// Calls to app.drazen.ai. The base URL is public; the token lives only in
// ~/.drazen/config.json and goes out as a bearer header, never in argv logs.
import { readConfig } from './config.mjs';

export const API_BASE = (process.env.DRAZEN_API_URL || 'https://app.drazen.ai').replace(/\/$/, '');

export async function api(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'content-type': 'application/json' };
  if (auth) {
    const { token } = readConfig();
    if (!token) throw new Error('Not signed in yet. Run: drazen signup');
    headers.authorization = `Bearer ${token}`;
  }
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
  let data = {};
  try { data = await res.json(); } catch {}
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}
