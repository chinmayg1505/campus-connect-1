"use client";

import Link from "next/link";
import type { RequestRow } from "@/lib/supabase/types";
import { CATEGORY_LABELS, formatRelativeDate, formatDeadline } from "@/lib/utils";
import { RequestStatusBadge, CategoryBadge } from "./Badges";

export function RequestCard({ request }: { request: RequestRow }) {
  const deadline = formatDeadline(request.deadline);
  return (
    <Link
      href={`/requests/${request.id}`}
      className="card block p-4 hover:border-secondary/50 transition-colors"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-semibold text-text-primary leading-snug">{request.title}</h3>
        <RequestStatusBadge status={request.status} />
      </div>
      <p className="text-sm text-text-secondary line-clamp-2 mb-3">{request.description}</p>
      <div className="flex flex-wrap items-center gap-2 text-xs text-text-secondary">
        <CategoryBadge label={CATEGORY_LABELS[request.category]} />
        {request.is_paid && request.budget ? (
          <span className="font-medium text-accent">₹{request.budget}</span>
        ) : (
          <span>Unpaid</span>
        )}
        {deadline && <span>· Due {deadline}</span>}
        <span className="ml-auto">{formatRelativeDate(request.created_at)}</span>
      </div>
    </Link>
  );
}
