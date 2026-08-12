import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export type OryvexWorkspace = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  status: "active" | "development" | "paused" | "archived";
  app_url: string | null;
  updated_at: string;
};

export type OryvexTask = {
  id: string;
  title: string;
  status: "todo" | "in_progress" | "done" | "overdue";
  priority: "low" | "medium" | "high" | "critical";
  due_date: string | null;
  workspace_id: string;
  oryvex_workspaces?: { name: string } | null;
};

export type OryvexUser = {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
};

function config() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("ORYVEX Supabase yapılandırması eksik.");
  return { url, key };
}

export async function getAccessToken() {
  const store = await cookies();
  return store.get("oryvex_access_token")?.value ?? null;
}

async function authFetch(path: string) {
  const token = await getAccessToken();
  if (!token) return null;
  const { url, key } = config();
  return fetch(`${url}${path}`, {
    headers: { apikey: key, Authorization: `Bearer ${token}`, Accept: "application/json" },
    cache: "no-store",
  });
}

export async function getCurrentUser(): Promise<OryvexUser | null> {
  const response = await authFetch("/auth/v1/user");
  if (!response || !response.ok) return null;
  return response.json();
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/giris");
  return user;
}

export async function getWorkspaces(): Promise<OryvexWorkspace[]> {
  const response = await authFetch("/rest/v1/oryvex_workspaces?select=id,slug,name,description,status,app_url,updated_at&order=name.asc");
  if (!response || !response.ok) return [];
  return response.json();
}

export async function getTasks(): Promise<OryvexTask[]> {
  const response = await authFetch("/rest/v1/oryvex_tasks?select=id,title,status,priority,due_date,workspace_id,oryvex_workspaces(name)&order=due_date.asc.nullslast");
  if (!response || !response.ok) return [];
  return response.json();
}
