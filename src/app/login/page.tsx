import AuthForm from "./auth-form";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string, message?: string }> }) {
  const resolvedParams = await searchParams;

  return (
    <AuthForm error={resolvedParams?.error} message={resolvedParams?.message} />
  );
}
