export interface Env {
  ORYVEX_ENV: string;
  ORYVEX_RUNTIME: string;
}

type Risk = "low" | "medium" | "high" | "critical";

type PolicyRequest = {
  action?: string;
  risk?: Risk;
  reversible?: boolean;
  actor?: string;
};

const services = [
  { id: "edge", contract: "oryvex.edge", provider: "cloudflare", status: "pilot" },
  { id: "ai", contract: "oryvex.ai", provider: "unbound", status: "planned" },
  { id: "data", contract: "oryvex.data", provider: "unbound", status: "planned" },
  { id: "storage", contract: "oryvex.storage", provider: "unbound", status: "planned" },
  { id: "workflow", contract: "oryvex.workflow", provider: "unbound", status: "planned" },
];

const constitution = {
  version: "0.1.0",
  principle: "Baglan ama bagimli olma.",
  migration: ["COPY", "TEST", "SWITCH", "OBSERVE", "ARCHIVE"],
  autonomy: {
    L0: "observe",
    L1: "recommend",
    L2: "auto-recover",
    L3: "controlled-operate",
    L4: "controlled-repair-second-verification",
    L5: "human-gate",
  },
};

function json(data: unknown, status = 200): Response {
  return Response.json(data, {
    status,
    headers: {
      "cache-control": "no-store",
      "x-oryvex-core": constitution.version,
    },
  });
}

function evaluatePolicy(input: PolicyRequest) {
  const risk: Risk = input.risk ?? "critical";
  const reversible = input.reversible === true;

  if (risk === "critical") {
    return { decision: "human_gate", autonomy: "L5", reason: "critical-risk" };
  }
  if (risk === "high") {
    return { decision: "second_verification", autonomy: "L4", reason: "high-risk" };
  }
  if (risk === "medium") {
    return reversible
      ? { decision: "allow_controlled", autonomy: "L3", reason: "medium-reversible" }
      : { decision: "second_verification", autonomy: "L4", reason: "medium-irreversible" };
  }
  return reversible
    ? { decision: "allow_recovery", autonomy: "L2", reason: "low-reversible" }
    : { decision: "recommend", autonomy: "L1", reason: "low-irreversible" };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/health") {
      return json({
        status: "ok",
        service: "oryvex-core",
        version: constitution.version,
        environment: env.ORYVEX_ENV,
        runtime: env.ORYVEX_RUNTIME,
        timestamp: new Date().toISOString(),
      });
    }

    if (request.method === "GET" && url.pathname === "/v1/constitution") {
      return json(constitution);
    }

    if (request.method === "GET" && url.pathname === "/v1/services") {
      return json({ services });
    }

    if (request.method === "POST" && url.pathname === "/v1/policy/evaluate") {
      let input: PolicyRequest;
      try {
        input = await request.json<PolicyRequest>();
      } catch {
        return json({ error: "invalid_json" }, 400);
      }
      return json({ input, ...evaluatePolicy(input) });
    }

    return json({
      name: "ORYVEX CORE",
      role: "decision-and-control-plane",
      endpoints: ["/health", "/v1/constitution", "/v1/services", "/v1/policy/evaluate"],
    });
  },
} satisfies ExportedHandler<Env>;
