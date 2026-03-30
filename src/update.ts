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
  ensureSymlink,
  assertNotSymlink,
  assertNoSymlinkInPath,
} from "./files.js";
import type { HookSettings, HookMatcher } from "./files.js";
import fs from "fs";
import { ALL_AGENTS, QUALITY_HOOKS, INFRA_HOOKS } from "./init.js";
import { parseAgentDefinition } from "./formats/canonical.js";
import { getAdaptersForRuntimes } from "./formats/adapters.js";
import "./adapters/agents-md.js";
import "./adapters/copilot.js";

interface AgentRename {
  oldLabel: string;
  oldFile: string;
  newLabel: string;
  newFile: string;
}

interface Migration {
  version: string;
  agentRenames?: AgentRename[];
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
export function cleanupLegacyMemoryDirs(devTeamDir: string): string[] {
  const log: string[] = [];
  const memoryDir = path.join(devTeamDir, "agent-memory");

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
  const pa = a.split(".").map((n) => parseInt(n.split("-")[0], 10));
  const pb = b.split(".").map((n) => parseInt(n.split("-")[0], 10));
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

    if (migration.skillRemovals) {
      const skillsDir = path.join(devTeamDir, "skills");
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

  // Clean up settings.json for any hooks removed by migrations
  const removedHookFiles = collectRemovedHookFiles(prefs.version || "0.0.0");
  if (removedHookFiles.length > 0) {
    const settingsPath = path.join(claudeDir, "settings.json");
    removeHooksFromSettings(settingsPath, removedHookFiles);
  }

  // Clean up legacy agent memory directories from pre-rename agents
  const legacyCleanupLog = cleanupLegacyMemoryDirs(devTeamDir);
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

  // Step 2: Update agents via adapter registry
  const agentsDir = path.join(devTeamDir, "agents");
  const memoryDir = path.join(devTeamDir, "agent-memory");

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

  // Step 5b: Create/repair symlinks in .claude/skills/ for framework skill discovery
  const claudeSkillsDir = path.join(claudeDir, "skills");
  for (const skillDir of discoveredSkills) {
    const symlinkPath = path.join(claudeSkillsDir, skillDir);
    const symlinkTarget = path.relative(claudeSkillsDir, path.join(skillsDir, skillDir));
    ensureSymlink(symlinkPath, symlinkTarget);
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
