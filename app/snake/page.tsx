'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import SnakeGame from '@/components/SnakeGame';

type GameState =
  | { status: 'loading' }
  | { status: 'no_game' }
  | { status: 'already_played'; foodEaten: number }
  | { status: 'playing'; gameId: string }
  | { status: 'finished'; foodEaten: number };

export default function SnakePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [gameState, setGameState] = useState<GameState>({ status: 'loading' });

  useEffect(() => {
    if (!loading && !user) router.push('/');
  }, [user, loading, router]);

  const fetchGame = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/snake/game?userId=${user.id}`);
      if (!res.ok) {
        setGameState({ status: 'no_game' });
        return;
      }
      const data = await res.json();
      if (data.alreadyPlayed) {
        setGameState({ status: 'already_played', foodEaten: data.foodEaten });
      } else {
        setGameState({ status: 'playing', gameId: data.game.id });
      }
    } catch {
      setGameState({ status: 'no_game' });
    }
  }, [user]);

  useEffect(() => {
    if (user) fetchGame();
  }, [user, fetchGame]);

  const handleGameOver = useCallback(async (foodEaten: number) => {
    if (gameState.status !== 'playing') return;
    const { gameId } = gameState;

    setGameState({ status: 'finished', foodEaten });

    await fetch('/api/snake/score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user!.id, gameId, foodEaten }),
    });
  }, [gameState, user]);

  if (loading || gameState.status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div>Loading...</div>
      </div>
    );
  }

  if (!user) return null;

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
              <h1 className="text-xl font-bold text-primary">Software@Scale Wordo</h1>
            </Link>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-muted-foreground">
                Welcome, <span className="font-semibold text-foreground">{user.name}</span>
              </span>
              <Button asChild variant="outline" size="sm">
                <Link href="/">Home</Link>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <main className="flex flex-col items-center py-8 px-4">
        {gameState.status === 'no_game' && (
          <Card className="max-w-md w-full shadow-xl text-center">
            <CardHeader>
              <CardTitle className="text-2xl">No Active Snake Session</CardTitle>
              <CardDescription>The admin hasn't opened a snake session yet. Check back soon!</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline">
                <Link href="/">Back to Home</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {gameState.status === 'already_played' && (
          <Card className="max-w-md w-full shadow-xl text-center">
            <CardHeader>
              <CardTitle className="text-2xl">Already Played!</CardTitle>
              <CardDescription>You've used your go for this session.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-4xl font-bold text-green-600">{gameState.foodEaten} 🍎</p>
              <p className="text-muted-foreground">food eaten this session</p>
              <Button asChild variant="outline">
                <Link href="/leaderboard">See Leaderboard</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {gameState.status === 'finished' && (
          <div className="space-y-6 flex flex-col items-center">
            <Card className="max-w-md w-full shadow-xl text-center">
              <CardHeader>
                <CardTitle className="text-2xl">Game Over!</CardTitle>
                <CardDescription>Your score has been saved.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-4xl font-bold text-green-600">{gameState.foodEaten} 🍎</p>
                <p className="text-muted-foreground">food eaten</p>
                <Button asChild variant="outline">
                  <Link href="/leaderboard">See Leaderboard</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {gameState.status === 'playing' && (
          <div className="space-y-4 flex flex-col items-center">
            <h2 className="text-2xl font-bold text-primary">Snake</h2>
            <SnakeGame onGameOver={handleGameOver} />
          </div>
        )}
      </main>
    </div>
  );
}
