"use strict";

const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const os = require("os");

const { CursorAdapter } = require("../../dist/adapters/cursor");
const { getAdapter } = require("../../dist/formats/adapters");

function makeTmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "cursor-adapter-test-"));
}

function cleanup(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

const SAMPLE_DEFS = [
  {
    name: "dev-team-voss",
    description: "Backend engineer.",
    body: "You are Voss.\n",
  },
  {
    name: "dev-team-szabo",
    description: "Security auditor.",
    body: "You are Szabo.\n",
  },
];

describe("CursorAdapter", () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = makeTmpDir();
  });

  afterEach(() => {
    cleanup(tmpDir);
  });

  it("has correct id and name", () => {
    const adapter = new CursorAdapter();
    assert.equal(adapter.id, "cursor");
    assert.equal(adapter.name, "Cursor");
  });

  it("is registered in the adapter registry", () => {
    const adapter = getAdapter("cursor");
    assert.ok(adapter, "cursor adapter should be registered");
    assert.equal(adapter.id, "cursor");
  });

  it("generate() creates .cursor/rules/{name}.md files", () => {
    const adapter = new CursorAdapter();
    adapter.generate(SAMPLE_DEFS, tmpDir);

    for (const def of SAMPLE_DEFS) {
      const filePath = path.join(tmpDir, ".cursor", "rules", `${def.name}.md`);
      assert.ok(fs.existsSync(filePath), `${def.name}.md should exist`);
    }
  });

  it("generate() uses Cursor MDC format with YAML frontmatter", () => {
    const adapter = new CursorAdapter();
    adapter.generate(SAMPLE_DEFS, tmpDir);

    const filePath = path.join(tmpDir, ".cursor", "rules", "dev-team-voss.md");
    const content = fs.readFileSync(filePath, "utf-8");

    assert.ok(content.startsWith("---\n"), "should start with frontmatter delimiter");
    assert.ok(content.includes("description: Backend engineer."), "should contain description");
    assert.ok(content.includes("You are Voss."), "should contain body");
  });

  it("update() returns added names on first run", () => {
    const adapter = new CursorAdapter();
    const result = adapter.update(SAMPLE_DEFS, tmpDir);

    assert.equal(result.added.length, 2);
    assert.ok(result.added.includes("dev-team-voss"));
    assert.ok(result.added.includes("dev-team-szabo"));
    assert.equal(result.updated.length, 0);
  });

  it("update() returns updated names when content changes", () => {
    const adapter = new CursorAdapter();
    adapter.generate(SAMPLE_DEFS, tmpDir);

    const modifiedDefs = [{ ...SAMPLE_DEFS[0], description: "Updated." }, SAMPLE_DEFS[1]];
    const result = adapter.update(modifiedDefs, tmpDir);

    assert.deepEqual(result.updated, ["dev-team-voss"]);
    assert.equal(result.added.length, 0);
  });

  it("update() returns empty arrays when nothing changed", () => {
    const adapter = new CursorAdapter();
    adapter.generate(SAMPLE_DEFS, tmpDir);
    const result = adapter.update(SAMPLE_DEFS, tmpDir);

    assert.equal(result.updated.length, 0);
    assert.equal(result.added.length, 0);
  });
});
