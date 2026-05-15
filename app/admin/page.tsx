'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { supabase, Game, SnakeGame } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type AdminUser = {
  id: string;
  name: string;
  username: string;
  isAdmin: boolean;
  createdAt: string;
};

export default function AdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [games, setGames] = useState<Game[]>([]);
  const [snakeGames, setSnakeGames] = useState<SnakeGame[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [newWord, setNewWord] = useState('');
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'games' | 'snake' | 'users'>('games');

  useEffect(() => {
    if (!loading && (!user || !user.isAdmin)) {
      router.push('/');
    } else if (user && user.isAdmin) {
      loadData();
    }
  }, [user, loading, router]);

  const loadData = async () => {
    const { data: gamesData } = await supabase
      .from('games')
      .select('*')
      .order('created_at', { ascending: false });
    if (gamesData) setGames(gamesData);

    const { data: snakeData } = await supabase
      .from('snake_games')
      .select('*')
      .order('created_at', { ascending: false });
    if (snakeData) setSnakeGames(snakeData);

    const { data: usersData } = await supabase
      .from('user')
      .select('*')
      .order('createdAt', { ascending: true });
    if (usersData) setUsers(usersData);
  };

  const createGame = async () => {
    if (newWord.length !== 5) { setMessage('Word must be exactly 5 letters'); return; }
    try {
      const { error } = await supabase.from('games').insert({ word: newWord.toUpperCase(), is_active: false });
      if (error) throw error;
      setMessage('Game created successfully!');
      setNewWord('');
      loadData();
    } catch (error: any) {
      setMessage('Error: ' + error.message);
    }
  };

  const toggleGameActive = async (gameId: string, currentState: boolean) => {
    try {
      if (!currentState) await supabase.from('games').update({ is_active: false }).neq('id', gameId);
      const { error } = await supabase.from('games').update({ is_active: !currentState }).eq('id', gameId);
      if (error) throw error;
      setMessage(currentState ? 'Game deactivated' : 'Game activated!');
      loadData();
    } catch (error: any) {
      setMessage('Error: ' + error.message);
    }
  };

  const deleteGame = async (gameId: string) => {
    if (!confirm('Delete this game? This will also delete all scores.')) return;
    try {
      const { error } = await supabase.from('games').delete().eq('id', gameId);
      if (error) throw error;
      setMessage('Game deleted');
      loadData();
    } catch (error: any) {
      setMessage('Error: ' + error.message);
    }
  };

  const createSnakeSession = async () => {
    try {
      const { error } = await supabase.from('snake_games').insert({ is_active: false });
      if (error) throw error;
      setMessage('Snake session created!');
      loadData();
    } catch (error: any) {
      setMessage('Error: ' + error.message);
    }
  };

  const toggleSnakeActive = async (sessionId: string, currentState: boolean) => {
    try {
      if (!currentState) await supabase.from('snake_games').update({ is_active: false }).neq('id', sessionId);
      const { error } = await supabase.from('snake_games').update({ is_active: !currentState }).eq('id', sessionId);
      if (error) throw error;
      setMessage(currentState ? 'Snake session deactivated' : 'Snake session activated!');
      loadData();
    } catch (error: any) {
      setMessage('Error: ' + error.message);
    }
  };

  const deleteSnakeSession = async (sessionId: string) => {
    if (!confirm('Delete this snake session? This will also delete all scores.')) return;
    try {
      const { error } = await supabase.from('snake_games').delete().eq('id', sessionId);
      if (error) throw error;
      setMessage('Snake session deleted');
      loadData();
    } catch (error: any) {
      setMessage('Error: ' + error.message);
    }
  };

  const toggleUserAdmin = async (userId: string, currentState: boolean) => {
    try {
      const { error } = await supabase.from('user').update({ isAdmin: !currentState }).eq('id', userId);
      if (error) throw error;
      setMessage('User updated');
      loadData();
    } catch (error: any) {
      setMessage('Error: ' + error.message);
    }
  };

  const resetUserPassword = async (userId: string, userName: string) => {
    if (!confirm(`Reset password for ${userName}? They will be prompted to set a new one on next login.`)) return;
    try {
      const res = await fetch('/api/admin/reset-user-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setMessage(`Password reset for ${userName}`);
    } catch (error: any) {
      setMessage('Error: ' + error.message);
    }
  };

  const deleteUser = async (userId: string) => {
    if (!confirm('Delete this user? This will also delete all their scores.')) return;
    try {
      const { error } = await supabase.from('user').delete().eq('id', userId);
      if (error) throw error;
      setMessage('User deleted');
      loadData();
    } catch (error: any) {
      setMessage('Error: ' + error.message);
    }
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center"><div>Loading...</div></div>;
  if (!user || !user.isAdmin) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-cyan-50">
      <nav className="border-b bg-white/90 backdrop-blur-sm shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-20 justify-between">
            <Link href="/" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
              <Image src="/images/logos/S@S_Logo_Mark_RGB.svg" alt="Software@Scale Logo" width={50} height={50} priority />
              <div>
                <h1 className="text-xl font-bold text-primary">Software@Scale Games</h1>
                <p className="text-xs text-secondary font-semibold">Admin Panel</p>
              </div>
            </Link>
            <div className="flex items-center">
              <Button asChild variant="outline"><Link href="/">Back to Home</Link></Button>
            </div>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-6xl px-4 py-8">
        {message && (
          <Card className="mb-6 border-primary/20 bg-primary/5">
            <CardContent className="py-4">
              <p className="text-primary font-medium">{message}</p>
            </CardContent>
          </Card>
        )}

        <div className="mb-6 flex space-x-2">
          {(['games', 'snake', 'users'] as const).map((tab) => (
            <Button key={tab} onClick={() => setActiveTab(tab)}
              variant={activeTab === tab ? 'default' : 'outline'} className="px-6 capitalize">
              {tab === 'games' ? 'Wordo Games' : tab === 'snake' ? 'Snake Sessions' : 'Users'}
            </Button>
          ))}
        </div>

        {activeTab === 'games' && (
          <div className="space-y-6">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="text-2xl">Create New Game</CardTitle>
                <CardDescription>Enter a 5-letter word</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4">
                  <Input type="text" value={newWord} onChange={(e) => setNewWord(e.target.value.toUpperCase())}
                    maxLength={5} placeholder="Enter 5-letter word" className="uppercase text-xl font-mono h-12 flex-1" />
                  <Button onClick={createGame} size="lg" className="px-8">Create Game</Button>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-lg">
              <CardHeader><CardTitle className="text-2xl">All Games</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {games.map((game) => (
                    <div key={game.id} className="flex items-center justify-between border-b pb-4 last:border-0">
                      <div>
                        <div className="font-mono text-2xl font-bold text-primary">{game.word}</div>
                        <div className="text-sm text-muted-foreground">Created: {new Date(game.created_at).toLocaleDateString()}</div>
                        {game.is_active && <span className="inline-block mt-1 rounded bg-secondary/20 px-2 py-1 text-xs font-semibold text-secondary">ACTIVE</span>}
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={() => toggleGameActive(game.id, game.is_active)} variant={game.is_active ? 'destructive' : 'secondary'} size="sm">
                          {game.is_active ? 'Deactivate' : 'Activate'}
                        </Button>
                        <Button onClick={() => deleteGame(game.id)} variant="destructive" size="sm">Delete</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'snake' && (
          <div className="space-y-6">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="text-2xl">Create Snake Session</CardTitle>
                <CardDescription>Open a new snake session for users to play</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={createSnakeSession} size="lg" className="px-8">Create Session</Button>
              </CardContent>
            </Card>

            <Card className="shadow-lg">
              <CardHeader><CardTitle className="text-2xl">All Snake Sessions</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {snakeGames.map((session) => (
                    <div key={session.id} className="flex items-center justify-between border-b pb-4 last:border-0">
                      <div>
                        <div className="font-mono text-sm text-muted-foreground">{session.id}</div>
                        <div className="text-sm text-muted-foreground">Created: {new Date(session.created_at).toLocaleDateString()}</div>
                        {session.is_active && <span className="inline-block mt-1 rounded bg-green-500/20 px-2 py-1 text-xs font-semibold text-green-700">ACTIVE</span>}
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={() => toggleSnakeActive(session.id, session.is_active)} variant={session.is_active ? 'destructive' : 'secondary'} size="sm">
                          {session.is_active ? 'Deactivate' : 'Activate'}
                        </Button>
                        <Button onClick={() => deleteSnakeSession(session.id)} variant="destructive" size="sm">Delete</Button>
                      </div>
                    </div>
                  ))}
                  {snakeGames.length === 0 && <p className="text-muted-foreground text-sm">No sessions yet.</p>}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'users' && (
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl">All Users</CardTitle>
              <CardDescription>Manage accounts and permissions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {users.map((u) => (
                  <div key={u.id} className="flex items-center justify-between border-b pb-4 last:border-0">
                    <div>
                      <div className="text-lg font-semibold">{u.name}</div>
                      <div className="text-sm text-muted-foreground">Joined: {new Date(u.createdAt).toLocaleDateString()}</div>
                      {u.isAdmin && <span className="inline-block mt-1 rounded bg-primary/20 px-2 py-1 text-xs font-semibold text-primary">ADMIN</span>}
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={() => toggleUserAdmin(u.id, u.isAdmin)} variant={u.isAdmin ? 'outline' : 'secondary'} size="sm">
                        {u.isAdmin ? 'Remove Admin' : 'Make Admin'}
                      </Button>
                      <Button onClick={() => resetUserPassword(u.id, u.name)} variant="outline" size="sm">
                        Reset Password
                      </Button>
                      {u.id !== user.id && (
                        <Button onClick={() => deleteUser(u.id)} variant="destructive" size="sm">Delete</Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
