import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Where the "Confirm your email address" link lands.
//
// The browser client uses the PKCE flow, so Supabase sends the user back here
// with a one-time `code` rather than a ready-made session. Exchanging it for a
// session is what actually signs the new member in — without this the link
// would confirm the address and then drop them on a sign-in form.
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") || "/dashboard";
  const errorDescription = url.searchParams.get("error_description");

  // Behind Vercel's proxy the request URL's host is internal; the forwarded
  // host is the one the user actually typed, and the one we must redirect to.
  const forwardedHost = request.headers.get("x-forwarded-host");
  const origin = forwardedHost ? `https://${forwardedHost}` : url.origin;

  const back = (path: string) => NextResponse.redirect(`${origin}${path}`);

  // Supabase reports expired/reused links as query parameters, not exceptions.
  if (errorDescription) return back(`/signin?error=${encodeURIComponent(errorDescription)}`);
  if (!code) return back("/signin");

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return back(`/signin?error=${encodeURIComponent(error.message)}`);

  return back(next);
}
