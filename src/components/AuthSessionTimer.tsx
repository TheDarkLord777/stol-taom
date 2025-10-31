"use client";
import * as React from "react";

type DebugCookies = {
  access?: {
    present?: boolean;
    valid?: boolean;
    ttlSec?: number;
    typ?: string;
    exp?: number;
    expISO?: string;
    error?: string;
  };
  refresh?: {
    present?: boolean;
    valid?: boolean;
    ttlSec?: number;
    typ?: string;
    exp?: number;
    expISO?: string;
    jti?: string;
    error?: string;
  };
};

type DebugResponse = {
  enableRedis: boolean;
  connected: boolean;
  cookies?: DebugCookies;
  error?: string;
};

function Pill({ label, value, tone }: { label: string; value: string; tone: "ok" | "warn" | "bad" | "muted" }) {
  const color =
    tone === "ok"
      ? "bg-emerald-500/20 text-emerald-300 border-emerald-400/30"
      : tone === "warn"
        ? "bg-amber-500/20 text-amber-300 border-amber-400/30"
        : tone === "bad"
          ? "bg-red-500/20 text-red-300 border-red-400/30"
          : "bg-white/10 text-gray-300 border-white/10";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${color}`}>
      <span className="opacity-80">{label}:</span>
      <span className="tabular-nums font-medium">{value}</span>
    </span>
  );
}

export default function AuthSessionTimer({ className = "" }: { className?: string }) {
  const enabled =
    (process.env.NEXT_PUBLIC_AUTH_DEBUG || "").toLowerCase() === "true" ||
    process.env.NEXT_PUBLIC_AUTH_DEBUG === "1";
  if (!enabled) return null;
  const [data, setData] = React.useState<DebugResponse | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const fetchDebug = React.useCallback(async () => {
    try {
      const r = await fetch("/api/auth/debug", { cache: "no-store", credentials: "same-origin" });
      if (!r.ok) throw new Error(`${r.status}`);
      const j = (await r.json()) as DebugResponse;
      setData(j);
      setError(null);
    } catch (e: any) {
      setError(e?.message || "xatolik");
    }
  }, []);

  React.useEffect(() => {
    let active = true;
    fetchDebug();
    const id = setInterval(() => {
      if (!active) return;
      fetchDebug();
    }, 1000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [fetchDebug]);

  const aTtl = data?.cookies?.access?.ttlSec;
  const rTtl = data?.cookies?.refresh?.ttlSec;

  const accessTone: "ok" | "warn" | "bad" | "muted" =
    aTtl == null
      ? "muted"
      : aTtl <= 0
        ? "bad"
        : aTtl <= 10
          ? "warn"
          : "ok";
  const refreshTone: "ok" | "warn" | "bad" | "muted" =
    rTtl == null
      ? "muted"
      : rTtl <= 0
        ? "bad"
        : rTtl <= 60
          ? "warn"
          : "ok";

  return (
    <div className={`rounded-lg border border-white/10 bg-white/5 p-3 ${className}`}>
      <div className="mb-2 text-xs font-medium text-gray-300">Jonli sessiya taymeri</div>
      <div className="flex flex-wrap items-center gap-2">
        <Pill label="Access" value={aTtl != null ? `${Math.max(0, Math.floor(aTtl))}s` : "—"} tone={accessTone} />
        <Pill label="Refresh" value={rTtl != null ? `${Math.max(0, Math.floor(rTtl))}s` : "—"} tone={refreshTone} />
        {data?.enableRedis != null && (
          <Pill
            label="Redis"
            value={data.enableRedis ? (data.connected ? "connected" : "down") : "off"}
            tone={!data.enableRedis ? "muted" : data.connected ? "ok" : "warn"}
          />
        )}
        {error && <span className="text-xs text-red-400">{error}</span>}
      </div>
    </div>
  );
}
