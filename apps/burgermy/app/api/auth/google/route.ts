import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return NextResponse.json({ error: "Google girişi henüz yapılandırılmadı." }, { status: 503 });

  const origin = new URL(request.url).origin;
  const redirectTo = `${origin}/?auth=google`;
  const authorize = new URL(`${url}/auth/v1/authorize`);
  authorize.searchParams.set("provider", "google");
  authorize.searchParams.set("redirect_to", redirectTo);

  return NextResponse.redirect(authorize);
}
