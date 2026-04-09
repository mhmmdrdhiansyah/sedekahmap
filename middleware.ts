import { handlers } from "@/lib/auth";

export default handlers;

export const config = {
  // Protect all routes except /api/public/* and /api/auth/*
  matcher: [
    "/((?!api/public|api/auth|_next/static|_next/image|favicon.ico).*)",
  ],
};
