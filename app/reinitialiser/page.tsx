"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { APP_INITIALS, APP_NAME } from "@/lib/config";
import { Field, inputClass, PrimaryButton } from "@/components/FormModal";

// Définition d'un nouveau mot de passe (session de récupération active,
// posée par /auth/confirm).
export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Le mot de passe doit faire au moins 8 caractères.");
      return;
    }
    if (password !== confirm) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }
    setLoading(true);
    const { error } = await createClient().auth.updateUser({ password });
    if (error) {
      setError(
        error.message.includes("session")
          ? "Lien expiré ou déjà utilisé. Redemande un lien depuis la connexion."
          : error.message,
      );
      setLoading(false);
      return;
    }
    setDone(true);
    setTimeout(() => router.push("/"), 1500);
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-lg font-black text-white">
            {APP_INITIALS}
          </span>
          <h1 className="text-xl font-bold">{APP_NAME}</h1>
          <p className="text-sm text-muted">Nouveau mot de passe</p>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          {done ? (
            <p className="rounded-lg bg-[var(--tone-green-bg)] px-3 py-2.5 text-sm text-[var(--tone-green-fg)]">
              ✓ Mot de passe mis à jour. Redirection…
            </p>
          ) : (
            <form onSubmit={onSubmit} className="flex flex-col gap-4">
              <Field label="Nouveau mot de passe" required>
                <input
                  type="password"
                  required
                  autoComplete="new-password"
                  className={inputClass}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="8 caractères minimum"
                />
              </Field>
              <Field label="Confirmer le mot de passe" required>
                <input
                  type="password"
                  required
                  autoComplete="new-password"
                  className={inputClass}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                />
              </Field>
              {error ? (
                <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
                  {error}
                </p>
              ) : null}
              <PrimaryButton disabled={loading}>
                {loading ? "Mise à jour…" : "Enregistrer le mot de passe"}
              </PrimaryButton>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
