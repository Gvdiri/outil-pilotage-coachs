"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { APP_INITIALS, APP_NAME } from "@/lib/config";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NAV_ICONS } from "@/components/NavIcons";

// Coquille de l'app : sidebar fixe (desktop) + topbar avec burger (mobile).

const NAV = [
  { href: "/", label: "Dashboard", icon: "dashboard" },
  { href: "/taches", label: "Tâches", icon: "taches" },
  { href: "/contenu", label: "Contenu", icon: "contenu" },
  { href: "/prospects", label: "Prospects", icon: "prospects" },
  { href: "/clients", label: "Clients", icon: "clients" },
  { href: "/finances", label: "Finances", icon: "finances" },
  { href: "/formulaires", label: "Formulaires", icon: "formulaires" },
  { href: "/docs", label: "Docs", icon: "docs" },
  { href: "/reunions", label: "Réunions", icon: "reunions" },
];

export function AppShell({
  userName,
  children,
}: {
  userName: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  async function logout() {
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const nav = (
    <nav className="flex flex-col gap-1">
      {NAV.map((item) => {
        const active =
          item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMenuOpen(false)}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              active
                ? "bg-primary-soft text-primary"
                : "text-muted hover:bg-background hover:text-foreground"
            }`}
          >
            <span className="shrink-0">{NAV_ICONS[item.icon]}</span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  const userBlock = (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 py-2">
      <div className="flex items-center gap-2 overflow-hidden">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
          {userName.charAt(0).toUpperCase()}
        </span>
        <span className="truncate text-sm font-medium">{userName}</span>
      </div>
      <button
        onClick={logout}
        title="Se déconnecter"
        className="shrink-0 rounded-md p-1.5 text-muted transition-colors hover:bg-surface hover:text-danger"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
        </svg>
      </button>
    </div>
  );

  return (
    <div className="flex min-h-dvh">
      {/* Sidebar desktop */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-border bg-surface p-4 lg:flex">
        <div className="mb-6 flex items-center justify-between px-1">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-black text-white">
              {APP_INITIALS}
            </span>
            <span className="text-[15px] font-bold">{APP_NAME}</span>
          </Link>
          <ThemeToggle />
        </div>
        {nav}
        <div className="mt-auto pt-4">{userBlock}</div>
      </aside>

      {/* Topbar mobile */}
      <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-surface px-4 lg:hidden">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-xs font-black text-white">
            {APP_INITIALS}
          </span>
          <span className="text-sm font-bold">{APP_NAME}</span>
        </Link>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="rounded-lg p-2 hover:bg-background"
            aria-label="Menu"
          >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            {menuOpen ? (
              <path d="M18 6 6 18M6 6l12 12" />
            ) : (
              <path d="M3 6h18M3 12h18M3 18h18" />
            )}
          </svg>
          </button>
        </div>
      </header>

      {/* Menu mobile déroulant */}
      {menuOpen ? (
        <div className="fixed inset-0 z-30 bg-slate-900/30 lg:hidden" onClick={() => setMenuOpen(false)}>
          <div
            className="mt-14 border-b border-border bg-surface p-4 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            {nav}
            <div className="mt-3">{userBlock}</div>
          </div>
        </div>
      ) : null}

      {/* Contenu */}
      <main className="min-w-0 flex-1 px-4 pb-10 pt-[4.5rem] lg:ml-60 lg:px-8 lg:pt-8">
        {children}
      </main>
    </div>
  );
}
