import crypto from "crypto";

/**
 * MVP admin auth — see admin-session.ts for context. This file holds the
 * pure crypto logic so it can be imported from middleware.ts without
 * pulling in next/headers (which only works inside RSC/route handlers).
 */

export const COOKIE_NAME = "powercut_admin_session";
const SECRET = process.env.ADMIN_SESSION_SECRET || "dev-only-insecure-secret";

function sign(value: string) {
  return crypto.createHmac("sha256", SECRET).update(value).digest("hex");
}

export function createSessionToken() {
  const issuedAt = Date.now().toString();
  return `${issuedAt}.${sign(issuedAt)}`;
}

export function isValidSessionToken(token: string | undefined) {
  if (!token) return false;
  const [issuedAt, sig] = token.split(".");
  if (!issuedAt || !sig) return false;
  if (sig !== sign(issuedAt)) return false;
  const ageMs = Date.now() - Number(issuedAt);
  return ageMs >= 0 && ageMs < 1000 * 60 * 60 * 12; // 12 hour session
}
