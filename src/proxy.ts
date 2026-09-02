import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth-constants";

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const publicRoute = pathname === "/login" || pathname === "/api/health";
  if (publicRoute || request.cookies.has(SESSION_COOKIE_NAME))
    return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("returnTo", `${pathname}${search}`);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|og.png).*)"],
};
