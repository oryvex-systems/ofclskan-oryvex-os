import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "https://tikladoy.tr",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const b64 = (buf: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(buf)));
async function hmac(key: string, value: string) {
  const cryptoKey = await crypto.subtle.importKey("raw", new TextEncoder().encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64(await crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(value)));
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const auth = req.headers.get("Authorization") || "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const merchantId = Deno.env.get("PAYTR_MERCHANT_ID")!;
    const merchantKey = Deno.env.get("PAYTR_MERCHANT_KEY")!;
    const merchantSalt = Deno.env.get("PAYTR_MERCHANT_SALT")!;
    if (!merchantId || !merchantKey || !merchantSalt) throw new Error("PayTR secrets are not configured");

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });

    const { orderId, userName, userAddress, userPhone, userIp = "127.0.0.1" } = await req.json();
    const admin = createClient(supabaseUrl, serviceKey);
    const { data: order, error: orderError } = await admin.from("orders").select("id,order_no,user_id,total_amount,status").eq("id", orderId).single();
    if (orderError || !order || order.user_id !== user.id) throw new Error("Order not found");

    const { data: items, error: itemsError } = await admin.from("order_items").select("product_name,quantity,unit_price,line_total").eq("order_id", orderId);
    if (itemsError || !items?.length) throw new Error("Order items not found");

    const merchantOid = order.order_no || `TKD-${Date.now()}`;
    const amount = Math.round(Number(order.total_amount) * 100);
    const basket = btoa(unescape(encodeURIComponent(JSON.stringify(items.map((x: any) => [x.product_name, String(Number(x.unit_price).toFixed(2)), Number(x.quantity)])))));
    const email = user.email || "musteri@tikladoy.tr";
    const noInstallment = "0", maxInstallment = "0", currency = "TL", testMode = Deno.env.get("PAYTR_TEST_MODE") || "1";
    const hashStr = `${merchantId}${userIp}${merchantOid}${email}${amount}${basket}${noInstallment}${maxInstallment}${currency}${testMode}`;
    const paytrToken = await hmac(merchantKey, hashStr + merchantSalt);

    const body = new URLSearchParams({
      merchant_id: merchantId,
      user_ip: userIp,
      merchant_oid: merchantOid,
      email,
      payment_amount: String(amount),
      paytr_token: paytrToken,
      user_basket: basket,
      debug_on: "1",
      no_installment: noInstallment,
      max_installment: maxInstallment,
      user_name: userName || user.user_metadata?.full_name || "TIKLADOY Müşterisi",
      user_address: userAddress || "Teslimat adresi",
      user_phone: userPhone || "5000000000",
      merchant_ok_url: "https://tikladoy.tr/#payment-success",
      merchant_fail_url: "https://tikladoy.tr/#payment-fail",
      timeout_limit: "30",
      currency,
      test_mode: testMode,
      lang: "tr",
    });

    const paytrRes = await fetch("https://www.paytr.com/odeme/api/get-token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body });
    const json = await paytrRes.json();
    if (json.status !== "success") throw new Error(json.reason || "PayTR token error");

    await admin.from("payment_sessions").upsert({ order_id: order.id, user_id: user.id, merchant_oid: merchantOid, amount: Number(order.total_amount), status: "pending", iframe_token: json.token }, { onConflict: "merchant_oid" });
    await admin.from("orders").update({ payment_provider: "paytr", payment_reference: merchantOid, payment_status: "pending" }).eq("id", order.id);

    return new Response(JSON.stringify({ token: json.token, iframeUrl: `https://www.paytr.com/odeme/guvenli/${json.token}` }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown_error" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
