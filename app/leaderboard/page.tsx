'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type WordleEntry = {
  user_id: string;
  user_name: string;
  total_points: number;
  games_played: number;
  games_won: number;
};

type SnakeEntry = {
  user_id: string;
  user_name: string;
  total_food: number;
  sessions_played: number;
};

type OverallEntry = {
  user_id: string;
  user_name: string;
  wordle_points: number;
  snake_points: number;
  total: number;
};

function scaleSnake(food: number): number {
  return Math.min(Math.max(Math.floor((food - 5) / 5), 0), 5);
}

type Tab = 'overall' | 'wordle' | 'snake';

export default function LeaderboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('overall');
  const [wordleBoard, setWordleBoard] = useState<WordleEntry[]>([]);
  const [snakeBoard, setSnakeBoard] = useState<SnakeEntry[]>([]);
  const [overallBoard, setOverallBoard] = useState<OverallEntry[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!loading && !user) router.push('/');
    else if (user) loadLeaderboards();
  }, [user, loading, router]);

  const loadLeaderboards = async () => {
    try {
      const [{ data: scoresData }, { data: snakeData }] = await Promise.all([
        supabase.from('scores').select('user_id, points, won, user(name)'),
        supabase.from('snake_scores').select('user_id, food_eaten, user(name)'),
      ]);

      // --- Wordle ---
      const wordleMap = new Map<string, WordleEntry>();
      scoresData?.forEach((s: any) => {
        const id = s.user_id;
        if (!wordleMap.has(id)) {
          wordleMap.set(id, { user_id: id, user_name: s.user.name, total_points: 0, games_played: 0, games_won: 0 });
        }
        const e = wordleMap.get(id)!;
        e.total_points += s.points;
        e.games_played += 1;
        if (s.won) e.games_won += 1;
      });
      const wordle = Array.from(wordleMap.values()).sort((a, b) => b.total_points - a.total_points);

      // --- Snake ---
      const snakeMap = new Map<string, SnakeEntry>();
      snakeData?.forEach((s: any) => {
        const id = s.user_id;
        if (!snakeMap.has(id)) {
          snakeMap.set(id, { user_id: id, user_name: s.user.name, total_food: 0, sessions_played: 0 });
        }
        const e = snakeMap.get(id)!;
        e.total_food += s.food_eaten;
        e.sessions_played += 1;
      });
      const snake = Array.from(snakeMap.values()).sort((a, b) => b.total_food - a.total_food);

      // --- Overall (all users who have any score) ---
      const overallMap = new Map<string, OverallEntry>();
      const addUser = (id: string, name: string) => {
        if (!overallMap.has(id)) {
          overallMap.set(id, { user_id: id, user_name: name, wordle_points: 0, snake_points: 0, total: 0 });
        }
      };
      wordleMap.forEach((e) => {
        addUser(e.user_id, e.user_name);
        overallMap.get(e.user_id)!.wordle_points = e.total_points;
      });
      snakeMap.forEach((e) => {
        addUser(e.user_id, e.user_name);
        overallMap.get(e.user_id)!.snake_points = scaleSnake(e.total_food);
      });
      overallMap.forEach((e) => { e.total = e.wordle_points + e.snake_points; });
      const overall = Array.from(overallMap.values()).sort((a, b) => b.total - a.total);

      setWordleBoard(wordle);
      setSnakeBoard(snake);
      setOverallBoard(overall);
      setLoadingData(false);
    } catch (error) {
      console.error('Error loading leaderboard:', error);
      setLoadingData(false);
    }
  };

  if (loading || loadingData) {
    return <div className="flex min-h-screen items-center justify-center"><div>Loading...</div></div>;
  }

  if (!user) return null;

  const medal = (i: number) => {
    if (i === 0) return '🥇';
    if (i === 1) return '🥈';
    if (i === 2) return '🥉';
    return null;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-cyan-50">
      <nav className="border-b bg-white/90 backdrop-blur-sm shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-20 justify-between">
            <Link href="/" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
              <Image src="/images/logos/S@S_Logo_Mark_RGB.svg" alt="Software@Scale Logo" width={50} height={50} priority />
              <h1 className="text-xl font-bold text-primary">Software@Scale Games</h1>
            </Link>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-muted-foreground">Welcome, <span className="font-semibold text-foreground">{user.name}</span></span>
              <Button asChild variant="secondary" size="sm"><Link href="/play">Wordo</Link></Button>
              <Button asChild variant="secondary" size="sm"><Link href="/snake">Snake</Link></Button>
            </div>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <Card className="shadow-xl">
          <CardHeader className="bg-gradient-to-r from-primary/5 to-secondary/5">
            <CardTitle className="text-center text-4xl font-bold text-primary">Leaderboard</CardTitle>
            <CardDescription className="text-center text-base">See who's dominating the competition!</CardDescription>
            <div className="flex justify-center gap-2 pt-4">
              {(['overall', 'wordle', 'snake'] as Tab[]).map((tab) => (
                <Button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  variant={activeTab === tab ? 'default' : 'outline'}
                  className="capitalize"
                >
                  {tab === 'overall' ? '🏆 Overall' : tab === 'wordle' ? '🔤 Wordo' : '🐍 Snake'}
                </Button>
              ))}
            </div>
          </CardHeader>

          <CardContent className="pt-6">
            {activeTab === 'overall' && (
              <>
                {overallBoard.length === 0 ? (
                  <p className="py-8 text-center text-muted-foreground">No scores yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b-2">
                          <th className="px-4 py-3 text-left">Rank</th>
                          <th className="px-4 py-3 text-left">Player</th>
                          <th className="px-4 py-3 text-center">Wordo Pts</th>
                          <th className="px-4 py-3 text-center">Snake Pts</th>
                          <th className="px-4 py-3 text-center">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {overallBoard.map((e, i) => (
                          <tr key={e.user_id} className={`border-b transition-colors ${e.user_id === user.id ? 'bg-primary/10 font-semibold' : 'hover:bg-muted/50'}`}>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1">
                                {medal(i) && <span className="text-2xl">{medal(i)}</span>}
                                <span className="text-lg">{i + 1}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3">{e.user_name}{e.user_id === user.id && <span className="ml-2 text-sm text-primary">(You)</span>}</td>
                            <td className="px-4 py-3 text-center">{e.wordle_points}</td>
                            <td className="px-4 py-3 text-center">{e.snake_points}</td>
                            <td className="px-4 py-3 text-center text-lg font-bold">{e.total}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <Card className="mt-6 bg-muted/50">
                  <CardHeader><CardTitle className="text-base">Scoring</CardTitle></CardHeader>
                  <CardContent className="text-sm space-y-1">
                    <p>• Overall = Wordo points + Snake points (scaled)</p>
                    <p>• Snake points: 0–9 food = 0 pts &nbsp;· 10–14 = 1 · 15–19 = 2 · 20–24 = 3 · 25–29 = 4 · 30+ = 5</p>
                  </CardContent>
                </Card>
              </>
            )}

            {activeTab === 'wordle' && (
              <>
                {wordleBoard.length === 0 ? (
                  <p className="py-8 text-center text-muted-foreground">No Wordo scores yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b-2">
                          <th className="px-4 py-3 text-left">Rank</th>
                          <th className="px-4 py-3 text-left">Player</th>
                          <th className="px-4 py-3 text-center">Points</th>
                          <th className="px-4 py-3 text-center">Played</th>
                          <th className="px-4 py-3 text-center">Won</th>
                          <th className="px-4 py-3 text-center">Win Rate</th>
                        </tr>
                      </thead>
                      <tbody>
                        {wordleBoard.map((e, i) => (
                          <tr key={e.user_id} className={`border-b transition-colors ${e.user_id === user.id ? 'bg-primary/10 font-semibold' : 'hover:bg-muted/50'}`}>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1">
                                {medal(i) && <span className="text-2xl">{medal(i)}</span>}
                                <span className="text-lg">{i + 1}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3">{e.user_name}{e.user_id === user.id && <span className="ml-2 text-sm text-primary">(You)</span>}</td>
                            <td className="px-4 py-3 text-center text-lg font-bold">{e.total_points}</td>
                            <td className="px-4 py-3 text-center">{e.games_played}</td>
                            <td className="px-4 py-3 text-center">{e.games_won}</td>
                            <td className="px-4 py-3 text-center">{e.games_played > 0 ? ((e.games_won / e.games_played) * 100).toFixed(0) : 0}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <Card className="mt-6 bg-muted/50">
                  <CardHeader><CardTitle className="text-base">Scoring</CardTitle></CardHeader>
                  <CardContent className="text-sm space-y-1">
                    <p>• 1 guess = 5 pts &nbsp;• 2 = 4 &nbsp;• 3 = 3 &nbsp;• 4 = 2 &nbsp;• 5 = 1 &nbsp;• Failed = 0</p>
                  </CardContent>
                </Card>
              </>
            )}

            {activeTab === 'snake' && (
              <>
                {snakeBoard.length === 0 ? (
                  <p className="py-8 text-center text-muted-foreground">No Snake scores yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b-2">
                          <th className="px-4 py-3 text-left">Rank</th>
                          <th className="px-4 py-3 text-left">Player</th>
                          <th className="px-4 py-3 text-center">Total Food Eaten</th>
                          <th className="px-4 py-3 text-center">Sessions Played</th>
                        </tr>
                      </thead>
                      <tbody>
                        {snakeBoard.map((e, i) => (
                          <tr key={e.user_id} className={`border-b transition-colors ${e.user_id === user.id ? 'bg-primary/10 font-semibold' : 'hover:bg-muted/50'}`}>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1">
                                {medal(i) && <span className="text-2xl">{medal(i)}</span>}
                                <span className="text-lg">{i + 1}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3">{e.user_name}{e.user_id === user.id && <span className="ml-2 text-sm text-primary">(You)</span>}</td>
                            <td className="px-4 py-3 text-center text-lg font-bold">{e.total_food} 🍎</td>
                            <td className="px-4 py-3 text-center">{e.sessions_played}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
