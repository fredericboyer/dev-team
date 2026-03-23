import path from "path";
import { fileExists, readFile, dirExists } from "./files";

export interface ScanFinding {
  category: "linter" | "formatter" | "sast" | "ci" | "dependency" | "enforcement";
  status: "found" | "missing" | "outdated" | "gap";
  tool: string;
  recommendation: string;
}

/**
 * Scans a project directory for existing tooling and identifies gaps.
 * Returns a list of findings with actionable recommendations.
 */
export function scanProject(targetDir: string): ScanFinding[] {
  const findings: ScanFinding[] = [];

  // Linters
  const linters: Array<{ file: string; tool: string }> = [
    { file: ".eslintrc.js", tool: "ESLint" },
    { file: ".eslintrc.json", tool: "ESLint" },
    { file: ".eslintrc.yml", tool: "ESLint" },
    { file: "eslint.config.js", tool: "ESLint (flat config)" },
    { file: "eslint.config.mjs", tool: "ESLint (flat config)" },
    { file: "biome.json", tool: "Biome" },
    { file: ".pylintrc", tool: "pylint" },
    { file: "setup.cfg", tool: "flake8/pylint" },
    { file: "pyproject.toml", tool: "ruff/pylint" },
    { file: ".rubocop.yml", tool: "RuboCop" },
    { file: ".golangci.yml", tool: "golangci-lint" },
  ];

  const foundLinter = linters.find((l) => fileExists(path.join(targetDir, l.file)));
  if (foundLinter) {
    findings.push({
      category: "linter",
      status: "found",
      tool: foundLinter.tool,
      recommendation: `${foundLinter.tool} detected. Consider adding a PostToolUse hook to run it on file save for immediate feedback.`,
    });
  } else {
    // Check package.json for lint script
    const pkg = readFile(path.join(targetDir, "package.json"));
    if (pkg && pkg.includes('"lint"')) {
      findings.push({
        category: "linter",
        status: "found",
        tool: "npm lint script",
        recommendation:
          "Lint script found in package.json. Consider adding a PostToolUse hook to run it automatically.",
      });
    } else {
      findings.push({
        category: "linter",
        status: "missing",
        tool: "none",
        recommendation:
          "No linter detected. Add ESLint, Biome, or a language-appropriate linter to catch issues early.",
      });
    }
  }

  // Formatters
  const formatters: Array<{ file: string; tool: string }> = [
    { file: ".prettierrc", tool: "Prettier" },
    { file: ".prettierrc.js", tool: "Prettier" },
    { file: ".prettierrc.json", tool: "Prettier" },
    { file: "prettier.config.js", tool: "Prettier" },
    { file: ".editorconfig", tool: "EditorConfig" },
    { file: "biome.json", tool: "Biome" },
    { file: "rustfmt.toml", tool: "rustfmt" },
    { file: ".clang-format", tool: "clang-format" },
  ];

  const foundFormatter = formatters.find((f) => fileExists(path.join(targetDir, f.file)));
  if (foundFormatter) {
    findings.push({
      category: "formatter",
      status: "found",
      tool: foundFormatter.tool,
      recommendation: `${foundFormatter.tool} detected. Consider a pre-commit hook or PostToolUse hook to auto-format on save.`,
    });
  } else {
    findings.push({
      category: "formatter",
      status: "missing",
      tool: "none",
      recommendation:
        "No formatter detected. Add Prettier, Biome, or a language-appropriate formatter to enforce consistent style.",
    });
  }

  // SAST / Security scanning
  const sastConfigs: Array<{ file: string; tool: string }> = [
    { file: ".semgrep.yml", tool: "Semgrep" },
    { file: ".semgrep", tool: "Semgrep" },
    { file: ".snyk", tool: "Snyk" },
    { file: ".trivyignore", tool: "Trivy" },
    { file: "sonar-project.properties", tool: "SonarQube" },
    { file: ".bandit", tool: "Bandit" },
    { file: ".safety-policy.yml", tool: "Safety" },
  ];

  const foundSast = sastConfigs.find((s) => fileExists(path.join(targetDir, s.file)));
  if (foundSast) {
    findings.push({
      category: "sast",
      status: "found",
      tool: foundSast.tool,
      recommendation: `${foundSast.tool} detected. Ensure it runs in CI and consider adding @dev-team-szabo for complementary AI-driven security review.`,
    });
  } else {
    findings.push({
      category: "sast",
      status: "missing",
      tool: "none",
      recommendation:
        "No SAST tool detected. Consider adding Semgrep, Snyk, or language-appropriate static analysis. @dev-team-szabo provides AI review but does not replace automated scanning.",
    });
  }

  // CI/CD
  const ciConfigs: Array<{ path: string; tool: string }> = [
    { path: ".github/workflows", tool: "GitHub Actions" },
    { path: ".gitlab-ci.yml", tool: "GitLab CI" },
    { path: ".circleci", tool: "CircleCI" },
    { path: "Jenkinsfile", tool: "Jenkins" },
    { path: ".travis.yml", tool: "Travis CI" },
    { path: "azure-pipelines.yml", tool: "Azure Pipelines" },
    { path: "bitbucket-pipelines.yml", tool: "Bitbucket Pipelines" },
  ];

  const foundCi = ciConfigs.find((c) => {
    const fullPath = path.join(targetDir, c.path);
    return fileExists(fullPath) || dirExists(fullPath);
  });

  if (foundCi) {
    findings.push({
      category: "ci",
      status: "found",
      tool: foundCi.tool,
      recommendation: `${foundCi.tool} detected. Verify it runs lint, format check, tests, and security scans. Consider parallel steps for independent jobs.`,
    });
  } else {
    findings.push({
      category: "ci",
      status: "missing",
      tool: "none",
      recommendation:
        "No CI/CD pipeline detected. Add GitHub Actions, GitLab CI, or equivalent. At minimum: lint, format check, and test steps.",
    });
  }

  // Dependency audit
  const lockFiles: Array<{ file: string; tool: string }> = [
    { file: "package-lock.json", tool: "npm audit" },
    { file: "yarn.lock", tool: "yarn audit" },
    { file: "pnpm-lock.yaml", tool: "pnpm audit" },
    { file: "Gemfile.lock", tool: "bundle audit" },
    { file: "poetry.lock", tool: "pip-audit / safety" },
    { file: "Cargo.lock", tool: "cargo audit" },
    { file: "go.sum", tool: "govulncheck" },
  ];

  const foundLock = lockFiles.find((l) => fileExists(path.join(targetDir, l.file)));
  if (foundLock) {
    findings.push({
      category: "dependency",
      status: "found",
      tool: foundLock.tool,
      recommendation: `Lock file detected (${foundLock.file}). Run \`${foundLock.tool}\` regularly and add it to CI.`,
    });
  }

  // Enforcement gap detection: CI checks vs local hook coverage
  const ciScripts = parseCiScripts(targetDir);
  const hookCommands = parseHookCommands(targetDir);

  const coverageMappings: Array<{
    scriptNames: string[];
    hookFile: string;
    partial?: boolean;
    partialReason?: string;
  }> = [
    { scriptNames: ["lint"], hookFile: "dev-team-pre-commit-lint.js" },
    { scriptNames: ["format:check"], hookFile: "dev-team-pre-commit-lint.js" },
    {
      scriptNames: ["test"],
      hookFile: "dev-team-tdd-enforce.js",
      partial: true,
      partialReason: "hook ensures tests exist but does not run them",
    },
  ];

  for (const scriptName of ciScripts) {
    const mapping = coverageMappings.find((m) => m.scriptNames.includes(scriptName));

    if (!mapping) {
      findings.push({
        category: "enforcement",
        status: "gap",
        tool: scriptName,
        recommendation: `CI runs "${scriptName}" but no local hook enforces it. Add a hook or accept the delayed feedback.`,
      });
      continue;
    }

    const hookPresent = hookCommands.some((cmd) => cmd.includes(mapping.hookFile));

    if (!hookPresent) {
      findings.push({
        category: "enforcement",
        status: "gap",
        tool: scriptName,
        recommendation: `CI runs "${scriptName}" but the corresponding hook (${mapping.hookFile}) is not installed. Run dev-team init to add it.`,
      });
    } else if (mapping.partial) {
      findings.push({
        category: "enforcement",
        status: "found",
        tool: scriptName,
        recommendation: `CI runs "${scriptName}" \u2014 partially covered by ${mapping.hookFile} (${mapping.partialReason}).`,
      });
    } else {
      findings.push({
        category: "enforcement",
        status: "found",
        tool: scriptName,
        recommendation: `CI runs "${scriptName}" \u2014 covered locally by ${mapping.hookFile}.`,
      });
    }
  }

  return findings;
}

/**
 * Formats scan findings as a human-readable report.
 */
export function formatScanReport(findings: ScanFinding[]): string {
  const lines: string[] = [];
  lines.push("Deming scan — Project tooling assessment\n");

  const missing = findings.filter((f) => f.status === "missing");
  const found = findings.filter((f) => f.status === "found");
  const gaps = findings.filter((f) => f.status === "gap");

  if (missing.length === 0 && gaps.length === 0) {
    lines.push("  All checked tooling categories are covered.\n");
  }

  for (const f of found) {
    lines.push(`  [OK]      ${f.category}: ${f.tool}`);
  }
  for (const f of missing) {
    lines.push(`  [MISSING] ${f.category}: ${f.recommendation}`);
  }
  for (const f of gaps) {
    lines.push(`  [GAP]     ${f.category}: ${f.recommendation}`);
  }

  if (missing.length > 0 || gaps.length > 0) {
    lines.push("\n  Tip: Run @dev-team-deming for deeper analysis and automated setup.");
  }

  return lines.join("\n");
}

/**
 * Parses package.json scripts to find CI-relevant check names.
 * Returns script names for: lint, format:check, test, typecheck, build.
 */
export function parseCiScripts(targetDir: string): string[] {
  const ciRelevantScripts = ["lint", "format:check", "test", "typecheck", "build"];
  const pkgContent = readFile(path.join(targetDir, "package.json"));
  if (!pkgContent) return [];

  try {
    const pkg = JSON.parse(pkgContent);
    const scripts = pkg.scripts || {};
    return ciRelevantScripts.filter((name) => name in scripts);
  } catch {
    return [];
  }
}

/**
 * Parses .claude/settings.json to extract all hook command strings.
 * Returns an array of command strings found across all hook events.
 */
export function parseHookCommands(targetDir: string): string[] {
  const settingsContent = readFile(path.join(targetDir, ".claude", "settings.json"));
  if (!settingsContent) return [];

  try {
    const settings = JSON.parse(settingsContent);
    const hooks = settings.hooks || {};
    const commands: string[] = [];

    for (const matchers of Object.values(hooks) as Array<
      Array<{ hooks?: Array<{ command?: string }> }>
    >) {
      for (const matcher of matchers) {
        for (const hook of matcher.hooks || []) {
          if (hook.command) {
            commands.push(hook.command);
          }
        }
      }
    }

    return commands;
  } catch {
    return [];
  }
}
