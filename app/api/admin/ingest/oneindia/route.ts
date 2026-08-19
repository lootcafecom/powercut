import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "@/lib/auth/admin-session";
import { isValidSessionToken } from "@/lib/auth/session-token";
import { ingestOneIndia } from "@/lib/sources/ingest-oneindia";

const INGEST_SECRET = process.env.INGEST_SECRET;

async function isAuthorized(request: NextRequest): Promise<boolean> {
  const sessionToken = await getSessionCookie();
  if (isValidSessionToken(sessionToken)) return true;

  const providedSecret = request.headers.get("x-ingest-secret");
  if (INGEST_SECRET && providedSecret === INGEST_SECRET) return true;

  return false;
}

export async function POST(request: NextRequest) {
  if (!(await isAuthorized(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const summary = await ingestOneIndia();
  return NextResponse.json(summary);
}
