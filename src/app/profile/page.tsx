import ClientOnly from "@/components/ClientOnly";
import ProfileClient from "./ProfileClient";

export default async function ProfilePage() {
  // Auth is enforced by middleware; avoid verifying here to let refresh flow work seamlessly.

  return (
    <ClientOnly
      fallback={
        <div
          suppressHydrationWarning
          className="mx-auto max-w-4xl p-6 space-y-4"
        >
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
