import fs from 'node:fs';
import path from 'node:path';
import { chromium, type BrowserContext, type Page } from 'playwright';
import { assetsDir, profileDir } from './accountStore';
import type { RuntimeAccount, Capability } from './types';
import {
  findInput,
  submitPrompt,
  extractResponse,
  captureGeneratedImage
} from './adapters/genericVisibleAdapter';

type ContextEntry = {
  context: BrowserContext;
  mode: 'login' | 'run';
};

const contexts = new Map<string, ContextEntry>();

async function closeContext(id: string) {
  const entry = contexts.get(id);
  if (entry) {
    contexts.delete(id);
    try { await entry.context.close(); } catch {}
  }
}

async function launch(account: RuntimeAccount, mode: 'login' | 'run') {
  const current = contexts.get(account.id);
  if (current?.mode === mode) return current.context;

  if (current) await closeContext(account.id);

  const headless = mode === 'login'
    ? false
    : (process.env.WORKER_HEADLESS ?? 'true') === 'true';

  const context = await chromium.launchPersistentContext(profileDir(account.id), {
    headless,
    viewport: { width: 1440, height: 1000 }
  });

  contexts.set(account.id, { context, mode });
  return context;
}

async function pageFor(account: RuntimeAccount, mode: 'login' | 'run') {
  const context = await launch(account, mode);
  const page = context.pages()[0] ?? await context.newPage();

  if (!page.url() || page.url() === 'about:blank') {
    await page.goto(account.startUrl, { waitUntil: 'domcontentloaded', timeout: 45_000 });
  }
  return page;
}

async function matchesAnyUrl(page: Page, parts?: string[]) {
  if (!parts?.length) return false;
  const u = page.url().toLowerCase();
  return parts.some(x => u.includes(x.toLowerCase()));
}

async function selectorVisible(page: Page, selector?: string) {
  if (!selector) return false;
  try {
    return await page.locator(selector).first().isVisible({ timeout: 800 });
  } catch {
    return false;
  }
}

export async function detectAuthState(account: RuntimeAccount) {
  const mode = contexts.get(account.id)?.mode ?? 'run';
  const page = await pageFor(account, mode);

  const verification =
    (await matchesAnyUrl(page, account.verificationUrlContains)) ||
    (await selectorVisible(page, account.selectors?.verification));

  if (verification) return 'NEEDS_VERIFICATION' as const;

  const loggedInBySelector = await selectorVisible(page, account.selectors?.loggedIn);
  const loggedInByUrl = await matchesAnyUrl(page, account.loggedInUrlContains);

  // 如果配置了已登录 selector，则优先依赖 selector。
  if (account.selectors?.loggedIn) {
    return loggedInBySelector ? 'HEALTHY' as const : 'NEEDS_LOGIN' as const;
  }

  // URL 规则只能作为弱判断；正式使用建议配置 loggedIn selector。
  if (loggedInByUrl) return 'HEALTHY' as const;
  return 'NEEDS_LOGIN' as const;
}

export async function openLoginWindow(account: RuntimeAccount) {
  const page = await pageFor(account, 'login');
  if (page.url() === 'about:blank') {
    await page.goto(account.startUrl, { waitUntil: 'domcontentloaded' });
  }
  await page.bringToFront();
  return { url: page.url() };
}

export async function closeLoginWindow(account: RuntimeAccount) {
  await closeContext(account.id);
}

export async function testSelector(account: RuntimeAccount, selector: string) {
  if (!selector) throw new Error('selector is required');
  const mode = contexts.get(account.id)?.mode ?? 'login';
  const page = await pageFor(account, mode);
  const count = await page.locator(selector).count();
  const visible = count > 0 ? await page.locator(selector).first().isVisible().catch(() => false) : false;
  return { count, visible, url: page.url() };
}

export async function runCapability(
  account: RuntimeAccount,
  capability: Capability,
  prompt: string
) {
  const page = await pageFor(account, 'run');

  const auth = await detectAuthState(account);
  if (auth !== 'HEALTHY') {
    account.status = auth;
    throw new Error(auth === 'NEEDS_VERIFICATION'
      ? '账号需要人工验证码/二次验证，请打开验证窗口'
      : '账号登录已失效，请打开登录窗口');
  }

  const input = await findInput(page, account);
  await input.click();

  // textarea 和 contenteditable 都兼容
  try {
    await input.fill(prompt);
  } catch {
    await page.keyboard.press('ControlOrMeta+A');
    await page.keyboard.type(prompt);
  }

  await submitPrompt(page, account);

  if (capability === 'chat') {
    const text = await extractResponse(page, account);
    return { text };
  }

  if (capability === 'image_generation') {
    const file = `${account.id}-${Date.now()}.png`;
    const target = path.join(assetsDir(), file);
    await captureGeneratedImage(page, account, target);
    return { assetFile: file };
  }

  throw new Error(`Capability ${capability} is not implemented yet`);
}
