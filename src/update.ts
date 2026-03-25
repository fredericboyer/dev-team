import path from "path";
import {
  templateDir,
  copyFile,
  fileExists,
  dirExists,
  readFile,
  writeFile,
  mergeSettings,
  mergeClaudeMd,
  listSubdirectories,
  listFilesRecursive,
  getPackageVersion,
} from "./files.js";
import type { HookSettings, HookMatcher } from "./files.js";
import fs from "fs";
import { ALL_AGENTS, QUALITY_HOOKS } from "./init.js";

interface AgentRename {
  oldLabel: string;
  oldFile: string;
  newLabel: string;
  newFile: string;
}

interface Migration {
  version: string;
  agentRenames?: AgentRename[];
}

const MIGRATIONS: Migration[] = [
  {
    version: "0.4.0",
    agentRenames: [
      {
        oldLabel: "Architect",
        oldFile: "dev-team-architect.md",
        newLabel: "Brooks",
        newFile: "dev-team-brooks.md",
      },
      {
        oldLabel: "Docs",
        oldFile: "dev-team-docs.md",
        newLabel: "Tufte",
        newFile: "dev-team-tufte.md",
      },
      {
        oldLabel: "Release",
        oldFile: "dev-team-release.md",
        newLabel: "Conway",
        newFile: "dev-team-conway.md",
      },
      {
        oldLabel: "Lead",
        oldFile: "dev-team-lead.md",
        newLabel: "Drucker",
        newFile: "dev-team-drucker.md",
      },
    ],
  },
];

export function compareSemver(a: string, b: string): number {
  const pa = a.split(".").map((n) => parseInt(n, 10));
  const pb = b.split(".").map((n) => parseInt(n, 10));
  for (let i = 0; i < 3; i++) {
    const diff = (pa[i] || 0) - (pb[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

function runMigrations(prefs: Preferences, fromVersion: string, devTeamDir: string): string[] {
  const log: string[] = [];

  for (const migration of MIGRATIONS) {
    // Skip migrations for versions already applied
    if (compareSemver(fromVersion, migration.version) >= 0) continue;

    if (migration.agentRenames) {
      for (const rename of migration.agentRenames) {
        const agentsDir = path.join(devTeamDir, "agents");
        const memoryDir = path.join(devTeamDir, "agent-memory");

        // Rename agent file
        const oldAgentPath = path.join(agentsDir, rename.oldFile);
        if (fileExists(oldAgentPath)) {
          try {
            fs.unlinkSync(oldAgentPath);
          } catch {
            // ignore
          }
          log.push(`Renamed agent: ${rename.oldLabel} → ${rename.newLabel}`);
        }

        // Rename memory directory (preserve calibration data)
        const oldMemDir = path.join(memoryDir, rename.oldFile.replace(".md", ""));
        const newMemDir = path.join(memoryDir, rename.newFile.replace(".md", ""));
        if (
          fileExists(path.join(oldMemDir, "MEMORY.md")) &&
          !fileExists(path.join(newMemDir, "MEMORY.md"))
        ) {
          try {
            fs.mkdirSync(newMemDir, { recursive: true });
            fs.renameSync(path.join(oldMemDir, "MEMORY.md"), path.join(newMemDir, "MEMORY.md"));
            fs.rmdirSync(oldMemDir);
          } catch {
            // Best effort — new memory template will be created if this fails
          }
          log.push(`Migrated memory: ${rename.oldLabel} → ${rename.newLabel}`);
        }

        // Update prefs: replace old label with new
        const idx = prefs.agents.indexOf(rename.oldLabel);
        if (idx !== -1) {
          prefs.agents[idx] = rename.newLabel;
        }
      }
    }
  }

  return log;
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
/**
 * Migrates files from .claude/ to .dev-team/ directory structure.
 * Preserves all user content (memories, learnings).
 */
function migrateFromClaude(targetDir: string): string[] {
  const log: string[] = [];
  const claudeDir = path.join(targetDir, ".claude");
  const devTeamDir = path.join(targetDir, ".dev-team");

  // Directories to move
  const dirMappings: Array<{ from: string; to: string }> = [
    { from: path.join(claudeDir, "agents"), to: path.join(devTeamDir, "agents") },
    { from: path.join(claudeDir, "agent-memory"), to: path.join(devTeamDir, "agent-memory") },
    { from: path.join(claudeDir, "hooks"), to: path.join(devTeamDir, "hooks") },
    { from: path.join(claudeDir, "skills"), to: path.join(devTeamDir, "skills") },
  ];

  // Protected files that must never be overwritten during migration
  const protectedPatterns = ["learnings.md", "MEMORY.md"];

  for (const { from, to } of dirMappings) {
    if (dirExists(from)) {
      const files = listFilesRecursive(from);
      for (const filePath of files) {
        const relativePath = path.relative(from, filePath);
        const destPath = path.join(to, relativePath);
        // Never overwrite existing files in .dev-team/ (partial migration safety)
        if (!fileExists(destPath)) {
          copyFile(filePath, destPath);
        }
      }
      log.push(`Migrated ${path.basename(from)}/ → .dev-team/${path.basename(to)}/`);
    }
  }

  // File mappings
  const fileMappings: Array<{ from: string; to: string }> = [
    {
      from: path.join(claudeDir, "dev-team-learnings.md"),
      to: path.join(devTeamDir, "learnings.md"),
    },
    { from: path.join(claudeDir, "dev-team.json"), to: path.join(devTeamDir, "config.json") },
  ];

  for (const { from, to } of fileMappings) {
    if (fileExists(from)) {
      const isProtected = protectedPatterns.some((p) => to.endsWith(p));
      // Never overwrite protected files (learnings, memory)
      if (!isProtected || !fileExists(to)) {
        copyFile(from, to);
      }
      log.push(`Migrated ${path.basename(from)} → .dev-team/${path.basename(to)}`);
    }
  }

  // Rewrite settings.json hook paths from .claude/hooks/ to .dev-team/hooks/
  const settingsPath = path.join(claudeDir, "settings.json");
  const settingsContent = readFile(settingsPath);
  if (settingsContent) {
    const updated = settingsContent.replace(/\.claude\/hooks\//g, ".dev-team/hooks/");
    writeFile(settingsPath, updated);
    log.push("Rewrote settings.json hook paths to .dev-team/hooks/");
  }

  // Clean up old .claude/ files (except settings.json and settings.local.json)
  for (const { from } of dirMappings) {
    if (dirExists(from)) {
      try {
        fs.rmSync(from, { recursive: true });
      } catch {
        // best effort
      }
    }
  }
  for (const { from } of fileMappings) {
    if (fileExists(from)) {
      try {
        fs.unlinkSync(from);
      } catch {
        // best effort
      }
    }
  }

  // Clean up other dev-team files in .claude/
  const otherFiles = [
    path.join(claudeDir, "dev-team-review-pending.json"),
    path.join(claudeDir, "dev-team-task.json"),
  ];
  for (const f of otherFiles) {
    if (fileExists(f)) {
      try {
        fs.unlinkSync(f);
      } catch {
        // best effort
      }
    }
  }

  return log;
}

export async function update(targetDir: string): Promise<void> {
  console.log("\ndev-team update — Upgrading to latest templates\n");

  const claudeDir = path.join(targetDir, ".claude");
  const devTeamDir = path.join(targetDir, ".dev-team");

  // Check if migration from .claude/ to .dev-team/ is needed
  const oldPrefsPath = path.join(claudeDir, "dev-team.json");
  const newPrefsPath = path.join(devTeamDir, "config.json");

  const needsMigration = fileExists(oldPrefsPath) && !fileExists(newPrefsPath);

  if (needsMigration) {
    console.log("Migrating from .claude/ to .dev-team/ directory structure...\n");
    const migrationLog = migrateFromClaude(targetDir);
    for (const entry of migrationLog) {
      console.log(`  ${entry}`);
    }
    console.log("");
  }

  const prefsPath = newPrefsPath;

  // Step 1: Read existing preferences
  const prefsContent = readFile(prefsPath);
  if (!prefsContent) {
    console.error("Error: No .dev-team/config.json found. Run `npx dev-team init` first.");
    process.exit(1);
  }

  let prefs: Preferences;
  try {
    prefs = JSON.parse(prefsContent);
  } catch {
    const backupPath = prefsPath + ".bak";
    try {
      copyFile(prefsPath, backupPath);
      console.error(
        `Error: dev-team.json is corrupted. Backed up to ${backupPath}. Run \`npx dev-team init\` to reinitialize.`,
      );
    } catch {
      console.error("Error: dev-team.json is corrupted. Run `npx dev-team init` to reinitialize.");
    }
    process.exit(1);
  }

  const packageVersion = getPackageVersion();

  if (prefs.version === packageVersion) {
    console.log(`Already at latest version (v${packageVersion})`);
  } else {
    console.log(`Upgrading from v${prefs.version} to v${packageVersion}`);
  }

  // Run version migrations before updating agents
  const agentMigrationLog = runMigrations(prefs, prefs.version || "0.0.0", devTeamDir);
  if (agentMigrationLog.length > 0) {
    console.log("Migrations:");
    for (const entry of agentMigrationLog) {
      console.log(`  ${entry}`);
    }
    console.log("");
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
  const agentsDir = path.join(devTeamDir, "agents");
  const memoryDir = path.join(devTeamDir, "agent-memory");

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
  const hooksDir = path.join(devTeamDir, "hooks");

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
  const skillsDir = path.join(devTeamDir, "skills");
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

  // Step 5b: Remove framework skills no longer in templates (moved to workflow-skills)
  const installedSkills = listSubdirectories(skillsDir);
  for (const installed of installedSkills) {
    if (!discoveredSkills.includes(installed)) {
      // This skill was removed from templates — check if it's a known workflow skill
      const workflowSrc = path.join(templates, "workflow-skills", installed, "SKILL.md");
      if (fileExists(workflowSrc)) {
        // Migrate to .claude/skills/ if not already there
        const claudeSkillDest = path.join(targetDir, ".claude", "skills", installed, "SKILL.md");
        if (!fileExists(claudeSkillDest)) {
          copyFile(workflowSrc, claudeSkillDest);
          summary.skills.added.push(installed.replace("dev-team-", "") + " (→ .claude/skills/)");
        }
        // Remove from .dev-team/skills/
        try {
          fs.rmSync(path.join(skillsDir, installed), { recursive: true });
        } catch {
          // best effort
        }
      }
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
  const learningsDest = path.join(devTeamDir, "learnings.md");
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
