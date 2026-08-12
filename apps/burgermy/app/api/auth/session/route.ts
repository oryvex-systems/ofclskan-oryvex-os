import { cookies } from "next/headers";
import { NextResponse } from "next/server";

function config() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  return url && key ? { url, key } : null;
}

async function readUser(token: string) {
  const auth = config();
  if (!auth) return null;
  const response = await fetch(`${auth.url}/auth/v1/user`, {
    headers: { apikey: auth.key, Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!response.ok) return null;
  return await response.json() as { id?: string; email?: string; user_metadata?: Record<string, unknown> };
}

export async function GET() {
  const store = await cookies();
  const token = store.get("burgermy-auth-token")?.value;
  if (!token) return NextResponse.json({ authenticated: false });
  const user = await readUser(token);
  if (!user?.id) return NextResponse.json({ authenticated: false });
  return NextResponse.json({ authenticated: true, userId: user.id, email: user.email ?? null, metadata: user.user_metadata ?? {} });
}

export async function POST(request: Request) {
  const auth = config();
  if (!auth) return NextResponse.json({ error: "Oturum bağlantısı yapılandırılmadı." }, { status: 503 });
  const body = await request.json() as { accessToken?: string; expiresIn?: number };
  const accessToken = String(body.accessToken || "");
  if (!accessToken) return NextResponse.json({ error: "Geçersiz oturum." }, { status: 400 });
  const user = await readUser(accessToken);
  if (!user?.id) return NextResponse.json({ error: "Oturum doğrulanamadı." }, { status: 401 });
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
