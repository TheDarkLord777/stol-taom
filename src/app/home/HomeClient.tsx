"use client";

import { usePageTheme } from "@/lib/use-page-theme";
import PulseCard from "@/components/ui/pulse-card";
import Galaxy from "@/components/ui/Galaxy";
import Link from "next/link";
import { Menu, Calendar, ShoppingCart, User } from "lucide-react";

export default function HomeClient() {
    // Apply per-page theme from localStorage (default: dark for /home)
    usePageTheme('/home');

    const actions = [
        { title: "Menyu", description: "Barcha taomlar", icon: <Menu />, href: "/menu", variant: "emerald" },
        { title: "Joy band qilish", description: "Rezervatsiya qiling", icon: <Calendar />, href: "/reservation", variant: "blue" },
        { title: "Buyurtmalarim", description: "Sizning buyurtmalaringiz", icon: <ShoppingCart />, href: "/orders", variant: "purple" },
        { title: "Profil", description: "Hisob sozlamalari", icon: <User />, href: "/profile", variant: "amber" },
    ];

    return (
        <div className="relative min-h-screen w-full overflow-hidden bg-black">
            {/* Galaxy background */}
            <div className="absolute inset-0 z-0">
                <Galaxy mouseRepulsion={true} mouseInteraction={true} className="size-full" />
            </div>

            {/* Content */}
            <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-12">
                <div className="w-full max-w-md">
                    <div className="grid grid-cols-1 gap-4">
                        {actions.map((a) => (
                            <Link key={a.title} href={a.href} className="w-full block">
                                <PulseCard
                                    icon={a.icon}
                                    title={a.title}
                                    description={a.description}
                                    variant={(a as any).variant}
                                    size="md"
                                    glowEffect={true}
                                />
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
