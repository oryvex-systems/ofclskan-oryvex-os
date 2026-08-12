import { cookies } from "next/headers";
import { NextResponse } from "next/server";

type IncomingItem = {
  productId: string;
  quantity: number;
  selectedOptions?: unknown;
};

function env() {
  const url = process.env.SUPABASE_URL;
  const publishable = process.env.SUPABASE_PUBLISHABLE_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && publishable && service ? { url, publishable, service } : null;
}

async function getUser(config: ReturnType<typeof env>) {
  if (!config) return null;
  const store = await cookies();
  const token = store.get("burgermy-auth-token")?.value;
  if (!token) return null;
  const response = await fetch(`${config.url}/auth/v1/user`, {
    headers: { apikey: config.publishable, Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!response.ok) return null;
  return await response.json() as { id: string; email?: string };
}

function adminHeaders(config: NonNullable<ReturnType<typeof env>>) {
  return {
    apikey: config.service,
    Authorization: `Bearer ${config.service}`,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  };
}

export async function POST(request: Request) {
  const config = env();
  if (!config) return NextResponse.json({ error: "Sipariş servisi yapılandırılmadı." }, { status: 503 });
  const user = await getUser(config);
  if (!user) return NextResponse.json({ error: "Sipariş vermek için giriş yapmalısınız." }, { status: 401 });

  const body = await request.json() as {
    branchId?: string;
    fulfillmentType?: "delivery" | "pickup";
    paymentMethod?: "paytr" | "door_pos";
    customerNote?: string;
    items?: IncomingItem[];
  };
  const items = Array.isArray(body.items) ? body.items.filter(item => item.productId && Number(item.quantity) > 0) : [];
  if (!items.length) return NextResponse.json({ error: "Sepet boş." }, { status: 400 });

  const sellerResponse = await fetch(`${config.url}/rest/v1/sellers?slug=eq.burgermy&select=id&limit=1`, { headers: adminHeaders(config), cache: "no-store" });
  const sellers = await sellerResponse.json() as Array<{ id: string }>;
  const seller = sellers[0];
  if (!seller) return NextResponse.json({ error: "BURGERMY mağazası bulunamadı." }, { status: 404 });

  const settingsResponse = await fetch(`${config.url}/rest/v1/seller_settings?seller_id=eq.${encodeURIComponent(seller.id)}&select=*`, { headers: adminHeaders(config), cache: "no-store" });
  const settings = (await settingsResponse.json() as Array<any>)[0];
  const fulfillmentType = body.fulfillmentType === "pickup" ? "pickup" : "delivery";
  if (fulfillmentType === "delivery" && settings && !settings.delivery_enabled) return NextResponse.json({ error: "Paket servis şu anda kapalı." }, { status: 409 });
  if (fulfillmentType === "pickup" && settings && !settings.pickup_enabled) return NextResponse.json({ error: "Gel-Al şu anda kapalı." }, { status: 409 });
  if (body.paymentMethod === "door_pos" && settings && !settings.door_pos_enabled) return NextResponse.json({ error: "Kapıda POS şu anda kapalı." }, { status: 409 });
  if (body.paymentMethod !== "door_pos" && settings && !settings.online_card_enabled) return NextResponse.json({ error: "Online ödeme şu anda kapalı." }, { status: 409 });

  const productIds = [...new Set(items.map(item => item.productId))];
  const inFilter = productIds.map(id => `"${id.replace(/"/g, "")}"`).join(",");
  const productsResponse = await fetch(`${config.url}/rest/v1/products?id=in.(${encodeURIComponent(inFilter)})&seller_id=eq.${encodeURIComponent(seller.id)}&is_active=eq.true&select=id,name,price`, { headers: adminHeaders(config), cache: "no-store" });
  const products = await productsResponse.json() as Array<{ id: string; name: string; price: number | string }>;
  const byId = new Map(products.map(product => [product.id, product]));
  if (products.length !== productIds.length) return NextResponse.json({ error: "Sepette satışta olmayan ürün var." }, { status: 409 });

  let branch: any = null;
  if (body.branchId) {
    const branchResponse = await fetch(`${config.url}/rest/v1/branches?id=eq.${encodeURIComponent(body.branchId)}&seller_id=eq.${encodeURIComponent(seller.id)}&is_active=eq.true&select=id,delivery_fee,minimum_order,prep_minutes_min,prep_minutes_max,supports_delivery,supports_pickup&limit=1`, { headers: adminHeaders(config), cache: "no-store" });
    branch = (await branchResponse.json() as Array<any>)[0] ?? null;
  }
  if (!branch) return NextResponse.json({ error: "Geçerli bir şube seçin." }, { status: 400 });
  if (fulfillmentType === "delivery" && !branch.supports_delivery) return NextResponse.json({ error: "Bu şube paket servis vermiyor." }, { status: 409 });
  if (fulfillmentType === "pickup" && !branch.supports_pickup) return NextResponse.json({ error: "Bu şubede Gel-Al kapalı." }, { status: 409 });

  const normalized = items.map(item => {
    const product = byId.get(item.productId)!;
    const quantity = Math.min(20, Math.max(1, Math.floor(Number(item.quantity))));
    const unitPrice = Number(product.price);
    return { product, quantity, unitPrice, lineTotal: unitPrice * quantity, selectedOptions: item.selectedOptions ?? [] };
  });
  const subtotal = normalized.reduce((sum, item) => sum + item.lineTotal, 0);
  const minimumOrder = Math.max(Number(branch.minimum_order || 0), Number(settings?.minimum_order || 0));
  if (subtotal < minimumOrder) return NextResponse.json({ error: `Minimum sipariş tutarı ₺${minimumOrder.toFixed(0)}.` }, { status: 409 });
  const deliveryFee = fulfillmentType === "delivery" ? Number(branch.delivery_fee || 0) : 0;
  const total = subtotal + deliveryFee;
  const now = new Date();
  const orderNo = `BM${String(now.getFullYear()).slice(-2)}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
  const paymentMethod = body.paymentMethod === "door_pos" ? "door_pos" : "paytr";

  const orderResponse = await fetch(`${config.url}/rest/v1/orders`, {
    method: "POST",
    headers: adminHeaders(config),
    body: JSON.stringify({
      order_no: orderNo,
      user_id: user.id,
      seller_id: seller.id,
      branch_id: branch.id,
      fulfillment_type: fulfillmentType,
      status: "received",
      payment_status: "pending",
      payment_method: paymentMethod,
      subtotal,
      delivery_fee: deliveryFee,
      discount_amount: 0,
      total_amount: total,
      estimated_min: branch.prep_minutes_min,
      estimated_max: branch.prep_minutes_max,
      customer_note: String(body.customerNote || "").slice(0, 500) || null,
    }),
  });
  const createdOrders = await orderResponse.json() as Array<{ id: string; order_no: string }> | { message?: string };
  if (!orderResponse.ok || !Array.isArray(createdOrders) || !createdOrders[0]) return NextResponse.json({ error: "Sipariş oluşturulamadı." }, { status: 502 });
  const order = createdOrders[0];

  const orderItemsResponse = await fetch(`${config.url}/rest/v1/order_items`, {
    method: "POST",
    headers: adminHeaders(config),
    body: JSON.stringify(normalized.map(item => ({
      order_id: order.id,
      product_id: item.product.id,
      product_name: item.product.name,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      selected_options: item.selectedOptions,
      line_total: item.lineTotal,
    }))),
  });
  if (!orderItemsResponse.ok) {
    await fetch(`${config.url}/rest/v1/orders?id=eq.${encodeURIComponent(order.id)}`, { method: "DELETE", headers: adminHeaders(config) });
    return NextResponse.json({ error: "Sipariş kalemleri kaydedilemedi." }, { status: 502 });
  }

  return NextResponse.json({ ok: true, orderId: order.id, orderNo: order.order_no, subtotal, deliveryFee, total, paymentMethod });
}

export async function GET() {
  const config = env();
  if (!config) return NextResponse.json({ error: "Sipariş servisi yapılandırılmadı." }, { status: 503 });
  const user = await getUser(config);
  if (!user) return NextResponse.json({ error: "Giriş yapmalısınız." }, { status: 401 });

  const response = await fetch(`${config.url}/rest/v1/orders?user_id=eq.${encodeURIComponent(user.id)}&select=id,order_no,status,payment_status,payment_method,subtotal,delivery_fee,total_amount,fulfillment_type,estimated_min,estimated_max,created_at&order=created_at.desc&limit=20`, { headers: adminHeaders(config), cache: "no-store" });
  const data = await response.json();
  return NextResponse.json({ orders: Array.isArray(data) ? data : [] }, { status: response.ok ? 200 : 502 });
}
