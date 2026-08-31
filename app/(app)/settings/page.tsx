"use client";

// Settings.
//
// The name, which the dashboard greets the student by, and the email the
// account is under. The email is shown but not editable: changing the address
// an account logs in with needs a confirmation step on the new address, and
// there is no mail being sent yet.

import { useEffect, useState } from "react";
import { useProfile } from "@/lib/profileStore";
import { CheckIcon } from "@/components/icons";

export default function SettingsPage() {
  const { profile, ready, setName } = useProfile();
  const [value, setValue] = useState("");
  const [saved, setSaved] = useState(false);

  // Fill the field once the account has loaded, not on every render — typing
  // would otherwise fight the stored value.
  useEffect(() => {
    if (ready) setValue(profile.name);
  }, [ready, profile.name]);

  useEffect(() => {
    if (!saved) return;
    const t = setTimeout(() => setSaved(false), 2000);
    return () => clearTimeout(t);
  }, [saved]);

  return (
    <section className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-3xl font-bold tracking-tight text-ink">Settings</h1>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setName(value);
          setSaved(true);
        }}
        className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-ink">Your name</span>
          <span className="mb-2 block text-xs text-slate-500">
            What Grasp calls you on your home page.
          </span>
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="e.g. Sam"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
        </label>

        <div className="mt-5 border-t border-slate-200 pt-5">
          <span className="mb-1.5 block text-sm font-semibold text-ink">Email</span>
          <p className="text-sm text-slate-500">
            {ready ? profile.email : "—"}
          </p>
        </div>

        <div className="mt-5 flex items-center gap-3">
          <button
            type="submit"
            className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
          >
            Save
          </button>
          {saved && (
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700">
              <CheckIcon className="h-4 w-4" /> Saved
            </span>
          )}
        </div>
      </form>
    </section>
  );
}
