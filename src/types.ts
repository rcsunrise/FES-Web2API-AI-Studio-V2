export type AccountStatus =
  | 'HEALTHY'
  | 'BUSY'
  | 'NEEDS_LOGIN'
  | 'NEEDS_VERIFICATION'
  | 'LOGIN_WINDOW_OPEN'
  | 'COOLDOWN'
  | 'ERROR'
  | 'DISABLED';

export type Capability = 'chat' | 'image_generation' | 'image_edit';

export type Account = {
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

export type AccountInput = {
  id: string;
  provider: string;
  label: string;
  enabled: boolean;
  startUrl: string;
  capabilities: Capability[];
  loggedInUrlContains?: string[];
  verificationUrlContains?: string[];
  selectors: {
    input?: string;
    submit?: string;
    response?: string;
    image?: string;
    loggedIn?: string;
    verification?: string;
  };
};
