import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";
const useStandalone = process.env.NEXT_STANDALONE === "true";

/**
 * Content Security Policy (CSP) configuration string.
 *
 * This policy defines the security rules for the application, specifying
 * the allowed sources for various types of content such as scripts, styles,
 * images, fonts, and more. It is designed to enhance security by preventing
 * unauthorized content from being loaded or executed.
 *
 * - `default-src`: Specifies the default policy for fetching resources.
 * - `connect-src`: Allows connections to the same origin and external protocols
 *   (e.g., HTTP, HTTPS, WebSocket, Secure WebSocket). This is relaxed during
 *   development for Next.js dev tools.
 * - `script-src`: Defines the sources for JavaScript execution. In production,
 *   only inline scripts and self-hosted scripts are allowed. During development,
 *   additional allowances are made for inline scripts, eval, and blob URLs to
 *   support Hot Module Replacement (HMR) and Next.js dev overlay.
 * - `style-src`: Specifies the sources for stylesheets. Inline styles are allowed.
 * - `img-src`: Defines the sources for images, including self-hosted, data URIs,
 *   blob URLs, and HTTPS.
 * - `font-src`: Specifies the sources for fonts, including self-hosted and data URIs.
 * - `object-src`: Disallows the use of `<object>` elements entirely.
 * - `base-uri`: Restricts the URLs that can be used in the `<base>` element.
 * - `form-action`: Limits the URLs to which forms can be submitted.
 * - `upgrade-insecure-requests`: (Commented out) Enforces the use of HTTPS for all
 *   resource requests when uncommented.
 *
 * Notes:
 * - The policy is more permissive during development to facilitate debugging and
 *   development workflows. In production, it is recommended to tighten the policy
 *   further as needed.
 * - Nonce-based or hash-based CSP can be implemented in the future for stricter
 *   script handling.
 */
const csp = [
  "default-src 'self'",
  // Allow Next dev websocket and APIs; tighten in prod as needed
  "connect-src 'self' https: http: ws: wss:",
  // Dev: allow inline/eval for HMR and Next dev overlay
  // Prod: allow inline for Next's small bootstrap scripts (can migrate to nonce-based later)
  isProd
    ? "script-src 'self' 'unsafe-inline'"
    : "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: data:",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  // Uncomment when ready to enforce subresource integrity and cross-origin isolation
  // "upgrade-insecure-requests",
].join("; ");

const nextConfig: NextConfig = {
  output: useStandalone ? "standalone" : undefined,
  transpilePackages: ["swagger-ui-react", "swagger-client"],
  async headers() {
    // Add dev-only cache headers for image optimizer and public photo assets
    // to avoid stale images when replacing files in /public/photo during development.
    const common = [
      { key: "Content-Security-Policy", value: csp },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "no-referrer" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
      { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
      // HSTS only in production and when served via HTTPS
      ...(isProd
        ? [
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          },
        ]
        : []),
    ];

    const headers: Array<{ source: string; headers: { key: string; value: string }[] }> = [];

    if (!isProd) {
      headers.push(
        {
          source: "/_next/image(.*)",
          headers: [
            { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          ],
        },
        {
          source: "/photo/:path*",
          headers: [
            { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          ],
        },
      );
    }

    // Fallback for all routes (common security headers)
    headers.push({ source: "/(.*)", headers: common });
    return headers;
  },
  // allowedDevOrigins is only used by Next.js in development to allow the dev
  // overlay and `_next` assets when loaded from other origins (e.g. remote
  // share links, tunnelling services). Keep this permissive only in dev.
  allowedDevOrigins: (() => {
    if (isProd) return [];
    const defaults = [
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      // Some tools bind to 0.0.0.0 which appears as this origin in requests
      "http://0.0.0.0:3000",
    ];
    // Allow extra origins via comma-separated env var DEV_ALLOWED_ORIGINS
    const extra = (process.env.DEV_ALLOWED_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean);
    return Array.from(new Set([...defaults, ...extra]));
  })(),
};

export default nextConfig;
