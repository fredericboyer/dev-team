'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');

const { copyFile, fileExists, dirExists, readFile, writeFile, mergeSettings, mergeClaudeMd } = require('../../dist/files');

let tmpDir;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dev-team-test-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('fileExists', () => {
  it('returns true for existing files', () => {
    const p = path.join(tmpDir, 'test.txt');
    fs.writeFileSync(p, 'hello');
    assert.equal(fileExists(p), true);
  });

  it('returns false for non-existent files', () => {
    assert.equal(fileExists(path.join(tmpDir, 'nope.txt')), false);
  });
});

describe('dirExists', () => {
  it('returns true for existing directories', () => {
    assert.equal(dirExists(tmpDir), true);
  });

  it('returns false for non-existent directories', () => {
    assert.equal(dirExists(path.join(tmpDir, 'nope')), false);
  });
});

describe('copyFile', () => {
  it('copies a file and creates parent directories', () => {
    const src = path.join(tmpDir, 'src.txt');
    const dest = path.join(tmpDir, 'sub', 'dir', 'dest.txt');
    fs.writeFileSync(src, 'content');

    copyFile(src, dest);

    assert.equal(fs.readFileSync(dest, 'utf-8'), 'content');
  });
});

describe('readFile', () => {
  it('returns file content', () => {
    const p = path.join(tmpDir, 'test.txt');
    fs.writeFileSync(p, 'hello');
    assert.equal(readFile(p), 'hello');
  });

  it('returns null for non-existent files', () => {
    assert.equal(readFile(path.join(tmpDir, 'nope.txt')), null);
  });
});

describe('writeFile', () => {
  it('creates file and parent directories', () => {
    const p = path.join(tmpDir, 'a', 'b', 'c.txt');
    writeFile(p, 'deep');
    assert.equal(fs.readFileSync(p, 'utf-8'), 'deep');
  });
});

describe('mergeSettings', () => {
  it('creates settings file if it does not exist', () => {
    const settingsPath = path.join(tmpDir, 'settings.json');
    const fragment = { hooks: { PostToolUse: [{ matcher: 'Edit', hooks: [{ type: 'command', command: 'test' }] }] } };

    mergeSettings(settingsPath, fragment);

    const result = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
    assert.deepEqual(result.hooks.PostToolUse[0].matcher, 'Edit');
  });

  it('merges additively without duplicating existing hooks', () => {
    const settingsPath = path.join(tmpDir, 'settings.json');
    const existing = { hooks: { PostToolUse: [{ matcher: 'Edit', hooks: [{ type: 'command', command: 'existing' }] }] } };
    fs.writeFileSync(settingsPath, JSON.stringify(existing));

    const fragment = { hooks: { PostToolUse: [{ matcher: 'Edit', hooks: [{ type: 'command', command: 'new' }] }] } };
    mergeSettings(settingsPath, fragment);

    const result = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
    assert.equal(result.hooks.PostToolUse.length, 2);
  });

  it('does not duplicate identical hooks on re-run', () => {
    const settingsPath = path.join(tmpDir, 'settings.json');
    const fragment = { hooks: { PreToolUse: [{ matcher: 'Bash', hooks: [{ type: 'command', command: 'same' }] }] } };

    mergeSettings(settingsPath, fragment);
    mergeSettings(settingsPath, fragment);

    const result = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
    assert.equal(result.hooks.PreToolUse.length, 1);
  });

  it('warns and starts fresh when settings file contains corrupt JSON', () => {
    const settingsPath = path.join(tmpDir, 'settings.json');
    fs.writeFileSync(settingsPath, '{ invalid json');

    const fragment = { hooks: { PostToolUse: [{ matcher: 'Edit', hooks: [{ type: 'command', command: 'test' }] }] } };
    mergeSettings(settingsPath, fragment);

    const result = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
    assert.deepEqual(result.hooks.PostToolUse[0].matcher, 'Edit');
  });
});

describe('mergeClaudeMd', () => {
  it('creates file if it does not exist', () => {
    const p = path.join(tmpDir, 'CLAUDE.md');
    const result = mergeClaudeMd(p, '<!-- dev-team:begin -->\ncontent\n<!-- dev-team:end -->');
    assert.equal(result, 'created');
    assert.ok(fs.readFileSync(p, 'utf-8').includes('content'));
  });

  it('appends to existing file without markers', () => {
    const p = path.join(tmpDir, 'CLAUDE.md');
    fs.writeFileSync(p, '# My Project\n\nExisting content.');
    const result = mergeClaudeMd(p, '<!-- dev-team:begin -->\nnew\n<!-- dev-team:end -->');
    assert.equal(result, 'appended');

    const content = fs.readFileSync(p, 'utf-8');
    assert.ok(content.includes('Existing content.'));
    assert.ok(content.includes('new'));
  });

  it('replaces between markers on re-run', () => {
    const p = path.join(tmpDir, 'CLAUDE.md');
    fs.writeFileSync(p, '# Project\n\n<!-- dev-team:begin -->\nold\n<!-- dev-team:end -->\n\nFooter');

    const result = mergeClaudeMd(p, '<!-- dev-team:begin -->\nupdated\n<!-- dev-team:end -->');
    assert.equal(result, 'replaced');

    const content = fs.readFileSync(p, 'utf-8');
    assert.ok(content.includes('updated'));
    assert.ok(!content.includes('old'));
    assert.ok(content.includes('Footer'));
  });

  it('appends instead of corrupting when begin marker exists but end marker is missing', () => {
    const p = path.join(tmpDir, 'CLAUDE.md');
    fs.writeFileSync(p, '# Project\n\n<!-- dev-team:begin -->\nold content without end marker');

    const result = mergeClaudeMd(p, '<!-- dev-team:begin -->\nnew\n<!-- dev-team:end -->');
    assert.equal(result, 'appended');

    const content = fs.readFileSync(p, 'utf-8');
    assert.ok(content.includes('old content without end marker'), 'should preserve original content');
    assert.ok(content.includes('new'), 'should append new content');
  });
});
