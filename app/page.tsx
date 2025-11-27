'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
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
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-white via-blue-50 to-cyan-50">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader className="text-center space-y-4">
            <div className="flex justify-center">
              <Image
                src="/images/logos/S@S_Logo_Mark_RGB.svg"
                alt="Software@Scale Logo"
                width={80}
                height={80}
                priority
              />
            </div>
            <div>
              <CardTitle className="text-3xl font-bold text-primary">Software@Scale Wordle</CardTitle>
              <CardDescription className="mt-2">
                {isRegistering ? 'Create a new account to start playing' : 'Welcome back! Sign in to continue'}
              </CardDescription>
            </div>
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
                  className="h-11"
                />
              </div>

              {error && (
                <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full h-11 text-base">
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
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-white via-blue-50 to-cyan-50">
      <nav className="border-b bg-white/90 backdrop-blur-sm shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-20 justify-between">
            <div className="flex items-center space-x-3">
              <Image
                src="/images/logos/S@S_Logo_Mark_RGB.svg"
                alt="Software@Scale Logo"
                width={50}
                height={50}
                priority
              />
              <h1 className="text-xl font-bold text-primary">Software@Scale Wordle</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-muted-foreground">Welcome, <span className="font-semibold text-foreground">{user.name}</span></span>
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

      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-5xl space-y-8">
          <div className="text-center">
            <h2 className="text-4xl font-bold text-primary mb-2">Ready to Play?</h2>
            <p className="text-lg text-muted-foreground">Choose an option below to get started</p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card className="transition-all hover:shadow-2xl hover:scale-[1.03] hover:border-primary/50 cursor-pointer group">
              <Link href="/play" className="block">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <span className="text-2xl">🎮</span>
                    </div>
                  </div>
                  <CardTitle className="text-3xl group-hover:text-primary transition-colors">Play Wordle</CardTitle>
                  <CardDescription className="text-base">Start guessing today's word and earn points!</CardDescription>
                </CardHeader>
              </Link>
            </Card>

            <Card className="transition-all hover:shadow-2xl hover:scale-[1.03] hover:border-secondary/50 cursor-pointer group">
              <Link href="/leaderboard" className="block">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center group-hover:bg-secondary/20 transition-colors">
                      <span className="text-2xl">🏆</span>
                    </div>
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
