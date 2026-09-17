import React, { useState } from "react";
import { Check, LogOut, Sparkles, Moon, Sun, Languages, Sliders, ShieldCheck } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import * as settingsService from "../services/settingsService";
import { getErrorMessage } from "../services/apiClient";
import ErrorState from "../components/ErrorState";
import PageHeader from "../components/PageHeader";

const LANGUAGES = [
  { code: "auto", label: "Auto (Detect from my question)" },
  { code: "en", label: "English" },
  { code: "ta", label: "Tamil (தமிழ்)" },
  { code: "hi", label: "Hindi (हिन्दी)" },
  { code: "te", label: "Telugu (తెలుగు)" },
  { code: "ml", label: "Malayalam (മലയാളം)" },
  { code: "kn", label: "Kannada (ಕನ್ನಡ)" },
  { code: "bn", label: "Bengali (বাংলা)" },
  { code: "mr", label: "Marathi (मराठी)" },
  { code: "gu", label: "Gujarati (ગુજરાતી)" },
  { code: "ur", label: "Urdu (اردو)" },
  { code: "ar", label: "Arabic (العربية)" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "es", label: "Spanish" },
  { code: "zh-cn", label: "Chinese" },
  { code: "ja", label: "Japanese" },
  { code: "ko", label: "Korean" },
];

export default function SettingsPage() {
  const { user, updateLocalUser, logout } = useAuth();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(update: settingsService.SettingsUpdate) {
    setSaving(true);
    setError(null);
    try {
      const updated = await settingsService.updateSettings(update);
      updateLocalUser(updated);
      if (update.theme) {
        document.documentElement.classList.toggle("dark", update.theme === "dark");
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    } catch (err) {
      setError(getErrorMessage(err, "Couldn't save your settings."));
    } finally {
      setSaving(false);
    }
  }

  if (!user) return null;

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <PageHeader
        title="Account & Settings"
        subtitle={`Signed in as ${user.email}`}
        badge={
          saved ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 text-xs font-semibold text-emerald-400 animate-fade-in">
              <Check size={13} /> Settings saved
            </span>
          ) : undefined
        }
      />

      {error && <ErrorState message={error} />}

      <div className="space-y-5">
        {/* Appearance Setting */}
        <section className="rounded-2xl border border-base-750 bg-gradient-to-b from-base-900 to-base-900/70 p-6 shadow-card space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent-500/15 text-accent-400">
              <Moon size={16} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-ink-100 uppercase tracking-wider">Appearance</h2>
              <p className="text-xs text-ink-400">Choose your workspace interface theme.</p>
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            {(["dark", "light"] as const).map((theme) => {
              const isSelected = user.theme === theme;
              return (
                <button
                  key={theme}
                  type="button"
                  onClick={() => save({ theme })}
                  disabled={saving}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-semibold capitalize transition-all focus-ring ${
                    isSelected
                      ? "bg-accent-600/20 text-accent-300 border border-accent-500/40 shadow-sm"
                      : "bg-base-950 text-ink-400 border border-base-750 hover:bg-base-800 hover:text-ink-100"
                  }`}
                >
                  {theme === "dark" ? <Moon size={15} /> : <Sun size={15} />}
                  <span>{theme} Theme</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Multilingual Preference */}
        <section className="rounded-2xl border border-base-750 bg-gradient-to-b from-base-900 to-base-900/70 p-6 shadow-card space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-500/15 text-sky-400">
              <Languages size={16} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-ink-100 uppercase tracking-wider">Default Language</h2>
              <p className="text-xs text-ink-400">
                Your preferred answer language. You can easily switch anytime while asking questions.
              </p>
            </div>
          </div>

          <div className="pt-1">
            <select
              aria-label="Preferred answer language"
              value={user.preferred_language}
              onChange={(e) => save({ preferred_language: e.target.value })}
              disabled={saving}
              className="w-full max-w-sm rounded-xl border border-base-750 bg-base-950 px-3.5 py-2.5 text-xs sm:text-sm text-ink-100 focus-ring hover:border-accent-500/40"
            >
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>
        </section>

        {/* AI Response Style */}
        <section className="rounded-2xl border border-base-750 bg-gradient-to-b from-base-900 to-base-900/70 p-6 shadow-card space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent-500/15 text-accent-400">
              <Sliders size={16} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-ink-100 uppercase tracking-wider">AI Teaching Style</h2>
              <p className="text-xs text-ink-400">
                Choose the default depth and structure of answers provided by your AI teacher.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 pt-1">
            {[
              { id: "detailed", label: "Detailed Teacher", desc: "Full concept breakdowns with explanations and examples" },
              { id: "concise", label: "Concise Bulleted", desc: "Short, rapid summaries and key highlights" },
            ].map((s) => {
              const isSelected = user.response_style === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => save({ response_style: s.id as any })}
                  disabled={saving}
                  className={`flex flex-col items-start gap-1 rounded-2xl p-4 text-left transition-all max-w-xs focus-ring ${
                    isSelected
                      ? "bg-accent-600/20 border border-accent-500/40 shadow-sm text-accent-300"
                      : "bg-base-950 border border-base-750 text-ink-400 hover:bg-base-800 hover:text-ink-100"
                  }`}
                >
                  <span className="text-xs sm:text-sm font-bold text-ink-100">{s.label}</span>
                  <span className="text-xs text-ink-500 leading-relaxed">{s.desc}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Session & Sign out */}
        <div className="pt-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-ink-500">
            <ShieldCheck size={14} className="text-accent-400" />
            <span>Encrypted JWT session</span>
          </div>

          <button
            type="button"
            onClick={logout}
            className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-xs sm:text-sm font-semibold text-red-400 transition-all hover:bg-red-500/20 focus-ring"
          >
            <LogOut size={15} />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
}
