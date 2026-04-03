/**
 * Codex CLI adapter.
 *
 * Generates native Codex configuration from canonical agent definitions.
 * See ADR-036 for the multi-runtime adapter architecture.
 */

import path from "path";
import type { CanonicalAgentDefinition } from "../formats/canonical.js";
import { registerAdapter, type RuntimeAdapter } from "../formats/adapters.js";
import { fileExists, readFile, writeFile, templateDir, listSubdirectories } from "../files.js";

function escapeTomlMultiline(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/"""/g, '""\\"');
}

function escapeTomlString(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");
}

export function renderAgentToml(def: CanonicalAgentDefinition): string {
  const lines: string[] = [];
  lines.push(`name = "${escapeTomlString(def.name)}"`);
  lines.push(`description = "${escapeTomlString(def.description)}"`);
  const cleanBody = def.body
    .replace(/\bAgent tool\b/g, "agent delegation")
    .replace(/\bsubagent_type:\s*"[^"]*"/g, "")
    .replace(/\brun_in_background:\s*true\b/g, "")
    .replace(/\bClaude Code\b/gi, "Codex");
  const tq = '"""';
  lines.push(`developer_instructions = ${tq}\n${escapeTomlMultiline(cleanBody.trimEnd())}\n${tq}`);
  if (def.model) lines.push(`model = "${escapeTomlString(def.model)}"`);
  lines.push("");
  return lines.join("\n");
}

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

interface CodexHookEntry {
  command: string;
  description?: string;
}
interface CodexHookEvent {
  matchers?: string[];
  hooks: CodexHookEntry[];
}
interface CodexHooksConfig {
  hooks: Record<string, CodexHookEvent[]>;
}

export function buildHooksConfig(): CodexHooksConfig {
  return {
    hooks: {
      PreToolUse: [
        {
          matchers: ["bash", "shell", "terminal"],
          hooks: [
            {
              command: "node .dev-team/hooks/dev-team-safety-guard.js",
              description: "Safety guard",
            },
          ],
        },
        {
          matchers: ["bash"],
          hooks: [
            {
              command: "node .dev-team/hooks/dev-team-pre-commit-lint.js",
              description: "Pre-commit lint",
            },
            { command: "node .dev-team/hooks/dev-team-review-gate.js", description: "Review gate" },
          ],
        },
      ],
      PostToolUse: [
        {
          matchers: ["edit_file", "write_file", "insert_code"],
          hooks: [
            {
              command: "node .dev-team/hooks/dev-team-tdd-enforce.js",
              description: "TDD enforcement",
            },
            {
              command: "node .dev-team/hooks/dev-team-post-change-review.js",
              description: "Post-change review",
            },
          ],
        },
      ],
    },
  };
}

export class CodexAdapter implements RuntimeAdapter {
  readonly id = "codex";
  readonly name = "Codex CLI";

  generate(definitions: CanonicalAgentDefinition[], targetDir: string): void {
    const codexDir = path.join(targetDir, ".codex");
    this.genToml(definitions, codexDir);
    this.copySkills(path.join(codexDir, "skills"));
    this.genHooks(codexDir);
    this.genRules(codexDir);
    this.genMemory(definitions, codexDir);
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
    const codexDir = path.join(targetDir, ".codex");
    const agentsDir = path.join(codexDir, "agents");
    const updated: string[] = [];
    const added: string[] = [];
    for (const def of definitions) {
      const tomlPath = path.join(agentsDir, `${def.name}.toml`);
      const nc = renderAgentToml(def);
      if (fileExists(tomlPath)) {
        if (readFile(tomlPath) !== nc) {
          writeFile(tomlPath, nc);
          updated.push(def.name);
        }
      } else {
        writeFile(tomlPath, nc);
        added.push(def.name);
      }
    }
    this.copySkills(path.join(codexDir, "skills"));
    this.genHooks(codexDir);
    this.genRules(codexDir);
    this.genMemory(definitions, codexDir);
    if (!fileExists(path.join(codexDir, "config.toml"))) {
      writeFile(
        path.join(codexDir, "config.toml"),
        "# Codex CLI configuration\ncodex_hooks = true\n",
      );
    }
    return { updated, added };
  }

  private genToml(defs: CanonicalAgentDefinition[], codexDir: string): void {
    const d = path.join(codexDir, "agents");
    for (const def of defs) writeFile(path.join(d, `${def.name}.toml`), renderAgentToml(def));
  }

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
      writeFile(path.join(skillsDestDir, skillDir, "SKILL.md"), content);
      const parsed = parseSkillFrontmatter(content);
      if (parsed && parsed.disableModelInvocation) {
        writeFile(
          path.join(skillsDestDir, skillDir, "agents", "openai.yaml"),
          [
            `name: ${parsed.name}`,
            `description: ${parsed.description}`,
            "policy:",
            "  allow_implicit_invocation: false",
            "",
          ].join("\n"),
        );
      }
    }
  }

  private genHooks(codexDir: string): void {
    writeFile(
      path.join(codexDir, "hooks.json"),
      JSON.stringify(buildHooksConfig(), null, 2) + "\n",
    );
  }

  private genRules(codexDir: string): void {
    const rulesPath = path.join(codexDir, "rules", "dev-team-learnings.md");
    if (fileExists(rulesPath)) return;
    const src = path.join(templateDir(), "dev-team-learnings.md");
    const content = readFile(src);
    writeFile(
      rulesPath,
      content || "# Shared Team Learnings\n\nAdd project-specific learnings here.\n",
    );
  }

  private genMemory(definitions: CanonicalAgentDefinition[], codexDir: string): void {
    for (const def of definitions) {
      const p = path.join(codexDir, "agent-memory", def.name, "MEMORY.md");
      if (!fileExists(p))
        writeFile(p, `# ${def.name} Memory\n\nAgent-specific calibration memory.\n`);
    }
  }
}

registerAdapter(new CodexAdapter());
