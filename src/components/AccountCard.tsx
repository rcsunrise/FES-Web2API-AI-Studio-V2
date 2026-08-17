import type { Account } from '../types';

export default function AccountCard({
  account,
  onLogin,
  onCheck,
  onClose,
  onEdit
}: {
  account: Account;
  onLogin: () => void;
  onCheck: () => void;
  onClose: () => void;
  onEdit: () => void;
}) {
  const actionText =
    account.status === 'NEEDS_VERIFICATION'
      ? '打开验证窗口'
      : account.status === 'NEEDS_LOGIN'
      ? '打开登录窗口'
      : '打开登录窗口';

  return (
    <article className="account-card">
      <div className="account-head">
        <div>
          <div className="account-label">{account.label || account.id}</div>
          <div className="muted">{account.provider} · {account.id}</div>
        </div>
        <span className={`status status-${account.status.toLowerCase()}`}>
          {account.status}
        </span>
      </div>

      <div className="caps">
        {account.capabilities.map(c => <span key={c}>{c}</span>)}
      </div>

      {account.lastError && <div className="error-box">{account.lastError}</div>}

      <div className="meta">
        <span>并发：{account.inFlight}</span>
        <span>启用：{account.enabled ? '是' : '否'}</span>
      </div>

      <div className="actions">
        <button onClick={onLogin}>{actionText}</button>
        <button className="secondary" onClick={onCheck}>检查登录状态</button>
        <button className="secondary" onClick={onEdit}>配置</button>
        {account.status === 'LOGIN_WINDOW_OPEN' && (
          <button className="danger" onClick={onClose}>关闭登录窗口</button>
        )}
      </div>
    </article>
  );
}
