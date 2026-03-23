'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');

const { run } = require('../../dist/init');
const { update } = require('../../dist/update');

let tmpDir;
let originalCwd;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dev-team-update-'));
  originalCwd = process.cwd();
  process.chdir(tmpDir);
});

afterEach(() => {
  process.chdir(originalCwd);
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('dev-team update', () => {
  it('updates agent files when template content changes', async () => {
    // Initial install
    await run(tmpDir, ['--all']);

    // Modify an installed agent to simulate a stale version
    const agentPath = path.join(tmpDir, '.claude', 'agents', 'dev-team-voss.md');
    fs.writeFileSync(agentPath, 'old content');

    // Run update
    await update(tmpDir);

    // Agent should be restored to template content
    const content = fs.readFileSync(agentPath, 'utf-8');
    assert.ok(content.includes('dev-team-voss'), 'agent should be updated to latest template');
    assert.ok(!content.includes('old content'), 'old content should be replaced');
  });

  it('preserves agent memory files during update', async () => {
    await run(tmpDir, ['--all']);

    // Add custom content to agent memory
    const memoryPath = path.join(tmpDir, '.claude', 'agent-memory', 'dev-team-voss', 'MEMORY.md');
    fs.writeFileSync(memoryPath, '# Custom learnings\nVoss learned something important.');

    await update(tmpDir);

    // Memory should be untouched
    const content = fs.readFileSync(memoryPath, 'utf-8');
    assert.ok(content.includes('Custom learnings'), 'memory should not be overwritten');
  });

  it('preserves CLAUDE.md content outside dev-team markers', async () => {
    // Create a CLAUDE.md with custom content
    fs.writeFileSync(path.join(tmpDir, 'CLAUDE.md'), '# My Project\n\nCustom instructions here.\n');

    await run(tmpDir, ['--all']);

    // Verify custom content was preserved after init
    let content = fs.readFileSync(path.join(tmpDir, 'CLAUDE.md'), 'utf-8');
    assert.ok(content.includes('My Project'), 'should preserve existing content after init');

    await update(tmpDir);

    // Still preserved after update
    content = fs.readFileSync(path.join(tmpDir, 'CLAUDE.md'), 'utf-8');
    assert.ok(content.includes('My Project'), 'should preserve existing content after update');
    assert.ok(content.includes('dev-team:begin'), 'should have dev-team markers');
  });

  it('updates hook files when template content changes', async () => {
    await run(tmpDir, ['--all']);

    // Modify an installed hook to simulate a stale version
    const hookPath = path.join(tmpDir, '.claude', 'hooks', 'dev-team-safety-guard.js');
    fs.writeFileSync(hookPath, '// old hook');

    await update(tmpDir);

    const content = fs.readFileSync(hookPath, 'utf-8');
    assert.ok(content.includes('safety-guard'), 'hook should be updated');
    assert.ok(!content.includes('old hook'), 'old content should be replaced');
  });

  it('updates skill files when template content changes', async () => {
    await run(tmpDir, ['--all']);

    const skillPath = path.join(tmpDir, '.claude', 'skills', 'dev-team-challenge', 'SKILL.md');
    fs.writeFileSync(skillPath, 'old skill');

    await update(tmpDir);

    const content = fs.readFileSync(skillPath, 'utf-8');
    assert.ok(content.includes('challenge'), 'skill should be updated');
  });

  it('reports no changes when already up to date', async () => {
    await run(tmpDir, ['--all']);

    // Update with no changes — should not throw
    await update(tmpDir);
  });

  it('preserves shared team learnings', async () => {
    await run(tmpDir, ['--all']);

    const learningsPath = path.join(tmpDir, '.claude', 'dev-team-learnings.md');
    fs.writeFileSync(learningsPath, '# Custom Learnings\nWe use PostgreSQL.');

    await update(tmpDir);

    const content = fs.readFileSync(learningsPath, 'utf-8');
    assert.ok(content.includes('PostgreSQL'), 'learnings should not be overwritten');
  });

  it('updates all agents including those added after initial install', async () => {
    await run(tmpDir, ['--all']);

    // Stale every agent file
    const agentsDir = path.join(tmpDir, '.claude', 'agents');
    const agentFiles = fs.readdirSync(agentsDir);
    for (const f of agentFiles) {
      fs.writeFileSync(path.join(agentsDir, f), 'stale');
    }

    await update(tmpDir);

    // Every agent should be restored — none should be our sentinel value
    for (const f of agentFiles) {
      const content = fs.readFileSync(path.join(agentsDir, f), 'utf-8');
      assert.ok(content.startsWith('---'), `${f} should have been updated (should start with frontmatter)`);
    }
  });

  it('upgrades version in prefs when package version is newer', async () => {
    // Initial install - saves current package version
    await run(tmpDir, ['--all']);

    const prefsPath = path.join(tmpDir, '.claude', 'dev-team.json');
    const prefs = JSON.parse(fs.readFileSync(prefsPath, 'utf-8'));
    const currentVersion = prefs.version;
    assert.ok(currentVersion, 'init should set a version in prefs');

    // Manually downgrade the version to simulate an older install
    prefs.version = '0.0.1';
    fs.writeFileSync(prefsPath, JSON.stringify(prefs, null, 2) + '\n');

    // Run update - should detect the version difference and upgrade
    await update(tmpDir);

    // Verify version is now current
    const updatedPrefs = JSON.parse(fs.readFileSync(prefsPath, 'utf-8'));
    assert.equal(updatedPrefs.version, currentVersion, 'version should be upgraded to current package version');
    assert.notEqual(updatedPrefs.version, '0.0.1', 'version should no longer be the old value');
  });

  it('auto-discovers and installs new hooks not in preferences', async () => {
    await run(tmpDir, ['--all']);

    // Remove a hook from preferences to simulate an older install
    const prefsPath = path.join(tmpDir, '.claude', 'dev-team.json');
    const prefs = JSON.parse(fs.readFileSync(prefsPath, 'utf-8'));
    const removedHook = prefs.hooks.pop(); // Remove last hook
    fs.writeFileSync(prefsPath, JSON.stringify(prefs, null, 2));

    // Delete the hook file too
    const hookFiles = fs.readdirSync(path.join(tmpDir, '.claude', 'hooks'));
    const hookCountBefore = hookFiles.length;

    await update(tmpDir);

    // Hook should be re-added to preferences
    const updatedPrefs = JSON.parse(fs.readFileSync(prefsPath, 'utf-8'));
    assert.ok(updatedPrefs.hooks.includes(removedHook), `${removedHook} should be auto-discovered`);
  });

  it('migrates renamed agents on update', async () => {
    await run(tmpDir, ['--all']);

    // Simulate pre-v0.4 prefs with old agent names
    const prefsPath = path.join(tmpDir, '.claude', 'dev-team.json');
    const prefs = JSON.parse(fs.readFileSync(prefsPath, 'utf-8'));
    prefs.version = '0.3.1';

    // Replace new names with old names
    prefs.agents = prefs.agents.map((a) => {
      if (a === 'Brooks') return 'Architect';
      if (a === 'Tufte') return 'Docs';
      if (a === 'Conway') return 'Release';
      if (a === 'Drucker') return 'Lead';
      return a;
    });

    // Create old agent files to simulate old install
    const agentsDir = path.join(tmpDir, '.claude', 'agents');
    fs.writeFileSync(path.join(agentsDir, 'dev-team-architect.md'), '---\nname: dev-team-architect\n---');
    fs.writeFileSync(path.join(agentsDir, 'dev-team-docs.md'), '---\nname: dev-team-docs\n---');
    fs.writeFileSync(path.join(agentsDir, 'dev-team-release.md'), '---\nname: dev-team-release\n---');
    fs.writeFileSync(path.join(agentsDir, 'dev-team-lead.md'), '---\nname: dev-team-lead\n---');

    fs.writeFileSync(prefsPath, JSON.stringify(prefs, null, 2));

    await update(tmpDir);

    // Verify old names replaced with new in prefs
    const updated = JSON.parse(fs.readFileSync(prefsPath, 'utf-8'));
    assert.ok(updated.agents.includes('Brooks'), 'should have Brooks');
    assert.ok(updated.agents.includes('Tufte'), 'should have Tufte');
    assert.ok(updated.agents.includes('Conway'), 'should have Conway');
    assert.ok(updated.agents.includes('Drucker'), 'should have Drucker');
    assert.ok(!updated.agents.includes('Architect'), 'should not have old Architect');
    assert.ok(!updated.agents.includes('Docs'), 'should not have old Docs');
    assert.ok(!updated.agents.includes('Release'), 'should not have old Release');
    assert.ok(!updated.agents.includes('Lead'), 'should not have old Lead');

    // Verify old agent files removed
    assert.ok(!fs.existsSync(path.join(agentsDir, 'dev-team-architect.md')), 'old architect file should be removed');
    assert.ok(!fs.existsSync(path.join(agentsDir, 'dev-team-docs.md')), 'old docs file should be removed');

    // Verify new agent files exist
    assert.ok(fs.existsSync(path.join(agentsDir, 'dev-team-brooks.md')), 'new brooks file should exist');
    assert.ok(fs.existsSync(path.join(agentsDir, 'dev-team-tufte.md')), 'new tufte file should exist');
  });
});
