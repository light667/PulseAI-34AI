import { type NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const isAuth = request.cookies.has("pulse_auth");
  
  const protectedPaths = [
    "/home",
    "/diagnostic",
    "/hospitals",
    "/lyra",
    "/scan",
    "/profile",
  ];

  const isProtected = protectedPaths.some((p) =>
    request.nextUrl.pathname.startsWith(p)
  );

  if (!isAuth && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    return NextResponse.redirect(url);
  }

  if (isAuth && request.nextUrl.pathname.startsWith("/auth/")) {
    const url = request.nextUrl.clone();
    url.pathname = "/home";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/home/:path*",
    "/diagnostic/:path*",
    "/hospitals/:path*",
    "/lyra/:path*",
    "/scan/:path*",
    "/profile/:path*",
    "/auth/:path*",
  ],
};
