/**
 * GitHub Copilot adapter.
 *
 * Generates Copilot instruction files from canonical agent definitions:
 * - `.github/copilot-instructions.md` — general instructions (all agents combined)
 * - `.github/instructions/{name}.instructions.md` — per-agent instruction files
 *   with optional `applyTo` frontmatter for path scoping
 * - `.github/hooks/hooks.json` — Copilot native hook configuration
 *
 * See ADR-036 for the multi-runtime adapter architecture.
 */

import path from "path";
import type { CanonicalAgentDefinition } from "../formats/canonical.js";
import { registerAdapter, type RuntimeAdapter } from "../formats/adapters.js";
import { fileExists, readFile, writeFile } from "../files.js";

/**
 * Renders the general copilot-instructions.md content from all definitions.
 */
function renderGeneralInstructions(definitions: CanonicalAgentDefinition[]): string {
  const lines: string[] = ["# Copilot Instructions", ""];

  for (const def of definitions) {
    lines.push(`## ${def.name}`, "", def.description, "");
  }

  return lines.join("\n");
}

/**
 * Renders a per-agent instruction file with optional applyTo frontmatter.
 */
function renderAgentInstruction(def: CanonicalAgentDefinition): string {
  const lines: string[] = [];

  // Add applyTo frontmatter if the agent has tool hints suggesting path scope
  // For now, no path scoping — agents are general-purpose
  lines.push(`# ${def.name}`, "", def.description, "", def.body.trimEnd(), "");

  return lines.join("\n");
}

/**
 * Copilot hook event types.
 * See: https://docs.github.com/en/copilot/customizing-copilot/extending-copilot-coding-agent-with-hooks
 */
interface CopilotHookEntry {
  command: string;
  description?: string;
}

interface CopilotHookEvent {
  matchers?: string[];
  hooks: CopilotHookEntry[];
}

interface CopilotHooksConfig {
  hooks: Record<string, CopilotHookEvent[]>;
}

/**
 * Builds the Copilot hooks.json configuration.
 *
 * Maps dev-team hooks to Copilot's 6 native hook events:
 * - preToolUse: safety guard (bash/shell), pre-commit lint, review gate (git commit)
 * - postToolUse: TDD enforcement, post-change review (file edit tools)
 */
export function buildHooksConfig(): CopilotHooksConfig {
  return {
    hooks: {
      preToolUse: [
        {
          matchers: ["bash", "shell", "terminal"],
          hooks: [
            {
              command: 'node .dev-team/hooks/dev-team-safety-guard.js "$TOOL_NAME" "$TOOL_INPUT"',
              description: "Safety guard — blocks dangerous shell commands",
            },
          ],
        },
        {
          matchers: ["git_commit", "git"],
          hooks: [
            {
              command: "node .dev-team/hooks/dev-team-pre-commit-lint.js",
              description: "Pre-commit lint — runs linter before commit",
            },
            {
              command: "node .dev-team/hooks/dev-team-review-gate.js",
              description: "Review gate — blocks commits without review evidence",
            },
          ],
        },
      ],
      postToolUse: [
        {
          matchers: ["edit_file", "write_file", "insert_code"],
          hooks: [
            {
              command: 'node .dev-team/hooks/dev-team-tdd-enforce.js "$TOOL_NAME" "$TOOL_INPUT"',
              description: "TDD enforcement — checks test exists for changed code",
            },
            {
              command:
                'node .dev-team/hooks/dev-team-post-change-review.js "$TOOL_NAME" "$TOOL_INPUT"',
              description: "Post-change review — triggers review for significant changes",
            },
          ],
        },
      ],
    },
  };
}

export class CopilotAdapter implements RuntimeAdapter {
  readonly id = "copilot";
  readonly name = "GitHub Copilot";

  generate(definitions: CanonicalAgentDefinition[], targetDir: string): void {
    const githubDir = path.join(targetDir, ".github");
    const instructionsDir = path.join(githubDir, "instructions");

    // General instructions
    writeFile(
      path.join(githubDir, "copilot-instructions.md"),
      renderGeneralInstructions(definitions),
    );

    // Per-agent instruction files
    for (const def of definitions) {
      writeFile(
        path.join(instructionsDir, `${def.name}.instructions.md`),
        renderAgentInstruction(def),
      );
    }

    // Native Copilot hooks
    this.generateHooks(targetDir);
  }

  update(
    definitions: CanonicalAgentDefinition[],
    targetDir: string,
  ): { updated: string[]; added: string[] } {
    const githubDir = path.join(targetDir, ".github");
    const instructionsDir = path.join(githubDir, "instructions");
    const updated: string[] = [];
    const added: string[] = [];

    // Update general instructions
    const generalPath = path.join(githubDir, "copilot-instructions.md");
    const newGeneral = renderGeneralInstructions(definitions);
    const oldGeneral = fileExists(generalPath) ? readFile(generalPath) : null;
    if (oldGeneral !== newGeneral) {
      writeFile(generalPath, newGeneral);
    }

    // Update per-agent instruction files
    for (const def of definitions) {
      const filePath = path.join(instructionsDir, `${def.name}.instructions.md`);
      const newContent = renderAgentInstruction(def);

      if (fileExists(filePath)) {
        const oldContent = readFile(filePath);
        if (oldContent !== newContent) {
          writeFile(filePath, newContent);
          updated.push(def.name);
        }
      } else {
        writeFile(filePath, newContent);
        added.push(def.name);
      }
    }

    // Update native Copilot hooks
    this.generateHooks(targetDir);

    return { updated, added };
  }

  /**
   * Generates `.github/hooks/hooks.json` with dev-team hook mappings
   * for Copilot's native hook system.
   */
  generateHooks(targetDir: string): void {
    const hooksPath = path.join(targetDir, ".github", "hooks", "hooks.json");
    const config = buildHooksConfig();
    writeFile(hooksPath, JSON.stringify(config, null, 2) + "\n");
  }
}

// Module-level registration
registerAdapter(new CopilotAdapter());
