import { cookies } from "next/headers";
import { COOKIE_NAME, createSessionToken } from "./session-token";

export async function getSessionCookie() {
  const store = await cookies();
  return store.get(COOKIE_NAME)?.value;
}

export async function setSessionCookie() {
  const store = await cookies();
  store.set(COOKIE_NAME, createSessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export { COOKIE_NAME } from "./session-token";
