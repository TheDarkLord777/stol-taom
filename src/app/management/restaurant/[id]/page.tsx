"use client";
import React from "react";
import { useRouter, useParams } from "next/navigation";
import { apiFetch } from "@/lib/apiFetch";

export default function RestaurantManagementPage() {
  const router = useRouter();
  const params = useParams() as { id?: string };
  const restaurantId = params?.id || "";

  const [status, setStatus] = React.useState<
    "loading" | "not-auth" | "checking" | "allowed" | "denied"
  >("loading");
  const [phone, setPhone] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [message, setMessage] = React.useState<string | null>(null);
  const [openOrders, setOpenOrders] = React.useState<any[] | null>(null);
  const [showRaw, setShowRaw] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;
    async function init() {
      if (!restaurantId) return;
      setStatus("checking");
      // Fast path: try fetching orders directly (works if cookies/access token valid)
      try {
        const direct = await apiFetch(
          `/api/management/orders?restaurantId=${encodeURIComponent(restaurantId)}`,
        );
        if (!mounted) return;
        if (direct.ok) {
          const dj = await direct.json();
          setOpenOrders(dj.items || []);
          setStatus("allowed");
          return;
        }
      } catch (e) {
        // ignore and fall back to explicit check
      }

      // Fallback: explicit manager check then fetch (allows refresh flow)
      try {
        const res = await fetch(
          `/api/management/check?restaurantId=${encodeURIComponent(restaurantId)}`,
          { credentials: "same-origin" },
        );
        if (!mounted) return;
        const j = await res.json().catch(() => null);
        if (j?.allowed) {
          setStatus("allowed");
          try {
            const or = await apiFetch(
              `/api/management/orders?restaurantId=${encodeURIComponent(restaurantId)}`,
            );
            if (!mounted) return;
            if (!or.ok) {
              const oj = await or.json().catch(() => null);
              setMessage(oj?.error || `Status ${or.status}`);
              setOpenOrders([]);
            } else {
              const oj = await or.json();
              if (!mounted) return;
              setOpenOrders(oj.items || []);
            }
          } catch (err) {
            if (!mounted) return;
            setMessage(String(err));
            setOpenOrders([]);
          }
        } else {
          setStatus("not-auth");
        }
      } catch (e) {
        setStatus("not-auth");
      }
    }
    void init();
    return () => {
      mounted = false;
    };
  }, [restaurantId]);

  async function doLogin(e?: React.FormEvent) {
    e?.preventDefault();
    setMessage(null);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ phone, password }),
      });
      const j = await res.json().catch(() => null);
      if (!res.ok) return setMessage(j?.error || `Login failed: ${res.status}`);
      // after successful login, re-check manager access
      const check = await fetch(
        `/api/management/check?restaurantId=${encodeURIComponent(restaurantId)}`,
        { credentials: "same-origin" },
      );
      const cj = await check.json().catch(() => null);
      if (cj?.allowed) setStatus("allowed");
      else setStatus("denied");
    } catch (err) {
      setMessage(String(err));
    }
  }

  // Accordion component for a client group — defined in component scope (before return)
  function ClientAccordion({ label, items }: { label: string; items: any[] }) {
    const [open, setOpen] = React.useState(false);
    // show most recent createdAt for group
    const latest = React.useMemo(() => {
      let ts = 0;
      for (const it of items) {
        const t = it.createdAt ? new Date(it.createdAt).getTime() : 0;
        if (t > ts) ts = t;
      }
      return ts ? new Date(ts).toLocaleString() : "";
    }, [items]);

    return (
      <div className="border rounded overflow-hidden">
        <button
          type="button"
          onClick={() => setOpen((s) => !s)}
          className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900"
        >
          <div className="text-left">
            <div className="font-medium text-gray-900 dark:text-gray-100">
              {label}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              {items.length} item{items.length !== 1 ? "s" : ""} — {latest}
            </div>
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-300">
            {open ? "▾" : "▸"}
          </div>
        </button>
        {open ? (
          <div className="p-3 space-y-2 bg-white dark:bg-gray-800">
            {items.map((o) => (
              <div key={o.id} className="p-2 border rounded">
                <div className="flex justify-between">
                  <div className="font-medium text-gray-900 dark:text-gray-100">
                    {o.type === "order"
                      ? `Order — ${o.status ?? "—"}`
                      : `Reservation — Party: ${o.partySize ?? "—"}`}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    {o.createdAt ? new Date(o.createdAt).toLocaleString() : ""}
                  </div>
                </div>
                {o.type === "order" ? (
                  <div className="mt-2 text-sm text-gray-700 dark:text-gray-200">
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                      Payment: {o.paymentMethod ?? "—"}
                    </div>
                    <div className="mt-2 space-y-1">
                      {Array.isArray(o.items) && o.items.length > 0 ? (
                        o.items.map((it: any) => (
                          <div
                            key={it.id}
                            className="flex justify-between text-sm text-gray-800 dark:text-gray-200"
                          >
                            <div>
                              {it.name} x{it.quantity}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {it.price != null ? `${it.price}` : ""}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-sm text-gray-500">No items</div>
                      )}
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="mt-2 text-sm text-gray-700 dark:text-gray-200">
                      From:{" "}
                      {o.fromDate ? new Date(o.fromDate).toLocaleString() : "—"}
                      {o.toDate
                        ? ` — ${new Date(o.toDate).toLocaleString()}`
                        : ""}
                    </div>
                    {o.note ? (
                      <div className="mt-2 text-sm text-gray-700 dark:text-gray-200">
                        Note: {o.note}
                      </div>
                    ) : null}
                  </>
                )}
              </div>
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  if (!restaurantId) return <div className="p-6">Restaurant id missing</div>;

  return (
    <main className="p-6 mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold mb-4">Management — {restaurantId}</h1>
      {status === "loading" || status === "checking" ? (
        <div>Checking access...</div>
      ) : null}

      {status === "not-auth" && (
        <div>
          <p className="mb-3">
            You must sign in as a manager for this restaurant.
          </p>
          <form onSubmit={doLogin} className="space-y-2">
            <input
              placeholder="Phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded border px-2 py-1"
            />
            <input
              placeholder="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded border px-2 py-1"
            />
            <div className="flex gap-2">
              <button
                className="rounded bg-emerald-500 text-white px-3 py-1"
                type="submit"
              >
                Sign in
              </button>
              <button
                type="button"
                className="rounded bg-gray-200 px-3 py-1"
                onClick={() => router.push("/management")}
              >
                Back
              </button>
            </div>
            {message ? (
              <div className="text-sm text-red-600 mt-2">{message}</div>
            ) : null}
          </form>
        </div>
      )}

      {status === "denied" && (
        <div className="text-red-600">
          Access denied. You are signed in but not a manager for this
          restaurant.
        </div>
      )}

      {status === "allowed" && (
        <div>
          <h2 className="text-lg font-semibold mb-2">Manager Dashboard</h2>
          <p className="text-sm text-gray-600 mb-4">
            You can now manage this restaurant (placeholder UI).
          </p>
          <div className="space-y-2">
            <div className="flex gap-2 items-start">
              <button
                className="rounded bg-sky-500 text-white px-3 py-1"
                onClick={async () => {
                  setMessage(null);
                  setStatus("checking");
                  try {
                    const res = await apiFetch(
                      `/api/management/orders?restaurantId=${encodeURIComponent(restaurantId)}`,
                    );
                    if (!res.ok) {
                      const j = await res.json().catch(() => null);
                      setMessage(j?.error || `Status ${res.status}`);
                      setStatus("allowed");
                      return;
                    }
                    const j = await res.json();
                    setStatus("allowed");
                    setOpenOrders(j.items || []);
                  } catch (e) {
                    setMessage(String(e));
                    setStatus("allowed");
                  }
                }}
              >
                Open Orders
              </button>
              <div>
                <small className="text-xs text-gray-500">
                  Click to load reservations (open orders)
                </small>
                {message ? (
                  <div className="text-sm text-red-600">{message}</div>
                ) : null}
              </div>
            </div>
            <button className="rounded bg-emerald-600 text-white px-3 py-1">
              Edit Menu
            </button>
            <button
              type="button"
              className="rounded bg-gray-200 px-3 py-1 text-sm"
              onClick={() => setShowRaw((s) => !s)}
            >
              {showRaw ? "Hide raw" : "Show raw"}
            </button>
          </div>
        </div>
      )}
      {showRaw && (
        <div className="mt-4 p-3 border rounded bg-white dark:bg-gray-900">
          <div className="text-sm font-medium mb-2">Raw openOrders JSON</div>
          <pre className="text-xs overflow-auto max-h-64">
            {JSON.stringify(openOrders, null, 2)}
          </pre>
        </div>
      )}
      {openOrders && openOrders.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-2">
            Open Orders / Reservations (grouped by client)
          </h3>
          <div className="space-y-2">
            {/* Group orders by user id / phone (robust - falls back to ungrouped list on error) */}
            {(() => {
              try {
                const groups: Array<{
                  key: string;
                  label: string;
                  items: any[];
                }> = [];
                const map = new Map<
                  string,
                  { key: string; label: string; items: any[] }
                >();
                if (!Array.isArray(openOrders))
                  throw new Error("openOrders is not an array");
                for (const o of openOrders) {
                  const uid =
                    (o && o.user && (o.user.id || o.user.phone)) || "guest";
                  const label =
                    (o && o.user && (o.user.name || o.user.phone)) || "Guest";
                  if (!map.has(uid))
                    map.set(uid, { key: uid, label, items: [] });
                  map.get(uid)!.items.push(o);
                }
                for (const v of map.values()) groups.push(v);
                if (groups.length === 0)
                  return (
                    <div className="text-sm text-gray-500">
                      No open orders found.
                    </div>
                  );
                return groups.map((g) => (
                  <ClientAccordion
                    key={g.key}
                    label={g.label}
                    items={g.items}
                  />
                ));
              } catch (err) {
                // If grouping fails for any reason, show a simple fallback list and surface the error message
                return (
                  <div className="space-y-2">
                    <div className="text-sm text-red-600">
                      Failed to group orders: {(err as Error).message}
                    </div>
                    {Array.isArray(openOrders) ? (
                      openOrders.map((o) => (
                        <div
                          key={o.id ?? Math.random()}
                          className="p-2 border rounded"
                        >
                          <div className="font-medium">
                            {o.type === "order"
                              ? `Order — ${o.status ?? "—"}`
                              : `Reservation — ${o.partySize ?? "—"}`}
                          </div>
                          <div className="text-xs text-gray-600">
                            {o.createdAt ?? ""}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-gray-500">
                        No open orders.
                      </div>
                    )}
                  </div>
                );
              }
            })()}
          </div>
        </div>
      )}

      {/* Accordion component for a client group (defined above) */}
    </main>
  );
}
