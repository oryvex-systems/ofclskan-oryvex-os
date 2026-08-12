import { NextResponse } from "next/server";

function config() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  return url && key ? { url, key } : null;
}

function setSessionCookie(response: NextResponse, token: string, expiresIn = 3600) {
  response.cookies.set("burgermy-auth-token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Math.min(expiresIn, 3600),
  });
}

export async function POST(request: Request) {
  const auth = config();
  if (!auth) return NextResponse.json({ error: "E-posta girişi henüz yapılandırılmadı." }, { status: 503 });

  const body = await request.json() as { action?: "signin" | "signup"; email?: string; password?: string };
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  if (!/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({ error: "Geçerli bir e-posta adresi girin." }, { status: 400 });
  if (password.length < 6) return NextResponse.json({ error: "Şifre en az 6 karakter olmalı." }, { status: 400 });

  const signup = body.action === "signup";
  const endpoint = signup ? "/auth/v1/signup" : "/auth/v1/token?grant_type=password";
  const response = await fetch(`${auth.url}${endpoint}`, {
    method: "POST",
    headers: { apikey: auth.key, Authorization: `Bearer ${auth.key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await response.json() as { access_token?: string; expires_in?: number; user?: { id?: string; email?: string }; message?: string; msg?: string; error_description?: string };
  if (!response.ok) {
    const message = data.message || data.msg || data.error_description || (signup ? "Kayıt oluşturulamadı." : "E-posta veya şifre hatalı.");
    return NextResponse.json({ error: message }, { status: response.status });
  }

  if (signup && !data.access_token) {
    return NextResponse.json({ ok: true, confirmationRequired: true, email });
  }
  if (!data.access_token || !data.user?.id) return NextResponse.json({ error: "Oturum açılamadı." }, { status: 401 });

  const result = NextResponse.json({ ok: true, userId: data.user.id, email: data.user.email || email });
  setSessionCookie(result, data.access_token, data.expires_in);
  return result;
}
