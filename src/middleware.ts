import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseMiddleware } from "@/lib/supabase";

const publicPaths = ["/login", "/signup", "/forgot-password", "/reset-password", "/api/auth"];

export async function middleware(request: NextRequest) {
  const res = NextResponse.next();
  const supabase = getSupabaseMiddleware(request, res);
  await supabase.auth.getSession();

  const { pathname } = request.nextUrl;

  const isPublicPath = publicPaths.some((p) => pathname.startsWith(p));
  const isApiPath = pathname.startsWith("/api/");

  if (!isPublicPath && !isApiPath) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      // Guarda a donde iba para volver ahi despues de iniciar sesion.
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Las rutas /api/* NO se redirigen: cada una hace su propio chequeo y
  // responde 401 JSON. Con el redirect, fetch lo seguia, recibia el HTML del
  // login y requestJson devolvia {} en silencio -> el dashboard reventaba
  // leyendo data.summary sobre undefined.

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
