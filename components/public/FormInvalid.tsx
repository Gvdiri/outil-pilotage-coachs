// Message propre quand le token est invalide/expiré — n'expose aucune donnée.
export function FormInvalid() {
  return (
    <div className="rounded-2xl border border-border bg-surface p-8 text-center shadow-sm">
      <span className="text-3xl">🔗</span>
      <h1 className="mt-3 text-lg font-bold">Lien invalide ou expiré</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        Ce lien de formulaire n&apos;est plus valide. Contacte ton coach pour
        qu&apos;il t&apos;envoie un nouveau lien.
      </p>
    </div>
  );
}
