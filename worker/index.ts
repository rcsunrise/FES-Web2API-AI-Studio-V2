import 'dotenv/config';
import express from 'express';
import type { AccountConfig, Capability, RuntimeAccount } from './types';
import {
  loadRuntime,
  upsertConfig,
  patchConfig,
  assetsDir
} from './accountStore';
import {
  openLoginWindow,
  closeLoginWindow,
  detectAuthState,
  testSelector,
  runCapability
} from './browserManager';

const app = express();
app.use(express.json({ limit: '8mb' }));

const port = Number(process.env.WORKER_PORT ?? 9797);
const host = process.env.WORKER_HOST ?? '0.0.0.0';
const secret = process.env.WORKER_SHARED_SECRET ?? 'change-this-secret';
const publicBase = process.env.WORKER_PUBLIC_BASE_URL ?? `http://127.0.0.1:${port}`;

let accounts: RuntimeAccount[] = loadRuntime();
const locks = new Map<string, Promise<void>>();

app.use('/assets', express.static(assetsDir()));

app.use('/worker', (req, res, next) => {
  if (req.headers['x-worker-secret'] !== secret) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  next();
});

function view(a: RuntimeAccount) {
  return {
    id: a.id,
    provider: a.provider,
    label: a.label,
    enabled: a.enabled,
    status: a.status,
    capabilities: a.capabilities,
    inFlight: a.inFlight,
    lastError: a.lastError,
    lastSeenAt: a.lastSeenAt,
    startUrl: a.startUrl,
    loggedInUrlContains: a.loggedInUrlContains,
    verificationUrlContains: a.verificationUrlContains
  };
}

function getAccount(id: string) {
  const a = accounts.find(x => x.id === id);
  if (!a) throw new Error('account not found');
  return a;
}

function refreshRuntimeConfig(config: AccountConfig) {
  const existing = accounts.find(a => a.id === config.id);
  if (existing) {
    Object.assign(existing, config);
    existing.status = config.enabled ? existing.status : 'DISABLED';
    if (config.enabled && existing.status === 'DISABLED') existing.status = 'NEEDS_LOGIN';
    return existing;
  }
  const a: RuntimeAccount = {
    ...config,
    status: config.enabled ? 'NEEDS_LOGIN' : 'DISABLED',
    inFlight: 0
  };
  accounts.push(a);
  return a;
}

app.get('/worker/accounts', (_, res) => {
  res.json({ data: accounts.map(view) });
});

app.post('/worker/accounts', (req, res) => {
  try {
    const input = req.body as AccountConfig;
    if (!input.id || !input.provider || !input.startUrl) {
      return res.status(400).json({ error: 'id, provider and startUrl are required' });
    }
    if (accounts.some(a => a.id === input.id)) {
      return res.status(409).json({ error: 'account id already exists' });
    }
    const saved = upsertConfig({
      ...input,
      label: input.label || input.id,
      enabled: input.enabled ?? true,
      capabilities: input.capabilities || ['chat'],
      selectors: input.selectors || {}
    });
    const runtime = refreshRuntimeConfig(saved);
    res.json({ ok: true, account: view(runtime) });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

app.patch('/worker/accounts/:id', (req, res) => {
  try {
    const saved = patchConfig(req.params.id, req.body);
    const runtime = refreshRuntimeConfig(saved);
    res.json({ ok: true, account: view(runtime) });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

app.post('/worker/accounts/:id/login/start', async (req, res) => {
  try {
    const account = getAccount(req.params.id);
    if (!account.enabled) return res.status(400).json({ error: 'account is disabled' });

    const out = await openLoginWindow(account);
    account.status = 'LOGIN_WINDOW_OPEN';
    account.lastError = undefined;

    res.json({
      ok: true,
      status: account.status,
      url: out.url,
      message: '请在 Browser Worker 所在机器弹出的真实浏览器窗口中完成账号、密码及验证码/2FA。'
    });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

app.post('/worker/accounts/:id/login/check', async (req, res) => {
  try {
    const account = getAccount(req.params.id);
    const state = await detectAuthState(account);
    account.status = state;
    account.lastSeenAt = new Date().toISOString();
    res.json({ ok: true, status: state });
  } catch (e: any) {
    const account = accounts.find(a => a.id === req.params.id);
    if (account) {
      account.status = 'ERROR';
      account.lastError = e.message;
    }
    res.status(400).json({ error: e.message });
  }
});

app.post('/worker/accounts/:id/login/close', async (req, res) => {
  try {
    const account = getAccount(req.params.id);
    await closeLoginWindow(account);
    account.status = 'NEEDS_LOGIN';
    res.json({ ok: true, status: account.status });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

app.post('/worker/accounts/:id/selector/test', async (req, res) => {
  try {
    const account = getAccount(req.params.id);
    res.json(await testSelector(account, String(req.body?.selector || '')));
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

async function withLock<T>(account: RuntimeAccount, fn: () => Promise<T>) {
  const prior = locks.get(account.id) || Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>(resolve => { release = resolve; });
  locks.set(account.id, prior.then(() => current));

  await prior;
  const previous = account.status;
  account.status = 'BUSY';
  account.inFlight += 1;

  try {
    return await fn();
  } finally {
    account.inFlight = Math.max(0, account.inFlight - 1);
    if (account.status === 'BUSY') account.status = previous === 'HEALTHY' ? 'HEALTHY' : previous;
    release();
  }
}

app.post('/worker/run', async (req, res) => {
  let account: RuntimeAccount | undefined;
  try {
    account = getAccount(req.body?.accountId);
    const capability = req.body?.capability as Capability;

    if (!account.enabled) return res.status(400).json({ error: 'account is disabled' });
    if (account.status !== 'HEALTHY') {
      return res.status(409).json({ error: `account is not HEALTHY: ${account.status}` });
    }
    if (!account.capabilities.includes(capability)) {
      return res.status(400).json({ error: `account does not support ${capability}` });
    }

    const result = await withLock(account, () =>
      runCapability(account!, capability, String(req.body?.prompt || ''))
    );

    account.lastError = undefined;
    account.lastSeenAt = new Date().toISOString();

    res.json({
      ok: true,
      accountId: account.id,
      text: 'text' in result ? result.text : undefined,
      assetUrl: 'assetFile' in result ? `${publicBase}/assets/${result.assetFile}` : undefined
    });
  } catch (e: any) {
    if (account) {
      account.lastError = e.message;
      if (!['NEEDS_LOGIN', 'NEEDS_VERIFICATION'].includes(account.status)) {
        account.status = 'ERROR';
      }
    }
    res.status(500).json({
      ok: false,
      accountId: account?.id,
      error: e.message
    });
  }
});

app.listen(port, host, () => {
  console.log(`[browser-worker] http://${host}:${port}`);
  console.log('[browser-worker] login/verification windows open on THIS machine.');
});
