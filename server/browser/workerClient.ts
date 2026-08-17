import type { AccountView, RunRequest, RunResponse } from '../types';

const BASE = process.env.BROWSER_WORKER_URL ?? 'http://127.0.0.1:9797';
const SECRET = process.env.WORKER_SHARED_SECRET ?? 'change-this-secret';

function h() {
  return { 'content-type': 'application/json', 'x-worker-secret': SECRET };
}

async function req(path: string, init?: RequestInit) {
  const r = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { ...h(), ...(init?.headers || {}) }
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data?.error || `Worker HTTP ${r.status}`);
  return data;
}

export async function listAccounts(): Promise<AccountView[]> {
  const data = await req('/worker/accounts');
  return data.data || [];
}

export async function createAccount(input: unknown) {
  return req('/worker/accounts', { method: 'POST', body: JSON.stringify(input) });
}

export async function updateAccount(id: string, input: unknown) {
  return req(`/worker/accounts/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(input)
  });
}

export async function startLogin(id: string) {
  return req(`/worker/accounts/${encodeURIComponent(id)}/login/start`, { method: 'POST' });
}

export async function checkLogin(id: string) {
  return req(`/worker/accounts/${encodeURIComponent(id)}/login/check`, { method: 'POST' });
}

export async function closeLogin(id: string) {
  return req(`/worker/accounts/${encodeURIComponent(id)}/login/close`, { method: 'POST' });
}

export async function testSelector(id: string, selector: string) {
  return req(`/worker/accounts/${encodeURIComponent(id)}/selector/test`, {
    method: 'POST',
    body: JSON.stringify({ selector })
  });
}

export async function runOnWorker(body: RunRequest): Promise<RunResponse> {
  return req('/worker/run', { method: 'POST', body: JSON.stringify(body) });
}
