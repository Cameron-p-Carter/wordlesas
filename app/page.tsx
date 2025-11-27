'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function Home() {
  const { user, login, register, logout, loading } = useAuth();
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Please enter a name');
      return;
    }

    try {
      if (isRegistering) {
        await register(name);
      } else {
        await login(name);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold">Wordle Clone</CardTitle>
            <CardDescription>
              {isRegistering ? 'Create a new account to start playing' : 'Welcome back! Sign in to continue'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Your Name</Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                />
              </div>

              {error && (
                <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full">
                {isRegistering ? 'Register' : 'Login'}
              </Button>
            </form>

            <Button
              variant="link"
              onClick={() => {
                setIsRegistering(!isRegistering);
                setError('');
              }}
              className="mt-4 w-full"
            >
              {isRegistering ? 'Already have an account? Login' : "Don't have an account? Register"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-slate-50 to-slate-100">
      <nav className="border-b bg-white/80 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between">
            <div className="flex items-center">
              <h1 className="text-xl font-bold">Wordle Clone</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-muted-foreground">Welcome, {user.name}!</span>
              {user.is_admin && (
                <Button asChild variant="secondary" size="sm">
                  <Link href="/admin">Admin</Link>
                </Button>
              )}
              <Button onClick={logout} variant="outline" size="sm">
                Logout
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <main className="flex flex-1 items-center justify-center px-4 py-8">
        <div className="grid w-full max-w-4xl gap-6 md:grid-cols-2">
          <Card className="transition-all hover:shadow-lg hover:scale-[1.02]">
            <Link href="/play" className="block">
              <CardHeader>
                <CardTitle className="text-2xl">Play Wordle</CardTitle>
                <CardDescription>Start guessing today's word!</CardDescription>
              </CardHeader>
            </Link>
          </Card>

          <Card className="transition-all hover:shadow-lg hover:scale-[1.02]">
            <Link href="/leaderboard" className="block">
              <CardHeader>
                <CardTitle className="text-2xl">Leaderboard</CardTitle>
                <CardDescription>See who's winning!</CardDescription>
              </CardHeader>
            </Link>
          </Card>
        </div>
      </main>
    </div>
  );
}
