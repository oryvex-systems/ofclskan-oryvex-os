import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST() {
  const url = process.env.SUPABASE_URL;
  const publishable = process.env.SUPABASE_PUBLISHABLE_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !publishable || !service) return NextResponse.json({ error: "Hesap silme servisi yapılandırılmadı." }, { status: 503 });

  const store = await cookies();
  const token = store.get("burgermy-auth-token")?.value;
  if (!token) return NextResponse.json({ error: "Oturum bulunamadı." }, { status: 401 });
  const userResponse = await fetch(`${url}/auth/v1/user`, { headers: { apikey: publishable, Authorization: `Bearer ${token}` }, cache: "no-store" });
  if (!userResponse.ok) return NextResponse.json({ error: "Oturum doğrulanamadı." }, { status: 401 });
  const user = await userResponse.json() as { id?: string };
  if (!user.id) return NextResponse.json({ error: "Kullanıcı bulunamadı." }, { status: 404 });

  // Remove directly identifiable profile data first. Legally required commerce records may remain.
  await fetch(`${url}/rest/v1/payment_sessions?user_id=eq.${encodeURIComponent(user.id)}`, { method: "PATCH", headers: { apikey: service, Authorization: `Bearer ${service}`, "Content-Type": "application/json", Prefer: "return=minimal" }, body: JSON.stringify({ user_id: null }) });
  await fetch(`${url}/rest/v1/profiles?id=eq.${encodeURIComponent(user.id)}`, { method: "DELETE", headers: { apikey: service, Authorization: `Bearer ${service}`, Prefer: "return=minimal" } });

  const deleteResponse = await fetch(`${url}/auth/v1/admin/users/${encodeURIComponent(user.id)}`, { method: "DELETE", headers: { apikey: service, Authorization: `Bearer ${service}` } });
  if (!deleteResponse.ok) return NextResponse.json({ error: "Hesap silinemedi." }, { status: 502 });
  const result = NextResponse.json({ ok: true });
  result.cookies.set("burgermy-auth-token", "", { httpOnly: true, path: "/", maxAge: 0 });
  return result;
}
