import { useEffect, useMemo, useState } from 'react';
import { api } from './api';
import AccountCard from './components/AccountCard';
import AccountEditor from './components/AccountEditor';
import type { Account, AccountInput } from './types';

export default function App() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [capabilities, setCapabilities] = useState<Record<string, any>>({});
  const [editing, setEditing] = useState<Account | null | undefined>(undefined);
  const [prompt, setPrompt] = useState('分析这款沙发的设计特点');
  const [result, setResult] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  async function refresh() {
    const [a, c] = await Promise.all([api.accounts(), api.capabilities()]);
    setAccounts(a.data || []);
    setCapabilities(c.capabilities || {});
  }

  useEffect(() => {
    refresh();
    const t = setInterval(() => refresh().catch(() => {}), 5000);
    return () => clearInterval(t);
  }, []);

  async function exec(fn: () => Promise<any>, success?: string) {
    setBusy(true);
    setNotice('');
    try {
      const out = await fn();
      if (success) setNotice(success);
      await refresh();
      return out;
    } catch (e: any) {
      setNotice(e?.message || String(e));
      throw e;
    } finally {
      setBusy(false);
    }
  }

  async function saveAccount(input: AccountInput) {
    const existing = accounts.find(a => a.id === input.id);
    if (existing) await api.updateAccount(input.id, input);
    else await api.createAccount(input);
    await refresh();
  }

  async function runChat() {
    setResult('');
    try {
      const data = await exec(() => api.chat(prompt));
      setResult(data?.choices?.[0]?.message?.content || JSON.stringify(data, null, 2));
    } catch {}
  }

  async function runImage() {
    setResult('');
    try {
      const data = await exec(() => api.image(prompt));
      setResult(JSON.stringify(data, null, 2));
    } catch {}
  }

  return (
    <main>
      <header>
        <div>
          <div className="eyebrow">FES WEB2API · V2</div>
          <h1>Web 能力与账号中心</h1>
          <p>
            账号密码和验证码只在目标网站的真实浏览器窗口中输入；FES 不保存密码，也不自动绕过验证码。
          </p>
        </div>
        <div className="header-actions">
          <button className="secondary" onClick={() => refresh()}>刷新</button>
          <button onClick={() => setEditing(null)}>新增账号</button>
        </div>
      </header>

      {notice && <div className="notice">{notice}</div>}

      <section className="summary-grid">
        {Object.entries(capabilities).map(([name, item]: any) => (
          <div className="summary-card" key={name}>
            <strong>{name}</strong>
            <span>{item.available ? '可用' : '不可用'}</span>
            <small>{item.accounts?.length || 0} 个节点</small>
          </div>
        ))}
      </section>

      <section>
        <div className="section-head">
          <h2>Web 账号</h2>
          <span className="muted">需要验证码时点击“打开验证窗口”，然后在真实网页中人工完成。</span>
        </div>

        <div className="account-grid">
          {accounts.map(account => (
            <AccountCard
              key={account.id}
              account={account}
              onLogin={() => exec(() => api.startLogin(account.id), '登录窗口已在 Browser Worker 所在机器打开。')}
              onCheck={() => exec(() => api.checkLogin(account.id), '已重新检查登录状态。')}
              onClose={() => exec(() => api.closeLogin(account.id), '登录窗口已关闭。')}
              onEdit={() => setEditing(account)}
            />
          ))}
          {!accounts.length && <div className="empty">尚未添加 Web 账号。</div>}
        </div>
      </section>

      <section className="card runner">
        <h2>API 调试</h2>
        <textarea value={prompt} onChange={e => setPrompt(e.target.value)} />
        <div className="actions">
          <button disabled={busy} onClick={runChat}>调用 Web 对话</button>
          <button disabled={busy} onClick={runImage}>调用 Web 生图</button>
        </div>
        <pre>{busy ? '执行中…' : result}</pre>
      </section>

      {editing !== undefined && (
        <AccountEditor
          account={editing || undefined}
          onSave={saveAccount}
          onClose={() => setEditing(undefined)}
        />
      )}
    </main>
  );
}
