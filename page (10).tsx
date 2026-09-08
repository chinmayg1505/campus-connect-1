"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { formatRelativeDate, friendlyErrorMessage } from "@/lib/utils";
import { LoadingState, ErrorState, EmptyState } from "@/components/States";
import type { RequestRow, Profile } from "@/lib/supabase/types";

interface ThreadInfo {
  request: RequestRow;
  otherParty: Profile | null;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
}

// Shapes returned by the two embedded-join queries below. Supabase's typed
// client can't infer nested embed shapes without generated types (`supabase
// gen types typescript`), so these are hand-written to match the exact
// `.select(...)` strings used — narrower and safer than casting to `any`.
interface RequestWithAcceptedOffers extends RequestRow {
  offers: { helper_id: string; status: string }[];
}
interface OfferWithRequest {
  status: string;
  request: RequestRow | null;
}

export default function MessagesPage() {
  const { profile } = useAuth();
  const [threads, setThreads] = useState<ThreadInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    setError(null);

    // A "thread" exists for any request where I'm the requester with an
    // accepted offer, or I'm the helper on an accepted offer.
    const [ownedRes, helpingRes] = await Promise.all([
      supabase
        .from("requests")
        .select("*, offers!inner(helper_id, status)")
        .eq("requester_id", profile.id)
        .eq("offers.status", "accepted"),
      supabase
        .from("offers")
        .select("status, request:requests(*)")
        .eq("helper_id", profile.id)
        .eq("status", "accepted"),
    ]);

    if (ownedRes.error || helpingRes.error) {
      setError(friendlyErrorMessage(ownedRes.error ?? helpingRes.error));
      setLoading(false);
      return;
    }

    const ownedData = (ownedRes.data ?? []) as RequestWithAcceptedOffers[];
    const helpingData = (helpingRes.data ?? []) as OfferWithRequest[];

    const ownedRequests = ownedData.map((r) => ({
      request: r,
      otherPartyId: r.offers[0]?.helper_id as string | undefined,
    }));
    const helpingRequests = helpingData
      .filter((o): o is OfferWithRequest & { request: RequestRow } => o.request !== null)
      .map((o) => ({
        request: o.request,
        otherPartyId: o.request.requester_id,
      }));

    const combined = [...ownedRequests, ...helpingRequests];

    const results: ThreadInfo[] = await Promise.all(
      combined.map(async ({ request, otherPartyId }) => {
        const [otherPartyRes, lastMsgRes, unreadRes] = await Promise.all([
          otherPartyId
            ? supabase.from("profiles").select("*").eq("id", otherPartyId).maybeSingle()
            : Promise.resolve({ data: null }),
          supabase
            .from("messages")
            .select("content, created_at")
            .eq("request_id", request.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase
            .from("messages")
            .select("id", { count: "exact", head: true })
            .eq("request_id", request.id)
            .eq("recipient_id", profile.id)
            .is("read_at", null),
        ]);
        return {
          request,
          otherParty: (otherPartyRes.data as Profile | null) ?? null,
          lastMessage: lastMsgRes.data?.content ?? null,
          lastMessageAt: lastMsgRes.data?.created_at ?? null,
          unreadCount: unreadRes.count ?? 0,
        };
      })
    );

    results.sort((a, b) => {
      const at = a.lastMessageAt ?? a.request.created_at;
      const bt = b.lastMessageAt ?? b.request.created_at;
      return new Date(bt).getTime() - new Date(at).getTime();
    });

    setThreads(results);
    setLoading(false);
  }, [profile]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <LoadingState label="Loading messages..." />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="p-4 md:p-6 flex flex-col gap-4">
      <h1 className="text-xl font-bold">Messages</h1>

      {threads.length === 0 ? (
        <EmptyState
          title="No conversations yet"
          description="Chats open automatically once an offer is accepted on a request."
        />
      ) : (
        <div className="flex flex-col gap-2">
          {threads.map((t) => (
            <Link
              key={t.request.id}
              href={`/messages/${t.request.id}`}
              className="card p-3.5 flex items-center gap-3 hover:border-secondary/50 transition-colors"
            >
              <div className="h-11 w-11 rounded-full bg-primary-light text-primary flex items-center justify-center font-semibold shrink-0">
                {t.otherParty?.full_name?.[0]?.toUpperCase() ?? "?"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-sm truncate">{t.otherParty?.full_name ?? "Student"}</p>
                  {t.lastMessageAt && (
                    <span className="text-xs text-text-secondary shrink-0">{formatRelativeDate(t.lastMessageAt)}</span>
                  )}
                </div>
                <p className="text-xs text-text-secondary truncate">{t.request.title}</p>
                {t.lastMessage && (
                  <p className="text-sm text-text-secondary truncate mt-0.5">{t.lastMessage}</p>
                )}
              </div>
              {t.unreadCount > 0 && (
                <span className="h-5 min-w-[20px] px-1 rounded-full bg-secondary text-white text-xs flex items-center justify-center shrink-0">
                  {t.unreadCount}
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
