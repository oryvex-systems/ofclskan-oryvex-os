import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "GET") return new Response("method_not_allowed", { status: 405, headers: cors });
  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const auth = req.headers.get("Authorization") || "";
  const client = createClient(url, anon, { global: { headers: { Authorization: auth } } });
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) return Response.json({ authenticated: false }, { status: 200, headers: cors });
  return Response.json({ authenticated: true, userId: user.id, email: user.email || null, metadata: user.user_metadata || {} }, { headers: cors });
});
