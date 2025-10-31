"use client";
import Image from "next/image";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  const actions = [
    { label: "🍔 Menyu", href: "/menu" },
    { label: "🍽️ Joy band qilish", href: "/reservation" },
    { label: "📅 Buyurtma berish", href: "/orders" },
    { label: "️⚙️ Profil", href: "/profile" },
  ];

  // Responsiv chap padding: mobil ~20px (pl-5), desktop ~40px (md:pl-10)

  return (
    <div
      suppressHydrationWarning
      className="relative min-h-screen w-full overflow-hidden"
    >
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/dashboard.png"
          alt="Food background"
          fill
          className="object-cover"
          priority
        />
        {/* Overlay for better text readability */}
        <div className="absolute inset-0 bg-black/20" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="flex flex-col items-center gap-4">
            {actions.map((a) => (
              <Button
                key={a.label}
                href={a.href}
                className="h-14 w-full max-w-xs bg-[#C8FF00] hover:bg-[#B8EF00] text-black text-xl font-bold shadow-xl rounded-lg justify-start text-left pl-5 md:pl-15"
              >
                {a.label}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
