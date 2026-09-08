"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import type { College } from "@/lib/supabase/types";
import { LoadingState } from "@/components/States";
import { StarRating } from "@/components/Badges";

export default function ProfilePage() {
  const { profile, signOut } = useAuth();
  const [college, setCollege] = useState<College | null>(null);

  useEffect(() => {
    if (!profile) return;
    supabase
      .from("colleges")
      .select("*")
      .eq("id", profile.college_id)
      .maybeSingle()
      .then(({ data }) => setCollege((data as College) ?? null));
  }, [profile]);

  if (!profile) return <LoadingState />;

  return (
    <div className="p-4 md:p-6 max-w-lg flex flex-col gap-6">
      <div className="flex items-center gap-4">
        {profile.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profile.avatar_url} alt="" className="h-16 w-16 rounded-full object-cover border border-border" />
        ) : (
          <div className="h-16 w-16 rounded-full bg-primary-light text-primary flex items-center justify-center text-2xl font-semibold">
            {profile.full_name[0]?.toUpperCase()}
          </div>
        )}
        <div>
          <h1 className="text-lg font-bold">{profile.full_name}</h1>
          <p className="text-text-secondary text-sm">@{profile.username}</p>
        </div>
      </div>

      <div className="card p-4 grid grid-cols-3 divide-x divide-border text-center">
        <div>
          <p className="text-lg font-bold">{profile.rating_average?.toFixed(1) ?? "0.0"}</p>
          <p className="text-xs text-text-secondary">Rating</p>
        </div>
        <div>
          <p className="text-lg font-bold">{profile.rating_count}</p>
          <p className="text-xs text-text-secondary">Reviews</p>
        </div>
        <div>
          <p className="text-lg font-bold">{profile.completed_count}</p>
          <p className="text-xs text-text-secondary">Completed</p>
        </div>
      </div>

      {profile.rating_count > 0 && (
        <div className="flex items-center gap-2">
          <StarRating value={Math.round(profile.rating_average)} readOnly size={18} />
          <span className="text-sm text-text-secondary">based on {profile.rating_count} rating{profile.rating_count === 1 ? "" : "s"}</span>
        </div>
      )}

      {profile.bio && <p className="text-sm text-text-primary">{profile.bio}</p>}

      <div className="card p-4 flex flex-col gap-2 text-sm">
        <Row label="College" value={college ? `${college.name} — ${college.city}` : "—"} />
        <Row label="Department" value={profile.department} />
        <Row label="Year" value={`Year ${profile.year_of_study}`} />
        <Row label="Looking to" value={{ need_help: "Get help", can_help: "Give help", both: "Both" }[profile.role_mode]} />
      </div>

      {profile.skills && profile.skills.length > 0 && (
        <div>
          <p className="label">Skills</p>
          <div className="flex flex-wrap gap-2">
            {profile.skills.map((s) => (
              <span key={s} className="rounded-full px-3 py-1 text-sm bg-accent-light text-accent">{s}</span>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3">
        <Link href="/profile/edit" className="btn-secondary text-center">Edit profile</Link>
        <button onClick={signOut} className="btn-danger-outline">Log out</button>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-text-secondary">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
