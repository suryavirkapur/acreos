import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { ArrowRight } from 'lucide-react';
import { type FormEvent, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authClient } from '@/lib/auth-client';
import { AuthBrandPanel, AuthMark } from '@/components/AuthBrandPanel';

export const Route = createFileRoute('/verify')({
  validateSearch: (search: Record<string, unknown>) => ({
    email: typeof search.email === 'string' ? search.email : '',
  }),
  component: Verify,
});

function Verify() {
  const navigate = useNavigate();
  const { email } = Route.useSearch();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resent, setResent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    const result = await authClient.signIn.emailOtp({ email, otp: code });
    setLoading(false);
    if (result.error) {
      setError(result.error.message ?? 'That code did not work. Try again.');
      return;
    }
    navigate({ to: '/dashboard' });
  }

  async function resend() {
    setError(null);
    setResent(false);
    const result = await authClient.emailOtp.sendVerificationOtp({ email, type: 'sign-in' });
    if (result.error) {
      setError(result.error.message ?? 'Could not resend the code.');
      return;
    }
    setResent(true);
  }

  return (
    <main className="grid min-h-screen w-full lg:grid-cols-2">
      <div className="flex items-center justify-center px-5 py-12">
        <form className="w-full max-w-sm" onSubmit={onSubmit}>
          <div className="mb-8">
            <AuthMark />
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
            Check your email
          </h1>
          <p className="mt-3 text-sm/6 text-muted-foreground">
            We sent a 6-digit code to{' '}
            <strong className="font-semibold text-foreground">{email || 'your email'}</strong>.
            Enter it below to sign in.{' '}
            <button type="button" className="link-brand" onClick={resend}>
              Resend code
            </button>
          </p>

          {resent && (
            <p className="mt-3 text-sm font-medium text-emerald-700">A new code is on its way.</p>
          )}

          <div className="mt-7 space-y-2">
            <Label htmlFor="code">Verification Code</Label>
            <Input
              id="code"
              name="code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              required
              placeholder="123456"
              className="tracking-[0.4em]"
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
            />
          </div>

          {error && <p className="mt-3 text-sm font-medium text-destructive">{error}</p>}

          <Button
            type="submit"
            size="lg"
            className="mt-5 w-full"
            disabled={loading || code.length < 6}
          >
            {loading ? 'Verifying…' : 'Sign In'}
            {!loading && <ArrowRight />}
          </Button>

          <p className="mt-5 text-center text-sm text-muted-foreground">
            Wrong email?{' '}
            <button type="button" className="link-brand" onClick={() => navigate({ to: '/login' })}>
              Go back
            </button>
          </p>
        </form>
      </div>

      <AuthBrandPanel />
    </main>
  );
}
