"use client";

import { useEffect, useState, useCallback, useRef, FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { formatRelativeDate, friendlyErrorMessage } from "@/lib/utils";
import { LoadingState, ErrorState, InlineBanner } from "@/components/States";
import type { Message, RequestRow, Profile } from "@/lib/supabase/types";

export default function ChatThreadPage() {
  const params = useParams<{ requestId: string }>();
  const requestId = params.requestId;
  const router = useRouter();
  const { profile } = useAuth();

  const [request, setRequest] = useState<RequestRow | null>(null);
  const [recipientId, setRecipientId] = useState<string | null>(null);
  const [recipientProfile, setRecipientProfile] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    setError(null);

    const reqRes = await supabase.from("requests").select("*").eq("id", requestId).maybeSingle();
    if (reqRes.error || !reqRes.data) {
      setError(reqRes.error ? friendlyErrorMessage(reqRes.error) : "Request not found.");
      setLoading(false);
      return;
    }
    const req = reqRes.data as RequestRow;
    setRequest(req);

    const acceptedOfferRes = await supabase
      .from("offers")
      .select("helper_id")
      .eq("request_id", requestId)
      .eq("status", "accepted")
      .maybeSingle();

    const isOwner = req.requester_id === profile.id;
    const otherId = isOwner ? acceptedOfferRes.data?.helper_id ?? null : req.requester_id;
    setRecipientId(otherId ?? null);

    if (otherId) {
      const { data } = await supabase.from("profiles").select("*").eq("id", otherId).maybeSingle();
      setRecipientProfile((data as Profile) ?? null);
    }

    const msgsRes = await supabase
      .from("messages")
      .select("*")
      .eq("request_id", requestId)
      .order("created_at", { ascending: true })
      .limit(200);

    if (msgsRes.error) {
      setError(friendlyErrorMessage(msgsRes.error));
      setLoading(false);
      return;
    }
    setMessages((msgsRes.data as Message[]) ?? []);
    setLoading(false);

    // Mark unread messages addressed to me as read.
    const unreadIds = ((msgsRes.data as Message[]) ?? [])
      .filter((m) => m.recipient_id === profile.id && !m.read_at)
      .map((m) => m.id);
    if (unreadIds.length > 0) {
      await supabase.from("messages").update({ read_at: new Date().toISOString() }).in("id", unreadIds);
    }
  }, [requestId, profile]);

  useEffect(() => {
    load();
  }, [load]);

  // Realtime subscription for new messages on this request.
  useEffect(() => {
    if (!profile) return;
    const channel = supabase
      .channel(`messages-${requestId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `request_id=eq.${requestId}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [requestId, profile]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    if (!draft.trim() || !profile || !recipientId) return;
    setSendError(null);
    setSending(true);
    const { error } = await supabase.from("messages").insert({
      request_id: requestId,
      sender_id: profile.id,
      recipient_id: recipientId,
      content: draft.trim(),
    });
    setSending(false);
    if (error) {
      setSendError(friendlyErrorMessage(error));
      return;
    }
    setDraft("");
  }

  if (loading) return <LoadingState label="Loading chat..." />;
  if (error || !request) return <ErrorState message={error ?? "Not found"} onRetry={load} />;

  if (!recipientId) {
    return (
      <div className="p-4 md:p-6">
        <button onClick={() => router.back()} className="text-sm text-secondary mb-4">← Back</button>
        <InlineBanner
          kind="warning"
          message="Chat opens once this request has an accepted offer."
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      <div className="border-b border-border bg-surface p-4 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => router.back()} aria-label="Back" className="text-secondary">←</button>
        <div className="h-9 w-9 rounded-full bg-primary-light text-primary flex items-center justify-center font-semibold text-sm">
          {recipientProfile?.full_name?.[0]?.toUpperCase() ?? "?"}
        </div>
        <div className="min-w-0">
          <p className="font-medium text-sm truncate">{recipientProfile?.full_name ?? "Student"}</p>
          <p className="text-xs text-text-secondary truncate">{request.title}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
        {messages.length === 0 && (
          <p className="text-center text-sm text-text-secondary mt-8">
            Say hello — messages here are just between you two, about this request.
          </p>
        )}
        {messages.map((m) => {
          const mine = m.sender_id === profile?.id;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm ${
                  mine ? "bg-secondary text-white rounded-br-sm" : "bg-surface border border-border rounded-bl-sm"
                }`}
              >
                <p className="whitespace-pre-wrap">{m.content}</p>
                <p className={`text-[10px] mt-1 ${mine ? "text-white/70" : "text-text-secondary"}`}>
                  {formatRelativeDate(m.created_at)}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="border-t border-border bg-surface p-3 flex gap-2 sticky bottom-0">
        {sendError && (
          <div className="absolute -top-10 left-3 right-3">
            <InlineBanner kind="error" message={sendError} />
          </div>
        )}
        <input
          className="input-field flex-1"
          placeholder="Type a message..."
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={3000}
          aria-label="Message"
        />
        <button type="submit" disabled={sending || !draft.trim()} className="btn-primary px-5">
          Send
        </button>
      </form>
    </div>
  );
}
