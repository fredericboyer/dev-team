/**
 * Windsurf adapter.
 *
 * Generates `.windsurf/rules/{name}.md` files from agent definitions.
 * Similar format to Cursor — YAML frontmatter with `description`.
 *
 * Instruction-only adapter — Windsurf has no hook support.
 */

import path from "path";
import type { CanonicalAgentDefinition } from "../formats/canonical.js";
import { registerAdapter, type RuntimeAdapter } from "../formats/adapters.js";
import { fileExists, readFile, writeFile } from "../files.js";

/**
 * Renders a canonical agent definition into Windsurf rule format.
 */
function renderWindsurfRule(def: CanonicalAgentDefinition): string {
  const lines = ["---", `description: ${def.description}`, "---", "", def.body];
  return lines.join("\n");
}

export class WindsurfAdapter implements RuntimeAdapter {
  readonly id = "windsurf";
  readonly name = "Windsurf";

  generate(definitions: CanonicalAgentDefinition[], targetDir: string): void {
    const rulesDir = path.join(targetDir, ".windsurf", "rules");
    for (const def of definitions) {
      const dest = path.join(rulesDir, `${def.name}.md`);
      writeFile(dest, renderWindsurfRule(def));
    }
  }

  update(
    definitions: CanonicalAgentDefinition[],
    targetDir: string,
  ): { updated: string[]; added: string[] } {
    const rulesDir = path.join(targetDir, ".windsurf", "rules");
    const updated: string[] = [];
    const added: string[] = [];

    for (const def of definitions) {
      const dest = path.join(rulesDir, `${def.name}.md`);
      const newContent = renderWindsurfRule(def);

      if (fileExists(dest)) {
        const oldContent = readFile(dest);
        if (oldContent !== newContent) {
          writeFile(dest, newContent);
          updated.push(def.name);
        }
      } else {
        writeFile(dest, newContent);
        added.push(def.name);
      }
    }

    return { updated, added };
  }
}

// Module-level registration
registerAdapter(new WindsurfAdapter());
