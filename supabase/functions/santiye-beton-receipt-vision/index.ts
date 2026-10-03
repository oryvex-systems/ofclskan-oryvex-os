/* ORYVEX_BETON_RECEIPT_VISION_V15_2 */
const OPENAI_VISION_MODEL = "gpt-6-luna";
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const OPENAI_TIMEOUT_MS = 45_000;
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function textOrNull(value) {
  if (value === null || value === undefined) return null;
  const out = String(value).trim();
  return out || null;
}

function confidenceOrNull(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(1, n));
}

function normalizeDate(value) {
  const raw = textOrNull(value);
  if (!raw) return null;
  let match = raw.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  let y, m, d;
  if (match) {
    y = Number(match[1]); m = Number(match[2]); d = Number(match[3]);
  } else {
    match = raw.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
    if (!match) return null;
    d = Number(match[1]); m = Number(match[2]); y = Number(match[3]);
  }
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return [String(y).padStart(4,"0"),String(m).padStart(2,"0"),String(d).padStart(2,"0")].join("-");
}

function normalizeTime(value) {
  const raw = textOrNull(value);
  if (!raw) return null;
  const match = raw.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) return null;
  const h = Number(match[1]), m = Number(match[2]), s = Number(match[3] ?? 0);
  if (h > 23 || m > 59 || s > 59) return null;
  return [String(h).padStart(2,"0"),String(m).padStart(2,"0"),String(s).padStart(2,"0")].join(":");
}

function normalizeQuantity(value) {
  const raw = textOrNull(value);
  if (!raw) return null;
  const normalized = raw.replace(/\s+/g,"").replace(",",".").replace(/[^0-9.+-]/g,"");
  const n = Number(normalized);
  if (!Number.isFinite(n) || n <= 0) return null;
  return String(n);
}

function normalizePlate(value) {
  const raw = textOrNull(value);
  return raw ? raw.toLocaleUpperCase("tr-TR").replace(/\s+/g," ").trim() : null;
}

function decodedBase64Bytes(dataUrl) {
  const comma = dataUrl.indexOf(",");
  if (comma < 0) return -1;
  const base64 = dataUrl.slice(comma + 1).replace(/\s+/g,"");
  if (!base64) return 0;
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.floor((base64.length * 3) / 4) - padding;
}

function getBearer(req) {
  const auth = req.headers.get("authorization") || "";
  const match = auth.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

async function supabaseGet(path, token, key) {
  const base = Deno.env.get("SUPABASE_URL");
  const res = await fetch(base + path, {
    headers: { Authorization: "Bearer " + token, apikey: key, Accept: "application/json" },
  });
  const data = await res.json().catch(() => null);
  return { res, data };
}

const FIELD_NAMES = [
  "slip_no","slip_date","quantity_m3","concrete_class","supplier_name",
  "customer_name","vehicle_plate","driver_name","production_start",
  "production_finish","printed_site_name","other_text"
];

const FIELD_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["value","confidence"],
  properties: {
    value: { type: ["string","null"] },
    confidence: { type: ["number","null"], minimum: 0, maximum: 1 },
  },
};

const RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["fields"],
  properties: {
    fields: {
      type: "object",
      additionalProperties: false,
      required: FIELD_NAMES,
      properties: Object.fromEntries(FIELD_NAMES.map((name) => [name, FIELD_SCHEMA])),
    },
  },
};

const PROMPT = [
  "Bu görüntü bir beton sevk/irsaliye fişidir.",
  "Yalnızca görüntüde açıkça bulunan bilgileri çıkar.",
  "Görüntüde bulunmayan bilgiyi uydurma.",
  "Emin olmadığın alanın value değerini null döndür.",
  "Tahmin etme.",
  "Sınıflandırma, kısım, iş grubu, masraf merkezi veya pour_id kararı verme.",
  "Cari kararı verme.",
  "Fiyat üretme veya uydurma.",
  "Görselde yazan değeri mümkün olduğunca aynen koru.",
  "Tarih ve saat değerini gördüğün biçimde çıkar; normalizasyon sunucuda yapılacaktır.",
  "quantity_m3 değerini yalnız sayı metni olarak döndür.",
  "Her alan için 0.00 ile 1.00 arasında confidence ver; güven üretilemiyorsa null kullan."
].join("\n");

function extractOutputText(payload) {
  const output = Array.isArray(payload?.output) ? payload.output : [];
  for (const item of output) {
    const content = Array.isArray(item?.content) ? item.content : [];
    for (const part of content) {
      if (part?.type === "refusal") return { refusal: textOrNull(part.refusal) || "Model refusal" };
      if (part?.type === "output_text" && typeof part.text === "string") return { text: part.text };
    }
  }
  return {};
}

function normalizeFields(rawFields) {
  const warnings = [];
  const fields = {};
  for (const name of FIELD_NAMES) {
    const raw = rawFields?.[name] || {};
    let value = raw.value;
    if (name === "slip_date") value = normalizeDate(value);
    else if (name === "production_start" || name === "production_finish") value = normalizeTime(value);
    else if (name === "quantity_m3") value = normalizeQuantity(value);
    else if (name === "vehicle_plate") value = normalizePlate(value);
    else value = textOrNull(value);

    if (raw.value !== null && raw.value !== undefined && value === null) {
      warnings.push(name + " güvenli biçime normalize edilemedi; kontrol gerekli.");
    }
    fields[name] = { value, confidence: confidenceOrNull(raw.confidence) };
  }
  return { fields, warnings };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  if (req.method !== "POST") return json(405, { ok:false, error:"method_not_allowed" });

  const token = getBearer(req);
  if (!token) return json(401, { ok:false, error:"authentication_required" });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
  const openaiKey = Deno.env.get("OPENAI_API_KEY");

  if (!supabaseUrl || !supabaseKey || !openaiKey) {
    return json(500, { ok:false, error:"server_configuration_error" });
  }

  let body;
  try { body = await req.json(); }
  catch { return json(400, { ok:false, error:"invalid_json" }); }

  const projectId = textOrNull(body?.project_id);
  const mime = textOrNull(body?.image?.mime_type)?.toLowerCase() || null;
  const dataUrl = textOrNull(body?.image?.data_url);

  if (!projectId) return json(400, { ok:false, error:"project_id_required" });
  if (!mime || !dataUrl) return json(400, { ok:false, error:"image_required" });
  if (!ALLOWED_MIME.has(mime)) return json(400, { ok:false, error:"invalid_image_mime" });

  const prefix = "data:" + mime + ";base64,";
  if (!dataUrl.startsWith(prefix)) return json(400, { ok:false, error:"invalid_image_data_url" });

  const imageBytes = decodedBase64Bytes(dataUrl);
  if (imageBytes < 1) return json(400, { ok:false, error:"empty_image" });
  if (imageBytes > MAX_IMAGE_BYTES) return json(413, { ok:false, error:"image_too_large" });

  const auth = await supabaseGet("/auth/v1/user", token, supabaseKey);
  if (!auth.res.ok || !auth.data?.id) return json(401, { ok:false, error:"invalid_session" });

  const projectQuery = "/rest/v1/santiye_projects?select=id%2Ccompany_id&id=eq." + encodeURIComponent(projectId) + "&limit=1";
  const projectResult = await supabaseGet(projectQuery, token, supabaseKey);
  const project = Array.isArray(projectResult.data) ? projectResult.data[0] : null;
  if (!projectResult.res.ok || !project?.company_id) return json(403, { ok:false, error:"project_access_denied" });

  const membershipQuery =
    "/rest/v1/santiye_company_members?select=company_id%2Cactive" +
    "&user_id=eq." + encodeURIComponent(auth.data.id) +
    "&company_id=eq." + encodeURIComponent(project.company_id) +
    "&active=eq.true&limit=1";
  const memberResult = await supabaseGet(membershipQuery, token, supabaseKey);
  const member = Array.isArray(memberResult.data) ? memberResult.data[0] : null;
  if (!memberResult.res.ok || !member?.active) return json(403, { ok:false, error:"membership_required" });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);
  let openaiResponse;

  try {
    openaiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      signal: controller.signal,
      headers: { Authorization: "Bearer " + openaiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OPENAI_VISION_MODEL,
        input: [{
          role: "user",
          content: [
            { type:"input_text", text:PROMPT },
            { type:"input_image", image_url:dataUrl }
          ]
        }],
        text: {
          format: {
            type:"json_schema",
            name:"beton_receipt",
            strict:true,
            schema:RESPONSE_SCHEMA
          }
        },
        max_output_tokens:1800
      })
    });
  } catch (error) {
    if (error?.name === "AbortError") return json(504, { ok:false, error:"openai_timeout" });
    return json(502, { ok:false, error:"openai_network_error" });
  } finally {
    clearTimeout(timeout);
  }

  if (!openaiResponse.ok) {
    if (openaiResponse.status === 429) return json(429, { ok:false, error:"openai_rate_limited" });
    if (openaiResponse.status === 401) return json(502, { ok:false, error:"openai_auth_error" });
    return json(502, { ok:false, error:"openai_request_failed", upstream_status:openaiResponse.status });
  }

  let openaiPayload;
  try { openaiPayload = await openaiResponse.json(); }
  catch { return json(502, { ok:false, error:"openai_invalid_json" }); }

  const extracted = extractOutputText(openaiPayload);
  if (extracted.refusal) return json(422, { ok:false, error:"model_refusal" });
  if (!extracted.text) return json(502, { ok:false, error:"structured_output_missing" });

  let parsed;
  try { parsed = JSON.parse(extracted.text); }
  catch { return json(502, { ok:false, error:"structured_output_invalid" }); }

  const normalized = normalizeFields(parsed?.fields);
  return json(200, {
    ok:true,
    fields:normalized.fields,
    warnings:normalized.warnings,
    model:OPENAI_VISION_MODEL
  });
});
