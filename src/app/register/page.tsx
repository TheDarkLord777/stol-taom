"use client";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import ClientOnly from "@/components/ClientOnly";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function RegistrationPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState<number>(0);

  function normalizePhone(input: string) {
    // ensure leading + and digits only
    let s = input.replace(/[^\d+]/g, "");
    if (!s.startsWith("+")) s = `+${s.replace(/^\+/, "")}`;
    return s;
  }

  async function onSubmit() {
    setError(null);
    if (cooldown > 0) return;
    const p = normalizePhone(phone);
    if (!/^\+\d{10,15}$/.test(p)) {
      setError("Telefon raqam noto'g'ri formatda");
      return;
    }
    if (password.length < 6) {
      setError("Parol kamida 6 ta belgi bo'lishi kerak");
      return;
    }
    try {
      setLoading(true);
      const res = await fetch("/api/register/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name || undefined, phone: p, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 429) {
          const retry = Number(data.retryAfterSec || 0);
          setCooldown(retry || 5);
        }
        throw new Error(data.error || "Xatolik yuz berdi");
      }
      router.push(
        `/verify?phone=${encodeURIComponent(data.phone)}&requestId=${encodeURIComponent(data.requestId)}`,
      );
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  // Cooldown timer
  React.useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((c) => (c > 0 ? c - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);
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
              Ro'yxatdan o'tish
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
                <div className="flex justify-center">
                  <div className="h-14 w-full max-w-md bg-white/50 backdrop-blur-sm rounded shadow-lg" />
                </div>
                <div className="space-y-4 pt-4">
                  <div className="flex flex-col items-center gap-2">
                    <div className="h-6 w-60 bg-white/40 rounded" />
                    <div className="h-16 w-full max-w-xs bg-white/50 rounded-lg" />
                  </div>
                  <div className="flex justify-end">
                    <div className="h-10 w-[140px] bg-black/30 rounded-lg" />
                  </div>
                </div>
              </form>
            }
          >
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (!loading && cooldown <= 0) void onSubmit();
              }}
            >
              {/* Name Input */}
              <div className="flex justify-center">
                <Input
                  type="text"
                  name="name"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ismingizni kiriting"
                  className="h-14 w-full max-w-md bg-white/90 backdrop-blur-sm text-gray-600 placeholder:text-gray-400 text-center text-[24px] border-none shadow-lg placeholder-inika-24"
                />
              </div>

              {/* Phone Input */}
              <div className="flex justify-center">
                <Input
                  type="tel"
                  name="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  onFocus={(e) => {
                    // Prefill +998 on focus if the field is empty to save typing the country code
                    if (!phone || phone.trim() === "") {
                      setPhone("+998");
                      // place caret at end after value is set — run on next tick so DOM reflects new value
                      setTimeout(() => {
                        try {
                          e.currentTarget.selectionStart = e.currentTarget.selectionEnd = e.currentTarget.value.length;
                        } catch {
                          /* ignore */
                        }
                      }, 0);
                    }
                  }}
                  placeholder="Telefon raqamingiz kiriting"
                  className="h-14 w-full max-w-md bg-white/90 backdrop-blur-sm text-gray-600 placeholder:text-gray-400 text-center text-[24px] border-none shadow-lg placeholder-inika-24"
                />
              </div>

              {/* Password Input */}
              <div className="flex justify-center">
                <div className="relative w-full max-w-md">
                  <Input
                    type={showPassword ? "text" : "password"}
                    name="new-password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Parolni kiriting"
                    className="h-14 w-full bg-white/90 backdrop-blur-sm text-gray-600 placeholder:text-gray-400 text-center text-[24px] border-none shadow-lg placeholder-inika-24 pr-12"
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
                <div className="flex flex-col items-center gap-2">
                  {error && <p className="text-red-200">{error}</p>}
                  <Button
                    type="submit"
                    disabled={loading || cooldown > 0}
                    className="h-16 w-full max-w-xs bg-[#C8FF00] hover:bg-[#B8EF00] text-black text-2xl font-bold shadow-xl rounded-lg"
                  >
                    {cooldown > 0
                      ? `Qayta urinsh: ${cooldown}s`
                      : loading
                        ? "Yuborilmoqda..."
                        : "Tasdiqlash"}
                  </Button>
                </div>

                {/* Login Button */}
                <div className="flex justify-end">
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-2 rounded-lg bg-black/50 px-4 py-2 text-white hover:bg-black/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 shadow-md drop-shadow-md"
                  >
                    KIRISH &rarr;
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
