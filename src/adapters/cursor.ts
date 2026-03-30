/**
 * Cursor adapter.
 *
 * Generates `.cursor/rules/{name}.md` files from agent definitions.
 * Uses Cursor's MDC format: YAML frontmatter with `description`
 * and optional `globs` for path scoping.
 *
 * Instruction-only adapter — Cursor has no hook support.
 */

import path from "path";
import type { CanonicalAgentDefinition } from "../formats/canonical.js";
import { registerAdapter, type RuntimeAdapter } from "../formats/adapters.js";
import { fileExists, readFile, writeFile } from "../files.js";

/**
 * Renders a canonical agent definition into Cursor MDC format.
 * Cursor rules use YAML frontmatter with `description` and optional `globs`.
 */
function renderCursorRule(def: CanonicalAgentDefinition): string {
  const lines = ["---", `description: ${def.description}`, "---", "", def.body];
  return lines.join("\n");
}

export class CursorAdapter implements RuntimeAdapter {
  readonly id = "cursor";
  readonly name = "Cursor";

  generate(definitions: CanonicalAgentDefinition[], targetDir: string): void {
    const rulesDir = path.join(targetDir, ".cursor", "rules");
    for (const def of definitions) {
      const dest = path.join(rulesDir, `${def.name}.md`);
      writeFile(dest, renderCursorRule(def));
    }
  }

  update(
    definitions: CanonicalAgentDefinition[],
    targetDir: string,
  ): { updated: string[]; added: string[] } {
    const rulesDir = path.join(targetDir, ".cursor", "rules");
    const updated: string[] = [];
    const added: string[] = [];

    for (const def of definitions) {
      const dest = path.join(rulesDir, `${def.name}.md`);
      const newContent = renderCursorRule(def);

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
registerAdapter(new CursorAdapter());
