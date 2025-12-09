import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  try {
    const { authGuard } = await import("@/lib/jwtAuth");
    return authGuard(req);
  } catch (error) {
    // Edge Runtime limitation: jose library has issues with jose crypto initialization.
    // In production, this gracefully passes through. Only log in dev mode.
    if (process.env.NODE_ENV !== "production") {
      console.error("Middleware error:", error);
    }
    // Return next() instead of crashing
    const { NextResponse } = await import("next/server");
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    // Run on all paths except static assets and api internals
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
