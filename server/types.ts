export type Capability = 'chat' | 'image_generation' | 'image_edit';

export type AccountStatus =
  | 'HEALTHY'
  | 'BUSY'
  | 'NEEDS_LOGIN'
  | 'NEEDS_VERIFICATION'
  | 'LOGIN_WINDOW_OPEN'
  | 'COOLDOWN'
  | 'ERROR'
  | 'DISABLED';

export type AccountView = {
  id: string;
  provider: string;
  label: string;
  enabled: boolean;
  status: AccountStatus;
  capabilities: Capability[];
  inFlight: number;
  lastError?: string;
  lastSeenAt?: string;
  startUrl: string;
  loggedInUrlContains?: string[];
  verificationUrlContains?: string[];
};

export type RunRequest = {
  accountId: string;
  capability: Capability;
  prompt: string;
};

export type RunResponse = {
  ok: boolean;
  accountId: string;
  text?: string;
  assetUrl?: string;
  error?: string;
};
