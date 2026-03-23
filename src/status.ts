import path from "path";
import fs from "fs";
import { fileExists, readFile, listSubdirectories } from "./files";

export function status(targetDir: string): void {
  const claudeDir = path.join(targetDir, ".claude");
  const prefsPath = path.join(claudeDir, "dev-team.json");

  const prefsContent = readFile(prefsPath);
  if (!prefsContent) {
    console.error("Not a dev-team project. Run `npx dev-team init` first.");
    process.exit(1);
  }

  let prefs: Record<string, unknown>;
  try {
    prefs = JSON.parse(prefsContent);
  } catch {
    console.error("dev-team.json is corrupted.");
    process.exit(1);
  }

  console.log("\ndev-team status\n");

  // Version and preset
  console.log(`  Version:  v${prefs.version}`);
  if (prefs.preset) {
    console.log(`  Preset:   ${prefs.preset}`);
  }

  // Agents
  const agents = (prefs.agents as string[]) || [];
  console.log(`  Agents:   ${agents.join(", ")} (${agents.length})`);

  // Hooks
  const hooks = (prefs.hooks as string[]) || [];
  console.log(`  Hooks:    ${hooks.join(", ")} (${hooks.length})`);

  // Skills (auto-discovered)
  const skillsDir = path.join(claudeDir, "skills");
  const skills = listSubdirectories(skillsDir).map((s) => s.replace("dev-team-", ""));
  console.log(`  Skills:   ${skills.length > 0 ? skills.join(", ") : "none"} (${skills.length})`);

  // Workflow
  if (prefs.issueTracker) {
    console.log(`  Tracker:  ${prefs.issueTracker}`);
  }
  if (prefs.branchConvention && prefs.branchConvention !== "None") {
    console.log(`  Branches: ${prefs.branchConvention}`);
  }

  // Memory status
  console.log("\n  Memory:");
  const memoryDir = path.join(claudeDir, "agent-memory");
  for (const label of agents) {
    const dirName = `dev-team-${label.toLowerCase()}`;
    const memPath = path.join(memoryDir, dirName, "MEMORY.md");
    if (fileExists(memPath)) {
      try {
        const stat = fs.statSync(memPath);
        const hasContent = stat.size > 200; // Template is ~200 bytes
        console.log(`    ${label}: ${hasContent ? "has learnings" : "empty (template only)"}`);
      } catch {
        console.log(`    ${label}: unknown`);
      }
    } else {
      console.log(`    ${label}: no memory file`);
    }
  }

  // Shared learnings
  const learningsPath = path.join(claudeDir, "dev-team-learnings.md");
  if (fileExists(learningsPath)) {
    try {
      const stat = fs.statSync(learningsPath);
      console.log(`    Shared learnings: ${stat.size > 300 ? "has content" : "template only"}`);
    } catch {
      console.log(`    Shared learnings: unknown`);
    }
  }

  console.log("");
}
