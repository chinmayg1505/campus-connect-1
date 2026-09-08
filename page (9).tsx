"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { friendlyErrorMessage } from "@/lib/utils";
import { LoadingState, ErrorState, EmptyState } from "@/components/States";
import { RequestCard } from "@/components/RequestCard";
import type { RequestRow, RequestStatus } from "@/lib/supabase/types";

const FILTERS: { value: RequestStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "posted", label: "Posted" },
  { value: "offer_received", label: "Offers" },
  { value: "accepted", label: "Accepted" },
  { value: "in_progress", label: "In progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

export default function MyRequestsPage() {
  const { profile } = useAuth();
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<RequestStatus | "all">("all");

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("requests")
      .select("*")
      .eq("requester_id", profile.id)
      .order("created_at", { ascending: false });
    if (error) {
      setError(friendlyErrorMessage(error));
    } else {
      setRequests((data as RequestRow[]) ?? []);
    }
    setLoading(false);
  }, [profile]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = filter === "all" ? requests : requests.filter((r) => r.status === filter);

  return (
    <div className="p-4 md:p-6 flex flex-col gap-4">
      <h1 className="text-xl font-bold">My requests</h1>

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 md:mx-0 md:px-0">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm border ${
              filter === f.value ? "bg-primary text-white border-primary" : "border-border text-text-secondary"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading && <LoadingState label="Loading your requests..." />}
      {!loading && error && <ErrorState message={error} onRetry={load} />}
      {!loading && !error && filtered.length === 0 && (
        <EmptyState title="Nothing here" description="Requests matching this filter will show up here." />
      )}
      {!loading && !error && filtered.length > 0 && (
        <div className="flex flex-col gap-3">
          {filtered.map((r) => <RequestCard key={r.id} request={r} />)}
        </div>
      )}
    </div>
  );
}
