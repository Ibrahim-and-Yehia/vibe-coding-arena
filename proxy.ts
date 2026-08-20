import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/lib/types";

// Next.js 16 renamed middleware.ts -> proxy.ts (and the `middleware` export
// -> `proxy`); this runs on the nodejs runtime only. Refreshes the Supabase
// session cookie on every request and gates /dashboard + /onboarding.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    }
  );

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  // /kds (fullscreen kitchen display) needs the same signed-in-with-a-venue
  // guarantee as /dashboard, it just renders without the dashboard chrome.
  const isDashboard = path.startsWith("/dashboard") || path.startsWith("/kds");
  const isOnboarding = path.startsWith("/onboarding");
  const isAuthPage = path === "/login" || path === "/signup";

  // A cookie can outlive the session it points at — the refresh token gets
  // revoked, the user is deleted, or the project is reset. Left alone it
  // throws "Invalid Refresh Token" on every single request forever. Clear the
  // dead cookies once and send them to sign in.
  if (authError && !isAuthPage) {
    const redirect = NextResponse.redirect(new URL("/login", request.url));
    for (const cookie of request.cookies.getAll()) {
      if (cookie.name.startsWith("sb-")) redirect.cookies.delete(cookie.name);
    }
    return redirect;
  }

  if (!user && (isDashboard || isOnboarding)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (user && (isDashboard || isOnboarding || isAuthPage)) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("venue_id")
      .eq("id", user.id)
      .maybeSingle();
    const hasVenue = !!profile?.venue_id;

    if (isDashboard && !hasVenue) {
      return NextResponse.redirect(new URL("/onboarding", request.url));
    }
    if ((isOnboarding && hasVenue) || (isAuthPage && hasVenue)) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    if (isAuthPage && !hasVenue) {
      return NextResponse.redirect(new URL("/onboarding", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ["/dashboard/:path*", "/kds/:path*", "/onboarding/:path*", "/login", "/signup"],
};
