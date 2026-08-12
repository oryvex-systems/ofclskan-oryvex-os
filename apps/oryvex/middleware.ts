import { NextRequest, NextResponse } from "next/server";

const protectedPaths = ["/panel", "/sistemler", "/gorevler", "/ai", "/profil", "/santiye-os"];

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const needsAuth = protectedPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
  if (!needsAuth) return NextResponse.next();

  const token = request.cookies.get("oryvex_access_token")?.value;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!token || !supabaseUrl || !supabaseAnonKey) {
    const loginUrl = new URL("/giris", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    if (!response.ok) throw new Error("invalid session");
    return NextResponse.next();
  } catch {
    const loginUrl = new URL("/giris", request.url);
    const redirect = NextResponse.redirect(loginUrl);
    redirect.cookies.set("oryvex_access_token", "", { path: "/", maxAge: 0 });
    redirect.cookies.set("oryvex_refresh_token", "", { path: "/", maxAge: 0 });
    return redirect;
  }
}

export const config = {
  matcher: ["/panel/:path*", "/sistemler/:path*", "/gorevler/:path*", "/ai/:path*", "/profil/:path*", "/santiye-os/:path*"],
};
