import { listAccounts } from './browser/workerClient';
import type { Capability } from './types';

export async function chooseAccount(capability: Capability, preferredProvider?: string) {
  const accounts = await listAccounts();
  const eligible = accounts
    .filter(a => a.enabled)
    .filter(a => a.status === 'HEALTHY')
    .filter(a => a.capabilities.includes(capability))
    .filter(a => !preferredProvider || a.provider === preferredProvider)
    .sort((a, b) => a.inFlight - b.inFlight);

  if (!eligible.length) {
    throw new Error(`没有 HEALTHY Web 节点支持能力：${capability}`);
  }
  return eligible[0];
}

export async function buildCapabilities() {
  const accounts = await listAccounts();
  const names: Capability[] = ['chat', 'image_generation', 'image_edit'];

  return Object.fromEntries(
    names.map(name => {
      const matched = accounts.filter(
        a => a.enabled && a.status === 'HEALTHY' && a.capabilities.includes(name)
      );
      return [name, { available: matched.length > 0, accounts: matched.map(a => a.id) }];
    })
  );
}
