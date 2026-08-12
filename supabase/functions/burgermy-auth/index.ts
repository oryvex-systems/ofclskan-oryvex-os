import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return new Response("method_not_allowed", { status: 405, headers: cors });

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const key = Deno.env.get("SUPABASE_ANON_KEY")!;
    if (!url || !key) throw new Error("Supabase auth config missing");

    const body = await req.json() as { action?: "signin" | "signup"; email?: string; password?: string };
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    if (!/^\S+@\S+\.\S+$/.test(email)) return Response.json({ error: "Geçerli bir e-posta adresi girin." }, { status: 400, headers: cors });
    if (password.length < 6) return Response.json({ error: "Şifre en az 6 karakter olmalı." }, { status: 400, headers: cors });

    const signup = body.action === "signup";
    const endpoint = signup ? "/auth/v1/signup" : "/auth/v1/token?grant_type=password";
    const response = await fetch(`${url}${endpoint}`, {
      method: "POST",
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json();
    if (!response.ok) {
      return Response.json({ error: data.message || data.msg || data.error_description || "Giriş yapılamadı." }, { status: response.status, headers: cors });
    }

    if (signup && !data.access_token) return Response.json({ ok: true, confirmationRequired: true, email }, { headers: cors });
    if (!data.access_token || !data.user?.id) return Response.json({ error: "Oturum açılamadı." }, { status: 401, headers: cors });

    return Response.json({
      ok: true,
      userId: data.user.id,
      email: data.user.email || email,
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in || 3600,
    }, { headers: cors });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "auth_failed" }, { status: 400, headers: cors });
  }
});
