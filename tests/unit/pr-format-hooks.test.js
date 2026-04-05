"use strict";
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { execFileSync, spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");
const HOOKS_DIR = path.join(__dirname, "..", "..", "templates", "hooks");
function runHook(h, ti, cwd) {
  const r = spawnSync(process.execPath, [path.join(HOOKS_DIR, h), JSON.stringify({tool_input:ti})], {encoding:"utf-8",timeout:10000,cwd:cwd||process.cwd(),env:{...process.env,PATH:process.env.PATH}});
  return {code:r.status,stdout:r.stdout||"",stderr:r.stderr||""};
}
function createTempDir(config) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "pr-hooks-"));
  fs.mkdirSync(path.join(d, ".dev-team"), {recursive:true});
  if (config) fs.writeFileSync(path.join(d, ".dev-team", "config.json"), JSON.stringify(config));
  return d;
}
function createTempRepo(branch, config) {
  const d = createTempDir(config);
  execFileSync("git", ["init", "-b", branch], {cwd:d,encoding:"utf-8"});
  execFileSync("git", ["config", "user.email", "t@t.com"], {cwd:d,encoding:"utf-8"});
  execFileSync("git", ["config", "user.name", "T"], {cwd:d,encoding:"utf-8"});
  fs.writeFileSync(path.join(d, ".gitkeep"), "");
  execFileSync("git", ["add", "."], {cwd:d,encoding:"utf-8"});
  execFileSync("git", ["commit", "-m", "init"], {cwd:d,encoding:"utf-8"});
  return d;
}
describe("pr-title-format", () => {
  it("skip non-pr", () => assert.equal(runHook("dev-team-pr-title-format.js", {command:"git status"}).code, 0));
  it("skip disabled", () => { const d=createTempDir({workflow:{pr:false}}); assert.equal(runHook("dev-team-pr-title-format.js", {command:'gh pr create --title "bad"'}, d).code, 0); });
  it("skip-format", () => assert.equal(runHook("dev-team-pr-title-format.js", {command:'gh pr create --title "bad" --skip-format'}).code, 0));
  it("valid conventional", () => { const d=createTempDir({pr:{titleFormat:"conventional"}}); assert.equal(runHook("dev-team-pr-title-format.js", {command:'gh pr create --title "feat: add"'}, d).code, 0); });
  it("block bad conventional", () => { const d=createTempDir({pr:{titleFormat:"conventional"}}); assert.equal(runHook("dev-team-pr-title-format.js", {command:'gh pr create --title "Add"'}, d).code, 2); });
  it("plain ok", () => { const d=createTempDir({pr:{titleFormat:"plain"}}); assert.equal(runHook("dev-team-pr-title-format.js", {command:'gh pr create --title "Any"'}, d).code, 0); });
  it("valid issue-prefix", () => { const d=createTempDir({pr:{titleFormat:"issue-prefix"}}); assert.equal(runHook("dev-team-pr-title-format.js", {command:'gh pr create --title "[#1] X"'}, d).code, 0); });
  it("block bad issue-prefix", () => { const d=createTempDir({pr:{titleFormat:"issue-prefix"}}); assert.equal(runHook("dev-team-pr-title-format.js", {command:'gh pr create --title "X"'}, d).code, 2); });
  it("defaults conventional", () => { const d=createTempDir({}); assert.equal(runHook("dev-team-pr-title-format.js", {command:'gh pr create --title "bad"'}, d).code, 2); });
});
describe("pr-link-keyword", () => {
  it("skip non-pr", () => assert.equal(runHook("dev-team-pr-link-keyword.js", {command:"git status"}).code, 0));
  it("skip empty keyword", () => { const d=createTempDir({pr:{linkKeyword:""}}); assert.equal(runHook("dev-team-pr-link-keyword.js", {command:'gh pr create --body "x"'}, d).code, 0); });
  it("body has link", () => { const d=createTempDir({pr:{linkKeyword:"Closes"}}); assert.equal(runHook("dev-team-pr-link-keyword.js", {command:'gh pr create --body "Closes #1"'}, d).code, 0); });
  it("block missing link", () => { const d=createTempDir({pr:{linkKeyword:"Closes"}}); assert.equal(runHook("dev-team-pr-link-keyword.js", {command:'gh pr create --body "none"'}, d).code, 2); });
  it("default Closes", () => { const d=createTempDir({}); assert.equal(runHook("dev-team-pr-link-keyword.js", {command:'gh pr create --body "Closes #1"'}, d).code, 0); });
});
describe("pr-draft", () => {
  it("skip non-pr", () => assert.equal(runHook("dev-team-pr-draft.js", {command:"git status"}).code, 0));
  it("no draft config", () => { const d=createTempDir({pr:{draft:false}}); assert.equal(runHook("dev-team-pr-draft.js", {command:"gh pr create"}, d).code, 0); });
  it("draft+flag ok", () => { const d=createTempDir({pr:{draft:true}}); assert.equal(runHook("dev-team-pr-draft.js", {command:"gh pr create --draft"}, d).code, 0); });
  it("advisory when missing", () => { const d=createTempDir({pr:{draft:true}}); const r=runHook("dev-team-pr-draft.js", {command:"gh pr create"}, d); assert.equal(r.code, 0); assert.match(r.stderr, /ADVISORY/); });
});
describe("pr-template", () => {
  it("skip non-pr", () => assert.equal(runHook("dev-team-pr-template.js", {command:"git status"}).code, 0));
  it("body has sections", () => { const d=createTempDir({pr:{template:["summary","testPlan"]}}); assert.equal(runHook("dev-team-pr-template.js", {command:'gh pr create --body "## Summary\nx\n## Test plan\ny"'}, d).code, 0); });
  it("block missing sections", () => { const d=createTempDir({pr:{template:["summary","testPlan"]}}); assert.equal(runHook("dev-team-pr-template.js", {command:'gh pr create --body "## Summary\nx"'}, d).code, 2); });
  it("empty template ok", () => { const d=createTempDir({pr:{template:[]}}); assert.equal(runHook("dev-team-pr-template.js", {command:'gh pr create --body "x"'}, d).code, 0); });
  it("defaults summary+testPlan", () => { const d=createTempDir({}); assert.equal(runHook("dev-team-pr-template.js", {command:'gh pr create --body "x"'}, d).code, 2); });
});
describe("pr-auto-label", () => {
  it("skip non-pr", () => assert.equal(runHook("dev-team-pr-auto-label.js", {command:"git status"}).code, 0));
  it("autoLabel false", () => { const d=createTempRepo("feat/t", {pr:{autoLabel:false}}); assert.equal(runHook("dev-team-pr-auto-label.js", {command:"gh pr create"}, d).code, 0); assert.equal(runHook("dev-team-pr-auto-label.js", {command:"gh pr create"}, d).stdout, ""); });
  it("feat enhancement", () => { const d=createTempRepo("feat/t", {pr:{autoLabel:true}}); const r=runHook("dev-team-pr-auto-label.js", {command:"gh pr create"}, d); assert.match(JSON.parse(r.stdout).tool_input.command, /--label enhancement/); });
  it("fix bug", () => { const d=createTempRepo("fix/t", {pr:{autoLabel:true}}); const r=runHook("dev-team-pr-auto-label.js", {command:"gh pr create"}, d); assert.match(JSON.parse(r.stdout).tool_input.command, /--label bug/); });
  it("skip existing label", () => { const d=createTempRepo("feat/t", {pr:{autoLabel:true}}); assert.equal(runHook("dev-team-pr-auto-label.js", {command:"gh pr create --label enhancement"}, d).stdout, ""); });
  it("default true", () => { const d=createTempRepo("feat/t", {}); const r=runHook("dev-team-pr-auto-label.js", {command:"gh pr create"}, d); assert.match(JSON.parse(r.stdout).tool_input.command, /--label enhancement/); });
});
