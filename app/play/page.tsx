'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import WordleGame from '@/components/WordleGame';
import { Button } from '@/components/ui/button';

export default function PlayPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div>Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-cyan-50">
      <nav className="border-b bg-white/90 backdrop-blur-sm shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-20 justify-between">
            <Link href="/" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
              <Image
                src="/images/logos/S@S_Logo_Mark_RGB.svg"
                alt="Software@Scale Logo"
                width={50}
                height={50}
                priority
              />
              <h1 className="text-xl font-bold text-primary">Software@Scale Wordle</h1>
            </Link>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-muted-foreground">Welcome, <span className="font-semibold text-foreground">{user.name}</span></span>
              <Button asChild variant="secondary" size="sm">
                <Link href="/leaderboard">Leaderboard</Link>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-4xl px-4 py-8">
        <WordleGame />
      </main>
    </div>
  );
}
