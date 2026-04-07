"use strict";

const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const os = require("os");

const {
  detectEcosystems,
  parseDependencies,
  matchSkills,
  formatRecommendations,
  loadCatalog,
  scanSkillRecommendations,
} = require("../../dist/skill-recommendations");

let tmpDir;
let catalog;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "dev-team-skills-"));
  catalog = loadCatalog();
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// --- Ecosystem detection ---

describe("detectEcosystems", () => {
  it("detects Node.js from package.json", () => {
    fs.writeFileSync(path.join(tmpDir, "package.json"), "{}");
    const ecosystems = detectEcosystems(tmpDir, catalog);
    assert.ok(ecosystems.includes("node"));
  });

  it("detects Python from requirements.txt", () => {
    fs.writeFileSync(path.join(tmpDir, "requirements.txt"), "flask\n");
    const ecosystems = detectEcosystems(tmpDir, catalog);
    assert.ok(ecosystems.includes("python"));
  });

  it("detects Python from pyproject.toml", () => {
    fs.writeFileSync(path.join(tmpDir, "pyproject.toml"), "[project]\n");
    const ecosystems = detectEcosystems(tmpDir, catalog);
    assert.ok(ecosystems.includes("python"));
  });

  it("detects Ruby from Gemfile", () => {
    fs.writeFileSync(path.join(tmpDir, "Gemfile"), "source 'https://rubygems.org'\n");
    const ecosystems = detectEcosystems(tmpDir, catalog);
    assert.ok(ecosystems.includes("ruby"));
  });

  it("detects Go from go.mod", () => {
    fs.writeFileSync(path.join(tmpDir, "go.mod"), "module example.com/app\n");
    const ecosystems = detectEcosystems(tmpDir, catalog);
    assert.ok(ecosystems.includes("go"));
  });

  it("detects Rust from Cargo.toml", () => {
    fs.writeFileSync(path.join(tmpDir, "Cargo.toml"), '[package]\nname = "app"\n');
    const ecosystems = detectEcosystems(tmpDir, catalog);
    assert.ok(ecosystems.includes("rust"));
  });

  it("detects Java from pom.xml", () => {
    fs.writeFileSync(path.join(tmpDir, "pom.xml"), "<project></project>");
    const ecosystems = detectEcosystems(tmpDir, catalog);
    assert.ok(ecosystems.includes("java"));
  });

  it("detects Java from build.gradle", () => {
    fs.writeFileSync(path.join(tmpDir, "build.gradle"), "plugins { }");
    const ecosystems = detectEcosystems(tmpDir, catalog);
    assert.ok(ecosystems.includes("java"));
  });

  it("detects Elixir from mix.exs", () => {
    fs.writeFileSync(path.join(tmpDir, "mix.exs"), "defmodule MyApp.MixProject do\nend\n");
    const ecosystems = detectEcosystems(tmpDir, catalog);
    assert.ok(ecosystems.includes("elixir"));
  });

  it("detects C#/.NET from .csproj file", () => {
    fs.writeFileSync(path.join(tmpDir, "MyApp.csproj"), "<Project></Project>");
    const ecosystems = detectEcosystems(tmpDir, catalog);
    assert.ok(ecosystems.includes("dotnet"));
  });

  it("detects C#/.NET from .sln file", () => {
    fs.writeFileSync(path.join(tmpDir, "MyApp.sln"), "Microsoft Visual Studio Solution File");
    const ecosystems = detectEcosystems(tmpDir, catalog);
    assert.ok(ecosystems.includes("dotnet"));
  });

  it("detects multiple ecosystems simultaneously", () => {
    fs.writeFileSync(path.join(tmpDir, "package.json"), "{}");
    fs.writeFileSync(path.join(tmpDir, "requirements.txt"), "");
    const ecosystems = detectEcosystems(tmpDir, catalog);
    assert.ok(ecosystems.includes("node"));
    assert.ok(ecosystems.includes("python"));
  });

  it("returns empty array for empty directory", () => {
    const ecosystems = detectEcosystems(tmpDir, catalog);
    assert.deepEqual(ecosystems, []);
  });
});

// --- Dependency parsing ---

describe("parseDependencies", () => {
  it("parses Node.js dependencies from package.json", () => {
    fs.writeFileSync(
      path.join(tmpDir, "package.json"),
      JSON.stringify({
        dependencies: { react: "^18.0.0", next: "^14.0.0" },
        devDependencies: { "@playwright/test": "^1.40.0" },
      }),
    );
    const deps = parseDependencies(tmpDir, ["node"]);
    assert.ok(deps.has("react"));
    assert.ok(deps.has("next"));
    assert.ok(deps.has("@playwright/test"));
  });

  it("parses Python dependencies from requirements.txt", () => {
    fs.writeFileSync(
      path.join(tmpDir, "requirements.txt"),
      "django>=4.0\nfastapi==0.100.0\n# comment\n-r other.txt\n",
    );
    const deps = parseDependencies(tmpDir, ["python"]);
    assert.ok(deps.has("django"));
    assert.ok(deps.has("fastapi"));
  });

  it("parses Python dependencies from pyproject.toml", () => {
    fs.writeFileSync(
      path.join(tmpDir, "pyproject.toml"),
      '[project]\ndependencies = [\n  "django>=4.0",\n  "fastapi",\n]\n',
    );
    const deps = parseDependencies(tmpDir, ["python"]);
    assert.ok(deps.has("django"));
    assert.ok(deps.has("fastapi"));
  });

  it("parses Python dependencies from Pipfile", () => {
    fs.writeFileSync(
      path.join(tmpDir, "Pipfile"),
      '[packages]\nflask = "*"\ndjango = ">=4.0"\n\n[dev-packages]\npytest = "*"\n',
    );
    const deps = parseDependencies(tmpDir, ["python"]);
    assert.ok(deps.has("flask"));
    assert.ok(deps.has("django"));
    assert.ok(deps.has("pytest"));
  });

  it("parses Ruby dependencies from Gemfile", () => {
    fs.writeFileSync(
      path.join(tmpDir, "Gemfile"),
      "source 'https://rubygems.org'\ngem 'rails', '~> 7.0'\ngem \"pg\"\n",
    );
    const deps = parseDependencies(tmpDir, ["ruby"]);
    assert.ok(deps.has("rails"));
    assert.ok(deps.has("pg"));
  });

  it("parses Go dependencies from go.mod", () => {
    fs.writeFileSync(
      path.join(tmpDir, "go.mod"),
      "module example.com/app\n\nrequire (\n\tgithub.com/gin-gonic/gin v1.9.0\n)\n",
    );
    const deps = parseDependencies(tmpDir, ["go"]);
    assert.ok(deps.has("github.com/gin-gonic/gin"));
  });

  it("parses Rust dependencies from Cargo.toml", () => {
    fs.writeFileSync(
      path.join(tmpDir, "Cargo.toml"),
      '[package]\nname = "app"\n\n[dependencies]\nserde = "1.0"\ntokio = { version = "1", features = ["full"] }\n',
    );
    const deps = parseDependencies(tmpDir, ["rust"]);
    assert.ok(deps.has("serde"));
    assert.ok(deps.has("tokio"));
  });

  it("parses Java dependencies from pom.xml", () => {
    fs.writeFileSync(
      path.join(tmpDir, "pom.xml"),
      "<project><dependencies><dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter</artifactId></dependency></dependencies></project>",
    );
    const deps = parseDependencies(tmpDir, ["java"]);
    assert.ok(deps.has("spring-boot-starter"));
  });

  it("parses Java dependencies from build.gradle", () => {
    fs.writeFileSync(
      path.join(tmpDir, "build.gradle"),
      "dependencies {\n  implementation 'org.springframework.boot:spring-boot-starter:3.0.0'\n}\n",
    );
    const deps = parseDependencies(tmpDir, ["java"]);
    assert.ok(deps.has("spring-boot-starter"));
  });

  it("parses Elixir dependencies from mix.exs", () => {
    fs.writeFileSync(
      path.join(tmpDir, "mix.exs"),
      'defmodule MyApp.MixProject do\n  defp deps do\n    [\n      {:phoenix, "~> 1.7"},\n      {:phoenix_live_view, "~> 0.20"},\n      {:ecto_sql, "~> 3.10"}\n    ]\n  end\nend\n',
    );
    const deps = parseDependencies(tmpDir, ["elixir"]);
    assert.ok(deps.has("phoenix"));
    assert.ok(deps.has("phoenix_live_view"));
    assert.ok(deps.has("ecto_sql"));
  });

  it("parses C#/.NET dependencies from .csproj PackageReference", () => {
    fs.writeFileSync(
      path.join(tmpDir, "MyApp.csproj"),
      '<Project Sdk="Microsoft.NET.Sdk.Web">\n  <ItemGroup>\n    <PackageReference Include="Microsoft.EntityFrameworkCore" Version="8.0.0" />\n    <PackageReference Include="Newtonsoft.Json" Version="13.0.1" />\n  </ItemGroup>\n</Project>\n',
    );
    const deps = parseDependencies(tmpDir, ["dotnet"]);
    assert.ok(deps.has("Microsoft.EntityFrameworkCore"));
    assert.ok(deps.has("Newtonsoft.Json"));
  });

  it("parses C#/.NET dependencies from nested .csproj", () => {
    fs.mkdirSync(path.join(tmpDir, "src"));
    fs.writeFileSync(
      path.join(tmpDir, "src", "MyApp.csproj"),
      '<Project>\n  <ItemGroup>\n    <PackageReference Include="Serilog" Version="3.0.0" />\n  </ItemGroup>\n</Project>\n',
    );
    const deps = parseDependencies(tmpDir, ["dotnet"]);
    assert.ok(deps.has("Serilog"));
  });

  it("handles invalid package.json gracefully", () => {
    fs.writeFileSync(path.join(tmpDir, "package.json"), "not json");
    const deps = parseDependencies(tmpDir, ["node"]);
    assert.equal(deps.size, 0);
  });

  it("returns empty set for non-existent files", () => {
    const deps = parseDependencies(tmpDir, ["node"]);
    assert.equal(deps.size, 0);
  });
});

// --- Skill matching ---

describe("matchSkills", () => {
  it("matches React skill from dependency", () => {
    const deps = new Set(["react", "react-dom"]);
    const matches = matchSkills(tmpDir, catalog, ["node"], deps);
    const react = matches.find((m) => m.id === "react");
    assert.ok(react, "expected React skill to match");
    assert.ok(react.detectedBy.includes("react"));
  });

  it("matches Next.js skill from dependency", () => {
    const deps = new Set(["next"]);
    const matches = matchSkills(tmpDir, catalog, ["node"], deps);
    const nextjs = matches.find((m) => m.id === "nextjs");
    assert.ok(nextjs, "expected Next.js skill to match");
  });

  it("matches Playwright skill from dependency", () => {
    const deps = new Set(["@playwright/test"]);
    const matches = matchSkills(tmpDir, catalog, ["node"], deps);
    const pw = matches.find((m) => m.id === "playwright");
    assert.ok(pw, "expected Playwright skill to match");
  });

  it("matches Expo skill from dependency", () => {
    const deps = new Set(["expo"]);
    const matches = matchSkills(tmpDir, catalog, ["node"], deps);
    const expo = matches.find((m) => m.id === "expo");
    assert.ok(expo, "expected Expo skill to match");
  });

  it("matches Prisma skill from dependency", () => {
    const deps = new Set(["@prisma/client"]);
    const matches = matchSkills(tmpDir, catalog, ["node"], deps);
    const prisma = matches.find((m) => m.id === "prisma");
    assert.ok(prisma, "expected Prisma skill to match");
  });

  it("matches Supabase skill from dependency", () => {
    const deps = new Set(["@supabase/supabase-js"]);
    const matches = matchSkills(tmpDir, catalog, ["node"], deps);
    const supa = matches.find((m) => m.id === "supabase");
    assert.ok(supa, "expected Supabase skill to match");
  });

  it("matches Vue skill from dependency", () => {
    const deps = new Set(["vue"]);
    const matches = matchSkills(tmpDir, catalog, ["node"], deps);
    const vue = matches.find((m) => m.id === "vue");
    assert.ok(vue, "expected Vue skill to match");
  });

  it("matches Next.js skill from config file when no dependency", () => {
    fs.writeFileSync(path.join(tmpDir, "next.config.js"), "module.exports = {}");
    const deps = new Set();
    const matches = matchSkills(tmpDir, catalog, ["node"], deps);
    const nextjs = matches.find((m) => m.id === "nextjs");
    assert.ok(nextjs, "expected Next.js skill to match via file");
    assert.ok(nextjs.detectedBy.includes("file:"));
  });

  it("matches Django skill from Python dependency", () => {
    const deps = new Set(["django"]);
    const matches = matchSkills(tmpDir, catalog, ["python"], deps);
    const django = matches.find((m) => m.id === "django");
    assert.ok(django, "expected Django skill to match");
  });

  it("matches Rails skill from Ruby dependency", () => {
    const deps = new Set(["rails"]);
    const matches = matchSkills(tmpDir, catalog, ["ruby"], deps);
    const rails = matches.find((m) => m.id === "rails");
    assert.ok(rails, "expected Rails skill to match");
  });

  it("matches Rails skill from file detection", () => {
    fs.mkdirSync(path.join(tmpDir, "config"), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, "config", "routes.rb"), "");
    const deps = new Set();
    const matches = matchSkills(tmpDir, catalog, ["ruby"], deps);
    const rails = matches.find((m) => m.id === "rails");
    assert.ok(rails, "expected Rails skill to match via file");
  });

  it("does not match Node skills for Python ecosystem", () => {
    const deps = new Set(["react"]);
    const matches = matchSkills(tmpDir, catalog, ["python"], deps);
    const react = matches.find((m) => m.id === "react");
    assert.equal(react, undefined, "React should not match for Python ecosystem");
  });

  it("returns empty array when no dependencies match", () => {
    const deps = new Set(["some-unknown-dep"]);
    const matches = matchSkills(tmpDir, catalog, ["node"], deps);
    assert.equal(matches.length, 0);
  });

  it("returns empty array for empty ecosystem list", () => {
    const deps = new Set(["react"]);
    const matches = matchSkills(tmpDir, catalog, [], deps);
    assert.equal(matches.length, 0);
  });

  it("matches multiple skills for a full-stack project", () => {
    const deps = new Set(["react", "next", "@prisma/client", "@playwright/test"]);
    const matches = matchSkills(tmpDir, catalog, ["node"], deps);
    assert.ok(matches.length >= 4, `expected at least 4 matches, got ${matches.length}`);
    assert.ok(matches.find((m) => m.id === "react"));
    assert.ok(matches.find((m) => m.id === "nextjs"));
    assert.ok(matches.find((m) => m.id === "prisma"));
    assert.ok(matches.find((m) => m.id === "playwright"));
  });

  it("matches Spring Boot skill from Java dependency", () => {
    const deps = new Set(["spring-boot-starter"]);
    const matches = matchSkills(tmpDir, catalog, ["java"], deps);
    const spring = matches.find((m) => m.id === "spring-boot");
    assert.ok(spring, "expected Spring Boot skill to match");
  });

  it("matches Phoenix skill from Elixir dependency", () => {
    const deps = new Set(["phoenix"]);
    const matches = matchSkills(tmpDir, catalog, ["elixir"], deps);
    const phoenix = matches.find((m) => m.id === "phoenix");
    assert.ok(phoenix, "expected Phoenix skill to match");
  });

  it("matches .NET skill from C# dependency", () => {
    const deps = new Set(["Microsoft.EntityFrameworkCore"]);
    const matches = matchSkills(tmpDir, catalog, ["dotnet"], deps);
    const dotnet = matches.find((m) => m.id === "dotnet");
    assert.ok(dotnet, "expected .NET skill to match");
  });

  it("matches .NET skill from ASP.NET dependency", () => {
    const deps = new Set(["Microsoft.AspNetCore.App"]);
    const matches = matchSkills(tmpDir, catalog, ["dotnet"], deps);
    const dotnet = matches.find((m) => m.id === "dotnet");
    assert.ok(dotnet, "expected .NET skill to match via ASP.NET dep");
  });

  it("matches Rust skill from Cargo.toml file", () => {
    fs.writeFileSync(path.join(tmpDir, "Cargo.toml"), '[package]\nname = "app"\n');
    const deps = new Set();
    const matches = matchSkills(tmpDir, catalog, ["rust"], deps);
    const rust = matches.find((m) => m.id === "rust-analyzer");
    assert.ok(rust, "expected Rust skill to match");
  });
});

// --- Format recommendations ---

describe("formatRecommendations", () => {
  it("formats recommendations with skill details", () => {
    const recommendations = [
      {
        id: "react",
        name: "React Documentation Lookup",
        description: "Search React docs",
        source: "vercel",
        detectedBy: "dependency: react",
      },
    ];
    const output = formatRecommendations(recommendations, ["node"], catalog);
    assert.ok(output.includes("[SKILL]"));
    assert.ok(output.includes("React Documentation Lookup"));
    assert.ok(output.includes("vercel"));
    assert.ok(output.includes("dependency: react"));
  });

  it("shows detected stack label", () => {
    const output = formatRecommendations([], ["node", "python"], catalog);
    assert.ok(output.includes("Node.js"));
    assert.ok(output.includes("Python"));
  });

  it("shows no-match message when recommendations are empty", () => {
    const output = formatRecommendations([], ["node"], catalog);
    assert.ok(output.includes("No matching skills"));
  });
});

// --- Full scan integration ---

describe("scanSkillRecommendations", () => {
  it("returns recommendations for a React project", () => {
    fs.writeFileSync(
      path.join(tmpDir, "package.json"),
      JSON.stringify({ dependencies: { react: "^18.0.0", "react-dom": "^18.0.0" } }),
    );
    const { recommendations, ecosystems } = scanSkillRecommendations(tmpDir);
    assert.ok(ecosystems.includes("node"));
    const react = recommendations.find((r) => r.id === "react");
    assert.ok(react, "expected React recommendation");
  });

  it("returns empty recommendations for empty project", () => {
    const { recommendations, ecosystems } = scanSkillRecommendations(tmpDir);
    assert.deepEqual(ecosystems, []);
    assert.deepEqual(recommendations, []);
  });

  it("detects Django in a Python project", () => {
    fs.writeFileSync(path.join(tmpDir, "requirements.txt"), "django>=4.0\ncelery\n");
    const { recommendations, ecosystems } = scanSkillRecommendations(tmpDir);
    assert.ok(ecosystems.includes("python"));
    const django = recommendations.find((r) => r.id === "django");
    assert.ok(django, "expected Django recommendation");
  });
});
