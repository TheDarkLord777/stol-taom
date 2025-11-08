"use client";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import CLSObserver from "@/components/CLSObserver";
import ClientOnly from "@/components/ClientOnly";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function Login() {
  const router = useRouter();

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function normalizePhone(input: string) {
    let s = input.replace(/[^\d+]/g, "");
    if (!s.startsWith("+")) s = `+${s.replace(/^\+/, "")}`;
    return s;
  }

  function normalizeForPrefix(v: string) {
    const PHONE_PREFIX = "+998";
    let s = v.trim();
    if (!s) return "";
    s = s.replace(/[^\d+]/g, "");
    if (s.startsWith("+")) {
      // keep other country codes intact
      s = `+${s.slice(1).replace(/\+/g, "")}`;
      return s;
    }
    if (s.startsWith("998")) return `+${s}`;
    return `${PHONE_PREFIX}${s}`;
  }

  async function onSubmit() {
    setError(null);
    const p = normalizePhone(normalizeForPrefix(phone));
    if (!/^\+\d{10,15}$/.test(p)) {
      setError("Telefon raqam noto'g'ri formatda");
      return;
    }
    try {
      setLoading(true);
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Ensure same-site cookies set by the API are accepted by the browser
        // (fetch defaults to 'same-origin' but being explicit avoids edge cases).
        credentials: "same-origin",
        body: JSON.stringify({ phone: p, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Xatolik yuz berdi");
      // Use a full navigation to ensure cookies are available to middleware
      // and server-rendered routes immediately after login. Using router.replace
      // can also work, but forcing a reload avoids edge cases where cookies
      // aren't yet visible to SSR-route checks.
      window.location.href = "/home";
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  // Client-side smooth redirect: if the user already has a valid session,
  // redirect them to /home without a full reload. This complements the
  // middleware/server-side redirect so UX is snappier in SPA flow.
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch("/api/auth/me", { credentials: "same-origin" });
        if (!mounted) return;
        if (res.ok) {
          // Use replace to avoid leaving /login in history
          router.replace("/home");
        }
      } catch {
        // ignore network errors; user will see login form
      }
    })();
    return () => {
      mounted = false;
    };
  }, [router]);
  return (
    <div className="relative min-h-dvh w-full overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/register.png"
          alt="Food background"
          fill
          className="object-cover"
          priority
        />
        {/* Overlay for better text readability */}
        <div className="absolute inset-0 bg-black/20" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex min-h-dvh items-center justify-center px-4 md:py-12 py-6">
        <div className="w-full max-w-md space-y-6">
          {/* Title */}
          <div className="flex justify-center">
            <h1 className="bg-[#7B9EFF] px-12 py-3 text-3xl font-bold text-white rounded-lg shadow-lg">
              Kirish
            </h1>
          </div>

          <ClientOnly
            fallback={
              <form className="space-y-4">
                <div className="flex justify-center">
                  <div className="h-14 w-full max-w-md bg-white/50 backdrop-blur-sm rounded shadow-lg" />
                </div>
                <div className="flex justify-center">
                  <div className="h-14 w-full max-w-md bg-white/50 backdrop-blur-sm rounded shadow-lg" />
                </div>
                <div className="space-y-4 pt-4">
                  <div className="flex justify-center">
                    <div className="h-16 w-full max-w-xs bg-white/50 rounded-lg" />
                  </div>
                  <div className="flex justify-end">
                    <div className="h-10 w-[180px] bg-black/30 rounded-lg" />
                  </div>
                </div>
              </form>
            }
          >
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (!loading) void onSubmit();
              }}
            >
              <CLSObserver />
              {/* Phone Input */}
              <div className="flex justify-center">
                <div className="relative w-full max-w-md">
                  <Input
                    type="tel"
                    name="username"
                    autoComplete="tel"
                    inputMode="tel"
                    value={phone}
                    onChange={(e) => {
                      // allow a single leading + and digits
                      let v = e.target.value;
                      v = v.replace(/[^\d+]/g, "");
                      // remove stray pluses not at start
                      if (v.indexOf("+") > 0) v = v.replace(/\+/g, "");
                      // ensure only one leading plus
                      if ((v.match(/\+/g) || []).length > 1) v = v.replace(/\+/g, "+");
                      setPhone(v);
                    }}
                    onBlur={(e) => {
                      const norm = normalizeForPrefix(e.currentTarget.value);
                      setPhone(norm);
                    }}
                    placeholder="Telefon raqamingiz kiriting"
                    className="h-14 w-full bg-white/90 backdrop-blur-sm text-gray-600 placeholder:text-gray-400 text-center text-lg border-none shadow-lg placeholder-inika-24"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="flex justify-center">
                <div className="relative w-full max-w-md">
                  <Input
                    type={showPassword ? "text" : "password"}
                    name="current-password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Parolni kiriting"
                    className="h-14 w-full bg-white/90 backdrop-blur-sm text-gray-600 placeholder:text-gray-400 text-center text-lg border-none shadow-lg placeholder-inika-24 pr-12"
                  />
                  <button
                    type="button"
                    aria-label="Toggle password visibility"
                    aria-pressed={showPassword}
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-9 w-9 items-center justify-center rounded-md bg-white/10 hover:bg-white/20"
                  >
                    {showPassword ? (
                      // Password is currently visible — show the open-eye icon
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        aria-hidden="true"
                        className="h-5 w-5 text-gray-700"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                      </svg>
                    ) : (
                      // Password is hidden — show the eye-off/hidden icon
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        aria-hidden="true"
                        className="h-5 w-5 text-gray-700"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13.875 18.825A10.05 10.05 0 0112 19c-5.523 0-10-4.477-10-10a9.97 9.97 0 012.45-6.175M3 3l18 18"
                        />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Buttons */}
              <div className="space-y-4 pt-4">
                {/* Confirm Button */}
                <div className="flex justify-center">
                  <Button
                    type="submit"
                    disabled={loading}
                    className="h-16 w-full max-w-xs bg-[#C8FF00] hover:bg-[#B8EF00] text-black text-2xl font-bold shadow-xl rounded-lg"
                  >
                    {loading ? "Kirilmoqda..." : "Kirish"}
                  </Button>
                </div>
                {error && <p className="text-center text-red-200">{error}</p>}

                {/* Register Button */}
                <div className="flex justify-end">
                  <Link
                    href="/register"
                    className="inline-flex items-center gap-2 rounded-lg bg-black/50 px-4 py-2 text-white hover:bg-black/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 shadow-md drop-shadow-md"
                  >
                    Ro'yhatdan o'tish &rarr;
                  </Link>
                </div>
              </div>
            </form>
          </ClientOnly>
        </div>
      </div>
    </div>
  );
}
