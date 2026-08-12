import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return NextResponse.json({ error: "Oturum bağlantısı yapılandırılmadı." }, { status: 503 });

  const body = await request.json() as { accessToken?: string; expiresIn?: number };
  const accessToken = String(body.accessToken || "");
  if (!accessToken) return NextResponse.json({ error: "Geçersiz oturum." }, { status: 400 });

  const userResponse = await fetch(`${url}/auth/v1/user`, {
    headers: { apikey: key, Authorization: `Bearer ${accessToken}` },
  });
  const user = await userResponse.json() as { id?: string; email?: string };
  if (!userResponse.ok || !user.id) return NextResponse.json({ error: "Oturum doğrulanamadı." }, { status: 401 });

  const result = NextResponse.json({ ok: true, userId: user.id, email: user.email ?? null });
  result.cookies.set("burgermy-auth-token", accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Math.min(Number(body.expiresIn || 3600), 3600),
  });
  return result;
}

export async function DELETE() {
  const result = NextResponse.json({ ok: true });
  result.cookies.set("burgermy-auth-token", "", { httpOnly: true, path: "/", maxAge: 0 });
  return result;
}
