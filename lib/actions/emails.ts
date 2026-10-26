"use server";

import { createClient } from "@/lib/supabase/server";
import { sendFollowupEmail, sendOnboardingEmail } from "@/lib/email";

// Server Actions d'envoi d'email à un client (déclenché depuis sa fiche).
// L'email du client doit être renseigné (fiche ou réponse d'onboarding).

type Result = { error?: string };

async function resolve(clientId: string) {
  const supabase = await createClient();
  const { data: client } = await supabase
    .from("clients")
    .select("id, name, email, contact, form_token")
    .eq("id", clientId)
    .maybeSingle();
  if (!client) return { error: "Client introuvable" as const };

  let email = client.email as string | null;
  if (!email) {
    // Repli sur l'email fourni à l'onboarding
    const { data: onb } = await supabase
      .from("client_onboarding_response")
      .select("answers")
      .eq("client_id", clientId)
      .maybeSingle();
    email = (onb?.answers as { email?: string } | null)?.email ?? null;
  }
  if (!email && typeof client.contact === "string" && client.contact.includes("@")) {
    email = client.contact;
  }
  return {
    client: {
      firstName: (client.name as string).split(" ")[0],
      email,
      token: client.form_token as string,
    },
  };
}

function origin(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
}

export async function emailOnboardingLink(clientId: string): Promise<Result> {
  const r = await resolve(clientId);
  if ("error" in r) return { error: r.error };
  if (!r.client.email) return { error: "Ce client n'a pas d'email renseigné." };
  const res = await sendOnboardingEmail(
    r.client.email,
    r.client.firstName,
    `${origin()}/form/onboarding/${r.client.token}`,
  );
  return res.ok ? {} : { error: res.error };
}

export async function emailFollowupLink(clientId: string): Promise<Result> {
  const r = await resolve(clientId);
  if ("error" in r) return { error: r.error };
  if (!r.client.email) return { error: "Ce client n'a pas d'email renseigné." };
  const res = await sendFollowupEmail(
    r.client.email,
    r.client.firstName,
    `${origin()}/form/suivi/${r.client.token}`,
  );
  return res.ok ? {} : { error: res.error };
}
