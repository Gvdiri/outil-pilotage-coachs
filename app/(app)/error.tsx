"use client";

// Filet de sécurité : erreur inattendue dans l'espace privé (ex : Supabase
// injoignable). Affiche le message et propose de réessayer.
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="max-w-md rounded-2xl border border-border bg-surface p-8 text-center">
        <span className="text-3xl">⚠️</span>
        <h1 className="mt-3 text-lg font-bold">Une erreur est survenue</h1>
        <p className="mt-2 break-words text-sm leading-relaxed text-muted">
          {error.message || "Erreur inconnue."}
        </p>
        <button
          onClick={reset}
          className="mt-4 inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
        >
          Réessayer
        </button>
      </div>
    </div>
  );
}
