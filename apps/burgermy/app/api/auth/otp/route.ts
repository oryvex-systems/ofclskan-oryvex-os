import { NextResponse } from "next/server";

function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, "").replace(/^90/, "");
  return digits.length === 10 && digits.startsWith("5") ? `+90${digits}` : "";
}

function authConfig() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  return url && key ? { url, key } : null;
}

export async function POST(request: Request) {
  const config = authConfig();
  if (!config) return NextResponse.json({ error: "SMS doğrulama bağlantısı henüz yapılandırılmadı.", configured: false }, { status: 503 });

  const body = await request.json() as { action?: "send" | "verify"; phone?: string; token?: string };
  const phone = normalizePhone(body.phone ?? "");
  if (!phone) return NextResponse.json({ error: "Geçerli bir Türkiye cep telefonu girin." }, { status: 400 });

  const endpoint = body.action === "verify" ? "/auth/v1/verify" : "/auth/v1/otp";
  const payload = body.action === "verify"
    ? { type: "sms", phone, token: body.token?.replace(/\D/g, "").slice(0, 6) }
    : { phone, create_user: true };
  if (body.action === "verify" && String(payload.token ?? "").length !== 6) {
    return NextResponse.json({ error: "Doğrulama kodu 6 haneli olmalı." }, { status: 400 });
  }

  const response = await fetch(`${config.url}${endpoint}`, {
    method: "POST",
    headers: { apikey: config.key, Authorization: `Bearer ${config.key}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await response.json() as { access_token?: string; expires_in?: number; user?: { id?: string; phone?: string }; message?: string; msg?: string; error_description?: string };
  if (!response.ok) {
    const error = response.status === 429 ? "Çok sık kod istendi. Lütfen biraz bekleyin." : (data.message || data.msg || data.error_description || "SMS doğrulama işlemi tamamlanamadı.");
    return NextResponse.json({ error }, { status: response.status });
  }
  if (body.action !== "verify") return NextResponse.json({ ok: true, retryAfter: 60 });
  if (!data.access_token || !data.user?.id) return NextResponse.json({ error: "Telefon doğrulanamadı." }, { status: 401 });

  const result = NextResponse.json({ ok: true, phone: data.user.phone ?? phone, userId: data.user.id });
  result.cookies.set("burgermy-auth-token", data.access_token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: Math.min(data.expires_in ?? 3600, 3600) });
  return result;
}
