"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { friendlyErrorMessage } from "@/lib/utils";
import { InlineBanner } from "@/components/States";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsEmailConfirm, setNeedsEmailConfirm] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setSubmitting(true);
    // This creates a row in auth.users ONLY. We deliberately do not insert
    // into public.profiles here — onboarding collects the required fields
    // (college, department, year, role_mode, username) first.
    const { data, error } = await supabase.auth.signUp({ email, password });
    setSubmitting(false);

    if (error) {
      setError(friendlyErrorMessage(error));
      return;
    }

    if (!data.session) {
      // Email confirmation is required by the project's auth settings.
      setNeedsEmailConfirm(true);
      return;
    }

    router.replace("/onboarding");
  }

  if (needsEmailConfirm) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center px-6 gap-3">
        <h1 className="text-xl font-bold">Check your email</h1>
        <p className="text-text-secondary max-w-sm">
          We sent a confirmation link to <strong>{email}</strong>. Confirm it, then come back and log in.
        </p>
        <Link href="/login" className="btn-primary mt-2">Go to login</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-center px-6 py-10 max-w-md mx-auto w-full">
      <h1 className="text-2xl font-bold mb-1">Create your account</h1>
      <p className="text-text-secondary mb-6">You&apos;ll set up your profile next.</p>

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

        <div>
          <label htmlFor="password" className="label">Password</label>
          <input
            id="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="input-field"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="confirm" className="label">Confirm password</label>
          <input
            id="confirm"
            type="password"
            required
            autoComplete="new-password"
            className="input-field"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>

        <button type="submit" disabled={submitting} className="btn-primary mt-2">
          {submitting ? "Creating account..." : "Create account"}
        </button>
      </form>

      <p className="text-sm text-text-secondary text-center mt-6">
        Already have an account?{" "}
        <Link href="/login" className="text-secondary font-medium">Log in</Link>
      </p>
    </div>
  );
}
