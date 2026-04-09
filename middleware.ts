import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Allow public API routes
  if (request.nextUrl.pathname.startsWith("/api/public") ||
      request.nextUrl.pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  // For other routes, let NextAuth handle auth
  // Note: This is a simplified version - NextAuth will handle protected routes
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
