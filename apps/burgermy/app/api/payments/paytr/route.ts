import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return NextResponse.json({ error: "Ödeme servisi yapılandırılmadı." }, { status: 503 });

  const store = await cookies();
  const token = store.get("burgermy-auth-token")?.value;
  if (!token) return NextResponse.json({ error: "Ödeme için giriş yapmalısınız." }, { status: 401 });

  const body = await request.json() as { orderId?: string; userName?: string; userAddress?: string; userPhone?: string };
  if (!body.orderId) return NextResponse.json({ error: "Sipariş bulunamadı." }, { status: 400 });

  const requestHeaders = await headers();
  const forwarded = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim();
  const userIp = forwarded || "127.0.0.1";

  const response = await fetch(`${url}/functions/v1/paytr-create-token`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      orderId: body.orderId,
      userName: body.userName,
      userAddress: body.userAddress,
      userPhone: body.userPhone,
      userIp,
    }),
    cache: "no-store",
  });
  const data = await response.json() as { iframeUrl?: string; token?: string; error?: string };
  if (!response.ok || !data.iframeUrl) return NextResponse.json({ error: data.error || "PayTR oturumu açılamadı." }, { status: response.status || 502 });
  return NextResponse.json({ ok: true, iframeUrl: data.iframeUrl, token: data.token });
}
