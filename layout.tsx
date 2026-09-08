"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Nav } from "@/components/Nav";
import { LoadingState } from "@/components/States";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { session, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!session) {
      router.replace("/welcome");
    } else if (!profile) {
      router.replace("/onboarding");
    }
  }, [loading, session, profile, router]);

  if (loading || !session || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingState />
      </div>
    );
  }

  return (
    <div className="md:flex min-h-screen">
      <Nav />
      <main className="flex-1 pb-20 md:pb-0 max-w-3xl w-full mx-auto md:mx-0">
        {children}
      </main>
    </div>
  );
}
