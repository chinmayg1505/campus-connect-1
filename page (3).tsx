"use client";

import { useState, FormEvent, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { friendlyErrorMessage } from "@/lib/utils";
import { InlineBanner, LoadingState } from "@/components/States";
import type { Skill, RoleMode } from "@/lib/supabase/types";

export default function EditProfilePage() {
  const router = useRouter();
  const { profile, refreshProfile } = useAuth();

  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [department, setDepartment] = useState(profile?.department ?? "");
  const [yearOfStudy, setYearOfStudy] = useState(String(profile?.year_of_study ?? 1));
  const [roleMode, setRoleMode] = useState<RoleMode>(profile?.role_mode ?? "both");
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? "");
  const [selectedSkills, setSelectedSkills] = useState<string[]>(profile?.skills ?? []);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.from("skills").select("*").order("name").then(({ data }) => setSkills((data as Skill[]) ?? []));
  }, []);

  function toggleSkill(name: string) {
    setSelectedSkills((prev) => (prev.includes(name) ? prev.filter((s) => s !== name) : [...prev, name]));
  }

  if (!profile) return <LoadingState />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!fullName.trim() || !department.trim()) {
      setError("Full name and department are required.");
      return;
    }
    setSubmitting(true);
    // Note: id, username, college_id, rating_average, rating_count, and
    // completed_count are intentionally NOT included here. Stats are
    // system-maintained (protect_profile_stats trigger) and username/college
    // changes aren't part of V1 edit scope per the design doc.
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName.trim(),
        department: department.trim(),
        year_of_study: Number(yearOfStudy),
        role_mode: roleMode,
        bio: bio.trim() || null,
        avatar_url: avatarUrl.trim() || null,
        skills: selectedSkills.length > 0 ? selectedSkills : null,
      })
      .eq("id", profile.id);
    setSubmitting(false);
    if (error) {
      setError(friendlyErrorMessage(error));
      return;
    }
    await refreshProfile();
    router.replace("/profile");
  }

  return (
    <div className="p-4 md:p-6 max-w-lg">
      <h1 className="text-xl font-bold mb-6">Edit profile</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        {error && <InlineBanner kind="error" message={error} />}

        <div>
          <label htmlFor="fullName" className="label">Full name *</label>
          <input id="fullName" required className="input-field" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>

        <div>
          <label className="label">Username</label>
          <input className="input-field bg-background text-text-secondary" value={profile.username} disabled />
          <p className="text-xs text-text-secondary mt-1">Username changes aren't supported yet.</p>
        </div>

        <div>
          <label htmlFor="department" className="label">Department *</label>
          <input id="department" required className="input-field" value={department} onChange={(e) => setDepartment(e.target.value)} />
        </div>

        <div>
          <label htmlFor="year" className="label">Year of study *</label>
          <select id="year" className="input-field" value={yearOfStudy} onChange={(e) => setYearOfStudy(e.target.value)}>
            {[1, 2, 3, 4, 5].map((y) => <option key={y} value={y}>Year {y}</option>)}
          </select>
        </div>

        <div>
          <label htmlFor="roleMode" className="label">I mostly want to</label>
          <select id="roleMode" className="input-field" value={roleMode} onChange={(e) => setRoleMode(e.target.value as RoleMode)}>
            <option value="need_help">Get help</option>
            <option value="can_help">Give help</option>
            <option value="both">Both</option>
          </select>
        </div>

        <div>
          <label htmlFor="bio" className="label">Bio</label>
          <textarea id="bio" className="input-field min-h-[88px]" value={bio} onChange={(e) => setBio(e.target.value)} />
        </div>

        <div>
          <span className="label">Skills</span>
          <div className="flex flex-wrap gap-2">
            {skills.map((skill) => {
              const active = selectedSkills.includes(skill.name);
              return (
                <button
                  type="button"
                  key={skill.id}
                  onClick={() => toggleSkill(skill.name)}
                  aria-pressed={active}
                  className={`rounded-full px-3 py-1.5 text-sm border transition-colors ${
                    active ? "bg-accent text-white border-accent" : "bg-surface text-text-secondary border-border hover:border-accent/50"
                  }`}
                >
                  {skill.name}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label htmlFor="avatarUrl" className="label">Avatar image URL</label>
          <input id="avatarUrl" className="input-field" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} />
        </div>

        <button type="submit" disabled={submitting} className="btn-primary mt-2">
          {submitting ? "Saving..." : "Save changes"}
        </button>
      </form>
    </div>
  );
}
