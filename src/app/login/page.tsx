"use client";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import CLSObserver from "@/components/CLSObserver";
import ClientOnly from "@/components/ClientOnly";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function Login() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function normalizePhone(input: string) {
    let s = input.replace(/[^\d+]/g, "");
    if (!s.startsWith("+")) s = `+${s.replace(/^\+/, "")}`;
    return s;
  }

  async function onSubmit() {
    setError(null);
    const p = normalizePhone(phone);
    if (!/^\+\d{10,15}$/.test(p)) {
      setError("Telefon raqam noto'g'ri formatda");
      return;
    }
    try {
      setLoading(true);
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: p, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Xatolik yuz berdi");
      router.replace("/home");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }
  return (
    <div className="relative min-h-[100dvh] w-full overflow-hidden">
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
      <div className="relative z-10 flex min-h-[100dvh] items-center justify-center px-4 md:py-12 py-6">
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
                <Input
                  type="tel"
                  name="username"
                  autoComplete="tel"
                  inputMode="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Telefon raqamingiz kiriting"
                  className="h-14 w-full max-w-md bg-white/90 backdrop-blur-sm text-gray-600 placeholder:text-gray-400 text-center text-lg border-none shadow-lg placeholder-inika-24"
                />
              </div>

              {/* Password Input */}
              <div className="flex justify-center">
                <Input
                  type="password"
                  name="current-password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Parolni kiriting"
                  className="h-14 w-full max-w-md bg-white/90 backdrop-blur-sm text-gray-600 placeholder:text-gray-400 text-center text-lg border-none shadow-lg placeholder-inika-24"
                />
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
