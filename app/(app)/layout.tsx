import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { SetupRequired } from "@/components/SetupRequired";
import { ToastProvider } from "@/components/Toast";
import { isSupabaseConfigured } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";

// Layout de l'espace privé : vérifie la session, charge le profil, pose la
// coquille (sidebar + toasts). Toutes les pages métier vivent sous ce layout.
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!isSupabaseConfigured()) {
    return <SetupRequired />;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("name")
    .eq("id", user.id)
    .maybeSingle();

  const userName = profile?.name ?? user.email?.split("@")[0] ?? "Utilisateur";

  return (
    <ToastProvider>
      <AppShell userName={userName}>{children}</AppShell>
    </ToastProvider>
  );
}
