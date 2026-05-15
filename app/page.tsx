'use client';

import { useAuth } from '@/contexts/AuthContext';
import { authClient } from '@/lib/auth-client';
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Step =
  | { type: 'username' }
  | { type: 'set-password'; username: string; isNew: boolean }
  | { type: 'enter-password'; username: string };

export default function Home() {
  const { user, logout, loading } = useAuth();
  const [step, setStep] = useState<Step>({ type: 'username' });
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setStep({ type: 'username' });
    setPassword('');
    setConfirmPassword('');
    setError('');
  };

  const handleContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!username.trim()) { setError('Please enter a name'); return; }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/auth/user-status?username=${encodeURIComponent(username.trim())}`);
      const data = await res.json();
      if (!data.exists) {
        setStep({ type: 'set-password', username: username.trim(), isNew: true });
      } else if (!data.hasPassword) {
        setStep({ type: 'set-password', username: username.trim(), isNew: false });
      } else {
        setStep({ type: 'enter-password', username: username.trim() });
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (step.type !== 'set-password') return;
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (step.isNew && password !== confirmPassword) { setError('Passwords do not match'); return; }
    setSubmitting(true);
    try {
      const endpoint = step.isNew ? '/api/auth/register' : '/api/auth/set-initial-password';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: step.username, password }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      // Sign in after account creation / password set
      const result = await (authClient as any).signIn.username({
        username: step.username,
        password,
      });
      if (result?.error) throw new Error(result.error.message);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (step.type !== 'enter-password') return;
    setSubmitting(true);
    try {
      const result = await (authClient as any).signIn.username({
        username: step.username,
        password,
      });
      if (result?.error) throw new Error(result.error.message ?? 'Invalid password');
    } catch (err: any) {
      setError(err.message || 'Invalid password');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (user) {
    return (
      <div className="flex min-h-screen flex-col bg-gradient-to-br from-white via-blue-50 to-cyan-50">
        <nav className="border-b bg-white/90 backdrop-blur-sm shadow-sm">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex h-20 justify-between">
              <div className="flex items-center space-x-3">
                <Image src="/images/logos/S@S_Logo_Mark_RGB.svg" alt="Software@Scale Logo" width={50} height={50} priority />
                <h1 className="text-xl font-bold text-primary">Software@Scale Games</h1>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-muted-foreground">Welcome, <span className="font-semibold text-foreground">{user.name}</span></span>
                {user.isAdmin && (
                  <Button asChild variant="secondary" size="sm">
                    <Link href="/admin">Admin</Link>
                  </Button>
                )}
                <Button onClick={logout} variant="outline" size="sm">Logout</Button>
              </div>
            </div>
          </div>
        </nav>
        <main className="flex flex-1 items-center justify-center px-4 py-12">
          <div className="w-full max-w-5xl space-y-8">
            <div className="text-center">
              <h2 className="text-4xl font-bold text-primary mb-2">Ready to Play?</h2>
              <p className="text-lg text-muted-foreground">Choose an option below to get started</p>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              <Card className="transition-all hover:shadow-2xl hover:scale-[1.03] hover:border-primary/50 cursor-pointer group">
                <Link href="/play" className="block">
                  <CardHeader className="pb-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center group-hover:bg-primary/20 transition-colors mb-2">
                      <span className="text-2xl">🔤</span>
                    </div>
                    <CardTitle className="text-3xl group-hover:text-primary transition-colors">Play Wordo</CardTitle>
                    <CardDescription className="text-base">Guess the word and earn points!</CardDescription>
                  </CardHeader>
                </Link>
              </Card>
              <Card className="transition-all hover:shadow-2xl hover:scale-[1.03] hover:border-green-500/50 cursor-pointer group">
                <Link href="/snake" className="block">
                  <CardHeader className="pb-4">
                    <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center group-hover:bg-green-500/20 transition-colors mb-2">
                      <span className="text-2xl">🐍</span>
                    </div>
                    <CardTitle className="text-3xl group-hover:text-green-600 transition-colors">Play Snake</CardTitle>
                    <CardDescription className="text-base">Eat as much food as you can!</CardDescription>
                  </CardHeader>
                </Link>
              </Card>
              <Card className="transition-all hover:shadow-2xl hover:scale-[1.03] hover:border-secondary/50 cursor-pointer group">
                <Link href="/leaderboard" className="block">
                  <CardHeader className="pb-4">
                    <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center group-hover:bg-secondary/20 transition-colors mb-2">
                      <span className="text-2xl">🏆</span>
                    </div>
                    <CardTitle className="text-3xl group-hover:text-primary transition-colors">Leaderboard</CardTitle>
                    <CardDescription className="text-base">See who's dominating the competition!</CardDescription>
                  </CardHeader>
                </Link>
              </Card>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-white via-blue-50 to-cyan-50">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <Image src="/images/logos/S@S_Logo_Mark_RGB.svg" alt="Software@Scale Logo" width={80} height={80} priority />
          </div>
          <div>
            <CardTitle className="text-3xl font-bold text-primary">Software@Scale Games</CardTitle>
            <CardDescription className="mt-2">
              {step.type === 'username' && 'Enter your name to get started'}
              {step.type === 'set-password' && step.isNew && 'Create a password for your new account'}
              {step.type === 'set-password' && !step.isNew && `Welcome back, ${step.username}! Set a password for your account`}
              {step.type === 'enter-password' && `Welcome back, ${step.username}!`}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {step.type === 'username' && (
            <form onSubmit={handleContinue} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Your Name</Label>
                <Input id="name" type="text" value={username} onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your name" className="h-11" autoFocus />
              </div>
              {error && <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">{error}</div>}
              <Button type="submit" className="w-full h-11 text-base" disabled={submitting}>
                {submitting ? 'Checking...' : 'Continue →'}
              </Button>
            </form>
          )}

          {step.type === 'set-password' && (
            <form onSubmit={handleSetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="Choose a password" className="h-11" autoFocus />
              </div>
              {step.isNew && (
                <div className="space-y-2">
                  <Label htmlFor="confirm">Confirm Password</Label>
                  <Input id="confirm" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your password" className="h-11" />
                </div>
              )}
              {error && <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">{error}</div>}
              <Button type="submit" className="w-full h-11 text-base" disabled={submitting}>
                {submitting ? 'Setting up...' : step.isNew ? 'Create Account' : 'Set Password & Sign In'}
              </Button>
              <Button type="button" variant="link" className="w-full" onClick={reset}>← Back</Button>
            </form>
          )}

          {step.type === 'enter-password' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password" className="h-11" autoFocus />
              </div>
              {error && <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">{error}</div>}
              <Button type="submit" className="w-full h-11 text-base" disabled={submitting}>
                {submitting ? 'Signing in...' : 'Sign In'}
              </Button>
              <Button type="button" variant="link" className="w-full" onClick={reset}>← Back</Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
