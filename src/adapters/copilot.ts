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
import { fileExists, readFile, writeFile, templateDir, listSubdirectories } from "../files.js";

const TOOL_MAP: Record<string, string> = {
  Read: "read",
  Edit: "edit",
  Write: "edit",
  Bash: "terminal",
  Grep: "search",
  Glob: "search",
  Agent: "agent",
  WebSearch: "search",
  WebFetch: "fetch",
};

export function mapTools(claudeTools?: string): string {
  if (!claudeTools) return "read, edit, search";
  const mapped = new Set<string>();
  for (const raw of claudeTools.split(",")) {
    const tool = raw.trim();
    const copilotTool = TOOL_MAP[tool];
    if (copilotTool) {
      mapped.add(copilotTool);
    }
  }
  return mapped.size > 0 ? Array.from(mapped).join(", ") : "read, edit, search";
}

export function adaptAgentBody(body: string): string {
  let adapted = body;
  adapted = adapted.replace(/\.claude\/rules\//g, ".github/instructions/");
  adapted = adapted.replace(/\.claude\/agents\//g, ".github/agents/");
  adapted = adapted.replace(/\.claude\/agent-memory\//g, ".github/agent-memory/");
  adapted = adapted.replace(
    /Write status to `\.dev-team\/agent-status\/[^`]+`[^.]*\./g,
    "Report progress via status messages.",
  );
  adapted = adapted.replace(/your MEMORY\.md/g, "your `.github/agent-memory/<agent>/MEMORY.md`");
  return adapted;
}

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

function renderCopilotAgent(def: CanonicalAgentDefinition): string {
  const tools = mapTools(def.tools);
  const adaptedBody = adaptAgentBody(def.body);
  const lines: string[] = [
    "---",
    `name: ${def.name}`,
    `description: ${def.description}`,
    `tools: ${tools}`,
    "---",
    "",
    adaptedBody.trimEnd(),
    "",
  ];
  return lines.join("\n");
}

function renderLearningsInstruction(learningsContent: string): string {
  const lines: string[] = ["---", 'applyTo: "**"', "---", "", learningsContent.trimEnd(), ""];
  return lines.join("\n");
}

function renderMemoryFile(agentName: string): string {
  return (
    `# ${agentName} Memory\n\n` +
    "<!-- Agent calibration memory. Domain-specific findings, known patterns, active watch lists. -->\n" +
    "<!-- Entries include Last-verified dates for temporal decay. -->\n"
  );
}

export function adaptSkillContent(content: string): string {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return content;
  const [, yaml, body] = match;
  const filteredLines = yaml
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("disable-model-invocation:"));
  return `---\n${filteredLines.join("\n")}\n---\n${body}`;
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

    // Copilot-native agent files
    this.generateAgents(definitions, targetDir);

    // Skills
    this.generateSkills(targetDir);

    // Agent memory directories
    this.generateAgentMemory(definitions, targetDir);

    // Shared learnings instruction file
    this.generateLearnings(targetDir);
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

    // Update Copilot-native agent files
    this.updateAgents(definitions, targetDir);

    // Update skills
    this.generateSkills(targetDir);

    // Update agent memory directories (preserve existing content)
    this.generateAgentMemory(definitions, targetDir);

    // Update shared learnings
    this.generateLearnings(targetDir);

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

  /**
   * Generates .github/agents/*.agent.md — Copilot-native agent files
   * with YAML frontmatter (name, description, tools).
   */
  generateAgents(definitions: CanonicalAgentDefinition[], targetDir: string): void {
    const agentsDir = path.join(targetDir, ".github", "agents");
    for (const def of definitions) {
      const agentPath = path.join(agentsDir, `${def.name}.agent.md`);
      writeFile(agentPath, renderCopilotAgent(def));
    }
  }

  /**
   * Updates .github/agents/*.agent.md during update().
   * Delegates to generateAgents() — change tracking is handled by
   * instruction file comparison in the caller.
   */
  private updateAgents(definitions: CanonicalAgentDefinition[], targetDir: string): void {
    this.generateAgents(definitions, targetDir);
  }

  /**
   * Generates .github/skills/SKILL.md files from templates.
   * Strips disable-model-invocation from frontmatter (Copilot uses
   * this at the agent level, not in skill definitions).
   */
  generateSkills(targetDir: string): void {
    const skillsSrcDir = path.join(templateDir(), "skills");
    const skillsDestDir = path.join(targetDir, ".github", "skills");

    const skillDirs = listSubdirectories(skillsSrcDir);

    for (const skillDir of skillDirs) {
      const srcPath = path.join(skillsSrcDir, skillDir, "SKILL.md");
      const content = readFile(srcPath);
      if (!content) continue;

      const adapted = adaptSkillContent(content);
      const destPath = path.join(skillsDestDir, skillDir, "SKILL.md");
      writeFile(destPath, adapted);
    }
  }

  /**
   * Generates .github/agent-memory/MEMORY.md files for each agent.
   * Preserves existing content — only creates files that do not exist.
   */
  generateAgentMemory(definitions: CanonicalAgentDefinition[], targetDir: string): void {
    const memoryDir = path.join(targetDir, ".github", "agent-memory");
    for (const def of definitions) {
      const memoryPath = path.join(memoryDir, def.name, "MEMORY.md");
      if (!fileExists(memoryPath)) {
        writeFile(memoryPath, renderMemoryFile(def.name));
      }
    }
  }

  /**
   * Generates .github/instructions/dev-team-learnings.instructions.md
   * with applyTo: "**" frontmatter so it loads for all files.
   */
  generateLearnings(targetDir: string): void {
    const learningsTemplatePath = path.join(templateDir(), "dev-team-learnings.md");
    const content = readFile(learningsTemplatePath);
    if (!content) return;

    const destPath = path.join(
      targetDir,
      ".github",
      "instructions",
      "dev-team-learnings.instructions.md",
    );
    writeFile(destPath, renderLearningsInstruction(content));
  }
}

// Module-level registration
registerAdapter(new CopilotAdapter());
