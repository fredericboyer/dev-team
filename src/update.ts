import path from "path";
import {
  templateDir,
  copyFile,
  fileExists,
  dirExists,
  readFile,
  writeFile,
  mergeSettings,
  removeHooksFromSettings,
  mergeClaudeMd,
  listSubdirectories,
  listFilesRecursive,
  getPackageVersion,
  assertNotSymlink,
  assertNoSymlinkInPath,
} from "./files.js";
import type { HookSettings, HookMatcher } from "./files.js";
import fs from "fs";
import { ALL_AGENTS, QUALITY_HOOKS, INFRA_HOOKS } from "./init.js";
import { parseAgentDefinition } from "./formats/canonical.js";
import { getAdaptersForRuntimes } from "./formats/adapters.js";
import "./adapters/index.js";

interface AgentRename {
  oldLabel: string;
  oldFile: string;
  newLabel: string;
  newFile: string;
}

interface AgentRemoval {
  label: string;
  file: string;
}

interface Migration {
  version: string;
  agentRenames?: AgentRename[];
  agentRemovals?: AgentRemoval[];
  skillRemovals?: string[];
  hookRemovals?: string[];
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
  {
    version: "1.0.0",
    skillRemovals: ["dev-team-merge", "dev-team-security-status"],
  },
  {
    version: "3.1.1",
    skillRemovals: ["merge"],
    agentRemovals: [{ label: "Beck", file: "dev-team-beck.md" }],
  },
];

/**
 * Known legacy agent memory directory names from pre-rename agents.
 * Maps old directory name to the current agent directory name.
 */
const LEGACY_MEMORY_DIRS: Record<string, string> = {
  "dev-team-architect": "dev-team-brooks",
  "dev-team-docs": "dev-team-tufte",
  "dev-team-lead": "dev-team-drucker",
  "dev-team-release": "dev-team-conway",
};

/**
 * Cleans up legacy agent memory directories from pre-rename agents.
 * Merges any content from legacy dirs into the new agent's memory,
 * then removes the legacy directories.
 */
export function cleanupLegacyMemoryDirs(claudeDir: string): string[] {
  const log: string[] = [];
  const memoryDir = path.join(claudeDir, "agent-memory");

  if (!dirExists(memoryDir)) return log;

  for (const [legacyDir, currentDir] of Object.entries(LEGACY_MEMORY_DIRS)) {
    const legacyPath = path.join(memoryDir, legacyDir);
    if (!dirExists(legacyPath)) continue;

    const legacyMemoryPath = path.join(legacyPath, "MEMORY.md");
    const currentMemoryPath = path.join(memoryDir, currentDir, "MEMORY.md");

    // If legacy dir has content and current dir exists, merge content
    if (fileExists(legacyMemoryPath) && fileExists(currentMemoryPath)) {
      const legacyContent = readFile(legacyMemoryPath);
      const currentContent = readFile(currentMemoryPath);

      // Only merge if legacy has actual structured entries (not just template boilerplate)
      const hasStructuredEntries = legacyContent && /### \[\d{4}-\d{2}-\d{2}\]/.test(legacyContent);
      if (hasStructuredEntries) {
        const mergedContent =
          (currentContent || "") + "\n\n## Migrated from " + legacyDir + "\n\n" + legacyContent;
        writeFile(currentMemoryPath, mergedContent);
        log.push(`Merged memory: ${legacyDir} → ${currentDir}`);
      }
    } else if (fileExists(legacyMemoryPath) && !fileExists(currentMemoryPath)) {
      // Move legacy content to current location
      assertNotSymlink(legacyMemoryPath);
      assertNoSymlinkInPath(legacyMemoryPath);
      assertNotSymlink(currentMemoryPath);
      assertNoSymlinkInPath(currentMemoryPath);
      fs.mkdirSync(path.join(memoryDir, currentDir), { recursive: true });
      fs.renameSync(legacyMemoryPath, currentMemoryPath);
      log.push(`Moved memory: ${legacyDir} → ${currentDir}`);
    }

    // Remove the legacy directory
    try {
      fs.rmSync(legacyPath, { recursive: true });
      log.push(`Removed legacy directory: ${legacyDir}/`);
    } catch {
      // Best effort
    }
  }

  return log;
}

export function compareSemver(a: string, b: string): number {
  // Strip build metadata (+...) before comparison per semver spec
  const cleanA = a.replace(/\+.*$/, "");
  const cleanB = b.replace(/\+.*$/, "");
  const pa = cleanA.split(".").map((n) => parseInt(n.split("-")[0], 10));
  const pb = cleanB.split(".").map((n) => parseInt(n.split("-")[0], 10));
  for (let i = 0; i < 3; i++) {
    const diff = (pa[i] || 0) - (pb[i] || 0);
    if (diff !== 0) return diff;
  }
  // Per semver spec: pre-release versions have lower precedence than release
  const aPreMatch = cleanA.match(/-(.+)$/);
  const bPreMatch = cleanB.match(/-(.+)$/);
  const aHasPre = !!aPreMatch;
  const bHasPre = !!bPreMatch;
  if (aHasPre && !bHasPre) return -1;
  if (!aHasPre && bHasPre) return 1;
  if (aHasPre && bHasPre) {
    // Compare pre-release identifiers per semver spec
    const aParts = aPreMatch![1].split(".");
    const bParts = bPreMatch![1].split(".");
    const len = Math.max(aParts.length, bParts.length);
    for (let i = 0; i < len; i++) {
      if (i >= aParts.length) return -1; // fewer fields = lower precedence
      if (i >= bParts.length) return 1;
      const aNum = parseInt(aParts[i], 10);
      const bNum = parseInt(bParts[i], 10);
      const aIsNum = !isNaN(aNum) && String(aNum) === aParts[i];
      const bIsNum = !isNaN(bNum) && String(bNum) === bParts[i];
      if (aIsNum && bIsNum) {
        if (aNum !== bNum) return aNum - bNum;
      } else if (aIsNum) {
        return -1; // numeric < string
      } else if (bIsNum) {
        return 1;
      } else {
        const cmp = aParts[i].localeCompare(bParts[i]);
        if (cmp !== 0) return cmp;
      }
    }
  }
  return 0;
}

function runMigrations(
  prefs: Preferences,
  fromVersion: string,
  devTeamDir: string,
  claudeDir: string,
): string[] {
  const log: string[] = [];

  for (const migration of MIGRATIONS) {
    // Skip migrations for versions already applied
    if (compareSemver(fromVersion, migration.version) >= 0) continue;

    if (migration.agentRenames) {
      for (const rename of migration.agentRenames) {
        const agentsDir = path.join(claudeDir, "agents");
        const memoryDir = path.join(claudeDir, "agent-memory");

        // Rename agent file (check both .agent.md and legacy .md extensions)
        const oldAgentPath = path.join(agentsDir, rename.oldFile.replace(/\.md$/, ".agent.md"));
        const oldAgentPathLegacy = path.join(agentsDir, rename.oldFile);
        const pathToRemove = fileExists(oldAgentPath)
          ? oldAgentPath
          : fileExists(oldAgentPathLegacy)
            ? oldAgentPathLegacy
            : null;
        if (pathToRemove) {
          try {
            fs.unlinkSync(pathToRemove);
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
            assertNotSymlink(path.join(oldMemDir, "MEMORY.md"));
            assertNoSymlinkInPath(path.join(oldMemDir, "MEMORY.md"));
            assertNotSymlink(path.join(newMemDir, "MEMORY.md"));
            assertNoSymlinkInPath(path.join(newMemDir, "MEMORY.md"));
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

    if (migration.agentRemovals) {
      for (const removal of migration.agentRemovals) {
        const agentsDir = path.join(claudeDir, "agents");
        const memoryDir = path.join(claudeDir, "agent-memory");

        // Remove agent file (check both .agent.md and legacy .md extensions)
        const agentPath = path.join(agentsDir, removal.file.replace(/\.md$/, ".agent.md"));
        const agentPathLegacy = path.join(agentsDir, removal.file);
        const pathToRemove = fileExists(agentPath)
          ? agentPath
          : fileExists(agentPathLegacy)
            ? agentPathLegacy
            : null;
        if (pathToRemove) {
          try {
            assertNotSymlink(pathToRemove);
            assertNoSymlinkInPath(pathToRemove);
            fs.unlinkSync(pathToRemove);
          } catch {
            // ignore — symlink or missing file
          }
          log.push(`Removed retired agent: ${removal.label}`);
        }

        // Remove memory directory
        const memDir = path.join(memoryDir, removal.file.replace(".md", ""));
        if (dirExists(memDir)) {
          try {
            assertNotSymlink(memDir);
            assertNoSymlinkInPath(memDir);
            fs.rmSync(memDir, { recursive: true, force: true });
            log.push(`Removed memory for retired agent: ${removal.label}`);
          } catch {
            // Best effort
          }
        }

        // Remove from prefs
        const idx = prefs.agents.indexOf(removal.label);
        if (idx !== -1) {
          prefs.agents.splice(idx, 1);
        }
      }
    }

    if (migration.skillRemovals) {
      const skillsDir = path.join(claudeDir, "skills");
      for (const skillName of migration.skillRemovals) {
        const skillDir = path.join(skillsDir, skillName);
        if (dirExists(skillDir)) {
          try {
            fs.rmSync(skillDir, { recursive: true, force: true });
            log.push(`Removed legacy workflow skill: ${skillName}`);
          } catch {
            // Best effort — skill dir may already be gone
          }
        }
      }
    }

    if (migration.hookRemovals) {
      const hooksDir = path.join(devTeamDir, "hooks");
      for (const hookFile of migration.hookRemovals) {
        const hookPath = path.join(hooksDir, hookFile);
        if (fileExists(hookPath)) {
          try {
            fs.unlinkSync(hookPath);
            log.push(`Removed obsolete hook: ${hookFile}`);
          } catch {
            // Best effort — hook file may already be gone
          }
        }

        // Remove the hook's label from config.json hooks array
        // Find the label by looking up HOOK_FILES in reverse
        const hookLabel = Object.entries(HOOK_FILES).find(([, f]) => f === hookFile)?.[0];
        if (hookLabel) {
          const idx = prefs.hooks.indexOf(hookLabel);
          if (idx !== -1) {
            prefs.hooks.splice(idx, 1);
          }
        }
      }
    }
  }

  return log;
}

/**
 * Collects all hook files to be removed across migrations applicable from fromVersion.
 */
function collectRemovedHookFiles(fromVersion: string): string[] {
  const files: string[] = [];
  for (const migration of MIGRATIONS) {
    if (compareSemver(fromVersion, migration.version) >= 0) continue;
    if (migration.hookRemovals) {
      files.push(...migration.hookRemovals);
    }
  }
  return files;
}

interface Preferences {
  version: string;
  agents: string[];
  hooks: string[];
  runtimes?: string[];
  issueTracker: string;
  branchConvention: string;
  platform?: string;
  agentTeams?: boolean;
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
  [...QUALITY_HOOKS, ...INFRA_HOOKS].map((h) => [h.label, h.file]),
);

// Skills auto-discovered at runtime from templates/skills/

/**
 * Update flow: upgrades installed agents, hooks, and skills to latest templates.
 * Preserves user customizations in CLAUDE.md and agent memory files.
 */
/**
 * Migrates files from old .claude/dev-team.json layout to .dev-team/ directory structure.
 * In v3.0+, agents and memory stay in .claude/; only hooks and config go to .dev-team/.
 * Preserves all user content (memories, learnings).
 */
function migrateFromClaude(targetDir: string): string[] {
  const log: string[] = [];
  const claudeDir = path.join(targetDir, ".claude");
  const devTeamDir = path.join(targetDir, ".dev-team");

  // Hooks move to .dev-team/hooks/ (agents and memory stay in .claude/)
  const hooksMigration = {
    from: path.join(claudeDir, "hooks"),
    to: path.join(devTeamDir, "hooks"),
  };

  if (dirExists(hooksMigration.from)) {
    const files = listFilesRecursive(hooksMigration.from);
    for (const filePath of files) {
      const relativePath = path.relative(hooksMigration.from, filePath);
      const destPath = path.join(hooksMigration.to, relativePath);
      if (!fileExists(destPath)) {
        copyFile(filePath, destPath);
      }
    }
    log.push("Migrated hooks/ → .dev-team/hooks/");
    try {
      fs.rmSync(hooksMigration.from, { recursive: true });
    } catch {
      // best effort
    }
  }

  // Config file migration
  const oldPrefs = path.join(claudeDir, "dev-team.json");
  if (fileExists(oldPrefs)) {
    const configDest = path.join(devTeamDir, "config.json");
    if (!fileExists(configDest)) {
      copyFile(oldPrefs, configDest);
    }
    log.push("Migrated dev-team.json → .dev-team/config.json");
    try {
      fs.unlinkSync(oldPrefs);
    } catch {
      // best effort
    }
  }

  // Learnings migration (old .claude/dev-team-learnings.md → .claude/rules/)
  const oldLearnings = path.join(claudeDir, "dev-team-learnings.md");
  if (fileExists(oldLearnings)) {
    const rulesDir = path.join(claudeDir, "rules");
    const learningsDest = path.join(rulesDir, "dev-team-learnings.md");
    if (!fileExists(learningsDest)) {
      copyFile(oldLearnings, learningsDest);
    }
    log.push("Migrated dev-team-learnings.md → .claude/rules/dev-team-learnings.md");
    try {
      fs.unlinkSync(oldLearnings);
    } catch {
      // best effort
    }
  }

  // Rewrite settings.json hook paths from .claude/hooks/ to .dev-team/hooks/
  const settingsPath = path.join(claudeDir, "settings.json");
  const settingsContent = readFile(settingsPath);
  if (settingsContent) {
    try {
      const settings = JSON.parse(settingsContent);
      let changed = false;
      if (settings.hooks && typeof settings.hooks === "object") {
        for (const event of Object.keys(settings.hooks)) {
          const matchers = settings.hooks[event];
          if (!Array.isArray(matchers)) continue;
          for (const matcher of matchers) {
            if (!matcher) continue;
            // Top-level command field (flat format)
            if (typeof matcher.command === "string" && matcher.command.includes(".claude/hooks/")) {
              matcher.command = matcher.command.replace(/\.claude\/hooks\//g, ".dev-team/hooks/");
              changed = true;
            }
            // Nested hooks array (standard format)
            if (Array.isArray(matcher.hooks)) {
              for (const hook of matcher.hooks) {
                if (
                  hook &&
                  typeof hook.command === "string" &&
                  hook.command.includes(".claude/hooks/")
                ) {
                  hook.command = hook.command.replace(/\.claude\/hooks\//g, ".dev-team/hooks/");
                  changed = true;
                }
              }
            }
          }
        }
      }
      if (changed) {
        writeFile(settingsPath, JSON.stringify(settings, null, 2) + "\n");
        log.push("Rewrote settings.json hook paths to .dev-team/hooks/");
      }
    } catch {
      log.push("WARNING: Failed to parse settings.json — skipping hook path rewrite");
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

/**
 * Migrates v2.x installations to v3.0 runtime-native layout (ADR-038).
 * Moves agents from .dev-team/agents/ → .claude/agents/ (renaming .md → .agent.md)
 * Moves agent-memory from .dev-team/agent-memory/ → .claude/agent-memory/
 * Removes .dev-team/skills/ symlinks (skills already in .claude/skills/)
 * Removes .dev-team/learnings.md if .claude/rules/dev-team-learnings.md exists
 * Idempotent — safe to run multiple times.
 */
export function migrateToV3Layout(targetDir: string): string[] {
  const log: string[] = [];
  const claudeDir = path.join(targetDir, ".claude");
  const devTeamDir = path.join(targetDir, ".dev-team");

  // 1. Migrate agents: .dev-team/agents/ → .claude/agents/ (rename .md → .agent.md)
  const oldAgentsDir = path.join(devTeamDir, "agents");
  if (dirExists(oldAgentsDir)) {
    const newAgentsDir = path.join(claudeDir, "agents");
    const files = listFilesRecursive(oldAgentsDir);
    let migrated = 0;
    for (const filePath of files) {
      const relativePath = path.relative(oldAgentsDir, filePath);
      // Rename dev-team-*.md to dev-team-*.agent.md (but not SHARED.md — keep as-is)
      let destRelative = relativePath;
      if (
        relativePath.startsWith("dev-team-") &&
        relativePath.endsWith(".md") &&
        !relativePath.endsWith(".agent.md")
      ) {
        destRelative = relativePath.replace(/\.md$/, ".agent.md");
      }
      const destPath = path.join(newAgentsDir, destRelative);
      if (!fileExists(destPath)) {
        copyFile(filePath, destPath);
        migrated++;
      }
    }
    if (migrated > 0) {
      log.push(`Migrated ${migrated} agents: .dev-team/agents/ → .claude/agents/`);
    }
    // Clean up old directory
    try {
      assertNotSymlink(oldAgentsDir);
      assertNoSymlinkInPath(oldAgentsDir);
      fs.rmSync(oldAgentsDir, { recursive: true });
    } catch {
      // best effort
    }
  }

  // 2. Migrate agent-memory: .dev-team/agent-memory/ → .claude/agent-memory/
  const oldMemoryDir = path.join(devTeamDir, "agent-memory");
  if (dirExists(oldMemoryDir)) {
    const newMemoryDir = path.join(claudeDir, "agent-memory");
    const files = listFilesRecursive(oldMemoryDir);
    let migrated = 0;
    for (const filePath of files) {
      const relativePath = path.relative(oldMemoryDir, filePath);
      const destPath = path.join(newMemoryDir, relativePath);
      // Never overwrite existing memory files (preserve user content)
      if (!fileExists(destPath)) {
        copyFile(filePath, destPath);
        migrated++;
      }
    }
    if (migrated > 0) {
      log.push(
        `Migrated ${migrated} memory files: .dev-team/agent-memory/ → .claude/agent-memory/`,
      );
    }
    // Clean up old directory
    try {
      assertNotSymlink(oldMemoryDir);
      assertNoSymlinkInPath(oldMemoryDir);
      fs.rmSync(oldMemoryDir, { recursive: true });
    } catch {
      // best effort
    }
  }

  // 3. Remove .dev-team/skills/ (skills now install directly to .claude/skills/)
  const oldSkillsDir = path.join(devTeamDir, "skills");
  if (dirExists(oldSkillsDir)) {
    try {
      assertNotSymlink(oldSkillsDir);
      assertNoSymlinkInPath(oldSkillsDir);
      fs.rmSync(oldSkillsDir, { recursive: true });
      log.push("Removed .dev-team/skills/ (skills now in .claude/skills/)");
    } catch {
      // best effort
    }
  }

  // 4. Remove .dev-team/learnings.md if .claude/rules/dev-team-learnings.md exists
  const oldLearningsPath = path.join(devTeamDir, "learnings.md");
  const rulesLearningsPath = path.join(claudeDir, "rules", "dev-team-learnings.md");
  if (fileExists(oldLearningsPath) && fileExists(rulesLearningsPath)) {
    try {
      fs.unlinkSync(oldLearningsPath);
      log.push("Removed .dev-team/learnings.md (already in .claude/rules/)");
    } catch {
      // best effort
    }
  }

  // 5. Remove stale symlinks in .claude/skills/ (from old symlink-based layout)
  const claudeSkillsDir = path.join(claudeDir, "skills");
  if (dirExists(claudeSkillsDir)) {
    try {
      const entries = fs.readdirSync(claudeSkillsDir);
      for (const entry of entries) {
        const entryPath = path.join(claudeSkillsDir, entry);
        try {
          const stat = fs.lstatSync(entryPath);
          if (stat.isSymbolicLink()) {
            const linkTarget = fs.readlinkSync(entryPath);
            if (
              linkTarget.includes(".dev-team/skills/") ||
              linkTarget.includes(".dev-team\\skills\\")
            ) {
              fs.unlinkSync(entryPath);
              log.push(`Removed stale symlink: .claude/skills/${entry}`);
            }
          }
        } catch {
          // best effort
        }
      }
    } catch {
      // best effort
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

  // Run v3.0 layout migration (ADR-038): agents/memory → .claude/, remove .dev-team/skills/
  const v3MigrationLog = migrateToV3Layout(targetDir);
  if (v3MigrationLog.length > 0) {
    console.log("v3.0 layout migration:");
    for (const entry of v3MigrationLog) {
      console.log(`  ${entry}`);
    }
    console.log("");
  }

  // Run version migrations before updating agents
  const agentMigrationLog = runMigrations(prefs, prefs.version || "0.0.0", devTeamDir, claudeDir);
  if (agentMigrationLog.length > 0) {
    console.log("Migrations:");
    for (const entry of agentMigrationLog) {
      console.log(`  ${entry}`);
    }
    console.log("");
  }

  // Clean up settings.json for any hooks removed by migrations
  const removedHookFiles = collectRemovedHookFiles(prefs.version || "0.0.0");
  if (removedHookFiles.length > 0) {
    const settingsPath = path.join(claudeDir, "settings.json");
    removeHooksFromSettings(settingsPath, removedHookFiles);
  }

  // Clean up legacy agent memory directories from pre-rename agents
  const legacyCleanupLog = cleanupLegacyMemoryDirs(claudeDir);
  if (legacyCleanupLog.length > 0) {
    console.log("Legacy cleanup:");
    for (const entry of legacyCleanupLog) {
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

  // Step 2: Update agents via adapter registry (runtime-native: .claude/agents/)
  const agentsDir = path.join(claudeDir, "agents");
  const memoryDir = path.join(claudeDir, "agent-memory");

  // Build canonical definitions for all agents (installed + newly discovered)
  const allAgentLabels = new Set(prefs.agents);
  for (const [label] of Object.entries(AGENT_FILES)) {
    allAgentLabels.add(label);
  }

  const canonicalDefs = [];
  for (const label of allAgentLabels) {
    const file = AGENT_FILES[label];
    if (!file) continue;
    const src = path.join(templates, "agents", file);
    const content = readFile(src);
    if (!content) continue;
    canonicalDefs.push({ label, def: parseAgentDefinition(content), file });
  }

  // Ensure all discovered agents are in prefs.agents (auto-discovery for new agents)
  for (const { label } of canonicalDefs) {
    if (!prefs.agents.includes(label)) {
      prefs.agents.push(label);
    }
  }

  // Run adapters for configured runtimes (default: ["claude"])
  const runtimes = prefs.runtimes || ["claude"];
  const adapters = getAdaptersForRuntimes(runtimes);
  for (const adapter of adapters) {
    const result = adapter.update(
      canonicalDefs.map((c) => c.def),
      targetDir,
    );
    // Map agent names back to labels for summary reporting
    for (const name of result.updated) {
      const entry = canonicalDefs.find((c) => c.def.name === name);
      if (entry && !summary.agents.updated.includes(entry.label)) {
        summary.agents.updated.push(entry.label);
      }
    }
    for (const name of result.added) {
      const entry = canonicalDefs.find((c) => c.def.name === name);
      if (entry && !summary.agents.added.includes(entry.label)) {
        summary.agents.added.push(entry.label);
      }
    }
  }

  // Create memory templates for all agents (never overwrite existing memory)
  for (const { file } of canonicalDefs) {
    const agentName = file.replace(".md", "");
    const memorySrc = path.join(templates, "agent-memory", agentName, "MEMORY.md");
    const memoryDest = path.join(memoryDir, agentName, "MEMORY.md");
    if (!fileExists(memoryDest) && fileExists(memorySrc)) {
      copyFile(memorySrc, memoryDest);
    }
  }

  // Update shared agent protocol
  const sharedSrc = path.join(templates, "agents", "SHARED.md");
  const sharedDest = path.join(agentsDir, "SHARED.md");
  if (fileExists(sharedSrc)) {
    copyFile(sharedSrc, sharedDest);
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

  // Copy hook support files (lib/ directory) — shared modules used by hooks
  const hookLibSrcDir = path.join(templates, "hooks", "lib");
  if (dirExists(hookLibSrcDir)) {
    const libFiles = listFilesRecursive(hookLibSrcDir);
    for (const libFile of libFiles) {
      const relative = path.relative(hookLibSrcDir, libFile);
      const libDest = path.join(hooksDir, "lib", relative);
      const srcContent = readFile(libFile);
      const destContent = readFile(libDest);
      if (srcContent !== destContent) {
        copyFile(libFile, libDest);
      }
    }
  }
  // Copy agent-patterns.json (authoritative pattern source for hooks)
  const patternsSrc = path.join(templates, "hooks", "agent-patterns.json");
  const patternsDest = path.join(hooksDir, "agent-patterns.json");
  const patternsSrcContent = readFile(patternsSrc);
  const patternsDestContent = readFile(patternsDest);
  if (patternsSrcContent && patternsSrcContent !== patternsDestContent) {
    copyFile(patternsSrc, patternsDest);
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

  // Step 4b: Enable agent teams if not already set (respect user opt-out)
  const settingsData = JSON.parse(readFile(settingsPath) || "{}");
  if (!settingsData.env) {
    settingsData.env = {};
  }
  // Only add if not already set — never re-enable if user explicitly disabled (=0)
  if (!("CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS" in settingsData.env)) {
    settingsData.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS = "1";
    writeFile(settingsPath, JSON.stringify(settingsData, null, 2) + "\n");
  }
  // Update config.json to reflect current agent teams status
  const agentTeamsEnabled = settingsData.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS === "1";
  prefs.agentTeams = agentTeamsEnabled;

  // Step 5: Update skills directly in .claude/skills/ (no symlinks — ADR-038)
  const claudeSkillsDir = path.join(claudeDir, "skills");
  const skillsSrcDir = path.join(templates, "skills");
  const discoveredSkills = listSubdirectories(skillsSrcDir);

  for (const skillDir of discoveredSkills) {
    const src = path.join(skillsSrcDir, skillDir, "SKILL.md");
    const dest = path.join(claudeSkillsDir, skillDir, "SKILL.md");

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

  // Step 7: Update shared learnings and process files (in .claude/rules/ for automatic agent context)
  const rulesDir = path.join(claudeDir, "rules");
  const learningsSrc = path.join(templates, "dev-team-learnings.md");
  const learningsDest = path.join(rulesDir, "dev-team-learnings.md");

  // Migration: move from old .dev-team/ paths to .claude/rules/
  const oldLearningsPath = path.join(devTeamDir, "learnings.md");
  if (fileExists(oldLearningsPath) && !fileExists(learningsDest)) {
    assertNotSymlink(oldLearningsPath);
    assertNoSymlinkInPath(oldLearningsPath);
    assertNotSymlink(learningsDest);
    assertNoSymlinkInPath(learningsDest);
    fs.mkdirSync(rulesDir, { recursive: true });
    fs.renameSync(oldLearningsPath, learningsDest);
    console.log("  Migrated learnings.md → .claude/rules/dev-team-learnings.md");
  }
  if (!fileExists(learningsDest)) {
    copyFile(learningsSrc, learningsDest);
  }

  const processSrc = path.join(templates, "dev-team-process.md");
  const processDest = path.join(rulesDir, "dev-team-process.md");

  // Migration: move from old .dev-team/ path to .claude/rules/
  const oldProcessPath = path.join(devTeamDir, "process.md");
  if (fileExists(oldProcessPath) && !fileExists(processDest)) {
    assertNotSymlink(oldProcessPath);
    assertNoSymlinkInPath(oldProcessPath);
    assertNotSymlink(processDest);
    assertNoSymlinkInPath(processDest);
    fs.mkdirSync(rulesDir, { recursive: true });
    fs.renameSync(oldProcessPath, processDest);
    console.log("  Migrated process.md → .claude/rules/dev-team-process.md");
  }
  if (!fileExists(processDest) && fileExists(processSrc)) {
    copyFile(processSrc, processDest);
  }

  // Step 7b: Create metrics log (only if missing — never overwrite user data)
  const metricsSrc = path.join(templates, "dev-team-metrics.md");
  const metricsDest = path.join(devTeamDir, "metrics.md");
  if (!fileExists(metricsDest) && fileExists(metricsSrc)) {
    copyFile(metricsSrc, metricsDest);
  }

  // Backfill platform field for existing installs (added in v1.5.0)
  if (!prefs.platform) {
    prefs.platform = "github";
  }

  // Clean up ghost entries (labels from removed hooks/agents)
  prefs.hooks = prefs.hooks.filter((label) => Object.hasOwn(HOOK_FILES, label));
  prefs.agents = prefs.agents.filter((label) => Object.hasOwn(AGENT_FILES, label));

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
