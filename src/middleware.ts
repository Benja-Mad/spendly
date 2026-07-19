import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseMiddleware } from "@/lib/supabase";

export async function middleware(request: NextRequest) {
  const res = NextResponse.next();
  const supabase = getSupabaseMiddleware(request, res);
  await supabase.auth.getSession();
  return res;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
