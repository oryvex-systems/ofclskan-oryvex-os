import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return NextResponse.json({ error: "Apple girişi henüz yapılandırılmadı." }, { status: 503 });

  const origin = new URL(request.url).origin;
  const redirectTo = `${origin}/?auth=apple`;
  const authorize = new URL(`${url}/auth/v1/authorize`);
  authorize.searchParams.set("provider", "apple");
  authorize.searchParams.set("redirect_to", redirectTo);

  return NextResponse.redirect(authorize);
}
