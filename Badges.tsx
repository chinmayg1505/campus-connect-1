"use client";

import type { RequestStatus, OfferStatus } from "@/lib/supabase/types";
import {
  STATUS_LABELS,
  STATUS_STYLES,
  OFFER_STATUS_LABELS,
  OFFER_STATUS_STYLES,
} from "@/lib/utils";

export function RequestStatusBadge({ status }: { status: RequestStatus }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}

export function OfferStatusBadge({ status }: { status: OfferStatus }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${OFFER_STATUS_STYLES[status]}`}>
      {OFFER_STATUS_LABELS[status]}
    </span>
  );
}

export function CategoryBadge({ label }: { label: string }) {
  return (
    <span className="inline-block rounded-full px-2.5 py-1 text-xs font-medium bg-primary-light text-primary">
      {label}
    </span>
  );
}

export function StarRating({
  value,
  onChange,
  readOnly = false,
  size = 24,
}: {
  value: number;
  onChange?: (v: number) => void;
  readOnly?: boolean;
  size?: number;
}) {
  return (
    <div className="flex gap-1" role={readOnly ? undefined : "radiogroup"} aria-label="Rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={readOnly}
          aria-label={`${n} star${n > 1 ? "s" : ""}`}
          aria-pressed={value >= n}
          onClick={() => onChange?.(n)}
          className={readOnly ? "cursor-default" : "cursor-pointer"}
          style={{ fontSize: size, lineHeight: 1 }}
        >
          <span className={value >= n ? "text-warning" : "text-border"}>★</span>
        </button>
      ))}
    </div>
  );
}
