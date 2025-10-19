"use client";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { Suspense, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function VerifyContent() {
  const params = useSearchParams();
  const router = useRouter();
  const phone = params.get("phone") || "";
  const requestId = params.get("requestId") || "";
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState<number>(0);

  async function onSubmit() {
    setError(null);
    if (!requestId || code.length !== 6) {
      setError("Kod 6 xonali bo'lishi kerak");
      return;
    }
    try {
      setLoading(true);
      const res = await fetch("/api/register/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, code }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 429) {
          const retry = Number(data.retryAfterSec || 0);
          setCooldown(retry || 5);
        }
        throw new Error(data.error || "Tasdiqlashda xatolik");
      }
      router.replace("/dashboard");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((c) => (c > 0 ? c - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      <div className="absolute inset-0 z-0">
        <Image src="/register.png" alt="bg" fill className="object-cover" />
        <div className="absolute inset-0 bg-black/20" />
      </div>
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-12">
        <div className="w-full max-w-md space-y-6">
          <div className="flex justify-center">
            <h1 className="bg-[#7B9EFF] px-12 py-3 text-3xl font-bold text-white rounded-lg shadow-lg">
              Kod tasdiqlash
            </h1>
          </div>
          <div className="space-y-2 text-white text-center">
            <p>
              {phone
                ? `${phone} raqamiga yuborilgan 6 xonali kodni kiriting`
                : "6 xonali kodni kiriting"}
            </p>
          </div>
          <div className="flex justify-center">
            <Input
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) =>
                setCode(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))
              }
              placeholder="______"
              className="h-14 w-full max-w-md bg-white/90 backdrop-blur-sm text-gray-600 placeholder:text-gray-400 text-center text-[24px] border-none shadow-lg placeholder-inika-24 tracking-[0.5em]"
            />
          </div>
          {error && <p className="text-center text-red-200">{error}</p>}
          <div className="flex justify-center pt-2">
            <Button
              onClick={onSubmit}
              disabled={loading || cooldown > 0}
              className="h-16 w-full max-w-xs bg-[#C8FF00] hover:bg-[#B8EF00] text-black text-2xl font-bold shadow-xl rounded-lg"
            >
              {cooldown > 0
                ? `Qayta urinish: ${cooldown}s`
                : loading
                  ? "Yuborilmoqda..."
                  : "Tasdiqlash"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <VerifyContent />
    </Suspense>
  );
}
