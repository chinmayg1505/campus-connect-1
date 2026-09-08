"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import type { PostgrestError } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth-context";
import {
  CATEGORY_LABELS,
  formatDeadline,
  formatRelativeDate,
  friendlyErrorMessage,
} from "@/lib/utils";
import { LoadingState, ErrorState, InlineBanner, EmptyState } from "@/components/States";
import { RequestStatusBadge, OfferStatusBadge, CategoryBadge, StarRating } from "@/components/Badges";
import type { RequestRow, Offer, Profile } from "@/lib/supabase/types";

type OfferWithHelper = Offer & { helper?: Profile };

export default function RequestDetailsPage() {
  const params = useParams<{ id: string }>();
  const requestId = params.id;
  const router = useRouter();
  const { profile } = useAuth();

  const [request, setRequest] = useState<RequestRow | null>(null);
  const [offers, setOffers] = useState<OfferWithHelper[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

  const [offerMessage, setOfferMessage] = useState("");
  const [offerPrice, setOfferPrice] = useState("");
  const [existingRatingGiven, setExistingRatingGiven] = useState(false);
  const [ratingValue, setRatingValue] = useState(5);
  const [ratingReview, setRatingReview] = useState("");
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  const [ratingSubmitted, setRatingSubmitted] = useState(false);

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    setError(null);

    const [reqRes, offersRes] = await Promise.all([
      supabase.from("requests").select("*").eq("id", requestId).maybeSingle(),
      supabase
        .from("offers")
        .select("*, helper:profiles!offers_helper_id_fkey(*)")
        .eq("request_id", requestId)
        .order("created_at", { ascending: false }),
    ]);

    if (reqRes.error) {
      setError(friendlyErrorMessage(reqRes.error));
      setLoading(false);
      return;
    }
    if (!reqRes.data) {
      setError("This request doesn't exist or you don't have access to it.");
      setLoading(false);
      return;
    }

    setRequest(reqRes.data as RequestRow);
    setOffers((offersRes.data as OfferWithHelper[]) ?? []);

    // Check if the current user already rated the other participant for this request.
    const { data: existingRating } = await supabase
      .from("ratings")
      .select("id")
      .eq("request_id", requestId)
      .eq("reviewer_id", profile.id)
      .maybeSingle();
    setExistingRatingGiven(Boolean(existingRating));

    setLoading(false);
  }, [requestId, profile]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <LoadingState label="Loading request..." />;
  if (error || !request) return <ErrorState message={error ?? "Not found"} onRetry={load} />;
  if (!profile) return null;

  const isOwner = request.requester_id === profile.id;
  const myOffer = offers.find((o) => o.helper_id === profile.id);
  const acceptedOffer = offers.find((o) => o.status === "accepted");
  const isAcceptedHelper = acceptedOffer?.helper_id === profile.id;
  const isParticipant = isOwner || isAcceptedHelper;
  const otherParticipantId = isOwner ? acceptedOffer?.helper_id : request.requester_id;

  const canSendOffer =
    !isOwner &&
    !myOffer &&
    (request.status === "posted" || request.status === "offer_received");

  async function runAction(action: () => Promise<{ error: PostgrestError | null }>) {
    setActionError(null);
    setActionBusy(true);
    const { error } = await action();
    setActionBusy(false);
    if (error) {
      setActionError(friendlyErrorMessage(error));
    } else {
      await load();
    }
  }

  async function submitOffer(e: React.FormEvent) {
    e.preventDefault();
    if (!offerMessage.trim()) {
      setActionError("Please add a short message.");
      return;
    }
    await runAction(() =>
      supabase.from("offers").insert({
        request_id: requestId,
        helper_id: profile.id,
        message: offerMessage.trim(),
        proposed_price: offerPrice ? Number(offerPrice) : null,
      })
    );
    setOfferMessage("");
    setOfferPrice("");
  }

  async function submitRating(e: React.FormEvent) {
    e.preventDefault();
    if (!otherParticipantId) return;
    setActionError(null);
    setRatingSubmitting(true);
    const { error } = await supabase.from("ratings").insert({
      request_id: requestId,
      reviewer_id: profile.id,
      reviewee_id: otherParticipantId,
      rating: ratingValue,
      review: ratingReview.trim() || null,
    });
    setRatingSubmitting(false);
    if (error) {
      setActionError(friendlyErrorMessage(error));
    } else {
      setRatingSubmitted(true);
      setExistingRatingGiven(true);
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl flex flex-col gap-6">
      <button onClick={() => router.back()} className="text-sm text-secondary self-start">
        ← Back
      </button>

      {actionError && <InlineBanner kind="error" message={actionError} />}

      <div className="card p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h1 className="text-lg font-bold">{request.title}</h1>
          <RequestStatusBadge status={request.status} />
        </div>
        <p className="text-text-primary whitespace-pre-wrap mb-3">{request.description}</p>
        <div className="flex flex-wrap items-center gap-2 text-sm text-text-secondary">
          <CategoryBadge label={CATEGORY_LABELS[request.category]} />
          {request.is_paid && request.budget ? (
            <span className="font-medium text-accent">₹{request.budget}</span>
          ) : (
            <span>Unpaid</span>
          )}
          {request.deadline && <span>· Due {formatDeadline(request.deadline)}</span>}
          <span className="ml-auto">Posted {formatRelativeDate(request.created_at)}</span>
        </div>
      </div>

      {/* Owner lifecycle controls */}
      {isOwner && (
        <div className="card p-4 flex flex-col gap-3">
          <h2 className="font-semibold text-sm">Manage this request</h2>
          <div className="flex flex-wrap gap-2">
            {request.status === "accepted" && (
              <button
                disabled={actionBusy}
                onClick={() => runAction(() => supabase.rpc("start_request", { p_request_id: requestId }))}
                className="btn-accent text-sm px-4 py-2"
              >
                Mark as started
              </button>
            )}
            {request.status === "in_progress" && (
              <button
                disabled={actionBusy}
                onClick={() => runAction(() => supabase.rpc("complete_request", { p_request_id: requestId }))}
                className="btn-accent text-sm px-4 py-2"
              >
                Mark as completed
              </button>
            )}
            {["posted", "offer_received", "accepted"].includes(request.status) && (
              <button
                disabled={actionBusy}
                onClick={() => runAction(() => supabase.rpc("cancel_request", { p_request_id: requestId }))}
                className="btn-danger-outline text-sm px-4 py-2"
              >
                Cancel request
              </button>
            )}
          </div>
        </div>
      )}

      {/* Chat link once there's an accepted helper and I'm a participant */}
      {isParticipant && acceptedOffer && (
        <Link href={`/messages/${requestId}`} className="btn-secondary text-center">
          💬 Open chat
        </Link>
      )}

      {/* Rating prompt after completion */}
      {request.status === "completed" && isParticipant && otherParticipantId && (
        <div className="card p-4">
          <h2 className="font-semibold text-sm mb-3">Rate your experience</h2>
          {existingRatingGiven || ratingSubmitted ? (
            <p className="text-sm text-text-secondary">You've already submitted a rating for this request. Thanks!</p>
          ) : (
            <form onSubmit={submitRating} className="flex flex-col gap-3">
              <StarRating value={ratingValue} onChange={setRatingValue} />
              <textarea
                className="input-field min-h-[80px]"
                placeholder="Optional review"
                value={ratingReview}
                onChange={(e) => setRatingReview(e.target.value)}
                maxLength={1000}
              />
              <button type="submit" disabled={ratingSubmitting} className="btn-primary text-sm py-2.5 self-start px-6">
                {ratingSubmitting ? "Submitting..." : "Submit rating"}
              </button>
            </form>
          )}
        </div>
      )}

      {/* Offers section */}
      <div>
        <h2 className="font-semibold mb-3">
          {isOwner ? `Offers (${offers.length})` : "Your offer"}
        </h2>

        {isOwner && offers.length === 0 && (
          <EmptyState title="No offers yet" description="Same-college students will see your request and can respond." />
        )}

        {isOwner &&
          offers.map((offer) => (
            <div key={offer.id} className="card p-4 mb-3 flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-sm">{offer.helper?.full_name ?? "Student"}</p>
                  <p className="text-xs text-text-secondary">@{offer.helper?.username}</p>
                </div>
                <OfferStatusBadge status={offer.status} />
              </div>
              <p className="text-sm text-text-primary">{offer.message}</p>
              {offer.proposed_price != null && (
                <p className="text-sm font-medium text-accent">₹{offer.proposed_price}</p>
              )}
              {offer.status === "pending" && (request.status === "posted" || request.status === "offer_received") && (
                <div className="flex gap-2 mt-1">
                  <button
                    disabled={actionBusy}
                    onClick={() => runAction(() => supabase.rpc("accept_offer", { p_offer_id: offer.id }))}
                    className="btn-accent text-sm px-4 py-2"
                  >
                    Accept
                  </button>
                  <button
                    disabled={actionBusy}
                    onClick={() =>
                      runAction(() =>
                        supabase.from("offers").update({ status: "rejected" }).eq("id", offer.id)
                      )
                    }
                    className="btn-danger-outline text-sm px-4 py-2"
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          ))}

        {!isOwner && myOffer && (
          <div className="card p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Your offer</p>
              <OfferStatusBadge status={myOffer.status} />
            </div>
            <p className="text-sm text-text-primary">{myOffer.message}</p>
            {myOffer.proposed_price != null && (
              <p className="text-sm font-medium text-accent">₹{myOffer.proposed_price}</p>
            )}
            {myOffer.status === "pending" && (
              <button
                disabled={actionBusy}
                onClick={() =>
                  runAction(() =>
                    supabase.from("offers").update({ status: "withdrawn" }).eq("id", myOffer.id)
                  )
                }
                className="btn-danger-outline text-sm px-4 py-2 self-start"
              >
                Withdraw offer
              </button>
            )}
          </div>
        )}

        {canSendOffer && (
          <form onSubmit={submitOffer} className="card p-4 flex flex-col gap-3 mt-3">
            <p className="text-sm font-medium">Send an offer</p>
            <textarea
              className="input-field min-h-[80px]"
              placeholder="Explain how you can help..."
              value={offerMessage}
              onChange={(e) => setOfferMessage(e.target.value)}
              maxLength={1000}
              required
            />
            <input
              type="number"
              min={0}
              className="input-field"
              placeholder="Proposed price (optional, ₹)"
              value={offerPrice}
              onChange={(e) => setOfferPrice(e.target.value)}
            />
            <button type="submit" disabled={actionBusy} className="btn-primary text-sm py-2.5 self-start px-6">
              {actionBusy ? "Sending..." : "Send offer"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
