import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ACCESS_TOKEN_NAME, verifyToken } from "@/lib/jwtAuth";
import ClientOnly from "@/components/ClientOnly";
import ProfileClient from "./ProfileClient";

export default async function ProfilePage() {
  // Page-level guard (fallback in dev): require a valid access token
  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_TOKEN_NAME)?.value;
  if (!token) redirect("/login");
  try {
    await verifyToken(token);
  } catch {
    redirect("/login");
  }

  return (
    <ClientOnly
      fallback={
        <div suppressHydrationWarning className="mx-auto max-w-4xl p-6 space-y-4">
          <div className="h-8 w-40 animate-pulse rounded bg-white/10" />
          <div className="h-10 w-full animate-pulse rounded bg-white/10" />
          <div className="h-10 w-2/3 animate-pulse rounded bg-white/10" />
          <div className="h-32 w-full animate-pulse rounded bg-white/10" />
        </div>
      }
    >
      <ProfileClient />
    </ClientOnly>
  );
}
