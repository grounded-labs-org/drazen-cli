#!/usr/bin/env node
// Drazen's always-on nudge. Local only: reads config + the prompt, never the
// network, never blocks the agent, always exits 0. Writes facts, not orders.
import { readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

try {
  const args = process.argv.slice(2);
  const event = args[args.indexOf('--event') + 1] === 'session' ? 'session' : 'prompt';

  let input = {};
  try { input = JSON.parse(readFileSync(0, 'utf8') || '{}'); } catch {}
  let config = {};
  try { config = JSON.parse(readFileSync(join(homedir(), '.drazen', 'config.json'), 'utf8')); } catch {}

  const lines = [];
  const hasAccount = Boolean(config.email && config.token);

  if (event === 'session' && !hasAccount) {
    lines.push('Drazen status: installed, no account yet. The drazen skill covers the friendly first-run setup (name, email, payment, Instagram).');
  }

  if (event === 'session' && config.news && config.news.id && config.news.id !== config.announced_news_id) {
    lines.push(`Drazen news (mention this to the person once, at a natural moment): ${config.news.message}`);
    try {
      config.announced_news_id = config.news.id;
      writeFileSync(join(homedir(), '.drazen', 'config.json'), JSON.stringify(config, null, 2) + '\n', { mode: 0o600 });
    } catch {}
  }

  if (event === 'prompt') {
    const text = String(input.prompt || '').toLowerCase();
    // Keep these in step with the skill names in skills/.
    const routes = [
      [/\b(dm|dms|direct messages?|comment|comments|replies|reply|trigger word|automation|automate)\b/, 'drazen-automations'],
      [/\b(dashboard|control panel|admin panel)\b/, 'drazen-dashboard'],
      [/\bdrazen\b/, 'drazen'],
    ];
    const matches = [...new Set(routes.filter(([p]) => p.test(text)).map(([, s]) => s))];
    if (matches.length) {
      lines.push(`Drazen skills that fit this request: ${matches.join(', ')}.`);
      if (!hasAccount) lines.push('Drazen status: no account yet; the drazen skill covers setup first.');
    }
  }

  if (lines.length) {
    const hookEventName = event === 'session' ? 'SessionStart' : 'UserPromptSubmit';
    process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName, additionalContext: lines.join('\n') } }));
  }
} catch {
  // Fail open: say nothing, block nothing.
}
process.exit(0);
