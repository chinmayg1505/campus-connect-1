import type { RequestCategory, RequestStatus, OfferStatus } from "./supabase/types";

export const CATEGORY_LABELS: Record<RequestCategory, string> = {
  academics: "Academics",
  tech: "Tech",
  design: "Design",
  projects: "Projects",
  events: "Events",
  other: "Other",
};

export const CATEGORIES: RequestCategory[] = [
  "academics",
  "tech",
  "design",
  "projects",
  "events",
  "other",
];

export const STATUS_LABELS: Record<RequestStatus, string> = {
  posted: "Posted",
  offer_received: "Offers received",
  accepted: "Accepted",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const STATUS_STYLES: Record<RequestStatus, string> = {
  posted: "bg-secondary-light text-secondary",
  offer_received: "bg-warning-light text-warning",
  accepted: "bg-accent-light text-accent",
  in_progress: "bg-accent-light text-accent",
  completed: "bg-success-light text-success",
  cancelled: "bg-danger-light text-danger",
};

export const OFFER_STATUS_LABELS: Record<OfferStatus, string> = {
  pending: "Pending",
  accepted: "Accepted",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

export const OFFER_STATUS_STYLES: Record<OfferStatus, string> = {
  pending: "bg-warning-light text-warning",
  accepted: "bg-success-light text-success",
  rejected: "bg-danger-light text-danger",
  withdrawn: "bg-border text-text-secondary",
};

export function formatRelativeDate(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export function formatDeadline(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function friendlyErrorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  if (raw.includes("permission denied") || raw.includes("policy")) {
    return "You don't have permission to do that.";
  }
  if (raw.includes("duplicate key") || raw.includes("already exists")) {
    return "That already exists — please try a different value.";
  }
  if (raw.includes("Failed to fetch") || raw.includes("network")) {
    return "Network error. Check your connection and try again.";
  }
  if (raw.includes("Invalid login credentials")) {
    return "Incorrect email or password.";
  }
  if (raw.includes("Email not confirmed")) {
    return "Please confirm your email before logging in.";
  }
  if (raw.includes("User already registered")) {
    return "An account with this email already exists.";
  }
  return "Something went wrong. Please try again.";
}
