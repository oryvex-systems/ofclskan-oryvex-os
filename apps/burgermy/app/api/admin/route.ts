import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const allowedStatuses = new Set(["received", "preparing", "courier_assigned", "on_the_way", "delivered", "cancelled"]);
const mutableSettings = new Set(["delivery_enabled", "pickup_enabled", "online_card_enabled", "door_pos_enabled", "minimum_order", "free_delivery_threshold", "order_notifications_enabled", "customer_notifications_enabled"]);

function env() {
  const url = process.env.SUPABASE_URL;
  const publishable = process.env.SUPABASE_PUBLISHABLE_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && publishable && service ? { url, publishable, service } : null;
}

function adminHeaders(config: NonNullable<ReturnType<typeof env>>) {
  return { apikey: config.service, Authorization: `Bearer ${config.service}`, "Content-Type": "application/json", Prefer: "return=representation" };
}

async function authorize(config: NonNullable<ReturnType<typeof env>>) {
  const store = await cookies();
  const token = store.get("burgermy-auth-token")?.value;
  if (!token) return null;
  const userResponse = await fetch(`${config.url}/auth/v1/user`, { headers: { apikey: config.publishable, Authorization: `Bearer ${token}` }, cache: "no-store" });
  const user = await userResponse.json() as { id?: string; email?: string };
  if (!userResponse.ok || !user.id) return null;

  const sellerResponse = await fetch(`${config.url}/rest/v1/sellers?slug=eq.burgermy&select=id,name&limit=1`, { headers: adminHeaders(config), cache: "no-store" });
  const seller = (await sellerResponse.json() as Array<{ id: string; name: string }>)[0];
  if (!seller) return null;

  const memberResponse = await fetch(`${config.url}/rest/v1/seller_members?seller_id=eq.${encodeURIComponent(seller.id)}&user_id=eq.${encodeURIComponent(user.id)}&is_active=eq.true&select=role&limit=1`, { headers: adminHeaders(config), cache: "no-store" });
  const member = (await memberResponse.json() as Array<{ role: string }>)[0];
  if (!member || !["owner", "manager", "kitchen"].includes(member.role)) return null;
  return { user, seller, role: member.role };
}

export async function GET() {
  const config = env();
  if (!config) return NextResponse.json({ error: "Yönetim servisi yapılandırılmadı." }, { status: 503 });
  const auth = await authorize(config);
  if (!auth) return NextResponse.json({ error: "Yönetim yetkisi gerekli." }, { status: 403 });

  const headers = adminHeaders(config);
  const sellerId = encodeURIComponent(auth.seller.id);
  const [ordersResponse, settingsResponse, branchesResponse] = await Promise.all([
    fetch(`${config.url}/rest/v1/orders?seller_id=eq.${sellerId}&select=id,order_no,status,payment_status,payment_method,total_amount,fulfillment_type,estimated_min,estimated_max,created_at,branch_id&order=created_at.desc&limit=100`, { headers, cache: "no-store" }),
    fetch(`${config.url}/rest/v1/seller_settings?seller_id=eq.${sellerId}&select=*`, { headers, cache: "no-store" }),
    fetch(`${config.url}/rest/v1/branches?seller_id=eq.${sellerId}&select=id,name,slug,is_active,supports_delivery,supports_pickup,delivery_fee,minimum_order&order=created_at.asc`, { headers, cache: "no-store" }),
  ]);

  const orders = ordersResponse.ok ? await ordersResponse.json() : [];
  const settings = settingsResponse.ok ? (await settingsResponse.json() as any[])[0] ?? null : null;
  const branches = branchesResponse.ok ? await branchesResponse.json() : [];
  return NextResponse.json({ role: auth.role, email: auth.user.email ?? null, seller: auth.seller, orders, settings, branches }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function PATCH(request: Request) {
  const config = env();
  if (!config) return NextResponse.json({ error: "Yönetim servisi yapılandırılmadı." }, { status: 503 });
  const auth = await authorize(config);
  if (!auth) return NextResponse.json({ error: "Yönetim yetkisi gerekli." }, { status: 403 });

  const body = await request.json() as { action?: "order_status" | "settings"; orderId?: string; status?: string; settings?: Record<string, unknown> };
  const headers = adminHeaders(config);

  if (body.action === "order_status") {
    if (!body.orderId || !body.status || !allowedStatuses.has(body.status)) return NextResponse.json({ error: "Geçersiz sipariş durumu." }, { status: 400 });
    const response = await fetch(`${config.url}/rest/v1/orders?id=eq.${encodeURIComponent(body.orderId)}&seller_id=eq.${encodeURIComponent(auth.seller.id)}`, {
      method: "PATCH", headers, body: JSON.stringify({ status: body.status, updated_at: new Date().toISOString() }), cache: "no-store",
    });
    const data = await response.json();
    if (!response.ok) return NextResponse.json({ error: "Sipariş durumu güncellenemedi." }, { status: 502 });
    return NextResponse.json({ ok: true, order: Array.isArray(data) ? data[0] ?? null : null });
  }

  if (body.action === "settings") {
    if (!["owner", "manager"].includes(auth.role)) return NextResponse.json({ error: "Bu ayar için yönetici yetkisi gerekli." }, { status: 403 });
    const incoming = body.settings && typeof body.settings === "object" ? body.settings : {};
    const update: Record<string, unknown> = { updated_at: new Date().toISOString(), cash_enabled: false };
    for (const [key, value] of Object.entries(incoming)) if (mutableSettings.has(key)) update[key] = value;
    const response = await fetch(`${config.url}/rest/v1/seller_settings?seller_id=eq.${encodeURIComponent(auth.seller.id)}`, {
      method: "PATCH", headers, body: JSON.stringify(update), cache: "no-store",
    });
    const data = await response.json();
    if (!response.ok) return NextResponse.json({ error: "Ayarlar güncellenemedi." }, { status: 502 });
    return NextResponse.json({ ok: true, settings: Array.isArray(data) ? data[0] ?? null : null });
  }

  return NextResponse.json({ error: "Geçersiz yönetim işlemi." }, { status: 400 });
}
