import type { NextRequest } from "next/server";
import { authGuard } from "@/lib/jwtAuth";

export async function middleware(req: NextRequest) {
  return authGuard(req);
}

export const config = {
  matcher: [
    // Run on all paths; authGuard itself whitelists public paths and only enforces where needed
    "/(.*)",
  ],
};
// Note: Middleware always runs on the Edge runtime in Next.js.
// Do not set a custom runtime here to avoid incompatibilities in dev.
