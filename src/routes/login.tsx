import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { ArrowRight } from 'lucide-react';
import { type FormEvent, useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authClient } from '@/lib/auth-client';
import { AuthBrandPanel, AuthMark } from '@/components/AuthBrandPanel';

export const Route = createFileRoute('/login')({
  component: Login,
});

function Login() {
  const navigate = useNavigate();
  const { data: session, isPending } = authClient.useSession();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isPending && session) navigate({ to: '/dashboard', replace: true });
  }, [isPending, session, navigate]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    const result = await authClient.emailOtp.sendVerificationOtp({ email, type: 'sign-in' });
    setLoading(false);
    if (result.error) {
      setError(result.error.message ?? 'Could not send a code. Try again.');
      return;
    }
    navigate({ to: '/verify', search: { email } });
  }

  return (
    <main className="grid min-h-screen w-full lg:grid-cols-2">
      <div className="flex items-center justify-center px-5 py-12">
        <form className="w-full max-w-sm" onSubmit={onSubmit}>
          <div className="mb-8">
            <AuthMark />
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
            Sign in to AcreOS
          </h1>
          <p className="mt-3 text-sm/6 text-muted-foreground">
            Enter your work email and we&rsquo;ll send you a 6-digit code to sign in. No passwords.
          </p>
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-950">
            Demo access: use verification code <code className="font-mono font-bold">123456</code>{' '}
            after entering any email.
          </p>

          <div className="mt-7 space-y-2">
            <Label htmlFor="email">Work email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@fund.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>

          {error && <p className="mt-3 text-sm font-medium text-destructive">{error}</p>}

          <Button type="submit" size="lg" className="mt-5 w-full" disabled={loading || !email}>
            {loading ? 'Sending code…' : 'Continue'}
            {!loading && <ArrowRight />}
          </Button>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            By continuing you agree to the AcreOS Terms and Privacy Policy.
          </p>
        </form>
      </div>

      <AuthBrandPanel />
    </main>
  );
}
