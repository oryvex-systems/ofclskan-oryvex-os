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

export async function getCurrentUser(): Promise<OryvexUser | null> {
  const token = await getAccessToken();
  if (!token) return null;
  const { url, key } = config();
  const response = await fetch(`${url}/auth/v1/user`, {
    headers: { apikey: key, Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!response.ok) return null;
  return response.json();
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/giris");
  return user;
}

export async function getWorkspaces(): Promise<OryvexWorkspace[]> {
  const token = await getAccessToken();
  if (!token) return [];
  const { url, key } = config();
  const response = await fetch(
    `${url}/rest/v1/oryvex_workspaces?select=id,slug,name,description,status,app_url,updated_at&order=name.asc`,
    {
      headers: {
        apikey: key,
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      cache: "no-store",
    },
  );
  if (!response.ok) return [];
  return response.json();
}
