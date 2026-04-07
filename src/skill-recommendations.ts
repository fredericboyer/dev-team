import fs from "fs";
import path from "path";
import { fileExists, listSubdirectories, readFile, templateDir } from "./files.js";

export interface SkillRecommendation {
  id: string;
  name: string;
  description: string;
  source: string;
  detectedBy: string;
}

interface SkillEntry {
  id: string;
  name: string;
  description: string;
  source: string;
  detectDeps: string[];
  detectFiles: string[];
  ecosystem: string;
}

interface EcosystemEntry {
  detectFiles: string[];
  label: string;
}

interface SkillCatalog {
  ecosystems: Record<string, EcosystemEntry>;
  skills: SkillEntry[];
}

/**
 * Loads the skill recommendations catalog from templates/.
 */
export function loadCatalog(): SkillCatalog {
  const catalogPath = path.join(templateDir(), "skill-recommendations.json");
  const content = readFile(catalogPath);
  if (!content) {
    throw new Error("Missing templates/skill-recommendations.json");
  }
  return JSON.parse(content) as SkillCatalog;
}

/**
 * Detects which ecosystems are present in a project directory.
 * Returns an array of ecosystem keys (e.g., ["node", "python"]).
 */
export function detectEcosystems(targetDir: string, catalog: SkillCatalog): string[] {
  const detected: string[] = [];

  for (const [key, eco] of Object.entries(catalog.ecosystems)) {
    const found = eco.detectFiles.some((f) => {
      if (f.startsWith("*")) {
        // Glob pattern — check if any file in targetDir matches the extension
        const ext = f.slice(1); // e.g., ".csproj"
        try {
          return fs.readdirSync(targetDir).some((entry: string) => entry.endsWith(ext));
        } catch {
          return false;
        }
      }
      return fileExists(path.join(targetDir, f));
    });
    if (found) {
      detected.push(key);
    }
  }

  return detected;
}

/**
 * Parses dependencies from ecosystem-specific manifest files.
 * Returns a set of dependency names found across all detected ecosystems.
 */
export function parseDependencies(targetDir: string, ecosystems: string[]): Set<string> {
  const deps = new Set<string>();

  if (ecosystems.includes("node")) {
    parseNodeDeps(targetDir, deps);
  }
  if (ecosystems.includes("python")) {
    parsePythonDeps(targetDir, deps);
  }
  if (ecosystems.includes("ruby")) {
    parseRubyDeps(targetDir, deps);
  }
  if (ecosystems.includes("go")) {
    parseGoDeps(targetDir, deps);
  }
  if (ecosystems.includes("rust")) {
    parseRustDeps(targetDir, deps);
  }
  if (ecosystems.includes("java")) {
    parseJavaDeps(targetDir, deps);
  }
  if (ecosystems.includes("elixir")) {
    parseElixirDeps(targetDir, deps);
  }
  if (ecosystems.includes("dotnet")) {
    parseDotnetDeps(targetDir, deps);
  }

  return deps;
}

function parseNodeDeps(targetDir: string, deps: Set<string>): void {
  const content = readFile(path.join(targetDir, "package.json"));
  if (!content) return;

  try {
    const pkg = JSON.parse(content);
    for (const key of ["dependencies", "devDependencies", "peerDependencies"]) {
      if (pkg[key]) {
        for (const dep of Object.keys(pkg[key])) {
          deps.add(dep);
        }
      }
    }
  } catch {
    // Invalid JSON — skip
  }
}

function parsePythonDeps(targetDir: string, deps: Set<string>): void {
  // requirements.txt
  const reqContent = readFile(path.join(targetDir, "requirements.txt"));
  if (reqContent) {
    for (const line of reqContent.split("\n")) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#") && !trimmed.startsWith("-")) {
        // Extract package name before version specifier
        const match = trimmed.match(/^([a-zA-Z0-9_-]+)/);
        if (match) {
          deps.add(match[1].toLowerCase());
        }
      }
    }
  }

  // pyproject.toml — lightweight parsing for [project] dependencies
  const pyprojectContent = readFile(path.join(targetDir, "pyproject.toml"));
  if (pyprojectContent) {
    // Match dependencies = ["django>=4.0", "fastapi", ...]
    const depsMatch = pyprojectContent.match(/dependencies\s*=\s*\[([\s\S]*?)\]/);
    if (depsMatch) {
      const entries = depsMatch[1].match(/"([^"]+)"/g);
      if (entries) {
        for (const entry of entries) {
          const name = entry.replace(/"/g, "").match(/^([a-zA-Z0-9_-]+)/);
          if (name) {
            deps.add(name[1].toLowerCase());
          }
        }
      }
    }
  }

  // Pipfile — lightweight parsing
  const pipfileContent = readFile(path.join(targetDir, "Pipfile"));
  if (pipfileContent) {
    const lines = pipfileContent.split("\n");
    let inPackages = false;
    for (const line of lines) {
      if (line.match(/^\[packages\]/) || line.match(/^\[dev-packages\]/)) {
        inPackages = true;
        continue;
      }
      if (line.match(/^\[/) && inPackages) {
        inPackages = false;
        continue;
      }
      if (inPackages) {
        const match = line.match(/^([a-zA-Z0-9_-]+)\s*=/);
        if (match) {
          deps.add(match[1].toLowerCase());
        }
      }
    }
  }
}

function parseRubyDeps(targetDir: string, deps: Set<string>): void {
  const content = readFile(path.join(targetDir, "Gemfile"));
  if (!content) return;

  for (const line of content.split("\n")) {
    // Match: gem 'rails', '~> 7.0' or gem "rails"
    const match = line.match(/^\s*gem\s+['"]([a-zA-Z0-9_-]+)['"]/);
    if (match) {
      deps.add(match[1]);
    }
  }
}

function parseGoDeps(targetDir: string, deps: Set<string>): void {
  const content = readFile(path.join(targetDir, "go.mod"));
  if (!content) return;

  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    // Match require lines: github.com/foo/bar v1.2.3
    if (trimmed && !trimmed.startsWith("//") && !trimmed.startsWith("module")) {
      const match = trimmed.match(/^([^\s]+)\s+v/);
      if (match) {
        deps.add(match[1]);
      }
    }
  }
}

function parseRustDeps(targetDir: string, deps: Set<string>): void {
  const content = readFile(path.join(targetDir, "Cargo.toml"));
  if (!content) return;

  const lines = content.split("\n");
  let inDeps = false;
  for (const line of lines) {
    if (
      line.match(/^\[dependencies\]/) ||
      line.match(/^\[dev-dependencies\]/) ||
      line.match(/^\[build-dependencies\]/)
    ) {
      inDeps = true;
      continue;
    }
    if (line.match(/^\[/) && inDeps) {
      inDeps = false;
      continue;
    }
    if (inDeps) {
      const match = line.match(/^([a-zA-Z0-9_-]+)\s*=/);
      if (match) {
        deps.add(match[1]);
      }
    }
  }
}

function parseJavaDeps(targetDir: string, deps: Set<string>): void {
  // pom.xml — lightweight parsing for artifactId
  const pomContent = readFile(path.join(targetDir, "pom.xml"));
  if (pomContent) {
    for (const match of pomContent.matchAll(/<artifactId>([^<]+)<\/artifactId>/g)) {
      deps.add(match[1]);
    }
  }

  // build.gradle — lightweight parsing for implementation/api deps
  for (const gradleFile of ["build.gradle", "build.gradle.kts"]) {
    const gradleContent = readFile(path.join(targetDir, gradleFile));
    if (gradleContent) {
      for (const match of gradleContent.matchAll(
        /(?:implementation|api|compileOnly|testImplementation)\s*[("']+([^"')]+)/g,
      )) {
        const parts = match[1].split(":");
        if (parts.length >= 2) {
          deps.add(parts[1]);
        }
      }
    }
  }
}

function parseElixirDeps(targetDir: string, deps: Set<string>): void {
  const content = readFile(path.join(targetDir, "mix.exs"));
  if (!content) return;

  for (const match of content.matchAll(/\{:([a-zA-Z0-9_]+)\s*,/g)) {
    deps.add(match[1]);
  }
}

function parseDotnetDeps(targetDir: string, deps: Set<string>): void {
  const dirs = [targetDir, ...listSubdirectories(targetDir).map((d) => path.join(targetDir, d))];

  for (const dir of dirs) {
    let files: string[];
    try {
      files = fs.readdirSync(dir).filter((f: string) => f.endsWith(".csproj"));
    } catch {
      continue;
    }
    for (const file of files) {
      const content = readFile(path.join(dir, file));
      if (!content) continue;

      for (const match of content.matchAll(/<PackageReference\s+Include="([^"]+)"/g)) {
        deps.add(match[1]);
      }
    }
  }
}

/**
 * Matches detected project state against the skill catalog.
 * Returns recommended skills with the reason they were detected.
 */
export function matchSkills(
  targetDir: string,
  catalog: SkillCatalog,
  ecosystems: string[],
  dependencies: Set<string>,
): SkillRecommendation[] {
  const recommendations: SkillRecommendation[] = [];

  for (const skill of catalog.skills) {
    // Skip if ecosystem doesn't match
    if (!ecosystems.includes(skill.ecosystem)) {
      continue;
    }

    // Check dependency matches
    const depMatch = skill.detectDeps.find((dep) => dependencies.has(dep));
    if (depMatch) {
      recommendations.push({
        id: skill.id,
        name: skill.name,
        description: skill.description,
        source: skill.source,
        detectedBy: `dependency: ${depMatch}`,
      });
      continue;
    }

    // Check file matches
    const fileMatch = skill.detectFiles.find((f) => fileExists(path.join(targetDir, f)));
    if (fileMatch) {
      recommendations.push({
        id: skill.id,
        name: skill.name,
        description: skill.description,
        source: skill.source,
        detectedBy: `file: ${fileMatch}`,
      });
    }
  }

  return recommendations;
}

/**
 * Formats skill recommendations as a human-readable report.
 */
export function formatRecommendations(
  recommendations: SkillRecommendation[],
  ecosystems: string[],
  catalog: SkillCatalog,
): string {
  const lines: string[] = [];
  lines.push("Skill recommendations\n");

  if (ecosystems.length > 0) {
    const ecoLabels = ecosystems.map((e) => catalog.ecosystems[e]?.label || e).join(", ");
    lines.push(`  Detected stack: ${ecoLabels}\n`);
  }

  if (recommendations.length === 0) {
    lines.push("  No matching skills found for your project's dependencies.");
    return lines.join("\n");
  }

  for (const rec of recommendations) {
    lines.push(`  [SKILL] ${rec.name}`);
    lines.push(`          ${rec.description}`);
    lines.push(`          Source: ${rec.source} | Detected via ${rec.detectedBy}`);
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Full scan: detect ecosystems, parse deps, match skills, return recommendations.
 * This is the main entry point used by init.ts.
 */
export function scanSkillRecommendations(targetDir: string): {
  recommendations: SkillRecommendation[];
  ecosystems: string[];
  catalog: SkillCatalog;
} {
  const catalog = loadCatalog();
  const ecosystems = detectEcosystems(targetDir, catalog);
  const dependencies = parseDependencies(targetDir, ecosystems);
  const recommendations = matchSkills(targetDir, catalog, ecosystems, dependencies);

  return { recommendations, ecosystems, catalog };
}
