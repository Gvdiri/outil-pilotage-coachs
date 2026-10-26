import { NextResponse, type NextRequest } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { ClientReport } from "@/lib/pdf/ClientReport";
import { FOLLOWUP_FIELDS, ONBOARDING_FIELDS, type FormFieldDef } from "@/lib/forms";
import { todayISO } from "@/lib/dates";
import type {
  Client,
  FollowupResponse,
  OnboardingResponse,
  Payment,
} from "@/lib/types";

// Bilan client en PDF, généré côté serveur, téléchargé directement (1 clic).
export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Non autorisé", { status: 401 });

  const [clientRes, paymentsRes, onbRes, fuRes, cfgRes] = await Promise.all([
    supabase.from("clients").select("*").eq("id", id).maybeSingle(),
    supabase.from("payments").select("*").eq("client_id", id).order("created_at", { ascending: true }),
    supabase.from("client_onboarding_response").select("*").eq("client_id", id).order("submitted_at", { ascending: false }).limit(1),
    supabase.from("client_followup_response").select("*").eq("client_id", id).order("period", { ascending: false }),
    supabase.from("form_config").select("kind, fields"),
  ]);

  if (!clientRes.data) return new NextResponse("Client introuvable", { status: 404 });

  const configs = (cfgRes.data ?? []) as { kind: string; fields: FormFieldDef[] }[];
  const onboardingFields = configs.find((c) => c.kind === "onboarding")?.fields ?? ONBOARDING_FIELDS;
  const followupFields = configs.find((c) => c.kind === "suivi")?.fields ?? FOLLOWUP_FIELDS;

  const buffer = await renderToBuffer(
    ClientReport({
      client: clientRes.data as Client,
      payments: (paymentsRes.data ?? []) as Payment[],
      onboarding: (onbRes.data?.[0] ?? null) as OnboardingResponse | null,
      followups: (fuRes.data ?? []) as FollowupResponse[],
      onboardingFields,
      followupFields,
      today: todayISO(),
    }),
  );

  const safeName = (clientRes.data.name as string).replace(/[^a-zA-Z0-9]+/g, "-");
  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="bilan-${safeName}-${todayISO()}.pdf"`,
    },
  });
}
