"use client";
import * as Tabs from "@radix-ui/react-tabs";
import * as React from "react";
import AuthSessionTimer from "@/components/AuthSessionTimer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type MeResponse = {
  user?: {
    id: string;
    name?: string;
    email?: string;
    phone?: string;
    avatarUrl?: string;
    locale?: string;
    timezone?: string;
  } | null;
};

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-white/10 bg-white/5 p-4">
      <h2 className="mb-3 text-base font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export default function ProfileClient() {
  const [tab, setTab] = React.useState("account");

  // Account state
  const [me, setMe] = React.useState<MeResponse["user"] | null>(null);
  const [loadingMe, setLoadingMe] = React.useState(true);
  const [errorMe, setErrorMe] = React.useState<string | null>(null);
  const [editing, setEditing] = React.useState(false);
  const [editName, setEditName] = React.useState("");
  const [editEmail, setEditEmail] = React.useState("");
  const [editPhone, setEditPhone] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  type ProfileUpdateRequest = {
    name?: string;
    email?: string;
    phone?: string;
  };
  type ProfileUpdateResponse = {
    success?: boolean;
    requestId?: string;
    phone?: string;
    user?: { id: string; name?: string; phone?: string };
    error?: string;
    retryAfterSec?: number;
    detail?: unknown;
  };

  // Reservations state
  type Reservation = {
    id?: string;
    restaurant?: { name?: string } | null;
    date?: string | null;
    createdAt?: number | null;
    status?: string | null;
    title?: string | null;
  };
  const [reservations, setReservations] = React.useState<Reservation[] | null>(
    null,
  );
  const [loadingRes, setLoadingRes] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    setLoadingMe(true);
    fetch("/api/auth/me", { credentials: "same-origin" })
      .then(async (r) => {
        if (r.status === 401) {
          // Not authenticated: redirect to login preserving return path
          if (active) {
            const from = encodeURIComponent("/profile");
            window.location.href = `/login?from=${from}`;
          }
          return Promise.reject("unauthorized");
        }
        if (!r.ok) return Promise.reject(r);
        return r.json();
      })
      .then((d: MeResponse) => {
        if (!active) return;
        setMe(d.user ?? null);
      })
      .catch((err) => {
        if (!active) return;
        if (err !== "unauthorized")
          setErrorMe("Ma'lumotlarni yuklashda xatolik");
      })
      .finally(() => {
        if (active) setLoadingMe(false);
      });

    return () => {
      active = false;
    };
  }, []);

  React.useEffect(() => {
    if (me) {
      setEditName(me.name ?? "");
      setEditEmail(me.email ?? "");
      setEditPhone(me.phone ?? "");
    }
  }, [me]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {}
    window.location.href = "/login";
  };

  const loadReservations = React.useCallback(() => {
    setLoadingRes(true);
    fetch("/api/reservations")
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((d: unknown) => {
        const payload = d as { items?: Reservation[] } | Reservation[];
        if (Array.isArray(payload)) {
          setReservations(payload as Reservation[]);
        } else {
          const obj = payload as { items?: Reservation[] | undefined };
          if (Array.isArray(obj.items))
            setReservations(obj.items as Reservation[]);
          else setReservations([]);
        }
      })
      .catch(() => setReservations([]))
      .finally(() => setLoadingRes(false));
  }, []);

  React.useEffect(() => {
    if (tab === "reservations" && reservations == null) {
      loadReservations();
    }
  }, [tab, reservations, loadReservations]);

  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="mb-4 text-2xl font-bold">Profil</h1>

      <Tabs.Root value={tab} onValueChange={setTab}>
        <Tabs.List className="mb-4 flex gap-2 border-b border-white/10 pb-2">
          <Tabs.Trigger
            value="account"
            className={`rounded px-3 py-1 text-sm ${tab === "account" ? "bg-white/10" : "hover:bg-white/5"}`}
          >
            Account
          </Tabs.Trigger>
          <Tabs.Trigger
            value="security"
            className={`rounded px-3 py-1 text-sm ${tab === "security" ? "bg-white/10" : "hover:bg-white/5"}`}
          >
            Security
          </Tabs.Trigger>
          <Tabs.Trigger
            value="reservations"
            className={`rounded px-3 py-1 text-sm ${tab === "reservations" ? "bg-white/10" : "hover:bg-white/5"}`}
          >
            Reservations
          </Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="account" className="space-y-4">
          <Section title="Foydalanuvchi ma'lumotlari">
            {loadingMe ? (
              <div className="animate-pulse space-y-3">
                <div className="h-6 w-48 rounded bg-white/10" />
                <div className="h-10 w-full rounded bg-white/10" />
                <div className="h-10 w-full rounded bg-white/10" />
                <div className="h-10 w-2/3 rounded bg-white/10" />
              </div>
            ) : errorMe ? (
              <div className="text-sm text-red-500">{errorMe}</div>
            ) : me ? (
              <form className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label
                    htmlFor="me-name"
                    className="mb-1 block text-sm text-gray-300"
                  >
                    Ism
                  </label>
                  <Input
                    id="me-name"
                    value={editing ? editName : (me.name ?? "")}
                    onChange={(e) => setEditName(e.target.value)}
                    disabled={!editing}
                    readOnly={!editing}
                  />
                </div>
                <div>
                  <label
                    htmlFor="me-email"
                    className="mb-1 block text-sm text-gray-300"
                  >
                    Email
                  </label>
                  <Input
                    id="me-email"
                    value={editing ? editEmail : (me.email ?? "")}
                    onChange={(e) => setEditEmail(e.target.value)}
                    disabled={!editing}
                    readOnly={!editing}
                  />
                </div>
                <div>
                  <label
                    htmlFor="me-phone"
                    className="mb-1 block text-sm text-gray-300"
                  >
                    Telefon
                  </label>
                  <Input
                    id="me-phone"
                    value={editing ? editPhone : (me.phone ?? "")}
                    onChange={(e) => setEditPhone(e.target.value)}
                    disabled={!editing}
                    readOnly={!editing}
                  />
                </div>
                <div>
                  <label
                    htmlFor="me-locale"
                    className="mb-1 block text-sm text-gray-300"
                  >
                    Til
                  </label>
                  <Input
                    id="me-locale"
                    value={me.locale ?? "uz"}
                    disabled
                    readOnly
                  />
                </div>
                <div>
                  <label
                    htmlFor="me-timezone"
                    className="mb-1 block text-sm text-gray-300"
                  >
                    Vaqt mintaqasi
                  </label>
                  <Input
                    id="me-timezone"
                    value={
                      me.timezone ??
                      Intl.DateTimeFormat().resolvedOptions().timeZone
                    }
                    disabled
                    readOnly
                  />
                </div>
                <div className="sm:col-span-2 flex items-center justify-between">
                  <div className="text-xs text-gray-400">
                    Profildagi ma'lumotni tahrirlash
                  </div>
                  <div className="flex gap-2">
                    {editing ? (
                      <>
                        <Button
                          onClick={async () => {
                            // Cancel
                            setEditing(false);
                            if (me) {
                              setEditName(me.name ?? "");
                              setEditEmail(me.email ?? "");
                              setEditPhone(me.phone ?? "");
                            }
                          }}
                          variant="outline"
                        >
                          Bekor qilish
                        </Button>
                        <Button
                          onClick={async () => {
                            // Save
                            if (!me) return;
                            setSaving(true);
                            try {
                              const payload: ProfileUpdateRequest = {
                                name: editName,
                                email: editEmail,
                              };
                              if (editPhone !== me.phone)
                                payload.phone = editPhone;
                              const res = await fetch("/api/profile/update", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify(payload),
                              });
                              const data =
                                (await res.json()) as ProfileUpdateResponse;
                              if (!res.ok)
                                throw new Error(data.error || "Xatolik");
                              // If phone change initiated, redirect to verify
                              if (data.requestId && data.phone) {
                                const url = new URL(
                                  `/verify`,
                                  window.location.origin,
                                );
                                url.searchParams.set(
                                  "phone",
                                  String(data.phone),
                                );
                                url.searchParams.set(
                                  "requestId",
                                  String(data.requestId),
                                );
                                url.searchParams.set("from", "profile");
                                window.location.href = url.toString();
                                return;
                              }
                              // Otherwise, update local state
                              setMe((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      name: editName,
                                      email: editEmail,
                                      phone: editPhone,
                                    }
                                  : prev,
                              );
                              setEditing(false);
                            } catch (e: unknown) {
                              const msg =
                                e instanceof Error ? e.message : String(e);
                              setErrorMe(msg);
                            } finally {
                              setSaving(false);
                            }
                          }}
                          disabled={saving}
                        >
                          Saqlash
                        </Button>
                      </>
                    ) : (
                      <Button onClick={() => setEditing(true)}>
                        Tahrirlash
                      </Button>
                    )}
                  </div>
                </div>
              </form>
            ) : (
              <div className="text-sm text-gray-400">Ma'lumot topilmadi</div>
            )}
          </Section>
        </Tabs.Content>

        <Tabs.Content value="security" className="space-y-4">
          <Section title="Sessiyalar">
            <div className="flex flex-col gap-3">
              <AuthSessionTimer />
              <div className="text-sm text-gray-400">
                Faol sessiya: ushbu qurilma
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleLogout}
                  className="h-10 px-4 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-md shadow-sm"
                >
                  Chiqish (ushbu qurilma)
                </Button>
              </div>
            </div>
          </Section>
        </Tabs.Content>

        <Tabs.Content value="reservations" className="space-y-4">
          <Section title="Bronlar">
            {loadingRes && !reservations ? (
              <div className="space-y-2">
                <div className="h-10 w-full animate-pulse rounded bg-white/10" />
                <div className="h-10 w-full animate-pulse rounded bg-white/10" />
                <div className="h-10 w-full animate-pulse rounded bg-white/10" />
              </div>
            ) : !reservations || reservations.length === 0 ? (
              <div className="text-sm text-gray-400">Hozircha bronlar yo'q</div>
            ) : (
              <ul className="divide-y divide-white/10">
                {reservations.map((r, idx) => (
                  <li key={r.id ?? idx} className="py-3 text-sm">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="font-medium">
                          {r.restaurant?.name ?? r.title ?? "Bron"}
                        </div>
                        <div className="text-gray-400">
                          {r.date
                            ? new Date(r.date).toLocaleString()
                            : r.createdAt
                              ? new Date(r.createdAt).toLocaleString()
                              : "Sana mavjud emas"}
                        </div>
                      </div>
                      <div className="text-xs text-gray-400">
                        {r.status ?? ""}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-3">
              <Button
                variant="secondary"
                onClick={loadReservations}
                disabled={loadingRes}
              >
                {loadingRes ? "Yuklanmoqda..." : "Yangilash"}
              </Button>
            </div>
          </Section>
        </Tabs.Content>
      </Tabs.Root>
    </div>
  );
}
