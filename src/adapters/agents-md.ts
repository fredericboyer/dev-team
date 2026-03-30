/**
 * AGENTS.md export adapter.
 *
 * Generates a single AGENTS.md file at the project root containing all
 * agent definitions in unstructured Markdown. No frontmatter — AGENTS.md
 * doesn't support it (per Codex research).
 *
 * See ADR-036 for the multi-runtime adapter architecture.
 */

import path from "path";
import type { CanonicalAgentDefinition } from "../formats/canonical.js";
import { registerAdapter, type RuntimeAdapter } from "../formats/adapters.js";
import { fileExists, readFile, writeFile } from "../files.js";

/**
 * Renders all canonical agent definitions into a single AGENTS.md string.
 */
function renderAgentsMd(definitions: CanonicalAgentDefinition[]): string {
  const sections: string[] = [];

  for (const def of definitions) {
    const section = `## Agent: ${def.name}\n\n${def.description}\n\n${def.body}`;
    sections.push(section.trimEnd());
  }

  return sections.join("\n\n") + "\n";
}

export class AgentsMdAdapter implements RuntimeAdapter {
  readonly id = "agents-md";
  readonly name = "AGENTS.md";

  generate(definitions: CanonicalAgentDefinition[], targetDir: string): void {
    const dest = path.join(targetDir, "AGENTS.md");
    writeFile(dest, renderAgentsMd(definitions));
  }

  update(
    definitions: CanonicalAgentDefinition[],
    targetDir: string,
  ): { updated: string[]; added: string[] } {
    const dest = path.join(targetDir, "AGENTS.md");
    const newContent = renderAgentsMd(definitions);
    const existed = fileExists(dest);
    const oldContent = existed ? readFile(dest) : null;

    if (oldContent === newContent) {
      return { updated: [], added: [] };
    }

    writeFile(dest, newContent);

    // AGENTS.md is a single file — report all agent names as updated or added
    const names = definitions.map((d) => d.name);
    return existed ? { updated: names, added: [] } : { updated: [], added: names };
  }
}

// Module-level registration
registerAdapter(new AgentsMdAdapter());
