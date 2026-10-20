#!/usr/bin/env node
// drazen — set up and use Drazen from any AI agent. Zero dependencies.
import { parseArgs } from 'node:util';
import { createInterface } from 'node:readline/promises';
import { api, API_BASE } from '../lib/api.mjs';
import { readConfig, writeConfig, ensureInstallId } from '../lib/config.mjs';
import { installAll, packageVersion } from '../lib/install.mjs';
import { uninstallAll } from '../lib/uninstall.mjs';
import { detectAgents } from '../lib/detect.mjs';
import { openUrl } from '../lib/open.mjs';

const CONSENT_TEXT =
  'Drazen will store your email to create your account and send you setup emails. ' +
  'You can ask us to delete it at any time: https://drazen.ai/privacy';

const [, , command = 'help', ...rest] = process.argv;
const { values: flags } = parseArgs({
  args: rest,
  options: {
    'dry-run': { type: 'boolean', default: false },
    name: { type: 'string' },
    email: { type: 'string' },
    code: { type: 'string' },
    consent: { type: 'boolean', default: false },
    json: { type: 'boolean', default: false },
    tool: { type: 'string' },
    args: { type: 'string' },
    'no-wait': { type: 'boolean', default: false },
  },
  allowPositionals: true,
  strict: false,
});

const out = (s) => process.stdout.write(s + '\n');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function cacheServerExtras(s) {
  try {
    const config = readConfig();
    let changed = false;
    if (s.latest_version && s.latest_version !== config.latest_version) { config.latest_version = s.latest_version; changed = true; }
    if (s.news && s.news.id !== (config.news && config.news.id)) { config.news = s.news; changed = true; }
    if (!s.news && config.news) { delete config.news; changed = true; }
    if (changed) writeConfig(config);
  } catch {}
}

async function fetchStatus() {
  const s = await api('/api/cli/status');
  cacheServerExtras(s);
  return s;
}

async function pollStatus(until, { label, timeoutMs = 10 * 60 * 1000 }) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    await sleep(5000);
    try {
      const s = await fetchStatus();
      if (until(s)) return s;
      process.stdout.write('.');
    } catch { process.stdout.write('.'); }
  }
  throw new Error(`Timed out waiting for ${label}. Run "drazen status" to check manually.`);
}

async function cmdInit() {
  const dryRun = Boolean(flags['dry-run']);
  const result = installAll({ dryRun });
  if (dryRun) return;
  const found = result.agents.map((a) => a.name).join(', ') || 'none detected';
  out(`Drazen installed. Agents found: ${found}.`);
  out(`Skills + hooks are in place. Version ${packageVersion()}.`);
  if (result.agents.some((a) => a.id === 'codex')) {
    out('Codex users: open Codex and run /hooks once to switch Drazen\'s hooks on.');
  }
  const config = readConfig();
  if (config.email && config.token) {
    out(`Signed in as ${config.email}. You're all set.`);
    return;
  }
  if (process.stdin.isTTY && process.stdout.isTTY) {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    out('\nSo pleased to have you here. Let\'s get your account set up — just a couple of minutes.');
    const name = (await rl.question('Your first name: ')).trim();
    const email = (await rl.question('Your email: ')).trim();
    rl.close();
    out(`\n${CONSENT_TEXT}`);
    await doSignupStart({ name, email });
    out('Check your inbox — I\'ve emailed you a 6-digit code. Finish with:');
    out(`  drazen verify --code 123456`);
  } else {
    // Launched by an agent: hand the conversation to it.
    out('AGENT NOTE: Drazen is installed. Now onboard the person following the drazen skill, and keep it WARM and conversational — wave emoji hello, excited to have them, one short question at a time, founder-welcoming-you energy, never formal, never mention rules or requirements. Start like: "Hey, welcome to Drazen 👋 So glad you\'re here — what should I call you?" Then email, consent line, drazen signup, code, pay, connect, as the skill describes.');
  }
}

async function doSignupStart({ name, email }) {
  const config = readConfig();
  config.name = name || config.name;
  config.email = email || config.email;
  writeConfig(config);
  await api('/api/cli/signup-start', {
    method: 'POST',
    auth: false,
    body: {
      name: config.name,
      email: config.email,
      consent: true,
      install_id: ensureInstallId(),
      agent: (config.agents || [])[0] || 'other',
      os: process.platform,
      cli_version: packageVersion(),
    },
  });
}

async function cmdSignup() {
  if (!flags.consent) {
    out(CONSENT_TEXT);
    out('AGENT NOTE: show the person the line above in a light, friendly way; once they say yes, rerun this command with --consent added. Nothing is blocked — it is just a quick ok.');
    process.exitCode = 1;
    return;
  }
  const email = String(flags.email || readConfig().email || '').trim();
  if (!email) { out('Need --email you@example.com'); process.exitCode = 1; return; }
  await doSignupStart({ name: String(flags.name || '').trim(), email });
  out(`Code sent to ${email}. Next: drazen verify --code 123456`);
}

async function cmdVerify() {
  const config = readConfig();
  const code = String(flags.code || '').trim();
  if (!/^\d{6}$/.test(code)) { out('Need --code with the 6 digits from the email.'); process.exitCode = 1; return; }
  const res = await api('/api/cli/verify', {
    method: 'POST',
    auth: false,
    body: {
      email: config.email,
      code,
      name: config.name || '',
      install_id: ensureInstallId(),
      agent: (config.agents || [])[0] || 'other',
    },
  });
  config.token = res.token;
  config.user_id = res.user?.id;
  writeConfig(config);
  out(`Verified. Account ready for ${res.user?.email}.`);
  out(res.active ? 'Subscription: active.' : 'No subscription yet — next: drazen pay');
}

async function cmdPay() {
  const before = await api('/api/cli/status').catch(() => null);
  const res = await api('/api/cli/checkout', { method: 'POST' });
  const opened = openUrl(res.url);
  out(opened ? 'Payment page opened in your browser.' : `Open this in your browser: ${res.url}`);
  if (flags['no-wait']) return;
  out('Waiting for the payment to land (I check every few seconds)…');
  const baseSlots = before ? before.paid_accounts || 0 : 0;
  const wasActive = Boolean(before && before.active);
  await pollStatus(
    (s) => (wasActive ? (s.paid_accounts || 0) > baseSlots : s.active),
    { label: 'payment' }
  );
  out('\nPayment verified. ' + (wasActive ? 'New account slot added.' : 'Subscription active.'));
}

async function cmdAddAccount() {
  out('Adding another Instagram account: payment first, then the connection.');
  await cmdPay();
  await cmdConnect();
}

async function cmdConnect() {
  const before = await fetchStatus();
  const res = await api('/api/cli/connect-link', { method: 'POST' });
  const opened = openUrl(res.url);
  out(opened ? 'Instagram connection opened in your browser — approve it there.' : `Open this in your browser: ${res.url}`);
  if (flags['no-wait']) return;
  out('Waiting for Instagram to connect…');
  const after = await pollStatus((s) => s.accounts.length > before.accounts.length, { label: 'Instagram connection' });
  const newest = after.accounts[after.accounts.length - 1];
  out(`\nConnected: @${newest.username}. All done.`);
}

async function cmdStatus() {
  const config = readConfig();
  if (!config.token) {
    const payload = { installed: true, signed_in: false, version: packageVersion() };
    out(flags.json ? JSON.stringify(payload) : 'Installed, but not signed in yet. The drazen skill covers setup.');
    return;
  }
  const s = await fetchStatus();
  if (flags.json) { out(JSON.stringify({ ...s, version: packageVersion() })); return; }
  out(`Signed in: ${s.email}${s.name ? ` (${s.name})` : ''}`);
  out(`Subscription: ${s.active ? 'active' : s.sub_status} · paid accounts: ${s.paid_accounts}`);
  out(`Instagram: ${s.accounts.length ? s.accounts.map((a) => '@' + a.username).join(', ') : 'not connected yet'}`);
  out(`Automations: ${s.automations.total} (${s.automations.live} live)`);
  if (s.news) out(`Drazen news: ${s.news.message}`);
  if (s.latest_version && s.latest_version !== packageVersion()) {
    out(`Update available (${packageVersion()} -> ${s.latest_version}): npx drazen-ai@latest init`);
  }
}

async function cmdTool() {
  const tool = String(flags.tool || rest.find((r) => !r.startsWith('-')) || '');
  if (!tool) {
    const res = await api('/api/cli/tool');
    out(JSON.stringify(res.tools, null, 2));
    return;
  }
  let args = {};
  if (flags.args) {
    try { args = JSON.parse(String(flags.args)); } catch { out('--args must be valid JSON'); process.exitCode = 1; return; }
  }
  const res = await api('/api/cli/tool', { method: 'POST', body: { tool, args } });
  if (res.isError) process.exitCode = 1;
  out(res.data ? JSON.stringify(res.data, null, 2) : res.text);
}

function cmdDoctor() {
  const agents = detectAgents();
  for (const a of agents) out(`${a.found ? '✓' : '✗'} ${a.name}`);
  const config = readConfig();
  out(`config: ${config.install_id ? 'present' : 'missing'} · signed in: ${config.token ? 'yes' : 'no'} · version ${packageVersion()}`);
  out('If skills look stale, run: npx drazen-ai@latest init');
}

const HELP = `drazen ${packageVersion()} — Drazen inside your AI agent (${API_BASE})

  npx drazen-ai@latest init     install skills + hooks, start friendly setup
  drazen signup --name "Sam" --email sam@x.com --consent   email a 6-digit code
  drazen login --email sam@x.com --consent                  same thing, for returning users
  drazen verify --code 123456                              finish sign-in
  drazen pay                 open checkout, wait + verify payment
  drazen connect             open the Instagram consent screen, wait for it
  drazen add-account         pay for + connect another Instagram account
  drazen status [--json]     account, subscription, accounts, automations
  drazen tool [name] --args '{"...": "..."}'   run a Drazen action (list with no name)
  drazen doctor              check the install
  npx drazen-ai uninstall       remove everything Drazen added

Docs: https://drazen.ai/connect`;

try {
  if (command === 'init') await cmdInit();
  else if (command === 'signup' || command === 'login') await cmdSignup();
  else if (command === 'verify') await cmdVerify();
  else if (command === 'pay') await cmdPay();
  else if (command === 'add-account') await cmdAddAccount();
  else if (command === 'connect') await cmdConnect();
  else if (command === 'status') await cmdStatus();
  else if (command === 'tool') await cmdTool();
  else if (command === 'doctor') cmdDoctor();
  else if (command === 'uninstall') { uninstallAll({ dryRun: Boolean(flags['dry-run']) }); if (!flags['dry-run']) out('Drazen removed. Settings backups were left in place.'); }
  else out(HELP);
} catch (err) {
  out(`drazen: ${err.message || err}`);
  process.exitCode = 1;
}
