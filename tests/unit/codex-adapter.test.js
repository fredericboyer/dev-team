"use strict";

const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const os = require("os");

const {
  CodexAdapter,
  parseSkillFrontmatter,
  renderAgentToml,
  buildHooksConfig,
} = require("../../dist/adapters/codex");
const { getAdapter } = require("../../dist/formats/adapters");

function makeTmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "codex-adapter-test-"));
}

function cleanup(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

const SAMPLE_DEFS = [
  { name: "dev-team-voss", description: "Backend engineer.", body: "You are Voss.\n" },
  {
    name: "dev-team-szabo",
    description: "Security auditor.",
    body: "You are Szabo.\n",
    tools: "Read, Bash",
    model: "sonnet",
  },
];

describe("CodexAdapter", () => {
  let tmpDir;
  beforeEach(() => {
    tmpDir = makeTmpDir();
  });
  afterEach(() => {
    cleanup(tmpDir);
  });

  it("has correct id and name", () => {
    const a = new CodexAdapter();
    assert.equal(a.id, "codex");
    assert.equal(a.name, "Codex CLI");
  });

  it("is registered in the adapter registry", () => {
    const a = getAdapter("codex");
    assert.ok(a);
    assert.equal(a.id, "codex");
  });

  it("generate() creates .codex/agents/*.toml files", () => {
    new CodexAdapter().generate(SAMPLE_DEFS, tmpDir);
    const vt = path.join(tmpDir, ".codex", "agents", "dev-team-voss.toml");
    const st = path.join(tmpDir, ".codex", "agents", "dev-team-szabo.toml");
    assert.ok(fs.existsSync(vt), "voss.toml should exist");
    assert.ok(fs.existsSync(st), "szabo.toml should exist");
    const vc = fs.readFileSync(vt, "utf-8");
    assert.ok(vc.includes('name = "dev-team-voss"'));
    assert.ok(vc.includes('description = "Backend engineer."'));
    assert.ok(vc.includes("developer_instructions"));
    assert.ok(vc.includes("You are Voss."));
    assert.ok(fs.readFileSync(st, "utf-8").includes('model = "sonnet"'));
  });

  it("generate() creates .codex/hooks.json", () => {
    new CodexAdapter().generate(SAMPLE_DEFS, tmpDir);
    const hp = path.join(tmpDir, ".codex", "hooks.json");
    assert.ok(fs.existsSync(hp));
    const c = JSON.parse(fs.readFileSync(hp, "utf-8"));
    assert.ok(c.hooks.PreToolUse);
    assert.ok(c.hooks.PostToolUse);
  });

  it("generate() creates .codex/rules/dev-team-learnings.md", () => {
    new CodexAdapter().generate(SAMPLE_DEFS, tmpDir);
    const rp = path.join(tmpDir, ".codex", "rules", "dev-team-learnings.md");
    assert.ok(fs.existsSync(rp));
    assert.ok(fs.readFileSync(rp, "utf-8").includes("Learnings"));
  });

  it("generate() creates .codex/agent-memory MEMORY.md", () => {
    new CodexAdapter().generate(SAMPLE_DEFS, tmpDir);
    for (const def of SAMPLE_DEFS) {
      const mp = path.join(tmpDir, ".codex", "agent-memory", def.name, "MEMORY.md");
      assert.ok(fs.existsSync(mp), def.name + "/MEMORY.md should exist");
      assert.ok(fs.readFileSync(mp, "utf-8").includes(def.name));
    }
  });

  it("generate() does not overwrite existing agent memory", () => {
    const mp = path.join(tmpDir, ".codex", "agent-memory", "dev-team-voss", "MEMORY.md");
    fs.mkdirSync(path.dirname(mp), { recursive: true });
    fs.writeFileSync(mp, "# Custom\nUser content.\n");
    new CodexAdapter().generate(SAMPLE_DEFS, tmpDir);
    assert.ok(fs.readFileSync(mp, "utf-8").includes("User content"));
  });

  it("generate() creates .codex/config.toml", () => {
    new CodexAdapter().generate(SAMPLE_DEFS, tmpDir);
    const cp = path.join(tmpDir, ".codex", "config.toml");
    assert.ok(fs.existsSync(cp));
    assert.ok(fs.readFileSync(cp, "utf-8").includes("codex_hooks = true"));
  });

  it("generate() does not overwrite existing config.toml", () => {
    const cp = path.join(tmpDir, ".codex", "config.toml");
    fs.mkdirSync(path.dirname(cp), { recursive: true });
    fs.writeFileSync(cp, "custom = true\n");
    new CodexAdapter().generate(SAMPLE_DEFS, tmpDir);
    const c = fs.readFileSync(cp, "utf-8");
    assert.ok(c.includes("custom"));
    assert.ok(!c.includes("codex_hooks"));
  });

  it("update() returns added on first run", () => {
    const r = new CodexAdapter().update(SAMPLE_DEFS, tmpDir);
    assert.equal(r.added.length, 2);
    assert.equal(r.updated.length, 0);
  });

  it("update() returns updated on change", () => {
    new CodexAdapter().generate(SAMPLE_DEFS, tmpDir);
    const r = new CodexAdapter().update(
      [{ ...SAMPLE_DEFS[0], description: "Changed." }, SAMPLE_DEFS[1]],
      tmpDir,
    );
    assert.ok(r.updated.includes("dev-team-voss"));
    assert.equal(r.added.length, 0);
  });

  it("update() returns empty when unchanged", () => {
    new CodexAdapter().generate(SAMPLE_DEFS, tmpDir);
    const r = new CodexAdapter().update(SAMPLE_DEFS, tmpDir);
    assert.equal(r.updated.length, 0);
    assert.equal(r.added.length, 0);
  });

  it("update() creates hooks and rules", () => {
    new CodexAdapter().update(SAMPLE_DEFS, tmpDir);
    assert.ok(fs.existsSync(path.join(tmpDir, ".codex", "hooks.json")));
    assert.ok(fs.existsSync(path.join(tmpDir, ".codex", "rules", "dev-team-learnings.md")));
  });

  it("generate() does not overwrite existing learnings rules", () => {
    const rp = path.join(tmpDir, ".codex", "rules", "dev-team-learnings.md");
    fs.mkdirSync(path.dirname(rp), { recursive: true });
    fs.writeFileSync(rp, "# Custom learnings\nUser-specific content.\n");
    new CodexAdapter().generate(SAMPLE_DEFS, tmpDir);
    const content = fs.readFileSync(rp, "utf-8");
    assert.ok(content.includes("User-specific content"), "existing learnings should be preserved");
  });

  it("generate() reads learnings content from templates/dev-team-learnings.md not templates/rules/", () => {
    new CodexAdapter().generate(SAMPLE_DEFS, tmpDir);
    const rp = path.join(tmpDir, ".codex", "rules", "dev-team-learnings.md");
    const content = fs.readFileSync(rp, "utf-8");
    // The real template contains a Tier 1 comment; the fallback string does not
    assert.ok(
      content.includes("Tier 1") || content.includes("Shared Team Learnings"),
      "learnings should be populated from the real template, not the fallback stub",
    );
    assert.ok(
      !content.includes("Add project-specific learnings here"),
      "content should not be the fallback stub — indicates wrong or missing template path",
    );
  });
});

describe("renderAgentToml", () => {
  it("renders basic definition", () => {
    const t = renderAgentToml({ name: "dev-team-voss", description: "Backend.", body: "Voss.\n" });
    assert.ok(t.includes('name = "dev-team-voss"'));
    assert.ok(t.includes("developer_instructions"));
    assert.ok(!t.includes("model ="));
  });

  it("includes model", () => {
    const t = renderAgentToml({ name: "x", description: "y", body: "z\n", model: "sonnet" });
    assert.ok(t.includes('model = "sonnet"'));
  });

  it("strips Claude Code refs", () => {
    const t = renderAgentToml({ name: "x", description: "y", body: "Agent tool. Claude Code.\n" });
    assert.ok(!t.includes("Agent tool"));
    assert.ok(!t.includes("Claude Code"));
    assert.ok(t.includes("agent delegation"));
    assert.ok(t.includes("Codex"));
  });

  it("escapes TOML chars", () => {
    const t = renderAgentToml({ name: "x", description: 'A "q" d', body: "b\n" });
    assert.ok(t.includes('\\"q\\"'));
  });
});

describe("buildHooksConfig", () => {
  it("has PreToolUse and PostToolUse", () => {
    const c = buildHooksConfig();
    assert.ok(c.hooks.PreToolUse);
    assert.ok(c.hooks.PostToolUse);
  });

  it("safety guard in PreToolUse bash", () => {
    const e = buildHooksConfig().hooks.PreToolUse.find(
      (e) => e.matchers && e.matchers.includes("shell"),
    );
    assert.ok(e);
    assert.ok(e.hooks.some((h) => h.command.includes("safety-guard")));
  });

  it("TDD in PostToolUse edit_file", () => {
    const e = buildHooksConfig().hooks.PostToolUse.find(
      (e) => e.matchers && e.matchers.includes("edit_file"),
    );
    assert.ok(e);
    assert.ok(e.hooks.some((h) => h.command.includes("tdd-enforce")));
  });

  it("post-change review in PostToolUse", () => {
    const e = buildHooksConfig().hooks.PostToolUse.find(
      (e) => e.matchers && e.matchers.includes("write_file"),
    );
    assert.ok(e);
    assert.ok(e.hooks.some((h) => h.command.includes("post-change-review")));
  });

  it("pre-commit lint in PreToolUse", () => {
    const e = buildHooksConfig().hooks.PreToolUse.find(
      (e) => e.hooks && e.hooks.some((h) => h.command.includes("pre-commit-lint")),
    );
    assert.ok(e);
    assert.ok(e.matchers.includes("bash"));
  });
});

describe("parseSkillFrontmatter", () => {
  it("parses valid content", () => {
    const r = parseSkillFrontmatter(
      "---\nname: t\ndescription: d\ndisable-model-invocation: true\n---\n\nBody",
    );
    assert.ok(r);
    assert.equal(r.name, "t");
    assert.equal(r.disableModelInvocation, true);
  });

  it("null without frontmatter", () => {
    assert.equal(parseSkillFrontmatter("# No fm"), null);
  });

  it("null missing fields", () => {
    assert.equal(parseSkillFrontmatter("---\nname: t\n---\nBody"), null);
  });

  it("defaults disableModelInvocation false", () => {
    const r = parseSkillFrontmatter("---\nname: t\ndescription: d\n---\nBody");
    assert.equal(r.disableModelInvocation, false);
  });
});

describe("CodexAdapter copySkills", () => {
  let tmpDir;
  beforeEach(() => {
    tmpDir = makeTmpDir();
  });
  afterEach(() => {
    cleanup(tmpDir);
  });

  it("creates .codex/skills/", () => {
    new CodexAdapter().generate(SAMPLE_DEFS, tmpDir);
    const sd = path.join(tmpDir, ".codex", "skills");
    assert.ok(fs.existsSync(sd));
    assert.ok(fs.readdirSync(sd).length > 0);
  });

  it("creates openai.yaml for orchestration skills", () => {
    new CodexAdapter().generate(SAMPLE_DEFS, tmpDir);
    const sd = path.join(tmpDir, ".codex", "skills");
    if (!fs.existsSync(sd)) return;
    let found = false;
    for (const e of fs.readdirSync(sd)) {
      const yp = path.join(sd, e, "agents", "openai.yaml");
      if (fs.existsSync(yp)) {
        found = true;
        assert.ok(fs.readFileSync(yp, "utf-8").includes("allow_implicit_invocation: false"));
      }
    }
    assert.ok(found);
  });
});
