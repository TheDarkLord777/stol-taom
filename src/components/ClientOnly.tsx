"use client";
import * as React from "react";

type Props = {
  children: React.ReactNode;
  fallback?: React.ReactNode;
};

export default function ClientOnly({ children, fallback = null }: Props) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  if (!mounted) return <>{fallback}</>;
  return <>{children}</>;
}
