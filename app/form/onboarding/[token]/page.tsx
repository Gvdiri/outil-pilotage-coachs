import type { Metadata } from "next";
import { PublicForm } from "@/components/public/PublicForm";
import { FormInvalid } from "@/components/public/FormInvalid";
import {
  findClientByToken,
  findOnboardingSubmission,
  getPublicFormConfig,
} from "@/lib/public-forms";

export const metadata: Metadata = { title: "Questionnaire de départ" };
// Page à token : toujours rendue à la demande, jamais mise en cache.
export const dynamic = "force-dynamic";

export default async function OnboardingFormPage({
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

  const [config, submittedAt] = await Promise.all([
    getPublicFormConfig("onboarding"),
    findOnboardingSubmission(client.id),
  ]);

  return (
    <PublicForm
      title={`Bienvenue ${client.firstName} 👋`}
      intro={config.description}
      fields={config.fields}
      endpoint="/api/public/onboarding"
      token={token}
      submitLabel="Envoyer mes réponses"
      alreadyFilledAt={submittedAt}
    />
  );
}
