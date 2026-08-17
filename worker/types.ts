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

export type Selectors = {
  input?: string;
  submit?: string;
  response?: string;
  image?: string;
  loggedIn?: string;
  verification?: string;
};

export type AccountConfig = {
  id: string;
  provider: string;
  label: string;
  enabled: boolean;
  startUrl: string;
  capabilities: Capability[];
  loggedInUrlContains?: string[];
  verificationUrlContains?: string[];
  selectors?: Selectors;
  waits?: {
    responseTimeoutMs?: number;
    imageTimeoutMs?: number;
  };
};

export type RuntimeAccount = AccountConfig & {
  status: AccountStatus;
  inFlight: number;
  lastError?: string;
  lastSeenAt?: string;
};
