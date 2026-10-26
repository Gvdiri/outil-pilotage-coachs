// Layout des formulaires publics : page épurée, sans navigation interne.
// C'est la SEULE surface de l'app visible sans authentification.
export default function PublicFormLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh items-start justify-center bg-background px-4 py-8 sm:py-12">
      <div className="w-full max-w-xl">{children}</div>
    </div>
  );
}
