const ADMIN_USERNAME = "admin";
const DEFAULT_PASSWORD_HASH =
  "d74ff0ee8da3b9806b18c877dbf29bbde50b5bd8e4dad7a3a725000feb82e8f1";
const AUTO_LOGIN_ENABLED = true;

const PASSWORD_HASH_KEY = "bc.admin.passwordHash.v1";
const SESSION_KEY = "bc.admin.session.v1";

interface AdminSession {
  username: string;
  loggedInAt: string;
}

function createSession(): AdminSession {
  return {
    username: ADMIN_USERNAME,
    loggedInAt: new Date().toISOString()
  };
}

function ensureSession(): void {
  if (!AUTO_LOGIN_ENABLED) {
    return;
  }

  const raw = window.localStorage.getItem(SESSION_KEY);
  if (!raw) {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(createSession()));
    return;
  }

  try {
    const parsed = JSON.parse(raw) as AdminSession;
    if (parsed.username !== ADMIN_USERNAME) {
      window.localStorage.setItem(SESSION_KEY, JSON.stringify(createSession()));
    }
  } catch {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(createSession()));
  }
}

function ensurePasswordHash(): string {
  const existing = window.localStorage.getItem(PASSWORD_HASH_KEY);
  if (existing) {
    return existing;
  }

  window.localStorage.setItem(PASSWORD_HASH_KEY, DEFAULT_PASSWORD_HASH);
  return DEFAULT_PASSWORD_HASH;
}

async function sha256(value: string): Promise<string> {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function getAdminUsername(): string {
  return ADMIN_USERNAME;
}

export function isAuthenticated(): boolean {
  if (AUTO_LOGIN_ENABLED) {
    ensurePasswordHash();
    ensureSession();
    return true;
  }

  const raw = window.localStorage.getItem(SESSION_KEY);
  if (!raw) {
    return false;
  }

  try {
    const parsed = JSON.parse(raw) as AdminSession;
    return parsed.username === ADMIN_USERNAME;
  } catch {
    return false;
  }
}

export function logout(): void {
  window.localStorage.removeItem(SESSION_KEY);
}

export async function login(username: string, password: string): Promise<boolean> {
  ensurePasswordHash();
  if (username.trim() !== ADMIN_USERNAME) {
    return false;
  }

  const candidateHash = await sha256(password);
  const savedHash = ensurePasswordHash();

  if (candidateHash !== savedHash) {
    return false;
  }

  const session: AdminSession = {
    username: ADMIN_USERNAME,
    loggedInAt: new Date().toISOString()
  };

  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return true;
}

export async function changePassword(
  oldPassword: string,
  newPassword: string,
  confirmPassword: string
): Promise<{ ok: boolean; message: string }> {
  const currentHash = ensurePasswordHash();
  const oldHash = await sha256(oldPassword);

  if (oldHash !== currentHash) {
    return { ok: false, message: "Current password is incorrect." };
  }

  if (newPassword.length < 6) {
    return { ok: false, message: "New password must be at least 6 characters." };
  }

  if (newPassword !== confirmPassword) {
    return { ok: false, message: "New password and confirmation do not match." };
  }

  const nextHash = await sha256(newPassword);
  window.localStorage.setItem(PASSWORD_HASH_KEY, nextHash);

  return { ok: true, message: "Password updated successfully." };
}

export function requireAdminAuth(redirectTo = "/admin/login"): void {
  if (AUTO_LOGIN_ENABLED) {
    ensurePasswordHash();
    ensureSession();
    return;
  }

  if (!isAuthenticated()) {
    window.location.assign(redirectTo);
  }
}
