import { NextRequest, NextResponse } from "next/server";
import { SignJWT, jwtVerify, JWTPayload } from "jose";

// Cookie names and TTLs
export const ACCESS_TOKEN_NAME = "access_token";
export const REFRESH_TOKEN_NAME = "refresh_token";

// Allow env-based overrides for testing or ops
function readSeconds(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.floor(n);
}

// Defaults: access 15 minutes, refresh 14 days
export const ACCESS_TTL_SEC = readSeconds("ACCESS_TTL_SECONDS", 60 * 15);
export const REFRESH_TTL_SEC = readSeconds(
  "REFRESH_TTL_SECONDS",
  60 * 60 * 24 * 14,
);

type PublicUser = { id: string; phone: string; name?: string };

function getSecretKey() {
  const secret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || "";
  if (!secret) throw new Error("JWT_SECRET not set");
  return new TextEncoder().encode(secret);
}

function newJti() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

async function getRefreshRepo() {
  // Avoid importing Node-only code in Edge (middleware)
  if ((globalThis as any).EdgeRuntime) return null;
  try {
    const mod = await import("./refreshRepo");
    return (mod as any).refreshRepo as {
      store: (jti: string, userId: string, ttlSec: number) => Promise<any>;
      exists: (jti: string) => Promise<boolean>;
      revoke: (jti: string) => Promise<any>;
      rotate: (
        oldJti: string,
        newJti: string,
        userId: string,
        ttlSec: number,
      ) => Promise<any>;
    };
  } catch {
    return null;
  }
}

export async function signAccessToken(user: PublicUser) {
  const key = getSecretKey();
  return await new SignJWT({
    sub: user.id,
    phone: user.phone,
    name: user.name,
    typ: "access",
  } as JWTPayload)
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TTL_SEC}s`)
    .sign(key);
}

export async function signRefreshToken(user: PublicUser, jti?: string) {
  const key = getSecretKey();
  const tokenJti = jti || newJti();
  return await new SignJWT({
    sub: user.id,
    phone: user.phone,
    name: user.name,
    typ: "refresh",
    jti: tokenJti,
  } as JWTPayload)
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .setExpirationTime(`${REFRESH_TTL_SEC}s`)
    .sign(key);
}

export async function verifyToken(token: string) {
  const key = getSecretKey();
  const { payload } = await jwtVerify(token, key, { algorithms: ["HS256"] });
  return payload as JWTPayload & {
    sub?: string;
    phone?: string;
    name?: string;
    typ?: string;
  };
}

export function extractBearer(req: NextRequest) {
  const h =
    req.headers.get("authorization") || req.headers.get("Authorization");
  if (!h) return null;
  const [scheme, token] = h.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token.trim();
}

export async function getUserFromRequest(
  req: NextRequest,
): Promise<PublicUser | null> {
  try {
    const token =
      req.cookies.get(ACCESS_TOKEN_NAME)?.value || extractBearer(req);
    if (!token) return null;
    const payload = await verifyToken(token);
    if (!payload?.sub || !payload.phone) return null;
    return { id: payload.sub, phone: payload.phone, name: payload.name };
  } catch {
    return null;
  }
}

export async function issueAndSetAuthCookies(
  res: NextResponse,
  user: PublicUser,
) {
  const [access, refresh] = await Promise.all([
    signAccessToken(user),
    signRefreshToken(user),
  ]);
  // If Redis is enabled, persist refresh JTI
  try {
    const payload = await verifyToken(refresh);
    if ((payload as any).jti && payload.sub) {
      const repo = await getRefreshRepo();
      if (repo)
        await repo.store(
          String((payload as any).jti),
          String(payload.sub),
          REFRESH_TTL_SEC,
        );
    }
  } catch {
    // ignore
  }
  const cookieSecureEnv = process.env.COOKIE_SECURE?.toLowerCase();
  const cookieSecure =
    cookieSecureEnv === "true"
      ? true
      : cookieSecureEnv === "false"
        ? false
        : process.env.NODE_ENV === "production";
  const base = {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure: cookieSecure,
  };
  res.cookies.set(ACCESS_TOKEN_NAME, access, {
    ...base,
    maxAge: ACCESS_TTL_SEC,
  });
  res.cookies.set(REFRESH_TOKEN_NAME, refresh, {
    ...base,
    maxAge: REFRESH_TTL_SEC,
  });
  return { access, refresh };
}

export function clearAuthCookies(res: NextResponse) {
  const cookieSecureEnv = process.env.COOKIE_SECURE?.toLowerCase();
  const cookieSecure =
    cookieSecureEnv === "true"
      ? true
      : cookieSecureEnv === "false"
        ? false
        : process.env.NODE_ENV === "production";
  const base = {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure: cookieSecure,
  };
  res.cookies.set(ACCESS_TOKEN_NAME, "", { ...base, maxAge: 0 });
  res.cookies.set(REFRESH_TOKEN_NAME, "", { ...base, maxAge: 0 });
}

export async function refreshAccessToken(req: NextRequest, res?: NextResponse) {
  const refresh = req.cookies.get(REFRESH_TOKEN_NAME)?.value;
  if (!refresh) return null;
  try {
    const payload = await verifyToken(refresh);
    if (!payload?.sub || !payload.phone) return null;
    // If Redis is enabled, require the JTI to exist. Rotate only if we can also set cookie on response
    if (payload.typ === "refresh" && "jti" in payload) {
      const jti = String((payload as any).jti || "");
      if (jti) {
        const repo = await getRefreshRepo();
        let ok = true;
        try {
          ok = repo ? await repo.exists(jti) : true;
        } catch {
          // Redis unavailable or error: fallback to stateless behavior
          ok = true;
        }
        if (!ok) return null; // revoked or missing
        if (res) {
          // rotate: delete old, issue new, and set cookie
          const userForRt: PublicUser = {
            id: payload.sub,
            phone: payload.phone,
            name: payload.name,
          };
          const nextJti = newJti();
          const newRefresh = await signRefreshToken(userForRt, nextJti);
          try {
            if (repo)
              await repo.rotate(jti, nextJti, userForRt.id, REFRESH_TTL_SEC);
          } catch {
            // ignore rotation errors
          }
          const cookieSecureEnv = process.env.COOKIE_SECURE?.toLowerCase();
          const cookieSecure =
            cookieSecureEnv === "true"
              ? true
              : cookieSecureEnv === "false"
                ? false
                : process.env.NODE_ENV === "production";
          const base = {
            httpOnly: true,
            sameSite: "lax" as const,
            path: "/",
            secure: cookieSecure,
          };
          res.cookies.set(REFRESH_TOKEN_NAME, newRefresh, {
            ...base,
            maxAge: REFRESH_TTL_SEC,
          });
        }
      }
    }
    const user: PublicUser = {
      id: payload.sub,
      phone: payload.phone,
      name: payload.name,
    };
    const access = await signAccessToken(user);
    if (res) {
      const cookieSecureEnv = process.env.COOKIE_SECURE?.toLowerCase();
      const cookieSecure =
        cookieSecureEnv === "true"
          ? true
          : cookieSecureEnv === "false"
            ? false
            : process.env.NODE_ENV === "production";
      const base = {
        httpOnly: true,
        sameSite: "lax" as const,
        path: "/",
        secure: cookieSecure,
      };
      res.cookies.set(ACCESS_TOKEN_NAME, access, {
        ...base,
        maxAge: ACCESS_TTL_SEC,
      });
    }
    return { access, user };
  } catch {
    return null;
  }
}

// ===== Centralized route protection control =====
// Edit only this section to manage which routes are protected.
export type PathRule = string | RegExp;

function normalizePath(p: string) {
  if (!p) return "/";
  // keep root as '/'; strip trailing slash for others
  return p.length > 1 && p.endsWith("/") ? p.slice(0, -1) : p;
}

export const AuthControl = {
  // Pages that require login (exact match or prefix with *; RegExp supported)
  protectedPages: ["/profile", "/orders"] as PathRule[],
  // API routes that require login
  protectedApi: [
    "/api/reservations",
    // '/api/profile*',
    // /^\/api\/orders(\/.*)?$/,
  ] as PathRule[],
  // Public pages (optional allowlist)
  publicPages: ["/", "/login", "/register", "/verify"] as PathRule[],
  // Where to redirect unauthenticated page requests
  loginPath: "/login",
};

function matchPath(pathname: string, rules: PathRule[]): boolean {
  const path = normalizePath(pathname);
  for (const r of rules) {
    if (typeof r === "string") {
      const rule = normalizePath(r);
      if (rule.endsWith("*")) {
        const prefix = rule.slice(0, -1);
        if (path.startsWith(prefix)) return true;
      } else if (path === rule) return true;
    } else if (r instanceof RegExp) {
      if (r.test(path)) return true;
    }
  }
  return false;
}

export async function authGuard(req: NextRequest): Promise<NextResponse> {
  const { pathname, search } = req.nextUrl;
  const isApi = pathname.startsWith("/api/");
  const dev = process.env.NODE_ENV !== "production";
  // If user hits landing ("/") and already authenticated (valid access token),
  // redirect them to /home. If no/expired token, keep the landing page visible.
  if (!isApi && normalizePath(pathname) === "/") {
    const user = await getUserFromRequest(req);
    if (user) {
      const url = req.nextUrl.clone();
      url.pathname = "/home";
      url.search = "";
      const redir = NextResponse.redirect(url);
      if (dev)
        redir.headers.set(
          "x-auth-debug",
          JSON.stringify({
            path: pathname,
            landing: true,
            authed: true,
            action: "redirect-home",
            via: "access",
          }),
        );
      return redir;
    }
    // Try to refresh on landing: if refresh is valid, mint access and redirect to /home
    const url = req.nextUrl.clone();
    url.pathname = "/home";
    url.search = "";
    const redir = NextResponse.redirect(url);
    const refreshed = await refreshAccessToken(req, redir);
    if (refreshed?.user) {
      if (dev)
        redir.headers.set(
          "x-auth-debug",
          JSON.stringify({
            path: pathname,
            landing: true,
            authed: true,
            action: "redirect-home",
            via: "refresh",
          }),
        );
      return redir;
    }
    const pass = NextResponse.next();
    if (dev)
      pass.headers.set(
        "x-auth-debug",
        JSON.stringify({
          path: pathname,
          landing: true,
          authed: false,
          action: "show-landing",
        }),
      );
    return pass;
  }
  const isPublic = matchPath(pathname, AuthControl.publicPages);
  const needsAuth = isApi
    ? matchPath(pathname, AuthControl.protectedApi)
    : matchPath(pathname, AuthControl.protectedPages);

  // dev is defined above

  if (!needsAuth || isPublic) {
    const res = NextResponse.next();
    if (dev)
      res.headers.set(
        "x-auth-debug",
        JSON.stringify({ path: pathname, isApi, needsAuth, isPublic }),
      );
    return res;
  }

  // Try access token
  const user = await getUserFromRequest(req);
  if (user) {
    const res = NextResponse.next();
    if (dev)
      res.headers.set(
        "x-auth-debug",
        JSON.stringify({
          path: pathname,
          isApi,
          needsAuth,
          isPublic,
          authed: true,
        }),
      );
    return res;
  }

  // Try refresh token to mint new access
  const res = NextResponse.next();
  const refreshed = await refreshAccessToken(req, res);
  if (refreshed?.user) return res;

  // Unauthenticated
  if (isApi) {
    const body = { error: "Unauthorized" };
    const res = NextResponse.json(body, { status: 401 });
    if (dev)
      res.headers.set(
        "x-auth-debug",
        JSON.stringify({
          path: pathname,
          isApi,
          needsAuth,
          isPublic,
          authed: false,
        }),
      );
    return res;
  }
  const url = req.nextUrl.clone();
  url.pathname = AuthControl.loginPath;
  url.search = search
    ? `?from=${encodeURIComponent(pathname + search)}`
    : `?from=${encodeURIComponent(pathname)}`;
  const redir = NextResponse.redirect(url);
  if (dev)
    redir.headers.set(
      "x-auth-debug",
      JSON.stringify({
        path: pathname,
        isApi,
        needsAuth,
        isPublic,
        authed: false,
        action: "redirect-login",
      }),
    );
  return redir;
}
