import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config";
import { ClientDetail } from "@/components/clients/ClientDetail";
import { FOLLOWUP_FIELDS, ONBOARDING_FIELDS, type FormFieldDef } from "@/lib/forms";
import type {
  Client,
  FollowupResponse,
  OnboardingResponse,
  Payment,
} from "@/lib/types";

export const metadata: Metadata = { title: "Fiche client" };

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // Env absente : le layout affiche "Configuration requise", la page s'efface.
  if (!isSupabaseConfigured()) return null;

  const supabase = await createClient();

  const [clientRes, paymentsRes, onboardingRes, followupsRes, configsRes] =
    await Promise.all([
      supabase.from("clients").select("*").eq("id", id).maybeSingle(),
      supabase
        .from("payments")
        .select("*")
        .eq("client_id", id)
        .order("created_at", { ascending: true }),
      supabase
        .from("client_onboarding_response")
        .select("*")
        .eq("client_id", id)
        .order("submitted_at", { ascending: false })
        .limit(1),
      supabase
        .from("client_followup_response")
        .select("*")
        .eq("client_id", id)
        .order("period", { ascending: false }),
      supabase.from("form_config").select("kind, fields"),
    ]);

  if (!clientRes.data) notFound();

  // Libellés des réponses : config en base si présente, défauts sinon
  const configs = (configsRes.data ?? []) as { kind: string; fields: FormFieldDef[] }[];
  const onboardingFields =
    configs.find((c) => c.kind === "onboarding")?.fields ?? ONBOARDING_FIELDS;
  const followupFields =
    configs.find((c) => c.kind === "suivi")?.fields ?? FOLLOWUP_FIELDS;

  return (
    <ClientDetail
      client={clientRes.data as Client}
      payments={(paymentsRes.data ?? []) as Payment[]}
      onboarding={(onboardingRes.data?.[0] ?? null) as OnboardingResponse | null}
      followups={(followupsRes.data ?? []) as FollowupResponse[]}
      onboardingFields={onboardingFields}
      followupFields={followupFields}
    />
  );
}
