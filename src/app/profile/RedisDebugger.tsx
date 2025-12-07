"use client";
import * as React from "react";

export default function RedisDebugger() {
  const [loading, setLoading] = React.useState(true);
  const [keys, setKeys] = React.useState<{ key: string; ttlSec: number }[]>([]);
  const [lastSync, setLastSync] = React.useState<number | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/profile/redis", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load");
      setKeys(data.keys ?? []);
      setLastSync(data.lastSync ?? null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const doDelete = async (k: string) => {
    if (!confirm(`Delete redis key ${k}?`)) return;
    await fetch("/api/profile/redis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", key: k }),
    });
    await load();
  };

  const doRefresh = async (k: string) => {
    if (!confirm(`Refresh redis key ${k}?`)) return;
    const res = await fetch("/api/profile/redis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "refresh", key: k }),
    });
    const d = await res.json();
    if (!res.ok) alert(d?.message || d?.error || "Refresh failed");
    await load();
  };

  if (loading)
    return <div className="text-sm text-gray-400">Loading Redis...</div>;
  if (error) return <div className="text-sm text-red-500">{error}</div>;

  return (
    <div>
      <div className="mb-3 text-sm text-gray-300">
        Last DB → Redis sync:{" "}
        {lastSync ? new Date(lastSync).toLocaleString() : "never"}
      </div>
      <div className="space-y-2">
        {keys.length === 0 ? (
          <div className="text-sm text-gray-400">No keys found</div>
        ) : (
          keys.map((k) => (
            <div
              key={k.key}
              className="flex items-center justify-between rounded border p-2"
            >
              <div className="flex flex-col">
                <div className="font-mono text-sm">{k.key}</div>
                <div className="text-xs text-gray-400">TTL: {k.ttlSec}</div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => doRefresh(k.key)}
                  className="text-sm text-blue-400"
                >
                  Refresh
                </button>
                <button
                  onClick={() => doDelete(k.key)}
                  className="text-sm text-red-400"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
      <div className="mt-3">
        <button onClick={load} className="text-sm text-gray-300">
          Refresh list
        </button>
      </div>
    </div>
  );
}
