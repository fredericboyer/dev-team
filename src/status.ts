import path from "path";
import { fileExists, readFile, listSubdirectories } from "./files.js";

export function status(targetDir: string): void {
  const devTeamDir = path.join(targetDir, ".dev-team");
  const prefsPath = path.join(devTeamDir, "config.json");

  const prefsContent = readFile(prefsPath);
  if (!prefsContent) {
    console.error("Not a dev-team project. Run `npx dev-team init` first.");
    process.exit(1);
  }

  let prefs: Record<string, unknown>;
  try {
    prefs = JSON.parse(prefsContent);
  } catch {
    console.error("config.json is corrupted.");
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
  const skillsDir = path.join(devTeamDir, "skills");
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
  const memoryDir = path.join(devTeamDir, "agent-memory");
  for (const label of agents) {
    const dirName = `dev-team-${label.toLowerCase()}`;
    const memPath = path.join(memoryDir, dirName, "MEMORY.md");
    if (fileExists(memPath)) {
      try {
        const content = readFile(memPath) || "";
        // Detect actual structured entries rather than relying on file size
        const hasEntries = /### \[\d{4}-\d{2}-\d{2}\]/.test(content);
        console.log(`    ${label}: ${hasEntries ? "has learnings" : "empty (template only)"}`);
      } catch {
        console.log(`    ${label}: unknown`);
      }
    } else {
      console.log(`    ${label}: no memory file`);
    }
  }

  // Shared learnings
  const learningsPath = path.join(devTeamDir, "learnings.md");
  if (fileExists(learningsPath)) {
    try {
      const content = readFile(learningsPath) || "";
      // Check for content under section headers (not just the headers themselves)
      const sections = content.split(/^## /m).slice(1);
      const hasContent = sections.some((s) =>
        s
          .split("\n")
          .slice(1)
          .some((l) => l.trim() !== "" && !l.startsWith("<!--")),
      );
      console.log(`    Shared learnings: ${hasContent ? "has content" : "template only"}`);
    } catch {
      console.log(`    Shared learnings: unknown`);
    }
  }

  console.log("");
}
