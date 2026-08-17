import { useMemo, useState } from 'react';
import type { Account, AccountInput, Capability } from '../types';

const allCaps: Capability[] = ['chat', 'image_generation', 'image_edit'];

function csv(v?: string[]) {
  return (v || []).join(',');
}

export default function AccountEditor({
  account,
  onSave,
  onClose
}: {
  account?: Account;
  onSave: (input: AccountInput) => Promise<void>;
  onClose: () => void;
}) {
  const [id, setId] = useState(account?.id || '');
  const [provider, setProvider] = useState(account?.provider || 'chatgpt-web');
  const [label, setLabel] = useState(account?.label || '');
  const [enabled, setEnabled] = useState(account?.enabled ?? true);
  const [startUrl, setStartUrl] = useState(account?.startUrl || '');
  const [capabilities, setCapabilities] = useState<Capability[]>(
    account?.capabilities || ['chat', 'image_generation']
  );
  const [loggedInUrlContains, setLoggedInUrlContains] = useState(csv(account?.loggedInUrlContains));
  const [verificationUrlContains, setVerificationUrlContains] = useState(csv(account?.verificationUrlContains));

  const [inputSelector, setInputSelector] = useState('');
  const [submitSelector, setSubmitSelector] = useState('');
  const [responseSelector, setResponseSelector] = useState('');
  const [imageSelector, setImageSelector] = useState('');
  const [loggedInSelector, setLoggedInSelector] = useState('');
  const [verificationSelector, setVerificationSelector] = useState('');
  const [saving, setSaving] = useState(false);

  const title = useMemo(() => account ? `编辑 ${account.label || account.id}` : '新增 Web 账号', [account]);

  function toggleCap(cap: Capability) {
    setCapabilities(prev => prev.includes(cap) ? prev.filter(x => x !== cap) : [...prev, cap]);
  }

  async function save() {
    setSaving(true);
    try {
      await onSave({
        id: id.trim(),
        provider: provider.trim(),
        label: label.trim() || id.trim(),
        enabled,
        startUrl: startUrl.trim(),
        capabilities,
        loggedInUrlContains: loggedInUrlContains.split(',').map(x => x.trim()).filter(Boolean),
        verificationUrlContains: verificationUrlContains.split(',').map(x => x.trim()).filter(Boolean),
        selectors: {
          input: inputSelector.trim() || undefined,
          submit: submitSelector.trim() || undefined,
          response: responseSelector.trim() || undefined,
          image: imageSelector.trim() || undefined,
          loggedIn: loggedInSelector.trim() || undefined,
          verification: verificationSelector.trim() || undefined
        }
      });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="secondary" onClick={onClose}>关闭</button>
        </div>

        <div className="form-grid">
          <label>账号 ID<input value={id} disabled={!!account} onChange={e => setId(e.target.value)} /></label>
          <label>平台
            <select value={provider} onChange={e => setProvider(e.target.value)}>
              <option value="chatgpt-web">chatgpt-web</option>
              <option value="gemini-web">gemini-web</option>
              <option value="custom-web">custom-web</option>
            </select>
          </label>
          <label>显示名称<input value={label} onChange={e => setLabel(e.target.value)} /></label>
          <label>起始 URL<input value={startUrl} onChange={e => setStartUrl(e.target.value)} placeholder="https://..." /></label>
          <label className="wide">登录成功 URL 关键字（逗号分隔）
            <input value={loggedInUrlContains} onChange={e => setLoggedInUrlContains(e.target.value)} />
          </label>
          <label className="wide">验证页面 URL 关键字（逗号分隔）
            <input value={verificationUrlContains} onChange={e => setVerificationUrlContains(e.target.value)} />
          </label>
        </div>

        <div className="section-title">能力</div>
        <div className="caps selectable">
          {allCaps.map(cap => (
            <button
              key={cap}
              className={capabilities.includes(cap) ? 'cap-on' : 'cap-off'}
              onClick={() => toggleCap(cap)}
            >
              {cap}
            </button>
          ))}
        </div>

        <div className="section-title">可选 DOM Selector</div>
        <p className="muted">
          不填则由通用适配器尝试页面可见元素。页面结构经常变化，生产使用建议配置并测试。
        </p>
        <div className="form-grid">
          <label>输入框<input value={inputSelector} onChange={e => setInputSelector(e.target.value)} /></label>
          <label>发送按钮<input value={submitSelector} onChange={e => setSubmitSelector(e.target.value)} /></label>
          <label>回复元素<input value={responseSelector} onChange={e => setResponseSelector(e.target.value)} /></label>
          <label>生成图片元素<input value={imageSelector} onChange={e => setImageSelector(e.target.value)} /></label>
          <label>已登录标识<input value={loggedInSelector} onChange={e => setLoggedInSelector(e.target.value)} /></label>
          <label>需要验证标识<input value={verificationSelector} onChange={e => setVerificationSelector(e.target.value)} /></label>
        </div>

        <label className="check">
          <input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} />
          启用该账号
        </label>

        <div className="modal-actions">
          <button disabled={saving || !id.trim() || !startUrl.trim()} onClick={save}>
            {saving ? '保存中…' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
}
