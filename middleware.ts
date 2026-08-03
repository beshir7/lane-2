import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Public routes (no session required). Everything else needs a logged-in user.
// `/auth` covers the email-confirmation callback, which by definition arrives
// without a session — it is the request that creates one.
const PUBLIC = ["/signin", "/signup", "/forgot", "/reset", "/auth"];
// Routes an already-logged-in user shouldn't sit on — bounce them to the app.
const AUTH_ONLY = ["/signin", "/signup"];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const path = request.nextUrl.pathname;
  const publicPath = PUBLIC.some((p) => path === p || path.startsWith(p + "/"));

  // Fast path: no Supabase auth cookie means there is no session to validate,
  // so skip the round-trip to the auth server entirely. Protected pages bounce
  // straight to sign-in; public pages render as-is. Every request used to pay
  // for that call whether or not a session existed.
  const hasSessionCookie = request.cookies.getAll().some((c) => /^sb-.*-auth-token/.test(c.name));
  if (!hasSessionCookie) {
    if (publicPath) return response;
    const url = request.nextUrl.clone();
    url.pathname = "/signin";
    url.search = "";
    return NextResponse.redirect(url);
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  // IMPORTANT: getUser() revalidates the token with Supabase — the source of truth.
  const { data: { user } } = await supabase.auth.getUser();

  // No session on a protected page → send to sign-in (blocks manual URL access).
  if (!user && !publicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/signin";
    url.search = "";
    return NextResponse.redirect(url);
  }
  // Logged in but on the sign-in/up page → send to the app.
  if (user && AUTH_ONLY.some((p) => path === p)) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  // Run on everything except Next internals and static asset files. `_next` is
  // excluded wholesale (not just /static and /image) so build assets, data and
  // RSC payload requests never pay for an auth round-trip — none of them are
  // application routes.
  matcher: ["/((?!_next/|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|webmanifest)$).*)"],
};
