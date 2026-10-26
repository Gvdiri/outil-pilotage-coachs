import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background p-4">
      <div className="max-w-md rounded-2xl border border-border bg-surface p-8 text-center">
        <span className="text-3xl">🔍</span>
        <h1 className="mt-3 text-lg font-bold">Page introuvable</h1>
        <p className="mt-2 text-sm text-muted">
          Cette page n&apos;existe pas ou a été supprimée.
        </p>
        <Link
          href="/"
          className="mt-4 inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
        >
          Retour au Dashboard
        </Link>
      </div>
    </div>
  );
}
