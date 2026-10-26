// État de chargement global de l'espace privé (affiché pendant les fetchs serveur).
export default function Loading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="flex items-center gap-3 text-muted">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-primary" />
        <span className="text-sm">Chargement…</span>
      </div>
    </div>
  );
}
