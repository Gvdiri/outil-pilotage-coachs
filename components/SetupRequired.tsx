import { APP_INITIALS, APP_NAME } from "@/lib/config";

// Écran affiché tant que les clés Supabase ne sont pas configurées
// (au lieu d'un crash) — guide vers SETUP.md.
export function SetupRequired() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-surface p-8 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-base font-black text-white">
            {APP_INITIALS}
          </span>
          <div>
            <h1 className="text-lg font-bold">{APP_NAME}</h1>
            <p className="text-sm text-muted">Configuration requise</p>
          </div>
        </div>
        <p className="text-sm leading-relaxed text-muted">
          L&apos;application n&apos;est pas encore connectée à Supabase. Pour la
          mettre en route :
        </p>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-relaxed">
          <li>
            Crée un projet sur{" "}
            <span className="font-medium">supabase.com</span> et exécute{" "}
            <code className="rounded bg-background px-1.5 py-0.5 text-xs">
              supabase/schema.sql
            </code>{" "}
            dans le SQL Editor.
          </li>
          <li>
            Copie{" "}
            <code className="rounded bg-background px-1.5 py-0.5 text-xs">
              .env.example
            </code>{" "}
            en{" "}
            <code className="rounded bg-background px-1.5 py-0.5 text-xs">
              .env.local
            </code>{" "}
            et renseigne les clés du projet.
          </li>
          <li>Redémarre le serveur de dev.</li>
        </ol>
        <p className="mt-4 text-sm text-muted">
          Le guide complet pas à pas est dans{" "}
          <span className="font-medium text-foreground">SETUP.md</span>.
        </p>
      </div>
    </div>
  );
}
