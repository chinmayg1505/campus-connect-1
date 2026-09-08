"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { CATEGORIES, CATEGORY_LABELS, friendlyErrorMessage } from "@/lib/utils";
import { LoadingState, ErrorState, EmptyState } from "@/components/States";
import { RequestCard } from "@/components/RequestCard";
import type { RequestRow, RequestCategory } from "@/lib/supabase/types";

type SortOption = "newest" | "oldest" | "deadline";

export default function DiscoverPage() {
  const { profile } = useAuth();
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<RequestCategory | "all">("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOption>("newest");

  // NOTE: this query returns whatever Supabase RLS allows for the current
  // user (same-college, non-cancelled requests, per requests_select_college_or_own).
  // The category/search/sort controls below are UX-only filtering on top of
  // that already-authorized result set — they do not, and must not, act as
  // a security boundary. RLS is the only real boundary.
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    let query = supabase.from("requests").select("*").neq("status", "cancelled");

    if (category !== "all") query = query.eq("category", category);

    if (sort === "newest") query = query.order("created_at", { ascending: false });
    if (sort === "oldest") query = query.order("created_at", { ascending: true });
    if (sort === "deadline") query = query.order("deadline", { ascending: true, nullsFirst: false });

    const { data, error } = await query.limit(50);
    if (error) {
      setError(friendlyErrorMessage(error));
    } else {
      setRequests((data as RequestRow[]) ?? []);
    }
    setLoading(false);
  }, [category, sort]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = requests.filter(
    (r) =>
      r.requester_id !== profile?.id &&
      (search.trim() === "" ||
        r.title.toLowerCase().includes(search.toLowerCase()) ||
        r.description.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="p-4 md:p-6 flex flex-col gap-4">
      <h1 className="text-xl font-bold">Discover</h1>

      <input
        type="search"
        placeholder="Search requests..."
        className="input-field"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        aria-label="Search requests"
      />

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 md:mx-0 md:px-0">
        <button
          onClick={() => setCategory("all")}
          className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm border ${
            category === "all" ? "bg-primary text-white border-primary" : "border-border text-text-secondary"
          }`}
        >
          All
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm border ${
              category === c ? "bg-primary text-white border-primary" : "border-border text-text-secondary"
            }`}
          >
            {CATEGORY_LABELS[c]}
          </button>
        ))}
      </div>

      <div className="flex justify-end">
        <select
          className="input-field w-auto text-sm py-2"
          value={sort}
          onChange={(e) => setSort(e.target.value as SortOption)}
          aria-label="Sort by"
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="deadline">Deadline soonest</option>
        </select>
      </div>

      {loading && <LoadingState label="Loading requests..." />}
      {!loading && error && <ErrorState message={error} onRetry={load} />}
      {!loading && !error && filtered.length === 0 && (
        <EmptyState title="No requests found" description="Try a different category or search term." />
      )}
      {!loading && !error && filtered.length > 0 && (
        <div className="flex flex-col gap-3">
          {filtered.map((r) => <RequestCard key={r.id} request={r} />)}
        </div>
      )}
    </div>
  );
}
