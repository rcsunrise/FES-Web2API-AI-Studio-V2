import fs from 'node:fs';
import path from 'node:path';
import type { AccountConfig, RuntimeAccount } from './types';

const dataRoot = path.resolve(process.env.WORKER_DATA_DIR ?? './worker-data');
const accountsFile = path.join(dataRoot, 'accounts.json');
fs.mkdirSync(dataRoot, { recursive: true });

const DEFAULTS: AccountConfig[] = [
  {
    id: 'chatgpt-web-01',
    provider: 'chatgpt-web',
    label: 'ChatGPT Web 01',
    enabled: false,
    startUrl: 'https://chatgpt.com',
    capabilities: ['chat', 'image_generation'],
    loggedInUrlContains: ['chatgpt.com'],
    verificationUrlContains: ['verify', 'challenge'],
    selectors: {}
  },
  {
    id: 'gemini-web-01',
    provider: 'gemini-web',
    label: 'Gemini Web 01',
    enabled: false,
    startUrl: 'https://gemini.google.com/app',
    capabilities: ['chat', 'image_generation'],
    loggedInUrlContains: ['gemini.google.com'],
    verificationUrlContains: ['challenge', 'signin'],
    selectors: {}
  }
];

function ensureFile() {
  if (!fs.existsSync(accountsFile)) {
    fs.writeFileSync(accountsFile, JSON.stringify(DEFAULTS, null, 2), 'utf8');
  }
}

export function readConfigs(): AccountConfig[] {
  ensureFile();
  return JSON.parse(fs.readFileSync(accountsFile, 'utf8'));
}

export function writeConfigs(configs: AccountConfig[]) {
  fs.writeFileSync(accountsFile, JSON.stringify(configs, null, 2), 'utf8');
}

export function loadRuntime(): RuntimeAccount[] {
  return readConfigs().map(a => ({
    ...a,
    status: a.enabled ? 'NEEDS_LOGIN' : 'DISABLED',
    inFlight: 0
  }));
}

export function upsertConfig(input: AccountConfig) {
  const all = readConfigs();
  const idx = all.findIndex(x => x.id === input.id);
  if (idx >= 0) all[idx] = input;
  else all.push(input);
  writeConfigs(all);
  return input;
}

export function patchConfig(id: string, patch: Partial<AccountConfig>) {
  const all = readConfigs();
  const idx = all.findIndex(x => x.id === id);
  if (idx < 0) throw new Error('account not found');
  all[idx] = { ...all[idx], ...patch, id };
  writeConfigs(all);
  return all[idx];
}

export function profileDir(id: string) {
  const safe = id.replace(/[^a-zA-Z0-9._-]/g, '_');
  const dir = path.join(dataRoot, 'profiles', safe);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function assetsDir() {
  const dir = path.join(dataRoot, 'assets');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}
