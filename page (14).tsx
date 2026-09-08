"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { friendlyErrorMessage } from "@/lib/utils";
import { InlineBanner } from "@/components/States";
import type { College, Skill, RoleMode } from "@/lib/supabase/types";

const ROLE_MODES: { value: RoleMode; label: string; description: string }[] = [
  { value: "need_help", label: "I need help", description: "I'll mostly post requests." },
  { value: "can_help", label: "I can help", description: "I'll mostly offer help to others." },
  { value: "both", label: "Both", description: "I'll do a bit of both." },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { session, refreshProfile, loading: authLoading } = useAuth();

  const [colleges, setColleges] = useState<College[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [optionsError, setOptionsError] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [collegeId, setCollegeId] = useState<string>("");
  const [department, setDepartment] = useState("");
  const [yearOfStudy, setYearOfStudy] = useState<string>("1");
  const [roleMode, setRoleMode] = useState<RoleMode>("both");
  const [bio, setBio] = useState("");
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [avatarUrl, setAvatarUrl] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !session) router.replace("/welcome");
  }, [authLoading, session, router]);

  useEffect(() => {
    async function loadOptions() {
      setLoadingOptions(true);
      setOptionsError(null);
      const [collegesRes, skillsRes] = await Promise.all([
        supabase.from("colleges").select("*").order("name"),
        supabase.from("skills").select("*").order("name"),
      ]);
      if (collegesRes.error || skillsRes.error) {
        setOptionsError(
          friendlyErrorMessage(collegesRes.error ?? skillsRes.error)
        );
      } else {
        setColleges((collegesRes.data as College[]) ?? []);
        setSkills((skillsRes.data as Skill[]) ?? []);
      }
      setLoadingOptions(false);
    }
    loadOptions();
  }, []);

  function toggleSkill(name: string) {
    setSelectedSkills((prev) =>
      prev.includes(name) ? prev.filter((s) => s !== name) : [...prev, name]
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!session) return;
    if (!fullName.trim() || !username.trim() || !collegeId || !department.trim()) {
      setError("Please fill in all required fields.");
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from("profiles").insert({
      id: session.user.id,
      full_name: fullName.trim(),
      username: username.trim().toLowerCase(),
      college_id: Number(collegeId),
      department: department.trim(),
      year_of_study: Number(yearOfStudy),
      role_mode: roleMode,
      bio: bio.trim() || null,
      skills: selectedSkills.length > 0 ? selectedSkills : null,
      avatar_url: avatarUrl.trim() || null,
    });
    setSubmitting(false);

    if (error) {
      setError(friendlyErrorMessage(error));
      return;
    }

    await refreshProfile();
    router.replace("/home");
  }

  if (loadingOptions) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-border border-t-secondary animate-spin" />
      </div>
    );
  }

  if (optionsError) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 text-center">
        <p className="text-danger">{optionsError}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-6 py-10 max-w-lg mx-auto w-full pb-16">
      <h1 className="text-2xl font-bold mb-1">Set up your profile</h1>
      <p className="text-text-secondary mb-6">
        This helps other students at your college find and trust you.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
        {error && <InlineBanner kind="error" message={error} />}

        <div>
          <label htmlFor="fullName" className="label">Full name *</label>
          <input id="fullName" required className="input-field" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>

        <div>
          <label htmlFor="username" className="label">Username *</label>
          <input id="username" required className="input-field" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="e.g. chinmay_r" />
        </div>

        <div>
          <label htmlFor="college" className="label">College *</label>
          <select id="college" required className="input-field" value={collegeId} onChange={(e) => setCollegeId(e.target.value)}>
            <option value="" disabled>Select your college</option>
            {colleges.map((c) => (
              <option key={c.id} value={c.id}>{c.name} — {c.city}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="department" className="label">Department *</label>
          <input id="department" required className="input-field" value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="e.g. Computer Science" />
        </div>

        <div>
          <label htmlFor="year" className="label">Year of study *</label>
          <select id="year" required className="input-field" value={yearOfStudy} onChange={(e) => setYearOfStudy(e.target.value)}>
            {[1, 2, 3, 4, 5].map((y) => (
              <option key={y} value={y}>Year {y}</option>
            ))}
          </select>
        </div>

        <fieldset>
          <legend className="label">I mostly want to *</legend>
          <div className="grid grid-cols-1 gap-2">
            {ROLE_MODES.map((mode) => (
              <label
                key={mode.value}
                className={`card p-3 flex items-start gap-3 cursor-pointer ${
                  roleMode === mode.value ? "border-secondary ring-1 ring-secondary" : ""
                }`}
              >
                <input
                  type="radio"
                  name="roleMode"
                  className="mt-1"
                  checked={roleMode === mode.value}
                  onChange={() => setRoleMode(mode.value)}
                />
                <span>
                  <span className="block font-medium text-sm">{mode.label}</span>
                  <span className="block text-xs text-text-secondary">{mode.description}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <label htmlFor="bio" className="label">Bio</label>
          <textarea id="bio" className="input-field min-h-[88px]" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="A short line about yourself (optional)" />
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
                    active
                      ? "bg-accent text-white border-accent"
                      : "bg-surface text-text-secondary border-border hover:border-accent/50"
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
          <input id="avatarUrl" className="input-field" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://... (optional)" />
          <p className="text-xs text-text-secondary mt-1">
            Direct file upload isn&apos;t implemented yet — paste a link for now. See PROJECT_STATE.md.
          </p>
        </div>

        <button type="submit" disabled={submitting} className="btn-primary mt-2">
          {submitting ? "Creating profile..." : "Finish setup"}
        </button>
      </form>
    </div>
  );
}
