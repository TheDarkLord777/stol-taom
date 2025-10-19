import { NextRequest, NextResponse } from 'next/server';
import { SignJWT, jwtVerify, JWTPayload } from 'jose';

// Cookie names and TTLs
export const ACCESS_TOKEN_NAME = 'access_token';
export const REFRESH_TOKEN_NAME = 'refresh_token';
export const ACCESS_TTL_SEC = 60 * 15; // 15 minutes
export const REFRESH_TTL_SEC = 60 * 60 * 24 * 14; // 14 days

type PublicUser = { id: string; phone: string; name?: string };

function getSecretKey() {
  const secret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || '';
  if (!secret) throw new Error('JWT_SECRET not set');
  return new TextEncoder().encode(secret);
}

export async function signAccessToken(user: PublicUser) {
  const key = getSecretKey();
  return await new SignJWT({ sub: user.id, phone: user.phone, name: user.name } as JWTPayload)
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TTL_SEC}s`)
    .sign(key);
}

export async function signRefreshToken(user: PublicUser) {
  const key = getSecretKey();
  return await new SignJWT({ sub: user.id, phone: user.phone, name: user.name, typ: 'refresh' } as JWTPayload)
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .setExpirationTime(`${REFRESH_TTL_SEC}s`)
    .sign(key);
}

export async function verifyToken(token: string) {
  const key = getSecretKey();
  const { payload } = await jwtVerify(token, key, { algorithms: ['HS256'] });
  return payload as JWTPayload & { sub?: string; phone?: string; name?: string; typ?: string };
}

export function extractBearer(req: NextRequest) {
  const h = req.headers.get('authorization') || req.headers.get('Authorization');
  if (!h) return null;
  const [scheme, token] = h.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) return null;
  return token.trim();
}

export async function getUserFromRequest(req: NextRequest): Promise<PublicUser | null> {
  try {
    const token = req.cookies.get(ACCESS_TOKEN_NAME)?.value || extractBearer(req);
    if (!token) return null;
    const payload = await verifyToken(token);
    if (!payload?.sub || !payload.phone) return null;
    return { id: payload.sub, phone: payload.phone, name: payload.name };
  } catch {
    return null;
  }
}

export async function issueAndSetAuthCookies(res: NextResponse, user: PublicUser) {
  const [access, refresh] = await Promise.all([
    signAccessToken(user),
    signRefreshToken(user),
  ]);
  const base = { httpOnly: true, sameSite: 'lax' as const, path: '/', secure: process.env.NODE_ENV === 'production' };
  res.cookies.set(ACCESS_TOKEN_NAME, access, { ...base, maxAge: ACCESS_TTL_SEC });
  res.cookies.set(REFRESH_TOKEN_NAME, refresh, { ...base, maxAge: REFRESH_TTL_SEC });
  return { access, refresh };
}

export function clearAuthCookies(res: NextResponse) {
  const base = { httpOnly: true, sameSite: 'lax' as const, path: '/', secure: process.env.NODE_ENV === 'production' };
  res.cookies.set(ACCESS_TOKEN_NAME, '', { ...base, maxAge: 0 });
  res.cookies.set(REFRESH_TOKEN_NAME, '', { ...base, maxAge: 0 });
}

export async function refreshAccessToken(req: NextRequest, res: NextResponse) {
  const refresh = req.cookies.get(REFRESH_TOKEN_NAME)?.value;
  if (!refresh) return null;
  try {
    const payload = await verifyToken(refresh);
    if (!payload?.sub || !payload.phone) return null;
    const user: PublicUser = { id: payload.sub, phone: payload.phone, name: payload.name };
    const access = await signAccessToken(user);
    const base = { httpOnly: true, sameSite: 'lax' as const, path: '/', secure: process.env.NODE_ENV === 'production' };
    res.cookies.set(ACCESS_TOKEN_NAME, access, { ...base, maxAge: ACCESS_TTL_SEC });
    return { access, user };
  } catch {
    return null;
  }
}

// ===== Centralized route protection control =====
// Edit only this section to manage which routes are protected.
export type PathRule = string | RegExp;

function normalizePath(p: string) {
  if (!p) return '/';
  // keep root as '/'; strip trailing slash for others
  return p.length > 1 && p.endsWith('/') ? p.slice(0, -1) : p;
}

export const AuthControl = {
  // Pages that require login (exact match or prefix with *; RegExp supported)
  protectedPages: [
    '/dashboard',
    '/profile',
    // '/restaurants',
    // '/orders',
  ] as PathRule[],
  // API routes that require login
  protectedApi: [
    // '/api/profile*',
    // /^\/api\/orders(\/.*)?$/,
  ] as PathRule[],
  // Public pages (optional allowlist)
  publicPages: [
    '/',
    '/login',
    '/register',
    '/verify',
  ] as PathRule[],
  // Where to redirect unauthenticated page requests
  loginPath: '/login',
};

function matchPath(pathname: string, rules: PathRule[]): boolean {
  const path = normalizePath(pathname);
  for (const r of rules) {
    if (typeof r === 'string') {
      const rule = normalizePath(r);
      if (rule.endsWith('*')) {
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
  const isApi = pathname.startsWith('/api/');
  const isPublic = matchPath(pathname, AuthControl.publicPages);
  const needsAuth = isApi
    ? matchPath(pathname, AuthControl.protectedApi)
    : matchPath(pathname, AuthControl.protectedPages);

  if (!needsAuth || isPublic) {
    return NextResponse.next();
  }

  // Try access token
  const user = await getUserFromRequest(req);
  if (user) return NextResponse.next();

  // Try refresh token to mint new access
  const res = NextResponse.next();
  const refreshed = await refreshAccessToken(req, res);
  if (refreshed?.user) return res;

  // Unauthenticated
  if (isApi) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = AuthControl.loginPath;
  url.search = search ? `?from=${encodeURIComponent(pathname + search)}` : `?from=${encodeURIComponent(pathname)}`;
  return NextResponse.redirect(url);
}
