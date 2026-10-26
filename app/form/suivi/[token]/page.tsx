import type { Metadata } from "next";
import { PublicForm } from "@/components/public/PublicForm";
import { FormInvalid } from "@/components/public/FormInvalid";
import { findClientByToken, getPublicFormConfig } from "@/lib/public-forms";

export const metadata: Metadata = { title: "Suivi de la semaine" };
// Page à token : toujours rendue à la demande, jamais mise en cache.
export const dynamic = "force-dynamic";

export default async function SuiviFormPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  let client = null;
  try {
    client = await findClientByToken(token);
  } catch {
    // service_role non configurée -> même message neutre, aucune fuite d'info
  }

  if (!client) return <FormInvalid />;

  const config = await getPublicFormConfig("suivi");

  return (
    <PublicForm
      title={`Ton suivi de la semaine, ${client.firstName} 💪`}
      intro={config.description}
      fields={config.fields}
      endpoint="/api/public/suivi"
      token={token}
      submitLabel="Envoyer mon suivi"
    />
  );
}
