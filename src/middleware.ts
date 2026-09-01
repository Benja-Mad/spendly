import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseMiddleware } from "@/lib/supabase";

const publicPaths = ["/login", "/signup", "/forgot-password", "/reset-password", "/api/auth"];

export async function middleware(request: NextRequest) {
  const res = NextResponse.next();
  const supabase = getSupabaseMiddleware(request, res);
  await supabase.auth.getSession();

  const { pathname } = request.nextUrl;

  const isPublicPath = publicPaths.some((p) => pathname.startsWith(p));

  if (!isPublicPath) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      return NextResponse.redirect(loginUrl);
    }
  }

  if (isPublicPath && pathname !== "/api/auth") {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const dashboardUrl = request.nextUrl.clone();
      dashboardUrl.pathname = "/dashboard";
      return NextResponse.redirect(dashboardUrl);
    }
  }

  return res;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
