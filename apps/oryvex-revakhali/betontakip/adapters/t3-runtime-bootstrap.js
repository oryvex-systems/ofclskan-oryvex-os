import "./supabase.js";
import "./auth.js";

const SUPABASE_URL =
  "https://wdimzayfvtlrxljpsvza.supabase.co";

function resolveAnonKey() {
  const candidates = [
    window.ORYVEXConcrete?.supabaseAnonKey,
    window.ORYVEXConcrete?.anonKey,
    window.ORYVEX_CONFIG?.supabaseAnonKey,
    window.ORYVEX_RUNTIME?.supabaseAnonKey,
    window.SUPABASE_ANON_KEY
  ];

  return candidates.find(
    value =>
      typeof value === "string" &&
      value.length > 20
  ) || null;
}

function resolveExistingClient() {
  if (
    window.ORYVEXConcrete?.supabase &&
    typeof window.ORYVEXConcrete.supabase
      .from === "function"
  ) {
    return window.ORYVEXConcrete.supabase;
  }

  const registered =
    window.ORYVEX_SUPABASE?.getClient?.();

  if (
    registered &&
    typeof registered.from === "function"
  ) {
    return registered;
  }

  return null;
}

async function bootstrap() {
  let client =
    resolveExistingClient();

  if (!client) {
    if (
      !window.supabase ||
      typeof window.supabase.createClient
        !== "function"
    ) {
      throw new Error(
        "SUPABASE_LIBRARY_REQUIRED"
      );
    }

    const anonKey =
      resolveAnonKey();

    if (!anonKey) {
      throw new Error(
        "SUPABASE_ANON_KEY_REQUIRED"
      );
    }

    client =
      window.supabase.createClient(
        SUPABASE_URL,
        anonKey,
        {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
          }
        }
      );
  }

  window.ORYVEX_SUPABASE.register(
    client
  );

  window.ORYVEX_AUTH.register({
    async session() {
      const {
        data,
        error
      } = await client.auth.getSession();

      if (error) throw error;

      return data?.session ?? null;
    }
  });

  const {
    data,
    error
  } = await client.auth.getSession();

  if (error) throw error;

  return {
    client,
    session: data?.session ?? null
  };
}

window.ORYVEX_T3_BOOTSTRAP = {
  bootstrap
};
