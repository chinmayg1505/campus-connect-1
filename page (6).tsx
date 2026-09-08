"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { friendlyErrorMessage } from "@/lib/utils";
import { LoadingState, ErrorState, EmptyState } from "@/components/States";
import { RequestCard } from "@/components/RequestCard";
import type { RequestRow } from "@/lib/supabase/types";

export default function HomePage() {
  const { profile } = useAuth();
  const [myActive, setMyActive] = useState<RequestRow[]>([]);
  const [recent, setRecent] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!profile) return;
    setLoading(true);
    setError(null);

    const [mineRes, recentRes] = await Promise.all([
      supabase
        .from("requests")
        .select("*")
        .eq("requester_id", profile.id)
        .in("status", ["posted", "offer_received", "accepted", "in_progress"])
        .order("created_at", { ascending: false })
        .limit(3),
      supabase
        .from("requests")
        .select("*")
        .neq("requester_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

    if (mineRes.error || recentRes.error) {
      setError(friendlyErrorMessage(mineRes.error ?? recentRes.error));
    } else {
      setMyActive((mineRes.data as RequestRow[]) ?? []);
      setRecent((recentRes.data as RequestRow[]) ?? []);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  if (loading) return <LoadingState label="Loading your home..." />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="p-4 md:p-6 flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold">Hi, {profile?.full_name?.split(" ")[0]} 👋</h1>
        <p className="text-text-secondary text-sm">What do you need help with today?</p>
      </div>

      <div className="flex gap-3">
        <Link href="/requests/new" className="btn-primary flex-1 text-center">
          + Post a request
        </Link>
        <Link href="/discover" className="btn-secondary flex-1 text-center">
          Discover
        </Link>
      </div>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Your active requests</h2>
          <Link href="/requests/mine" className="text-sm text-secondary">See all</Link>
        </div>
        {myActive.length === 0 ? (
          <EmptyState
            title="No active requests"
            description="Post one and same-college students will see it right away."
          />
        ) : (
          <div className="flex flex-col gap-3">
            {myActive.map((r) => <RequestCard key={r.id} request={r} />)}
          </div>
        )}
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Recently posted</h2>
          <Link href="/discover" className="text-sm text-secondary">See all</Link>
        </div>
        {recent.length === 0 ? (
          <EmptyState title="Nothing here yet" description="Be the first to post a request at your college." />
        ) : (
          <div className="flex flex-col gap-3">
            {recent.map((r) => <RequestCard key={r.id} request={r} />)}
          </div>
        )}
      </section>
    </div>
  );
}
