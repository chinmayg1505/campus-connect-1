"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export default function SplashPage() {
  const { session, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!session) {
      router.replace("/welcome");
    } else if (!profile) {
      router.replace("/onboarding");
    } else {
      router.replace("/home");
    }
  }, [loading, session, profile, router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-primary">
      <div className="text-3xl font-bold text-white tracking-tight">CampusConnect</div>
      <div className="h-8 w-8 rounded-full border-2 border-white/30 border-t-white animate-spin" />
    </div>
  );
}
