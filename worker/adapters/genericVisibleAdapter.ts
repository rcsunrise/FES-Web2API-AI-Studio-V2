import type { Page } from 'playwright';
import type { RuntimeAccount } from '../types';

async function firstVisible(page: Page, selectors: string[]) {
  for (const selector of selectors) {
    try {
      const loc = page.locator(selector).last();
      if (await loc.isVisible({ timeout: 600 })) return loc;
    } catch {}
  }
  return null;
}

export async function findInput(page: Page, account: RuntimeAccount) {
  const configured = account.selectors?.input;
  if (configured) {
    const loc = page.locator(configured).last();
    await loc.waitFor({ state: 'visible', timeout: 20_000 });
    return loc;
  }

  const loc = await firstVisible(page, [
    'textarea',
    '[contenteditable="true"][role="textbox"]',
    '[contenteditable="true"]'
  ]);
  if (!loc) throw new Error('未找到可见输入框；请在账号配置中填写 selectors.input');
  return loc;
}

export async function submitPrompt(page: Page, account: RuntimeAccount) {
  const configured = account.selectors?.submit;
  if (configured) {
    const btn = page.locator(configured).last();
    await btn.waitFor({ state: 'visible', timeout: 20_000 });
    await btn.click();
    return;
  }

  // 通用策略：先尝试 Enter。若目标站点要求点击按钮，请配置 selectors.submit。
  await page.keyboard.press('Enter');
}

export async function extractResponse(page: Page, account: RuntimeAccount) {
  const configured = account.selectors?.response;
  if (!configured) {
    throw new Error('为保证结果可靠，请配置 selectors.response');
  }

  const loc = page.locator(configured).last();
  await loc.waitFor({
    state: 'visible',
    timeout: account.waits?.responseTimeoutMs ?? 120_000
  });

  let prev = '';
  let stableRounds = 0;
  const deadline = Date.now() + (account.waits?.responseTimeoutMs ?? 120_000);

  while (Date.now() < deadline) {
    const text = (await loc.innerText()).trim();
    if (text && text === prev) stableRounds += 1;
    else stableRounds = 0;
    prev = text;

    if (text && stableRounds >= 3) return text;
    await page.waitForTimeout(900);
  }

  if (prev) return prev;
  throw new Error('等待回复超时');
}

export async function captureGeneratedImage(page: Page, account: RuntimeAccount, targetPath: string) {
  const configured = account.selectors?.image;
  if (!configured) {
    throw new Error('为保证生图结果可靠，请配置 selectors.image');
  }

  const loc = page.locator(configured).last();
  await loc.waitFor({
    state: 'visible',
    timeout: account.waits?.imageTimeoutMs ?? 180_000
  });

  await page.waitForTimeout(1200);
  await loc.screenshot({ path: targetPath });
}
