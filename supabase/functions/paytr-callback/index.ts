import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const b64 = (buf: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(buf)));
async function hmac(key: string, value: string) {
  const cryptoKey = await crypto.subtle.importKey("raw", new TextEncoder().encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64(await crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(value)));
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("", { status: 405 });
  try {
    const merchantKey = Deno.env.get("PAYTR_MERCHANT_KEY")!;
    const merchantSalt = Deno.env.get("PAYTR_MERCHANT_SALT")!;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!merchantKey || !merchantSalt) throw new Error("PayTR secrets are not configured");

    const form = await req.formData();
    const merchantOid = String(form.get("merchant_oid") || "");
    const status = String(form.get("status") || "");
    const totalAmount = String(form.get("total_amount") || "");
    const receivedHash = String(form.get("hash") || "");
    const calculatedHash = await hmac(merchantKey, `${merchantOid}${merchantSalt}${status}${totalAmount}`);
    if (!merchantOid || calculatedHash !== receivedHash) return new Response("PAYTR notification failed: bad hash", { status: 400 });

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: session } = await admin.from("payment_sessions").select("id,order_id,status").eq("merchant_oid", merchantOid).single();
    if (!session) return new Response("OK");
    if (session.status === "paid" || session.status === "failed") return new Response("OK");

    const payload: Record<string, string> = {};
    for (const [k, v] of form.entries()) payload[k] = String(v);

    if (status === "success") {
      await admin.from("payment_sessions").update({ status: "paid", callback_payload: payload, paid_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", session.id);
      if (session.order_id) await admin.from("orders").update({ payment_status: "paid", payment_method: "paytr", payment_provider: "paytr", payment_reference: merchantOid }).eq("id", session.order_id);
    } else {
      await admin.from("payment_sessions").update({ status: "failed", callback_payload: payload, updated_at: new Date().toISOString() }).eq("id", session.id);
      if (session.order_id) await admin.from("orders").update({ payment_status: "failed", payment_method: "paytr", payment_provider: "paytr", payment_reference: merchantOid }).eq("id", session.order_id);
    }

    return new Response("OK");
  } catch (e) {
    console.error(e);
    return new Response("PAYTR notification failed", { status: 500 });
  }
});
