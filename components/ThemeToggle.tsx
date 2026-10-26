"use client";

import { useSyncExternalStore } from "react";

// Bascule clair/sombre : classe .dark sur <html> + persistance localStorage.
// L'anti-flash (script inline dans le layout racine) applique le thème avant
// le premier rendu — ce composant ne fait que refléter et modifier l'état.

const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function getSnapshot() {
  return document.documentElement.classList.contains("dark");
}

function toggleTheme() {
  const next = !getSnapshot();
  document.documentElement.classList.toggle("dark", next);
  try {
    localStorage.setItem("theme", next ? "dark" : "light");
  } catch {
    // stockage indisponible (navigation privée) : le thème reste pour la session
  }
  listeners.forEach((cb) => cb());
}

export function ThemeToggle() {
  // Serveur : toujours "clair" ; le client se synchronise à l'hydratation.
  const dark = useSyncExternalStore(subscribe, getSnapshot, () => false);

  return (
    <button
      onClick={toggleTheme}
      title={dark ? "Passer en mode clair" : "Passer en mode sombre"}
      className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-background hover:text-foreground"
    >
      {dark ? (
        // Soleil
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      ) : (
        // Lune
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
        </svg>
      )}
    </button>
  );
}
