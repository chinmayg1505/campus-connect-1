"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { friendlyErrorMessage } from "@/lib/utils";
import { InlineBanner } from "@/components/States";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (error) {
      setError(friendlyErrorMessage(error));
      return;
    }
    router.replace("/"); // splash re-evaluates session + profile and routes onward
  }

  return (
    <div className="min-h-screen flex flex-col justify-center px-6 py-10 max-w-md mx-auto w-full">
      <h1 className="text-2xl font-bold mb-1">Welcome back</h1>
      <p className="text-text-secondary mb-6">Log in to continue.</p>

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
            autoComplete="current-password"
            className="input-field"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <Link href="/forgot-password" className="text-sm text-secondary self-end -mt-2">
          Forgot password?
        </Link>

        <button type="submit" disabled={submitting} className="btn-primary mt-2">
          {submitting ? "Logging in..." : "Log in"}
        </button>
      </form>

      <p className="text-sm text-text-secondary text-center mt-6">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="text-secondary font-medium">Sign up</Link>
      </p>
    </div>
  );
}
