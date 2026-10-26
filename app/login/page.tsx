"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { APP_INITIALS, APP_NAME, APP_TAGLINE } from "@/lib/config";
import { Field, inputClass, PrimaryButton } from "@/components/FormModal";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [forgot, setForgot] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const configured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);

  async function onResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email) {
      setError("Saisis d'abord ton adresse email.");
      return;
    }
    setLoading(true);
    const { error } = await createClient().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/confirm`,
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setResetSent(true);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setError(
        error.message === "Invalid login credentials"
          ? "Email ou mot de passe incorrect."
          : error.message,
      );
      setLoading(false);
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div className="relative flex min-h-dvh items-center justify-center bg-background p-4">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-lg font-black text-white">
            {APP_INITIALS}
          </span>
          <h1 className="text-xl font-bold">{APP_NAME}</h1>
          <p className="text-sm text-muted">{APP_TAGLINE}</p>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          {!configured ? (
            <p className="text-sm leading-relaxed text-muted">
              Supabase n&apos;est pas encore configuré. Suis le guide{" "}
              <span className="font-medium text-foreground">SETUP.md</span>{" "}
              pour connecter la base de données.
            </p>
          ) : resetSent ? (
            <div className="flex flex-col gap-3">
              <p className="rounded-lg bg-[var(--tone-green-bg)] px-3 py-2.5 text-sm text-[var(--tone-green-fg)]">
                ✓ Si un compte existe pour <strong>{email}</strong>, un email de
                réinitialisation vient d&apos;être envoyé. Vérifie ta boîte (et
                les spams).
              </p>
              <button
                type="button"
                onClick={() => {
                  setForgot(false);
                  setResetSent(false);
                }}
                className="text-sm text-primary hover:underline"
              >
                ← Retour à la connexion
              </button>
            </div>
          ) : forgot ? (
            <form onSubmit={onResetPassword} className="flex flex-col gap-4">
              <p className="text-sm text-muted">
                Entre ton email : tu recevras un lien pour définir un nouveau
                mot de passe.
              </p>
              <Field label="Email" required>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  className={inputClass}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alex@exemple.com"
                />
              </Field>
              {error ? (
                <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
                  {error}
                </p>
              ) : null}
              <PrimaryButton disabled={loading}>
                {loading ? "Envoi…" : "Envoyer le lien"}
              </PrimaryButton>
              <button
                type="button"
                onClick={() => {
                  setForgot(false);
                  setError(null);
                }}
                className="text-sm text-muted hover:text-foreground"
              >
                ← Retour à la connexion
              </button>
            </form>
          ) : (
            <form onSubmit={onSubmit} className="flex flex-col gap-4">
              <Field label="Email" required>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  className={inputClass}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alex@exemple.com"
                />
              </Field>
              <Field label="Mot de passe" required>
                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  className={inputClass}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </Field>
              {error ? (
                <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
                  {error}
                </p>
              ) : null}
              <PrimaryButton disabled={loading}>
                {loading ? "Connexion…" : "Se connecter"}
              </PrimaryButton>
              <button
                type="button"
                onClick={() => {
                  setForgot(true);
                  setError(null);
                }}
                className="text-center text-sm text-muted hover:text-foreground"
              >
                Mot de passe oublié ?
              </button>
            </form>
          )}
        </div>
        <p className="mt-4 text-center text-xs text-muted">
          Espace privé — réservé à Alex &amp; Sam.
        </p>
      </div>
    </div>
  );
}
