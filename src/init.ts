import path from "path";
import fs from "fs";
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
  getPackageVersion,
} from "./files.js";
import type { HookSettings, HookMatcher } from "./files.js";
import * as prompts from "./prompts.js";
import { scanProject, formatScanReport } from "./scan.js";
import { scanSkillRecommendations, formatRecommendations } from "./skill-recommendations.js";

interface AgentDefinition {
  label: string;
  file: string;
  description: string;
}

interface HookDefinition {
  label: string;
  file: string;
  description: string;
}

const ALL_AGENTS: AgentDefinition[] = [
  { label: "Voss", file: "dev-team-voss.md", description: "Backend Engineer" },
  {
    label: "Hamilton",
    file: "dev-team-hamilton.md",
    description: "Infrastructure Engineer",
  },
  {
    label: "Mori",
    file: "dev-team-mori.md",
    description: "Frontend/UI Engineer",
  },
  {
    label: "Szabo",
    file: "dev-team-szabo.md",
    description: "Security Auditor",
  },
  {
    label: "Knuth",
    file: "dev-team-knuth.md",
    description: "Quality Auditor",
  },
  { label: "Beck", file: "dev-team-beck.md", description: "Test Implementer" },
  {
    label: "Deming",
    file: "dev-team-deming.md",
    description: "Tooling & DX Optimizer",
  },
  {
    label: "Tufte",
    file: "dev-team-tufte.md",
    description: "Documentation Engineer",
  },
  {
    label: "Brooks",
    file: "dev-team-brooks.md",
    description: "Architect",
  },
  {
    label: "Conway",
    file: "dev-team-conway.md",
    description: "Release Manager",
  },
  {
    label: "Drucker",
    file: "dev-team-drucker.md",
    description: "Orchestrator / Team Lead",
  },
  {
    label: "Borges",
    file: "dev-team-borges.md",
    description: "Librarian (end-of-task knowledge review)",
  },
  {
    label: "Turing",
    file: "dev-team-turing.md",
    description: "Pre-implementation Researcher",
  },
  {
    label: "Rams",
    file: "dev-team-rams.md",
    description: "Design System Reviewer",
  },
];

const QUALITY_HOOKS: HookDefinition[] = [
  {
    label: "TDD enforcement",
    file: "dev-team-tdd-enforce.js",
    description: "Block implementation changes without tests",
  },
  {
    label: "Safety guard",
    file: "dev-team-safety-guard.js",
    description: "Block dangerous commands (rm -rf, force push)",
  },
  {
    label: "Post-change review",
    file: "dev-team-post-change-review.js",
    description: "Flag which agents should review after edits",
  },
  {
    label: "Pre-commit gate",
    file: "dev-team-pre-commit-gate.js",
    description: "Memory freshness reminders before committing (advisory-only)",
  },
  {
    label: "Pre-commit lint",
    file: "dev-team-pre-commit-lint.js",
    description: "Run lint + format checks before git commit",
  },
  {
    label: "Agent teams guide",
    file: "dev-team-agent-teams-guide.js",
    description: "Advisory guidance for agent team isolation patterns",
  },
  {
    label: "Watch list",
    file: "dev-team-watch-list.js",
    description: "Auto-spawn agents when file patterns match (configurable)",
  },
  {
    label: "Review gate",
    file: "dev-team-review-gate.js",
    description: "Enforce adversarial review loop via stateless commit gates",
  },
];

interface PresetDefinition {
  label: string;
  description: string;
  agents: string[];
  hooks: string[];
}

const PRESETS: Record<string, PresetDefinition> = {
  backend: {
    label: "backend",
    description: "Backend-heavy — API, security, architecture, quality",
    agents: [
      "Voss",
      "Hamilton",
      "Szabo",
      "Knuth",
      "Beck",
      "Deming",
      "Brooks",
      "Conway",
      "Drucker",
      "Borges",
    ],
    hooks: QUALITY_HOOKS.map((h) => h.label),
  },
  fullstack: {
    label: "fullstack",
    description: "Full-stack — all agents for end-to-end coverage",
    agents: ALL_AGENTS.map((a) => a.label),
    hooks: QUALITY_HOOKS.map((h) => h.label),
  },
  data: {
    label: "data",
    description: "Data pipeline — backend, quality, security, tooling",
    agents: ["Voss", "Szabo", "Knuth", "Beck", "Deming", "Tufte", "Drucker", "Borges"],
    hooks: QUALITY_HOOKS.map((h) => h.label),
  },
};

export { PRESETS, ALL_AGENTS, QUALITY_HOOKS };

/**
 * Main init flow.
 */
export async function run(targetDir: string, flags: string[] = []): Promise<void> {
  const isAll = flags.includes("--all");
  const presetFlag = flags.find((f) => f.startsWith("--preset"));
  let presetName: string | undefined;
  if (presetFlag) {
    const idx = flags.indexOf(presetFlag);
    presetName = presetFlag.includes("=") ? presetFlag.split("=")[1] : flags[idx + 1];
  }
  const preset = presetName ? PRESETS[presetName] : undefined;
  if (presetName && !preset) {
    console.error(`Unknown preset: ${presetName}. Available: ${Object.keys(PRESETS).join(", ")}`);
    process.exit(1);
  }

  console.log("\ndev-team — Adversarial AI agent team\n");
  if (preset) {
    console.log(`Using preset: ${preset.label} — ${preset.description}\n`);
  }

  // Step 1: Detect existing state
  const claudeDir = path.join(targetDir, ".claude");
  const devTeamDir = path.join(targetDir, ".dev-team");
  const agentsDir = path.join(devTeamDir, "agents");
  const hooksDir = path.join(devTeamDir, "hooks");
  const skillsDir = path.join(devTeamDir, "skills");
  const memoryDir = path.join(devTeamDir, "agent-memory");
  const settingsPath = path.join(claudeDir, "settings.json");
  const claudeMdPath = path.join(targetDir, "CLAUDE.md");
  const prefsPath = path.join(devTeamDir, "config.json");

  console.log("Detected:");
  console.log(`  .dev-team/ directory: ${dirExists(devTeamDir) ? "exists" : "will be created"}`);
  console.log(
    `  CLAUDE.md: ${fileExists(claudeMdPath) ? "exists (will merge)" : "will be created"}`,
  );
  console.log("");

  // Step 2: Agent selection
  let selectedAgents: string[];
  if (isAll || preset) {
    selectedAgents = preset ? preset.agents : ALL_AGENTS.map((a) => a.label);
  } else {
    selectedAgents = await prompts.checkbox(
      "Which agents would you like to install?",
      ALL_AGENTS.map((a) => ({
        label: a.label,
        description: `${a.description}`,
        defaultSelected: true,
      })),
    );
  }

  // Step 3: Hook selection
  let selectedHooks: string[];
  if (isAll || preset) {
    selectedHooks = preset ? preset.hooks : QUALITY_HOOKS.map((h) => h.label);
  } else {
    selectedHooks = await prompts.checkbox(
      "Which quality hooks do you want to enforce?",
      QUALITY_HOOKS.map((h) => ({
        label: h.label,
        description: h.description,
        defaultSelected: true,
      })),
    );
  }

  // Step 4: Issue tracker preference
  let issueTracker: string;
  if (isAll || preset) {
    issueTracker = "GitHub Issues";
  } else {
    issueTracker = await prompts.select("Which issue tracker do you use?", [
      { label: "GitHub Issues", description: "Track work with GitHub Issues" },
      { label: "Jira", description: "Atlassian Jira" },
      { label: "Linear", description: "Linear issue tracker" },
      { label: "Other", description: "Another issue tracker" },
      { label: "None", description: "No issue tracking enforcement" },
    ]);
  }

  // Step 5: Branch naming convention
  let branchConvention: string;
  if (isAll || preset) {
    branchConvention = "feat/123-description";
  } else {
    branchConvention = await prompts.select("Branch naming convention?", [
      {
        label: "feat/123-description",
        description: "Type/issue-number-description (e.g., feat/42-add-auth)",
      },
      {
        label: "type/description",
        description: "Type/description without issue number (e.g., feat/add-auth)",
      },
      { label: "None", description: "No branch naming enforcement" },
    ]);
  }

  // Step 6: Copy agents (renumbered after adding workflow prompts)
  const templates = templateDir();
  let agentCount = 0;

  for (const agent of ALL_AGENTS) {
    if (!selectedAgents.includes(agent.label)) continue;

    const src = path.join(templates, "agents", agent.file);
    const dest = path.join(agentsDir, agent.file);

    if (fileExists(dest) && !isAll && !preset) {
      const overwrite = await prompts.confirm(`  ${agent.file} already exists. Overwrite?`, false);
      if (!overwrite) continue;
    }

    copyFile(src, dest);
    agentCount++;
  }

  // Step 6b: Copy shared agent protocol
  const sharedSrc = path.join(templates, "agents", "SHARED.md");
  const sharedDest = path.join(agentsDir, "SHARED.md");
  copyFile(sharedSrc, sharedDest);

  // Step 7: Create agent memory directories
  for (const agent of ALL_AGENTS) {
    if (!selectedAgents.includes(agent.label)) continue;

    const agentName = agent.file.replace(".md", "");
    const memorySrc = path.join(templates, "agent-memory", agentName, "MEMORY.md");
    const memoryDest = path.join(memoryDir, agentName, "MEMORY.md");

    if (!fileExists(memoryDest)) {
      copyFile(memorySrc, memoryDest);
    }
  }

  // Step 8: Create shared team learnings
  const learningsSrc = path.join(templates, "dev-team-learnings.md");
  const learningsDest = path.join(devTeamDir, "learnings.md");
  if (!fileExists(learningsDest)) {
    copyFile(learningsSrc, learningsDest);
  }

  // Step 8b: Install process file (only if missing — never overwrite user customizations)
  const processSrc = path.join(templates, "dev-team-process.md");
  const processDest = path.join(devTeamDir, "process.md");
  if (!fileExists(processDest)) {
    copyFile(processSrc, processDest);
  }

  // Step 8c: Create metrics log
  // Install destination must be .dev-team/metrics.md — skills (task, review, retro)
  // and agents (Borges, Drucker) reference this exact path for calibration metrics.
  const metricsSrc = path.join(templates, "dev-team-metrics.md");
  const metricsDest = path.join(devTeamDir, "metrics.md");
  if (!fileExists(metricsDest)) {
    copyFile(metricsSrc, metricsDest);
  }

  // Step 7: Copy hooks
  let hookCount = 0;

  for (const hook of QUALITY_HOOKS) {
    if (!selectedHooks.includes(hook.label)) continue;

    const src = path.join(templates, "hooks", hook.file);
    const dest = path.join(hooksDir, hook.file);

    if (fileExists(dest) && !isAll && !preset) {
      const overwrite = await prompts.confirm(`  ${hook.file} already exists. Overwrite?`, false);
      if (!overwrite) continue;
    }

    copyFile(src, dest);
    hookCount++;
  }

  // Step 8: Merge hook settings
  const settingsContent = readFile(path.join(templates, "settings.json"));
  if (!settingsContent) {
    throw new Error("Missing templates/settings.json");
  }
  const settingsTemplate: HookSettings = JSON.parse(settingsContent);

  // Filter settings to only include selected hooks
  const filteredSettings: HookSettings = { hooks: {} };
  const selectedHookFiles = QUALITY_HOOKS.filter((h) => selectedHooks.includes(h.label)).map(
    (h) => h.file,
  );

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

  // Step 8c: Enable agent teams (experimental)
  const settingsData = JSON.parse(readFile(settingsPath) || "{}");
  if (!settingsData.env) {
    settingsData.env = {};
  }
  if (!("CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS" in settingsData.env)) {
    settingsData.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS = "1";
  }
  writeFile(settingsPath, JSON.stringify(settingsData, null, 2) + "\n");

  // Step 9: Copy framework skills (auto-discovered from templates/skills/)
  const skillsSrcDir = path.join(templates, "skills");
  const skillDirs = listSubdirectories(skillsSrcDir);
  for (const skillDir of skillDirs) {
    const src = path.join(skillsSrcDir, skillDir, "SKILL.md");
    const dest = path.join(skillsDir, skillDir, "SKILL.md");
    if (!fileExists(dest) || isAll) {
      copyFile(src, dest);
    }
  }

  // Step 9b: Create symlinks in .claude/skills/ so Claude Code can discover framework skills
  const claudeSkillsDir = path.join(claudeDir, "skills");
  for (const skillDir of skillDirs) {
    const symlinkPath = path.join(claudeSkillsDir, skillDir);
    const symlinkTarget = path.relative(claudeSkillsDir, path.join(skillsDir, skillDir));
    // Skip if path exists and is NOT a symlink (user's real directory — preserve it)
    let isNonSymlink = false;
    try {
      isNonSymlink = fs.existsSync(symlinkPath) && !fs.lstatSync(symlinkPath).isSymbolicLink();
    } catch {
      // ENOENT — path doesn't exist, proceed to create symlink
    }
    if (!isNonSymlink) {
      try {
        fs.mkdirSync(path.dirname(symlinkPath), { recursive: true });
        // Remove existing symlink (broken or stale) — only unlink symlinks, not real files/dirs
        try {
          if (fs.lstatSync(symlinkPath).isSymbolicLink()) {
            fs.unlinkSync(symlinkPath);
          }
        } catch {
          // ENOENT is expected when no prior symlink exists
        }
        fs.symlinkSync(symlinkTarget, symlinkPath);
      } catch (err) {
        // On Windows, non-admin users get EPERM/EACCES for symlinks — fall back to junction
        if (
          process.platform === "win32" &&
          ((err as NodeJS.ErrnoException).code === "EPERM" ||
            (err as NodeJS.ErrnoException).code === "EACCES")
        ) {
          try {
            fs.symlinkSync(symlinkTarget, symlinkPath, "junction");
          } catch (junctionErr) {
            console.warn(
              `  Warning: could not create skill symlink for ${skillDir}: ${(junctionErr as Error).message}`,
            );
          }
        } else {
          console.warn(
            `  Warning: could not create skill symlink for ${skillDir}: ${(err as Error).message}`,
          );
        }
      }
    }
  }

  // Step 10: Merge CLAUDE.md
  const claudeMdTemplate = readFile(path.join(templates, "CLAUDE.md"));
  if (!claudeMdTemplate) {
    throw new Error("Missing templates/CLAUDE.md");
  }
  const claudeResult = mergeClaudeMd(claudeMdPath, claudeMdTemplate);

  // Save preferences
  const agentTeamsEnabled = settingsData.env?.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS === "1";
  const prefs: Record<string, unknown> = {
    version: getPackageVersion(),
    agents: selectedAgents,
    hooks: selectedHooks,
    issueTracker,
    branchConvention,
    platform: "github",
    agentTeams: agentTeamsEnabled,
  };
  if (preset) {
    prefs.preset = preset.label;
  }
  writeFile(prefsPath, JSON.stringify(prefs, null, 2) + "\n");

  // Step 11: Print summary
  console.log("\nDone! Installed:\n");
  console.log(`  Agents:    ${selectedAgents.join(", ")} (${agentCount} files)`);
  console.log(`  Hooks:     ${selectedHooks.join(", ")} (${hookCount} files)`);
  const frameworkSkillNames = skillDirs.map((d) => d.replace("dev-team-", "")).join(", ");
  console.log(`  Skills:    ${frameworkSkillNames} (framework)`);
  console.log(
    `  Memory:    ${selectedAgents.length} agent memories + shared learnings + metrics log`,
  );
  console.log(`  CLAUDE.md: ${claudeResult}`);
  console.log(`  Settings:  ${settingsPath}`);
  console.log(
    `  Workflow:  ${issueTracker}${branchConvention !== "None" ? `, branches: ${branchConvention}` : ""}`,
  );
  if (agentTeamsEnabled) {
    console.log(
      "  Agent teams: enabled (experimental — disable with CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=0 if issues arise)",
    );
  }
  console.log("");

  // Step 12: Optional Deming tooling scan
  let runScan = isAll || !!preset;
  if (!isAll && !preset) {
    runScan = await prompts.confirm(
      "Run Deming tooling scan to check for linters, SAST, and CI gaps?",
      true,
    );
  }

  if (runScan) {
    const findings = scanProject(targetDir);
    console.log(formatScanReport(findings));
    console.log("");
  }

  // Step 13: Skill recommendations
  let runSkillScan = isAll || !!preset;
  if (!isAll && !preset) {
    runSkillScan = await prompts.confirm(
      "Scan for recommended Claude Code skills based on your project stack?",
      true,
    );
  }

  if (runSkillScan) {
    const { recommendations, ecosystems, catalog } = scanSkillRecommendations(targetDir);
    if (recommendations.length > 0) {
      console.log(formatRecommendations(recommendations, ecosystems, catalog));

      if (!isAll && !preset) {
        console.log(
          "  Install recommended skills from your Claude Code settings or MCP configuration.",
        );
        console.log("  These are suggestions only — skip any that don't apply.\n");
      }
    } else if (ecosystems.length > 0) {
      console.log("Skill scan: no matching skills found for your detected stack.\n");
    }
  }

  console.log("Next steps:");
  console.log("  1. Review installed agents in .dev-team/agents/");
  console.log("  2. Customize agent personas and focus areas to fit your project");
  if (!runScan) {
    console.log("  3. Run @dev-team-deming to scan for additional tooling recommendations");
  }
  console.log("");
}
