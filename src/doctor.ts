import path from "path";
import { fileExists, dirExists, readFile } from "./files.js";

interface CheckResult {
  name: string;
  pass: boolean;
  detail: string;
}

export function doctor(targetDir: string): void {
  console.log("\ndev-team doctor — Installation health check\n");

  const devTeamDir = path.join(targetDir, ".dev-team");
  const results: CheckResult[] = [];

  // 1. config.json exists and is valid
  const prefsPath = path.join(devTeamDir, "config.json");
  const prefsContent = readFile(prefsPath);
  let prefs: { version?: string; agents?: string[]; hooks?: string[] } | null = null;
  if (!prefsContent) {
    results.push({ name: "config.json", pass: false, detail: "Not found" });
  } else {
    try {
      prefs = JSON.parse(prefsContent);
      results.push({ name: "config.json", pass: true, detail: `v${prefs!.version}` });
    } catch {
      results.push({ name: "config.json", pass: false, detail: "Invalid JSON" });
    }
  }

  // 2. Agent files exist
  if (prefs?.agents) {
    const agentsDir = path.join(devTeamDir, "agents");
    for (const label of prefs.agents) {
      // Convert label to filename pattern
      const fileName = `dev-team-${label.toLowerCase()}.md`;
      const exists = fileExists(path.join(agentsDir, fileName));
      results.push({
        name: `Agent: ${label}`,
        pass: exists,
        detail: exists ? fileName : `${fileName} missing`,
      });
    }
  }

  // 3. Hook files exist
  if (prefs?.hooks) {
    const hooksDir = path.join(devTeamDir, "hooks");
    const hookFileMap: Record<string, string> = {
      "TDD enforcement": "dev-team-tdd-enforce.js",
      "Safety guard": "dev-team-safety-guard.js",
      "Post-change review": "dev-team-post-change-review.js",
      "Pre-commit gate": "dev-team-pre-commit-gate.js",
      "Watch list": "dev-team-watch-list.js",
      "Pre-commit lint": "dev-team-pre-commit-lint.js",
      "Review gate": "dev-team-review-gate.js",
    };
    for (const label of prefs.hooks) {
      const fileName = hookFileMap[label];
      if (!fileName) {
        results.push({ name: `Hook: ${label}`, pass: false, detail: "Unknown hook" });
        continue;
      }
      const exists = fileExists(path.join(hooksDir, fileName));
      results.push({
        name: `Hook: ${label}`,
        pass: exists,
        detail: exists ? fileName : `${fileName} missing`,
      });
    }
  }

  // 4. CLAUDE.md has dev-team markers
  const claudeMdPath = path.join(targetDir, "CLAUDE.md");
  const claudeMd = readFile(claudeMdPath);
  if (!claudeMd) {
    results.push({ name: "CLAUDE.md", pass: false, detail: "Not found" });
  } else if (!claudeMd.includes("<!-- dev-team:begin -->")) {
    results.push({ name: "CLAUDE.md", pass: false, detail: "Missing dev-team markers" });
  } else {
    results.push({ name: "CLAUDE.md", pass: true, detail: "Markers present" });
  }

  // 5. Agent memory directories
  if (prefs?.agents) {
    const memoryDir = path.join(devTeamDir, "agent-memory");
    for (const label of prefs.agents) {
      const dirName = `dev-team-${label.toLowerCase()}`;
      const memPath = path.join(memoryDir, dirName, "MEMORY.md");
      const exists = fileExists(memPath);
      results.push({
        name: `Memory: ${label}`,
        pass: exists,
        detail: exists ? "MEMORY.md present" : "MEMORY.md missing",
      });
    }
  }

  // Print results
  const passed = results.filter((r) => r.pass).length;
  const failed = results.filter((r) => !r.pass).length;

  for (const r of results) {
    const icon = r.pass ? "  OK" : "  FAIL";
    console.log(`${icon}  ${r.name} — ${r.detail}`);
  }

  console.log(`\n${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
}
