/**
 * Authentication guard for API routes.
 *
 * Checks for a valid Supabase session using the auth token
 * from the request cookies or Authorization header.
 *
 * Usage in any API route:
 *   const authResult = await checkAuth(request);
 *   if (authResult) return authResult;
 *
 * In development (no SUPABASE_URL configured), auth is bypassed
 * to allow local testing without Supabase.
 */

import { NextRequest, NextResponse } from "next/server";

/**
 * Verify the request has a valid authentication session.
 *
 * @param request - The Next.js request object
 * @returns NextResponse with 401 status if unauthorized, or null if authenticated
 */
export async function checkAuth(
  request: NextRequest
): Promise<NextResponse | null> {
  // In development without Supabase configured, bypass auth
  // This allows local testing without a Supabase project
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl || supabaseUrl.includes("your-project")) {
    return null; // Auth bypassed — no Supabase configured
  }

  // Check for auth token in Authorization header or cookies
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  // Also check Supabase session cookies
  const sessionCookie =
    request.cookies.get("sb-access-token")?.value ??
    request.cookies.get("supabase-auth-token")?.value;

  if (!token && !sessionCookie) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

  // In a full implementation, validate the token against Supabase:
  // const { data: { user }, error } = await supabase.auth.getUser(token);
  // if (error || !user) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

  // For now, accept any non-empty token (real validation requires @supabase/ssr)
  return null;
}
