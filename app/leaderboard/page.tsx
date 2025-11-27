'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type LeaderboardEntry = {
  user_id: string;
  user_name: string;
  total_points: number;
  games_played: number;
  games_won: number;
};

export default function LeaderboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    } else if (user) {
      loadLeaderboard();
    }
  }, [user, loading, router]);

  const loadLeaderboard = async () => {
    try {
      const { data, error } = await supabase
        .from('scores')
        .select(`
          user_id,
          points,
          won,
          users (
            name
          )
        `);

      if (error) throw error;

      // Aggregate scores by user
      const userStats = new Map<string, LeaderboardEntry>();

      data?.forEach((score: any) => {
        const userId = score.user_id;
        const userName = score.users.name;

        if (!userStats.has(userId)) {
          userStats.set(userId, {
            user_id: userId,
            user_name: userName,
            total_points: 0,
            games_played: 0,
            games_won: 0,
          });
        }

        const entry = userStats.get(userId)!;
        entry.total_points += score.points;
        entry.games_played += 1;
        if (score.won) entry.games_won += 1;
      });

      // Convert to array and sort by total points
      const leaderboardData = Array.from(userStats.values()).sort(
        (a, b) => b.total_points - a.total_points
      );

      setLeaderboard(leaderboardData);
      setLoadingData(false);
    } catch (error) {
      console.error('Error loading leaderboard:', error);
      setLoadingData(false);
    }
  };

  if (loading || loadingData) {
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
                <Link href="/play">Play</Link>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <Card className="shadow-xl">
          <CardHeader className="bg-gradient-to-r from-primary/5 to-secondary/5">
            <CardTitle className="text-center text-4xl font-bold text-primary">Leaderboard</CardTitle>
            <CardDescription className="text-center text-base">See who's dominating the competition!</CardDescription>
          </CardHeader>
          <CardContent>
            {leaderboard.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                No scores yet. Be the first to play!
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2">
                      <th className="px-4 py-3 text-left">Rank</th>
                      <th className="px-4 py-3 text-left">Player</th>
                      <th className="px-4 py-3 text-center">Points</th>
                      <th className="px-4 py-3 text-center">Games Played</th>
                      <th className="px-4 py-3 text-center">Games Won</th>
                      <th className="px-4 py-3 text-center">Win Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map((entry, index) => {
                      const winRate = entry.games_played > 0
                        ? ((entry.games_won / entry.games_played) * 100).toFixed(0)
                        : '0';

                      return (
                        <tr
                          key={entry.user_id}
                          className={`border-b transition-colors ${
                            entry.user_id === user.id ? 'bg-primary/10 font-semibold' : 'hover:bg-muted/50'
                          }`}
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center">
                              {index === 0 && <span className="mr-2 text-2xl">🥇</span>}
                              {index === 1 && <span className="mr-2 text-2xl">🥈</span>}
                              {index === 2 && <span className="mr-2 text-2xl">🥉</span>}
                              <span className="text-lg">{index + 1}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {entry.user_name}
                            {entry.user_id === user.id && (
                              <span className="ml-2 text-sm text-primary">(You)</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center text-lg font-bold">
                            {entry.total_points}
                          </td>
                          <td className="px-4 py-3 text-center">{entry.games_played}</td>
                          <td className="px-4 py-3 text-center">{entry.games_won}</td>
                          <td className="px-4 py-3 text-center">{winRate}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <Card className="mt-6 bg-muted/50">
              <CardHeader>
                <CardTitle className="text-base">Scoring System</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1 text-sm">
                  <li>• 1 guess = 5 points</li>
                  <li>• 2 guesses = 4 points</li>
                  <li>• 3 guesses = 3 points</li>
                  <li>• 4 guesses = 2 points</li>
                  <li>• 5 guesses = 1 point</li>
                  <li>• Failed (no correct answer in 5 guesses) = 0 points</li>
                </ul>
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
