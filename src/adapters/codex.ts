/**
 * Codex CLI adapter.
 *
 * Generates `.agents/skills/` directory with per-skill SKILL.md files
 * and per-agent instruction files. Skills transfer ~95% (near-identical
 * format). Hooks are NOT mapped — only ~30% are Bash-scoped and the
 * hook system is experimental.
 *
 * Per research brief #508: focus on skills + instructions, skip hooks.
 * See docs/research/508-codex-cli-evaluation-2026-03-30.md.
 */

import path from "path";
import type { CanonicalAgentDefinition } from "../formats/canonical.js";
import { registerAdapter, type RuntimeAdapter } from "../formats/adapters.js";
import { fileExists, readFile, writeFile, templateDir, listSubdirectories } from "../files.js";

/**
 * Renders an agent definition into Codex-compatible instruction Markdown.
 * No frontmatter — Codex uses AGENTS.md for instructions, which is plain Markdown.
 */
function renderAgentInstruction(def: CanonicalAgentDefinition): string {
  return `## ${def.name}\n\n${def.description}\n\n${def.body}`.trimEnd() + "\n";
}

/**
 * Reads a SKILL.md file and extracts frontmatter fields.
 */
export function parseSkillFrontmatter(
  content: string,
): { name: string; description: string; disableModelInvocation: boolean; body: string } | null {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return null;

  const [, yaml, body] = match;
  const fields: Record<string, string> = {};
  for (const line of yaml.split("\n")) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (key && value) fields[key] = value;
  }

  if (!fields.name || !fields.description) return null;

  return {
    name: fields.name,
    description: fields.description,
    disableModelInvocation: fields["disable-model-invocation"] === "true",
    body: body.trimStart(),
  };
}

export class CodexAdapter implements RuntimeAdapter {
  readonly id = "codex";
  readonly name = "Codex CLI";

  generate(definitions: CanonicalAgentDefinition[], targetDir: string): void {
    const agentsDir = path.join(targetDir, ".agents");
    const skillsDestDir = path.join(agentsDir, "skills");

    // Write combined agent instructions to .agents/AGENTS.md
    const instructions = definitions.map(renderAgentInstruction).join("\n");
    writeFile(path.join(agentsDir, "AGENTS.md"), instructions);

    // Copy skills from templates to .agents/skills/
    this.copySkills(skillsDestDir);

    // Create .codex/ config directory with hooks feature flag
    const codexDir = path.join(targetDir, ".codex");
    if (!fileExists(path.join(codexDir, "config.toml"))) {
      writeFile(
        path.join(codexDir, "config.toml"),
        "# Codex CLI configuration\ncodex_hooks = true\n",
      );
    }
  }

  update(
    definitions: CanonicalAgentDefinition[],
    targetDir: string,
  ): { updated: string[]; added: string[] } {
    const agentsDir = path.join(targetDir, ".agents");
    const skillsDestDir = path.join(agentsDir, "skills");
    const agentsMdPath = path.join(agentsDir, "AGENTS.md");

    const newInstructions = definitions.map(renderAgentInstruction).join("\n");
    const existed = fileExists(agentsMdPath);
    const oldContent = existed ? readFile(agentsMdPath) : null;

    writeFile(agentsMdPath, newInstructions);

    // Update skills
    this.copySkills(skillsDestDir);

    // Ensure .codex/ config exists
    const codexDir = path.join(targetDir, ".codex");
    if (!fileExists(path.join(codexDir, "config.toml"))) {
      writeFile(
        path.join(codexDir, "config.toml"),
        "# Codex CLI configuration\ncodex_hooks = true\n",
      );
    }

    if (oldContent === newInstructions) {
      return { updated: [], added: [] };
    }

    const names = definitions.map((d) => d.name);
    return existed ? { updated: names, added: [] } : { updated: [], added: names };
  }

  /**
   * Copies skill SKILL.md files from templates to .agents/skills/.
   * For orchestration skills (disable-model-invocation: true), generates
   * an openai.yaml policy file to prevent implicit invocation.
   */
  private copySkills(skillsDestDir: string): void {
    const skillsSrcDir = path.join(templateDir(), "skills");
    let skillDirs: string[];
    try {
      skillDirs = listSubdirectories(skillsSrcDir);
    } catch {
      return;
    }

    for (const skillDir of skillDirs) {
      const srcPath = path.join(skillsSrcDir, skillDir, "SKILL.md");
      const content = readFile(srcPath);
      if (!content) continue;

      const destPath = path.join(skillsDestDir, skillDir, "SKILL.md");
      writeFile(destPath, content);

      // Generate openai.yaml for orchestration skills
      const parsed = parseSkillFrontmatter(content);
      if (parsed && parsed.disableModelInvocation) {
        const yamlPath = path.join(skillsDestDir, skillDir, "agents", "openai.yaml");
        const yamlContent = [
          `name: ${parsed.name}`,
          `description: ${parsed.description}`,
          "policy:",
          "  allow_implicit_invocation: false",
          "",
        ].join("\n");
        writeFile(yamlPath, yamlContent);
      }
    }
  }
}

// Module-level registration
registerAdapter(new CodexAdapter());
