"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { CATEGORIES, CATEGORY_LABELS, friendlyErrorMessage } from "@/lib/utils";
import { InlineBanner } from "@/components/States";
import type { RequestCategory } from "@/lib/supabase/types";

export default function NewRequestPage() {
  const router = useRouter();
  const { profile } = useAuth();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<RequestCategory>("academics");
  const [isPaid, setIsPaid] = useState(false);
  const [budget, setBudget] = useState("");
  const [deadline, setDeadline] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!profile) return;
    if (!title.trim() || !description.trim()) {
      setError("Title and description are required.");
      return;
    }
    if (title.length > 150) {
      setError("Title must be under 150 characters.");
      return;
    }

    setSubmitting(true);
    const { data, error } = await supabase
      .from("requests")
      .insert({
        requester_id: profile.id,
        title: title.trim(),
        description: description.trim(),
        category,
        is_paid: isPaid,
        budget: isPaid && budget ? Number(budget) : null,
        deadline: deadline || null,
      })
      .select("id")
      .single();
    setSubmitting(false);

    if (error) {
      setError(friendlyErrorMessage(error));
      return;
    }

    router.replace(`/requests/${data.id}`);
  }

  return (
    <div className="p-4 md:p-6 max-w-lg">
      <h1 className="text-xl font-bold mb-1">Post a request</h1>
      <p className="text-text-secondary text-sm mb-6">
        Visible to students at your college once posted.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        {error && <InlineBanner kind="error" message={error} />}

        <div>
          <label htmlFor="title" className="label">Title *</label>
          <input id="title" required maxLength={150} className="input-field" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Need help with SolidWorks assembly" />
        </div>

        <div>
          <label htmlFor="description" className="label">Description *</label>
          <textarea id="description" required maxLength={3000} className="input-field min-h-[120px]" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What exactly do you need help with, and by when?" />
        </div>

        <div>
          <label htmlFor="category" className="label">Category *</label>
          <select id="category" className="input-field" value={category} onChange={(e) => setCategory(e.target.value as RequestCategory)}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
            ))}
          </select>
        </div>

        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" checked={isPaid} onChange={(e) => setIsPaid(e.target.checked)} />
          This is a paid request
        </label>

        {isPaid && (
          <div>
            <label htmlFor="budget" className="label">Budget (₹)</label>
            <input id="budget" type="number" min={0} step="1" className="input-field" value={budget} onChange={(e) => setBudget(e.target.value)} />
          </div>
        )}

        <div>
          <label htmlFor="deadline" className="label">Deadline</label>
          <input id="deadline" type="date" className="input-field" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
        </div>

        <button type="submit" disabled={submitting} className="btn-primary mt-2">
          {submitting ? "Posting..." : "Post request"}
        </button>
      </form>
    </div>
  );
}
