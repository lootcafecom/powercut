import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { and, eq, gte } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { userReportInputSchema } from "@/lib/validators/user-report";

const RATE_LIMIT_MINUTES = 30;

function hashIp(ip: string): string {
  const salt = process.env.ADMIN_SESSION_SECRET || "dev-only-insecure-secret";
  return crypto.createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}

function getClientIp(request: NextRequest): string {
  // Railway (and most PaaS) sit behind a proxy — the real client IP is in
  // x-forwarded-for, not the raw connection.
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return "unknown";
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = userReportInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid submission", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const ipHash = hashIp(getClientIp(request));
  const cutoff = new Date(Date.now() - RATE_LIMIT_MINUTES * 60 * 1000).toISOString();

  const recent = await db
    .select({ id: schema.userReports.id })
    .from(schema.userReports)
    .where(
      and(
        eq(schema.userReports.localityId, parsed.data.localityId),
        eq(schema.userReports.reporterIpHash, ipHash),
        gte(schema.userReports.createdAt, cutoff)
      )
    )
    .limit(1);

  if (recent[0]) {
    return NextResponse.json(
      { error: `You've already reported this area recently. Try again later.` },
      { status: 429 }
    );
  }

  const [locality] = await db
    .select({ cityId: schema.localities.cityId })
    .from(schema.localities)
    .where(eq(schema.localities.id, parsed.data.localityId))
    .limit(1);

  if (!locality) {
    return NextResponse.json({ error: "Unknown locality" }, { status: 400 });
  }

  await db.insert(schema.userReports).values({
    cityId: locality.cityId,
    localityId: parsed.data.localityId,
    description: parsed.data.description || undefined,
    reporterIpHash: ipHash,
    createdAt: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true });
}
