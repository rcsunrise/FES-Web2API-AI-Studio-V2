import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { buildCapabilities, chooseAccount } from './capabilityRouter';
import {
  listAccounts,
  createAccount,
  updateAccount,
  startLogin,
  checkLogin,
  closeLogin,
  testSelector,
  runOnWorker
} from './browser/workerClient';

const app = express();
app.use(cors());
app.use(express.json({ limit: '12mb' }));

const port = Number(process.env.PORT ?? 8787);
const apiKey = process.env.FES_API_KEY ?? '';

function auth(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (!apiKey) return next();
  if (req.headers.authorization !== `Bearer ${apiKey}`) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  next();
}

app.get('/healthz', (_, res) => res.json({ ok: true, service: 'fes-web2api-control-plane-v2' }));

app.get('/v1/accounts', auth, async (_, res) => {
  try { res.json({ object: 'list', data: await listAccounts() }); }
  catch (e: any) { res.status(503).json({ error: e.message }); }
});

app.post('/v1/accounts', auth, async (req, res) => {
  try { res.json(await createAccount(req.body)); }
  catch (e: any) { res.status(400).json({ error: e.message }); }
});

app.patch('/v1/accounts/:id', auth, async (req, res) => {
  try { res.json(await updateAccount(req.params.id, req.body)); }
  catch (e: any) { res.status(400).json({ error: e.message }); }
});

app.post('/v1/accounts/:id/login/start', auth, async (req, res) => {
  try { res.json(await startLogin(req.params.id)); }
  catch (e: any) { res.status(400).json({ error: e.message }); }
});

app.post('/v1/accounts/:id/login/check', auth, async (req, res) => {
  try { res.json(await checkLogin(req.params.id)); }
  catch (e: any) { res.status(400).json({ error: e.message }); }
});

app.post('/v1/accounts/:id/login/close', auth, async (req, res) => {
  try { res.json(await closeLogin(req.params.id)); }
  catch (e: any) { res.status(400).json({ error: e.message }); }
});

app.post('/v1/accounts/:id/selector/test', auth, async (req, res) => {
  try { res.json(await testSelector(req.params.id, String(req.body?.selector || ''))); }
  catch (e: any) { res.status(400).json({ error: e.message }); }
});

app.get('/v1/capabilities', auth, async (_, res) => {
  try { res.json({ capabilities: await buildCapabilities() }); }
  catch (e: any) { res.status(503).json({ error: e.message }); }
});

app.get('/v1/models', auth, async (_, res) => {
  try {
    const accounts = await listAccounts();
    res.json({
      object: 'list',
      data: accounts.flatMap(a =>
        a.capabilities.map(cap => ({
          id: `${a.provider}:${cap}`,
          object: 'model',
          owned_by: 'fes-web2api',
          account_id: a.id,
          status: a.status
        }))
      )
    });
  } catch (e: any) {
    res.status(503).json({ error: e.message });
  }
});

app.post('/v1/chat/completions', auth, async (req, res) => {
  try {
    if (req.body?.stream === true) {
      return res.status(501).json({
        error: 'V2 先完成稳定 DOM 结果识别；SSE 在 V2.1 增加。'
      });
    }

    const messages = Array.isArray(req.body?.messages) ? req.body.messages : [];
    const prompt = messages.map((m: any) => `${m.role || 'user'}: ${m.content || ''}`).join('\n');
    const account = await chooseAccount('chat', req.body?.provider);
    const out = await runOnWorker({
      accountId: account.id,
      capability: 'chat',
      prompt
    });

    res.json({
      id: `chatcmpl_web_${Date.now()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: req.body?.model || 'auto-web',
      choices: [{
        index: 0,
        message: { role: 'assistant', content: out.text || '' },
        finish_reason: 'stop'
      }],
      web_meta: { account_id: out.accountId }
    });
  } catch (e: any) {
    res.status(503).json({ error: e.message });
  }
});

app.post('/v1/images/generations', auth, async (req, res) => {
  try {
    const prompt = String(req.body?.prompt || '');
    if (!prompt) return res.status(400).json({ error: 'prompt is required' });

    const account = await chooseAccount('image_generation', req.body?.provider);
    const out = await runOnWorker({
      accountId: account.id,
      capability: 'image_generation',
      prompt
    });

    res.json({
      created: Math.floor(Date.now() / 1000),
      data: out.assetUrl ? [{ url: out.assetUrl }] : [],
      web_meta: { account_id: out.accountId }
    });
  } catch (e: any) {
    res.status(503).json({ error: e.message });
  }
});

app.post('/v1/images/edits', auth, async (_, res) => {
  res.status(501).json({
    error: 'V2 已预留 image_edit；文件上传、mask 和站点适配放到 V2.1。'
  });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`[control-plane] http://0.0.0.0:${port}`);
});
