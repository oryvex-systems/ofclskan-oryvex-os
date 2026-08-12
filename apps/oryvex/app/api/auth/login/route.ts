import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: "Kimlik doğrulama yapılandırması eksik." }, { status: 500 });
  }

  const body = await request.json();
  const email = String(body.email || "").trim();
  const password = String(body.password || "");
  const remember = Boolean(body.remember);

  if (!email || !password) {
    return NextResponse.json({ error: "E-posta ve şifre zorunludur." }, { status: 400 });
  }

  const authResponse = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: supabaseAnonKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
    cache: "no-store",
  });

  const auth = await authResponse.json();
  if (!authResponse.ok || !auth.access_token) {
    return NextResponse.json({ error: "E-posta veya şifre hatalı." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true, user: auth.user });
  const maxAge = remember ? 60 * 60 * 24 * 30 : undefined;

  response.cookies.set("oryvex_access_token", auth.access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  });

  if (auth.refresh_token) {
    response.cookies.set("oryvex_refresh_token", auth.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge,
    });
  }

  return response;
}
