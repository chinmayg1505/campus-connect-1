"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { friendlyErrorMessage } from "@/lib/utils";
import { InlineBanner } from "@/components/States";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const redirectTo =
      typeof window !== "undefined" ? `${window.location.origin}/login` : undefined;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    setSubmitting(false);
    if (error) {
      setError(friendlyErrorMessage(error));
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center px-6 gap-3">
        <h1 className="text-xl font-bold">Check your email</h1>
        <p className="text-text-secondary max-w-sm">
          If an account exists for <strong>{email}</strong>, a password reset link is on its way.
        </p>
        <Link href="/login" className="btn-primary mt-2">Back to login</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-center px-6 py-10 max-w-md mx-auto w-full">
      <h1 className="text-2xl font-bold mb-1">Reset your password</h1>
      <p className="text-text-secondary mb-6">
        Enter your email and we&apos;ll send you a reset link.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        {error && <InlineBanner kind="error" message={error} />}
        <div>
          <label htmlFor="email" className="label">Email</label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            className="input-field"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <button type="submit" disabled={submitting} className="btn-primary mt-2">
          {submitting ? "Sending..." : "Send reset link"}
        </button>
      </form>

      <p className="text-sm text-text-secondary text-center mt-6">
        <Link href="/login" className="text-secondary font-medium">Back to login</Link>
      </p>
    </div>
  );
}
