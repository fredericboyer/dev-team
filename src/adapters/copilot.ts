/**
 * GitHub Copilot adapter.
 *
 * Generates Copilot instruction files from canonical agent definitions:
 * - `.github/copilot-instructions.md` — general instructions (all agents combined)
 * - `.github/instructions/{name}.instructions.md` — per-agent instruction files
 *   with optional `applyTo` frontmatter for path scoping
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

    return { updated, added };
  }
}

// Module-level registration
registerAdapter(new CopilotAdapter());
