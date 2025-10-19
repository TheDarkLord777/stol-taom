import { NextRequest } from "next/server";
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

export const runtime = "nodejs";
