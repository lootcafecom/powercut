import { NextRequest, NextResponse } from "next/server";
import { getLocalityByPincode } from "@/lib/db/queries";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code")?.trim() ?? "";
  const origin = request.nextUrl.origin;

  if (!/^\d{6}$/.test(code)) {
    return NextResponse.redirect(`${origin}/?pincode_invalid=${encodeURIComponent(code)}`);
  }

  const result = await getLocalityByPincode(code);
  if (!result) {
    return NextResponse.redirect(`${origin}/?pincode_notfound=${code}`);
  }

  return NextResponse.redirect(
    `${origin}/power-cut/${result.state.slug}/${result.city.slug}?locality=${result.locality.slug}`
  );
}
