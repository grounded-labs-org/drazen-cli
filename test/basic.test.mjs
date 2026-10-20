import { test } from 'node:test';
import assert from 'node:assert';
import { mkdtempSync, writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { addDrazenHooks, removeDrazenHooks } from '../lib/hooks.mjs';

test('hooks: adds once, never twice, keeps others', () => {
  const dir = mkdtempSync(join(tmpdir(), 'drz-'));
  const file = join(dir, 'settings.json');
  writeFileSync(file, JSON.stringify({ hooks: { UserPromptSubmit: [{ hooks: [{ type: 'command', command: 'other-tool' }] }] } }));
  addDrazenHooks(file, '"node" "/x/drazen-hook.mjs"');
  addDrazenHooks(file, '"node" "/x/drazen-hook.mjs"');
  const s = JSON.parse(readFileSync(file, 'utf8'));
  const drz = s.hooks.UserPromptSubmit.filter((g) => g.hooks.some((h) => h.command.includes('drazen-hook')));
  assert.equal(drz.length, 1);
  assert.equal(s.hooks.UserPromptSubmit.length, 2);
  assert.equal(s.hooks.SessionStart.length, 1);
});

test('hooks: refuses bad JSON', () => {
  const dir = mkdtempSync(join(tmpdir(), 'drz-'));
  const file = join(dir, 'settings.json');
  writeFileSync(file, '{not json');
  assert.throws(() => addDrazenHooks(file, 'x'));
  assert.equal(readFileSync(file, 'utf8'), '{not json');
});

test('hooks: uninstall removes only drazen entries', () => {
  const dir = mkdtempSync(join(tmpdir(), 'drz-'));
  const file = join(dir, 'settings.json');
  writeFileSync(file, JSON.stringify({ hooks: { UserPromptSubmit: [{ hooks: [{ type: 'command', command: 'other-tool' }] }] } }));
  addDrazenHooks(file, '"node" "/x/drazen-hook.mjs"');
  assert.equal(removeDrazenHooks(file), true);
  const s = JSON.parse(readFileSync(file, 'utf8'));
  assert.equal(s.hooks.UserPromptSubmit.length, 1);
  assert.equal(s.hooks.UserPromptSubmit[0].hooks[0].command, 'other-tool');
  assert.equal(s.hooks.SessionStart, undefined);
});

test('hook script: bad input exits 0, prints nothing', async () => {
  const { execFileSync } = await import('node:child_process');
  const outp = execFileSync(process.execPath, ['hook/drazen-hook.mjs', '--event', 'prompt'], { input: 'NOT JSON' });
  assert.equal(outp.toString(), '');
});

test('hook script: DM request names drazen-automations', async () => {
  const { execFileSync } = await import('node:child_process');
  const fakeHome = mkdtempSync(join(tmpdir(), 'drz-home-'));
  const outp = execFileSync(process.execPath, ['hook/drazen-hook.mjs', '--event', 'prompt'], {
    input: JSON.stringify({ prompt: 'set up a comment to DM automation on my last post' }),
    env: { ...process.env, HOME: fakeHome, USERPROFILE: fakeHome },
  });
  const parsed = JSON.parse(outp.toString());
  assert.match(parsed.hookSpecificOutput.additionalContext, /drazen-automations/);
});

test('detect: returns the four agents', async () => {
  const { detectAgents } = await import('../lib/detect.mjs');
  const agents = detectAgents();
  assert.deepEqual(agents.map((a) => a.id), ['claude-code', 'codex', 'gemini', 'cursor']);
});
