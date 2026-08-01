import { SignupForm } from './SignupForm';

interface SignupPageProps {
  searchParams: Promise<{ email?: string }>;
}

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const { email } = await searchParams;
  return <SignupForm defaultEmail={email ?? ''} />;
}
