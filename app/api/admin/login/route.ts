import { NextRequest, NextResponse } from "next/server";
import { setSessionCookie } from "@/lib/auth/admin-session";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "powercut-admin";

export async function POST(request: NextRequest) {
  const { password } = await request.json();
  if (password !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }
  await setSessionCookie();
  return NextResponse.json({ ok: true });
}
