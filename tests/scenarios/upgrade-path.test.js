'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');

const { run } = require('../../dist/init');

let tmpDir;
let originalCwd;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dev-team-upgrade-'));
  originalCwd = process.cwd();
  process.chdir(tmpDir);
});

afterEach(() => {
  process.chdir(originalCwd);
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('upgrade path scenario', () => {
  it('re-running init preserves customizations and adds new content', async () => {
    // First install
    await run(tmpDir, ['--all']);

    // Simulate user customizations
    const claudeMdPath = path.join(tmpDir, 'CLAUDE.md');
    const originalClaudeMd = fs.readFileSync(claudeMdPath, 'utf-8');
    fs.writeFileSync(claudeMdPath, '# My Custom Rules\n\nDo X not Y.\n\n' + originalClaudeMd);

    // Simulate agent memory accumulation
    const memoryPath = path.join(tmpDir, '.dev-team', 'agent-memory', 'dev-team-voss', 'MEMORY.md');
    fs.writeFileSync(memoryPath, '# Voss Memory\n\n- Uses PostgreSQL\n- REST API with Express\n');

    // Simulate custom settings additions
    const settingsPath = path.join(tmpDir, '.claude', 'settings.json');
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
    settings.customField = 'user-added';
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));

    // Re-run init (simulating upgrade)
    await run(tmpDir, ['--all']);

    // Custom CLAUDE.md content preserved
    const updatedClaudeMd = fs.readFileSync(claudeMdPath, 'utf-8');
    assert.ok(updatedClaudeMd.includes('My Custom Rules'), 'should preserve custom content above markers');
    assert.ok(updatedClaudeMd.includes('Do X not Y'), 'should preserve custom instructions');
    assert.ok(updatedClaudeMd.includes('dev-team:begin'), 'should still have dev-team section');

    // Agent memory preserved
    const memory = fs.readFileSync(memoryPath, 'utf-8');
    assert.ok(memory.includes('PostgreSQL'), 'should preserve accumulated agent memory');

    // Custom settings field preserved
    const updatedSettings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
    assert.equal(updatedSettings.customField, 'user-added', 'should preserve custom settings fields');

    // Hooks not duplicated
    for (const [event, entries] of Object.entries(updatedSettings.hooks)) {
      const commands = entries.flatMap((e) => (e.hooks || []).map((h) => h.command));
      const unique = [...new Set(commands)];
      assert.equal(commands.length, unique.length, `${event} hooks should not have duplicates after re-run`);
    }
  });

  it('handles project that already has .claude/ with non-dev-team content', async () => {
    // Pre-existing .claude directory with custom agents
    fs.mkdirSync(path.join(tmpDir, '.claude', 'agents'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, '.claude', 'agents', 'custom-agent.md'), '---\nname: custom\n---\nMy agent');
    fs.writeFileSync(path.join(tmpDir, '.claude', 'settings.json'), JSON.stringify({
      hooks: { PreToolUse: [{ matcher: 'Bash', hooks: [{ type: 'command', command: 'echo custom' }] }] },
    }));

    await run(tmpDir, ['--all']);

    // Custom agent in .claude/ preserved (dev-team doesn't touch .claude/agents/ anymore)
    assert.ok(fs.existsSync(path.join(tmpDir, '.claude', 'agents', 'custom-agent.md')), 'should not delete custom agents in .claude/');

    // Dev-team agents in .dev-team/
    assert.ok(fs.existsSync(path.join(tmpDir, '.dev-team', 'agents', 'dev-team-voss.md')));

    // Custom hooks preserved alongside dev-team hooks
    const settings = JSON.parse(fs.readFileSync(path.join(tmpDir, '.claude', 'settings.json'), 'utf-8'));
    const preToolUseCommands = settings.hooks.PreToolUse.flatMap((e) => (e.hooks || []).map((h) => h.command));
    assert.ok(preToolUseCommands.includes('echo custom'), 'should preserve custom hooks');
    assert.ok(preToolUseCommands.some((c) => c.includes('dev-team')), 'should add dev-team hooks');
  });
});
