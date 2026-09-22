// Minimal admin auth: a single shared password (ADMIN_PASSWORD env).
// The login cookie holds a SHA-256 token derived from the password, so the raw
// password is never stored in the cookie. Edge-safe (uses Web Crypto only),
// so it works in middleware too.

export const COOKIE = "rw_admin";

// When no password is set (local dev) auth is disabled and the UI is open.
export function authDisabled() {
  return !process.env.ADMIN_PASSWORD;
}

async function sha256Hex(str) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function expectedToken() {
  return await sha256Hex("rw-admin:" + (process.env.ADMIN_PASSWORD || ""));
}

export async function isValidCookie(value) {
  if (authDisabled()) return true;
  if (!value) return false;
  return value === (await expectedToken());
}
