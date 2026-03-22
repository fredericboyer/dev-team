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
} from "./files";
import type { HookSettings, HookMatcher } from "./files";
import * as prompts from "./prompts";
import { scanProject, formatScanReport } from "./scan";

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
    label: "Docs",
    file: "dev-team-docs.md",
    description: "Documentation Engineer",
  },
  {
    label: "Architect",
    file: "dev-team-architect.md",
    description: "Architect",
  },
  {
    label: "Release",
    file: "dev-team-release.md",
    description: "Release Manager",
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
    description: "Remind about reviews before committing",
  },
  {
    label: "Task loop",
    file: "dev-team-task-loop.js",
    description: "Iterative task loop with adversarial review gates",
  },
];

/**
 * Main init flow.
 */
export async function run(targetDir: string, flags: string[] = []): Promise<void> {
  const isAll = flags.includes("--all");

  console.log("\ndev-team — Adversarial AI agent team\n");

  // Step 1: Detect existing state
  const claudeDir = path.join(targetDir, ".claude");
  const agentsDir = path.join(claudeDir, "agents");
  const hooksDir = path.join(claudeDir, "hooks");
  const skillsDir = path.join(claudeDir, "skills");
  const memoryDir = path.join(claudeDir, "agent-memory");
  const settingsPath = path.join(claudeDir, "settings.json");
  const claudeMdPath = path.join(targetDir, "CLAUDE.md");
  const prefsPath = path.join(claudeDir, "dev-team.json");

  console.log("Detected:");
  console.log(`  .claude/ directory: ${dirExists(claudeDir) ? "exists" : "will be created"}`);
  console.log(
    `  CLAUDE.md: ${fileExists(claudeMdPath) ? "exists (will merge)" : "will be created"}`,
  );
  console.log("");

  // Step 2: Agent selection
  let selectedAgents: string[];
  if (isAll) {
    selectedAgents = ALL_AGENTS.map((a) => a.label);
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
  if (isAll) {
    selectedHooks = QUALITY_HOOKS.map((h) => h.label);
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
  if (isAll) {
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
  if (isAll) {
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

    if (fileExists(dest) && !isAll) {
      const overwrite = await prompts.confirm(`  ${agent.file} already exists. Overwrite?`, false);
      if (!overwrite) continue;
    }

    copyFile(src, dest);
    agentCount++;
  }

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
  const learningsDest = path.join(claudeDir, "dev-team-learnings.md");
  if (!fileExists(learningsDest)) {
    copyFile(learningsSrc, learningsDest);
  }

  // Step 7: Copy hooks
  let hookCount = 0;

  for (const hook of QUALITY_HOOKS) {
    if (!selectedHooks.includes(hook.label)) continue;

    const src = path.join(templates, "hooks", hook.file);
    const dest = path.join(hooksDir, hook.file);

    if (fileExists(dest) && !isAll) {
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

  // Step 9: Copy skills
  const skillsSrcDir = path.join(templates, "skills");
  const skillDirs = ["dev-team-challenge", "dev-team-task", "dev-team-review", "dev-team-audit"];
  for (const skillDir of skillDirs) {
    const src = path.join(skillsSrcDir, skillDir, "SKILL.md");
    const dest = path.join(skillsDir, skillDir, "SKILL.md");
    if (!fileExists(dest) || isAll) {
      copyFile(src, dest);
    }
  }

  // Step 10: Merge CLAUDE.md
  const claudeMdTemplate = readFile(path.join(templates, "CLAUDE.md"));
  if (!claudeMdTemplate) {
    throw new Error("Missing templates/CLAUDE.md");
  }
  const claudeResult = mergeClaudeMd(claudeMdPath, claudeMdTemplate);

  // Save preferences
  const prefs = {
    version: "0.1.0",
    agents: selectedAgents,
    hooks: selectedHooks,
    issueTracker,
    branchConvention,
  };
  writeFile(prefsPath, JSON.stringify(prefs, null, 2) + "\n");

  // Step 11: Print summary
  console.log("\nDone! Installed:\n");
  console.log(`  Agents:    ${selectedAgents.join(", ")} (${agentCount} files)`);
  console.log(`  Hooks:     ${selectedHooks.join(", ")} (${hookCount} files)`);
  console.log("  Skills:    challenge, task, review, audit");
  console.log(`  Memory:    ${selectedAgents.length} agent memories + shared learnings`);
  console.log(`  CLAUDE.md: ${claudeResult}`);
  console.log(`  Settings:  ${settingsPath}`);
  console.log(
    `  Workflow:  ${issueTracker}${branchConvention !== "None" ? `, branches: ${branchConvention}` : ""}`,
  );
  console.log("");

  // Step 12: Optional Deming tooling scan
  let runScan = isAll;
  if (!isAll) {
    runScan = await prompts.confirm("Run Deming tooling scan to check for linters, SAST, and CI gaps?", true);
  }

  if (runScan) {
    const findings = scanProject(targetDir);
    console.log(formatScanReport(findings));
    console.log("");
  }

  console.log("Next steps:");
  console.log("  1. Review installed agents in .claude/agents/");
  console.log("  2. Customize agent personas and focus areas to fit your project");
  if (!runScan) {
    console.log("  3. Run @dev-team-deming to scan for additional tooling recommendations");
  }
  console.log("");
}
