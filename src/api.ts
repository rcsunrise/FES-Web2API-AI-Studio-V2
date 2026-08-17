import type { AccountInput } from './types';

async function request(path: string, init?: RequestInit) {
  const r = await fetch(path, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(init?.headers || {})
    }
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data?.error || `HTTP ${r.status}`);
  return data;
}

export const api = {
  accounts: () => request('/v1/accounts'),
  capabilities: () => request('/v1/capabilities'),
  createAccount: (input: AccountInput) =>
    request('/v1/accounts', { method: 'POST', body: JSON.stringify(input) }),
  updateAccount: (id: string, input: Partial<AccountInput>) =>
    request(`/v1/accounts/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(input)
    }),
  startLogin: (id: string) =>
    request(`/v1/accounts/${encodeURIComponent(id)}/login/start`, { method: 'POST' }),
  checkLogin: (id: string) =>
    request(`/v1/accounts/${encodeURIComponent(id)}/login/check`, { method: 'POST' }),
  closeLogin: (id: string) =>
    request(`/v1/accounts/${encodeURIComponent(id)}/login/close`, { method: 'POST' }),
  testSelector: (id: string, selector: string) =>
    request(`/v1/accounts/${encodeURIComponent(id)}/selector/test`, {
      method: 'POST',
      body: JSON.stringify({ selector })
    }),
  chat: (prompt: string, provider?: string) =>
    request('/v1/chat/completions', {
      method: 'POST',
      body: JSON.stringify({
        model: 'auto-web',
        provider,
        stream: false,
        messages: [{ role: 'user', content: prompt }]
      })
    }),
  image: (prompt: string, provider?: string) =>
    request('/v1/images/generations', {
      method: 'POST',
      body: JSON.stringify({
        model: 'auto-web-image',
        provider,
        prompt
      })
    })
};
