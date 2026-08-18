import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth/admin-session";

export async function POST() {
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}
