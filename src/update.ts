import path from "path";
import {
  templateDir,
  copyFile,
  fileExists,
  readFile,
  writeFile,
  mergeSettings,
  mergeClaudeMd,
  listSubdirectories,
} from "./files";
import type { HookSettings, HookMatcher } from "./files";
import { ALL_AGENTS, QUALITY_HOOKS } from "./init";

/**
 * Returns the current package version from package.json.
 */
function getPackageVersion(): string {
  const pkgPath = path.join(templateDir(), "..", "package.json");
  const content = readFile(pkgPath);
  if (!content) {
    throw new Error("Cannot read package.json");
  }
  return JSON.parse(content).version;
}

interface Preferences {
  version: string;
  agents: string[];
  hooks: string[];
  issueTracker: string;
  branchConvention: string;
}

interface UpdateSummary {
  agents: { updated: string[]; added: string[] };
  hooks: { updated: string[]; added: string[] };
  skills: { updated: string[]; added: string[] };
  claudeMd: string;
  settings: boolean;
}

// Derived from init.ts — single source of truth, no drift
const AGENT_FILES: Record<string, string> = Object.fromEntries(
  ALL_AGENTS.map((a) => [a.label, a.file]),
);

const HOOK_FILES: Record<string, string> = Object.fromEntries(
  QUALITY_HOOKS.map((h) => [h.label, h.file]),
);

// Skills auto-discovered at runtime from templates/skills/

/**
 * Update flow: upgrades installed agents, hooks, and skills to latest templates.
 * Preserves user customizations in CLAUDE.md and agent memory files.
 */
export async function update(targetDir: string): Promise<void> {
  console.log("\ndev-team update — Upgrading to latest templates\n");

  const claudeDir = path.join(targetDir, ".claude");
  const prefsPath = path.join(claudeDir, "dev-team.json");

  // Step 1: Read existing preferences
  const prefsContent = readFile(prefsPath);
  if (!prefsContent) {
    console.error("Error: No dev-team.json found. Run `npx dev-team init` first.");
    process.exit(1);
  }

  let prefs: Preferences;
  try {
    prefs = JSON.parse(prefsContent);
  } catch {
    console.error("Error: dev-team.json is corrupted. Run `npx dev-team init` to reinitialize.");
    process.exit(1);
  }

  const packageVersion = getPackageVersion();

  if (prefs.version === packageVersion) {
    console.log(`Already at latest version (v${packageVersion})`);
  } else {
    console.log(`Upgrading from v${prefs.version} to v${packageVersion}`);
  }

  console.log(`  Agents: ${prefs.agents.join(", ")}`);
  console.log(`  Hooks:  ${prefs.hooks.join(", ")}`);
  console.log("");

  const templates = templateDir();
  const summary: UpdateSummary = {
    agents: { updated: [], added: [] },
    hooks: { updated: [], added: [] },
    skills: { updated: [], added: [] },
    claudeMd: "unchanged",
    settings: false,
  };

  // Step 2: Update agents
  const agentsDir = path.join(claudeDir, "agents");
  const memoryDir = path.join(claudeDir, "agent-memory");

  for (const label of prefs.agents) {
    const file = AGENT_FILES[label];
    if (!file) continue;

    const src = path.join(templates, "agents", file);
    const dest = path.join(agentsDir, file);

    if (!fileExists(src)) continue;

    if (fileExists(dest)) {
      const srcContent = readFile(src);
      const destContent = readFile(dest);
      if (srcContent !== destContent) {
        copyFile(src, dest);
        summary.agents.updated.push(label);
      }
    } else {
      copyFile(src, dest);
      summary.agents.added.push(label);
    }

    // Create memory template if missing (never overwrite existing memory)
    const agentName = file.replace(".md", "");
    const memorySrc = path.join(templates, "agent-memory", agentName, "MEMORY.md");
    const memoryDest = path.join(memoryDir, agentName, "MEMORY.md");
    if (!fileExists(memoryDest) && fileExists(memorySrc)) {
      copyFile(memorySrc, memoryDest);
    }
  }

  // Detect new agents available in templates but not in preferences
  for (const [label, file] of Object.entries(AGENT_FILES)) {
    if (prefs.agents.includes(label)) continue;
    const src = path.join(templates, "agents", file);
    if (fileExists(src)) {
      const dest = path.join(agentsDir, file);
      copyFile(src, dest);
      summary.agents.added.push(label);
      prefs.agents.push(label);

      const agentName = file.replace(".md", "");
      const memorySrc = path.join(templates, "agent-memory", agentName, "MEMORY.md");
      const memoryDest = path.join(memoryDir, agentName, "MEMORY.md");
      if (!fileExists(memoryDest) && fileExists(memorySrc)) {
        copyFile(memorySrc, memoryDest);
      }
    }
  }

  // Step 3: Update hooks
  const hooksDir = path.join(claudeDir, "hooks");

  for (const label of prefs.hooks) {
    const file = HOOK_FILES[label];
    if (!file) continue;

    const src = path.join(templates, "hooks", file);
    const dest = path.join(hooksDir, file);

    if (!fileExists(src)) continue;

    if (fileExists(dest)) {
      const srcContent = readFile(src);
      const destContent = readFile(dest);
      if (srcContent !== destContent) {
        copyFile(src, dest);
        summary.hooks.updated.push(label);
      }
    } else {
      copyFile(src, dest);
      summary.hooks.added.push(label);
    }
  }

  // Detect new hooks available in templates but not in preferences
  for (const [label, file] of Object.entries(HOOK_FILES)) {
    if (prefs.hooks.includes(label)) continue;
    const src = path.join(templates, "hooks", file);
    if (fileExists(src)) {
      const dest = path.join(hooksDir, file);
      copyFile(src, dest);
      summary.hooks.added.push(label);
      prefs.hooks.push(label);
    }
  }

  // Step 4: Update settings
  const settingsPath = path.join(claudeDir, "settings.json");
  const settingsContent = readFile(path.join(templates, "settings.json"));
  if (settingsContent) {
    const settingsTemplate: HookSettings = JSON.parse(settingsContent);
    const selectedHookFiles = prefs.hooks.map((label) => HOOK_FILES[label]).filter(Boolean);

    const filteredSettings: HookSettings = { hooks: {} };
    for (const [event, entries] of Object.entries(settingsTemplate.hooks)) {
      const filteredEntries: HookMatcher[] = entries
        .map((entry) => ({
          ...entry,
          hooks: (entry.hooks || []).filter((h) =>
            selectedHookFiles.some((f) => h.command && h.command.includes(f)),
          ),
        }))
        .filter((entry) => entry.hooks.length > 0);

      if (filteredEntries.length > 0) {
        filteredSettings.hooks[event] = filteredEntries;
      }
    }

    mergeSettings(settingsPath, filteredSettings);
    summary.settings = true;
  }

  // Step 5: Update skills (auto-discovered from templates/skills/)
  const skillsDir = path.join(claudeDir, "skills");
  const skillsSrcDir = path.join(templates, "skills");
  const discoveredSkills = listSubdirectories(skillsSrcDir);

  for (const skillDir of discoveredSkills) {
    const src = path.join(skillsSrcDir, skillDir, "SKILL.md");
    const dest = path.join(skillsDir, skillDir, "SKILL.md");

    if (!fileExists(src)) continue;

    if (fileExists(dest)) {
      const srcContent = readFile(src);
      const destContent = readFile(dest);
      if (srcContent !== destContent) {
        copyFile(src, dest);
        summary.skills.updated.push(skillDir.replace("dev-team-", ""));
      }
    } else {
      copyFile(src, dest);
      summary.skills.added.push(skillDir.replace("dev-team-", ""));
    }
  }

  // Step 6: Update CLAUDE.md (preserves user content outside markers)
  const claudeMdPath = path.join(targetDir, "CLAUDE.md");
  const claudeMdTemplate = readFile(path.join(templates, "CLAUDE.md"));
  if (claudeMdTemplate) {
    summary.claudeMd = mergeClaudeMd(claudeMdPath, claudeMdTemplate);
  }

  // Step 7: Update shared learnings template (only if missing)
  const learningsSrc = path.join(templates, "dev-team-learnings.md");
  const learningsDest = path.join(claudeDir, "dev-team-learnings.md");
  if (!fileExists(learningsDest)) {
    copyFile(learningsSrc, learningsDest);
  }

  // Step 8: Save updated preferences (stamp current package version)
  prefs.version = packageVersion;
  writeFile(prefsPath, JSON.stringify(prefs, null, 2) + "\n");

  // Step 9: Print summary
  console.log("Update summary:\n");

  const agentChanges = [...summary.agents.updated, ...summary.agents.added];
  const hookChanges = [...summary.hooks.updated, ...summary.hooks.added];
  const skillChanges = [...summary.skills.updated, ...summary.skills.added];

  if (
    agentChanges.length === 0 &&
    hookChanges.length === 0 &&
    skillChanges.length === 0 &&
    summary.claudeMd === "unchanged"
  ) {
    console.log("  Already up to date. No changes needed.\n");
    return;
  }

  if (summary.agents.updated.length > 0) {
    console.log(`  Agents updated:  ${summary.agents.updated.join(", ")}`);
  }
  if (summary.agents.added.length > 0) {
    console.log(`  Agents added:    ${summary.agents.added.join(", ")}`);
  }
  if (summary.hooks.updated.length > 0) {
    console.log(`  Hooks updated:   ${summary.hooks.updated.join(", ")}`);
  }
  if (summary.hooks.added.length > 0) {
    console.log(`  Hooks added:     ${summary.hooks.added.join(", ")}`);
  }
  if (summary.skills.updated.length > 0) {
    console.log(`  Skills updated:  ${summary.skills.updated.join(", ")}`);
  }
  if (summary.skills.added.length > 0) {
    console.log(`  Skills added:    ${summary.skills.added.join(", ")}`);
  }
  if (summary.claudeMd !== "unchanged") {
    console.log(`  CLAUDE.md:       ${summary.claudeMd}`);
  }

  console.log("\nPreserved:");
  console.log("  Agent memory files (not overwritten)");
  console.log("  Shared team learnings (not overwritten)");
  console.log("  CLAUDE.md content outside dev-team markers");
  console.log("");
}
