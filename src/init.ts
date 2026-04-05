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
import * as prompts from "./prompts.js";
import { scanProject, formatScanReport } from "./scan.js";
import { scanSkillRecommendations, formatRecommendations } from "./skill-recommendations.js";
import { parseAgentDefinition } from "./formats/canonical.js";
import { getAdaptersForRuntimes } from "./formats/adapters.js";
import "./adapters/index.js";

export type VersioningScheme = "semver" | "none";

export interface VersioningConfig {
  scheme: VersioningScheme;
  source: string;
}

export const DEFAULT_VERSIONING: VersioningConfig = {
  scheme: "semver",
  source: "package.json",
};

export type PrTitleFormat = "conventional" | "plain" | "issue-prefix";

export interface PrConfig {
  titleFormat: PrTitleFormat;
  linkKeyword: string;
  draft: boolean;
  template: string[];
  autoLabel: boolean;
}

export const DEFAULT_PR_CONFIG: PrConfig = {
  titleFormat: "conventional",
  linkKeyword: "Closes",
  draft: false,
  template: ["summary", "testPlan"],
  autoLabel: true,
};

export type ModelTier = "opus" | "sonnet" | "haiku";
export type ModelAssignment = ModelTier | ModelTier[];

export interface ModelsConfig {
  default: ModelTier;
  agents: Record<string, ModelAssignment>;
}

export const DEFAULT_MODELS: ModelsConfig = {
  default: "opus",
  agents: {},
};

/**
 * Merges a partial models config into the defaults, preserving all user-set values
 * and adding new keys with their defaults.
 */
export function mergeModelsConfig(existing: Partial<ModelsConfig>): ModelsConfig {
  const merged: ModelsConfig = {
    default: existing.default || DEFAULT_MODELS.default,
    agents: {},
  };
  if (existing.agents) {
    for (const [key, value] of Object.entries(existing.agents)) {
      merged.agents[key] = value;
    }
  }
  return merged;
}

export type WorkflowToggle = boolean | "complex";
export type WorkflowSwitch = boolean;

export interface WorkflowConfig {
  research: WorkflowToggle;
  challenge: WorkflowToggle;
  implement: WorkflowSwitch;
  review: WorkflowToggle;
  pr: WorkflowSwitch;
  merge: WorkflowSwitch;
  release: WorkflowSwitch;
  learn: WorkflowToggle;
}

export const DEFAULT_WORKFLOW: WorkflowConfig = {
  research: true,
  challenge: false,
  implement: true,
  review: true,
  pr: true,
  merge: true,
  release: false,
  learn: true,
};

export interface WorkflowValidationWarning {
  step: string;
  reason: string;
  action: string;
}

/**
 * Validates workflow config dependency rules.
 * - merge requires pr
 * - release requires merge
 * - challenge: "complex" requires Brooks pre-assessment
 *
 * Returns a list of warnings. Steps that fail dependencies are flagged
 * but callers decide whether to block or warn.
 */
export function validateWorkflowConfig(
  workflow: Partial<WorkflowConfig>,
): WorkflowValidationWarning[] {
  const warnings: WorkflowValidationWarning[] = [];

  if (workflow.merge && !workflow.pr) {
    warnings.push({
      step: "merge",
      reason: "merge requires pr to be enabled",
      action: "merge will be skipped",
    });
  }

  if (workflow.release && !workflow.merge) {
    warnings.push({
      step: "release",
      reason: "release requires merge to be enabled",
      action: "release will be skipped",
    });
  }

  if (workflow.challenge === "complex") {
    warnings.push({
      step: "challenge",
      reason: 'challenge: "complex" requires Brooks pre-assessment before implementation',
      action: "Brooks will be spawned for pre-assessment on complex tasks",
    });
  }

  return warnings;
}

/**
 * Merges a partial workflow config into the defaults, preserving all user-set values
 * and adding new keys with their defaults.
 */
export function mergeWorkflowConfig(existing: Partial<WorkflowConfig>): WorkflowConfig {
  return {
    ...DEFAULT_WORKFLOW,
    ...Object.fromEntries(
      Object.entries(existing).filter(([key]) => Object.hasOwn(DEFAULT_WORKFLOW, key)),
    ),
  } as WorkflowConfig;
}

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

// Infrastructure hooks — always installed, not user-selectable.
// Workaround for upstream CC bugs (anthropics/claude-code#34645, #39680).
const INFRA_HOOKS: HookDefinition[] = [
  {
    label: "Worktree create",
    file: "dev-team-worktree-create.js",
    description: "Serialize worktree creation to prevent git config.lock races",
  },
  {
    label: "Worktree remove",
    file: "dev-team-worktree-remove.js",
    description: "Clean up worktrees created by the serialized create hook",
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
  {
    label: "Merge gate",
    file: "dev-team-merge-gate.js",
    description: "Block gh pr merge when no review evidence exists for the branch",
  },
  {
    label: "Implementer guard",
    file: "dev-team-implementer-guard.js",
    description: "Block shutdown of implementing agents before review completes",
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
    agents: ["Voss", "Szabo", "Knuth", "Deming", "Tufte", "Drucker", "Borges"],
    hooks: QUALITY_HOOKS.map((h) => h.label),
  },
};

export { PRESETS, ALL_AGENTS, QUALITY_HOOKS, INFRA_HOOKS };

/**
 * Main init flow.
 */
export async function run(targetDir: string, flags: string[] = []): Promise<void> {
  const isAll = flags.includes("--all");
  const presetFlag = flags.find((f) => f === "--preset" || f.startsWith("--preset="));
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

  // Guard: refuse to re-init if config already exists (use --force to override)
  const existingConfig = path.join(targetDir, ".dev-team", "config.json");
  if (fileExists(existingConfig) && !flags.includes("--force")) {
    console.error("Error: .dev-team/config.json already exists.");
    console.error("Use `npx dev-team update` to upgrade templates.");
    console.error("Pass `--force` to reinitialize (this will overwrite config).");
    process.exit(1);
  }

  console.log("\ndev-team — Adversarial AI agent team\n");
  if (preset) {
    console.log(`Using preset: ${preset.label} — ${preset.description}\n`);
  }

  // Step 1: Detect existing state
  const claudeDir = path.join(targetDir, ".claude");
  const devTeamDir = path.join(targetDir, ".dev-team");
  const agentsDir = path.join(claudeDir, "agents");
  const hooksDir = path.join(devTeamDir, "hooks");
  const memoryDir = path.join(claudeDir, "agent-memory");
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

  // Always include infrastructure hooks in config (they're always installed)
  selectedHooks.push(...INFRA_HOOKS.map((h) => h.label));

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

  // Step 6: Copy agents via adapter registry
  const templates = templateDir();
  let agentCount = 0;

  // Parse canonical definitions for selected agents
  const canonicalDefs = [];
  for (const agent of ALL_AGENTS) {
    if (!selectedAgents.includes(agent.label)) continue;

    const src = path.join(templates, "agents", agent.file);
    const content = readFile(src);
    if (!content) continue;

    const agentFileName = agent.file.replace(/\.md$/, ".agent.md");
    if (fileExists(path.join(agentsDir, agentFileName)) && !isAll && !preset) {
      const overwrite = await prompts.confirm(
        `  ${agentFileName} already exists. Overwrite?`,
        false,
      );
      if (!overwrite) continue;
    }

    canonicalDefs.push(parseAgentDefinition(content));
    agentCount++;
  }

  // Resolve runtimes from preferences (default: ["claude"])
  const runtimeFlag = flags.find((f) => f === "--runtime" || f.startsWith("--runtime="));
  let runtimes = ["claude"];
  if (runtimeFlag) {
    const idx = flags.indexOf(runtimeFlag);
    const runtimeValue = runtimeFlag.includes("=") ? runtimeFlag.split("=")[1] : flags[idx + 1];
    if (runtimeValue) {
      runtimes = runtimeValue.split(",").map((r) => r.trim());
    }
  }

  // Generate agent files for each configured runtime adapter
  const adapters = getAdaptersForRuntimes(runtimes);
  for (const adapter of adapters) {
    adapter.generate(canonicalDefs, targetDir);
  }

  // Step 7: Copy shared agent protocol (to runtime-native agents dir)
  const sharedSrc = path.join(templates, "agents", "SHARED.md");
  const sharedDest = path.join(agentsDir, "SHARED.md");
  copyFile(sharedSrc, sharedDest);

  // Step 8: Create agent memory directories
  for (const agent of ALL_AGENTS) {
    if (!selectedAgents.includes(agent.label)) continue;

    const agentName = agent.file.replace(".md", "");
    const memorySrc = path.join(templates, "agent-memory", agentName, "MEMORY.md");
    const memoryDest = path.join(memoryDir, agentName, "MEMORY.md");

    if (!fileExists(memoryDest)) {
      copyFile(memorySrc, memoryDest);
    }
  }

  // Step 9: Create shared team learnings (installed to .claude/rules/ for automatic agent context)
  const rulesDir = path.join(claudeDir, "rules");
  const learningsSrc = path.join(templates, "dev-team-learnings.md");
  const learningsDest = path.join(rulesDir, "dev-team-learnings.md");
  if (!fileExists(learningsDest)) {
    copyFile(learningsSrc, learningsDest);
  }

  // Step 9a: Install process file (installed to .claude/rules/ for automatic agent context)
  const processSrc = path.join(templates, "dev-team-process.md");
  const processDest = path.join(rulesDir, "dev-team-process.md");
  if (!fileExists(processDest)) {
    copyFile(processSrc, processDest);
  }

  // Step 9b: Create metrics log
  // Install destination must be .dev-team/metrics.md — skills (task, review, retro)
  // and agents (Borges, Drucker) reference this exact path for calibration metrics.
  const metricsSrc = path.join(templates, "dev-team-metrics.md");
  const metricsDest = path.join(devTeamDir, "metrics.md");
  if (!fileExists(metricsDest)) {
    copyFile(metricsSrc, metricsDest);
  }

  // Step 10: Copy hooks
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

  // Copy infrastructure hooks (always installed)
  for (const hook of INFRA_HOOKS) {
    const src = path.join(templates, "hooks", hook.file);
    const dest = path.join(hooksDir, hook.file);
    copyFile(src, dest);
  }

  // Copy shared hook support files (required by hooks at runtime)
  const hookLibSrc = path.join(templates, "hooks", "lib");
  if (dirExists(hookLibSrc)) {
    const libFiles = listFilesRecursive(hookLibSrc);
    for (const libFile of libFiles) {
      const relative = path.relative(hookLibSrc, libFile);
      copyFile(libFile, path.join(hooksDir, "lib", relative));
    }
  }

  // Step 11: Merge hook settings
  const settingsContent = readFile(path.join(templates, "settings.json"));
  if (!settingsContent) {
    throw new Error("Missing templates/settings.json");
  }
  const settingsTemplate: HookSettings = JSON.parse(settingsContent);

  // Filter settings to only include selected hooks + infrastructure hooks
  const filteredSettings: HookSettings = { hooks: {} };
  const infraHookFiles = INFRA_HOOKS.map((h) => h.file);
  const selectedHookFiles = [
    ...infraHookFiles,
    ...QUALITY_HOOKS.filter((h) => selectedHooks.includes(h.label)).map((h) => h.file),
  ];

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

  // Step 11a: Enable agent teams (experimental)
  const settingsData = JSON.parse(readFile(settingsPath) || "{}");
  if (!settingsData.env) {
    settingsData.env = {};
  }
  if (!("CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS" in settingsData.env)) {
    settingsData.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS = "1";
  }
  writeFile(settingsPath, JSON.stringify(settingsData, null, 2) + "\n");

  // Step 12: Copy framework skills directly to .claude/skills/ (no symlinks — ADR-038)
  const skillsSrcDir = path.join(templates, "skills");
  const claudeSkillsDir = path.join(claudeDir, "skills");
  const skillDirs = listSubdirectories(skillsSrcDir);
  for (const skillDir of skillDirs) {
    const src = path.join(skillsSrcDir, skillDir, "SKILL.md");
    const dest = path.join(claudeSkillsDir, skillDir, "SKILL.md");
    if (!fileExists(dest) || isAll) {
      copyFile(src, dest);
    }
  }

  // Step 13: Merge CLAUDE.md
  const claudeMdTemplate = readFile(path.join(templates, "CLAUDE.md"));
  if (!claudeMdTemplate) {
    throw new Error("Missing templates/CLAUDE.md");
  }
  const claudeResult = mergeClaudeMd(claudeMdPath, claudeMdTemplate);

  // Step 14: Save preferences
  const agentTeamsEnabled = settingsData.env?.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS === "1";
  const prefs: Record<string, unknown> = {
    version: getPackageVersion(),
    agents: selectedAgents,
    hooks: selectedHooks,
    runtimes,
    issueTracker,
    branchConvention,
    taskBranchPattern: "(feat|fix)\\/",
    platform: "github",
    agentTeams: agentTeamsEnabled,
    versioning: DEFAULT_VERSIONING,
    workflow: DEFAULT_WORKFLOW,
    pr: DEFAULT_PR_CONFIG,
  };
  if (preset) {
    prefs.preset = preset.label;
  }
  writeFile(prefsPath, JSON.stringify(prefs, null, 2) + "\n");

  // Step 15: Print summary
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

  // Step 16: Optional Deming tooling scan
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

  // Step 17: Skill recommendations
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
        console.log("  Install recommended skills from your Claude Code settings.");
        console.log("  These are suggestions only — skip any that don't apply.\n");
      }
    } else if (ecosystems.length > 0) {
      console.log("Skill scan: no matching skills found for your detected stack.\n");
    }
  }

  console.log("Next steps:");
  console.log("  1. Review installed agents in .claude/agents/");
  console.log("  2. Customize agent personas and focus areas to fit your project");
  if (!runScan) {
    console.log("  3. Run @dev-team-deming to scan for additional tooling recommendations");
  }
  console.log("");
}
