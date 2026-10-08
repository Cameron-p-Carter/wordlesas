'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { supabase, Game, SnakeGame, ConnectionsGame, ConnectionsDifficulty } from '@/lib/supabase';
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

const CONNECTION_COLORS: { key: ConnectionsDifficulty; label: string; swatch: string }[] = [
  { key: 'yellow', label: 'Yellow (easiest)', swatch: 'bg-[#f9df6d]' },
  { key: 'green', label: 'Green', swatch: 'bg-[#a0c35a]' },
  { key: 'blue', label: 'Blue', swatch: 'bg-[#b0c4ef]' },
  { key: 'purple', label: 'Purple (trickiest)', swatch: 'bg-[#ba81c5]' },
];

type ConnGroupDraft = { difficulty: ConnectionsDifficulty; label: string; wordsText: string };

const emptyConnGroups = (): ConnGroupDraft[] =>
  CONNECTION_COLORS.map((c) => ({ difficulty: c.key, label: '', wordsText: '' }));

async function adminPost(path: string, body: object): Promise<{ ok: boolean; data: any }> {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return { ok: res.ok, data };
}

export default function AdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [games, setGames] = useState<Game[]>([]);
  const [snakeGames, setSnakeGames] = useState<SnakeGame[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [connectionsGames, setConnectionsGames] = useState<ConnectionsGame[]>([]);
  const [connGroups, setConnGroups] = useState<ConnGroupDraft[]>(emptyConnGroups());
  const [newWord, setNewWord] = useState('');
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'games' | 'snake' | 'connections' | 'users'>('games');

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

    const { data: connectionsData } = await supabase
      .from('connections_games')
      .select('*')
      .order('created_at', { ascending: false });
    if (connectionsData) setConnectionsGames(connectionsData);

    const { data: usersData } = await supabase
      .from('user')
      .select('*')
      .order('createdAt', { ascending: true });
    if (usersData) setUsers(usersData);
  };

  const createGame = async () => {
    if (newWord.length !== 5) { setMessage('Word must be exactly 5 letters'); return; }
    const { ok, data } = await adminPost('/api/admin/games', { action: 'create', word: newWord });
    if (!ok) { setMessage('Error: ' + data.error); return; }
    setMessage('Game created successfully!');
    setNewWord('');
    loadData();
  };

  const toggleGameActive = async (gameId: string, currentState: boolean) => {
    const action = currentState ? 'deactivate' : 'activate';
    const { ok, data } = await adminPost('/api/admin/games', { action, gameId });
    if (!ok) { setMessage('Error: ' + data.error); return; }
    setMessage(currentState ? 'Game deactivated' : 'Game activated!');
    loadData();
  };

  const deleteGame = async (gameId: string) => {
    if (!confirm('Delete this game? This will also delete all scores.')) return;
    const { ok, data } = await adminPost('/api/admin/games', { action: 'delete', gameId });
    if (!ok) { setMessage('Error: ' + data.error); return; }
    setMessage('Game deleted');
    loadData();
  };

  const createSnakeSession = async () => {
    const { ok, data } = await adminPost('/api/admin/snake', { action: 'create' });
    if (!ok) { setMessage('Error: ' + data.error); return; }
    setMessage('Snake session created!');
    loadData();
  };

  const toggleSnakeActive = async (sessionId: string, currentState: boolean) => {
    const action = currentState ? 'deactivate' : 'activate';
    const { ok, data } = await adminPost('/api/admin/snake', { action, sessionId });
    if (!ok) { setMessage('Error: ' + data.error); return; }
    setMessage(currentState ? 'Snake session deactivated' : 'Snake session activated!');
    loadData();
  };

  const deleteSnakeSession = async (sessionId: string) => {
    if (!confirm('Delete this snake session? This will also delete all scores.')) return;
    const { ok, data } = await adminPost('/api/admin/snake', { action: 'delete', sessionId });
    if (!ok) { setMessage('Error: ' + data.error); return; }
    setMessage('Snake session deleted');
    loadData();
  };

  const createConnections = async () => {
    const groups = connGroups.map((g) => ({
      difficulty: g.difficulty,
      label: g.label.trim(),
      words: g.wordsText.split(',').map((w) => w.trim()).filter(Boolean),
    }));

    // Light client-side check; the server re-validates authoritatively.
    for (const g of groups) {
      if (!g.label) { setMessage('Every group needs a category label'); return; }
      if (g.words.length !== 4) { setMessage(`Group "${g.label || g.difficulty}" needs exactly 4 words (comma-separated)`); return; }
    }
    const allWords = groups.flatMap((g) => g.words.map((w) => w.toUpperCase()));
    if (new Set(allWords).size !== 16) { setMessage('All 16 words must be unique'); return; }

    const { ok, data } = await adminPost('/api/admin/connections', { action: 'create', groups });
    if (!ok) { setMessage('Error: ' + data.error); return; }
    setMessage('Connections puzzle created!');
    setConnGroups(emptyConnGroups());
    loadData();
  };

  const toggleConnectionsActive = async (gameId: string, currentState: boolean) => {
    const action = currentState ? 'deactivate' : 'activate';
    const { ok, data } = await adminPost('/api/admin/connections', { action, gameId });
    if (!ok) { setMessage('Error: ' + data.error); return; }
    setMessage(currentState ? 'Puzzle deactivated' : 'Puzzle activated!');
    loadData();
  };

  const deleteConnections = async (gameId: string) => {
    if (!confirm('Delete this puzzle? This will also delete all scores.')) return;
    const { ok, data } = await adminPost('/api/admin/connections', { action: 'delete', gameId });
    if (!ok) { setMessage('Error: ' + data.error); return; }
    setMessage('Puzzle deleted');
    loadData();
  };

  const toggleUserAdmin = async (userId: string, currentState: boolean) => {
    const { ok, data } = await adminPost('/api/admin/users', {
      action: 'toggleAdmin',
      userId,
      isAdmin: !currentState,
    });
    if (!ok) { setMessage('Error: ' + data.error); return; }
    setMessage('User updated');
    loadData();
  };

  const resetUserPassword = async (userId: string, userName: string) => {
    if (!confirm(`Reset password for ${userName}? They will need a one-time token to set a new one.`)) return;
    const { ok, data } = await adminPost('/api/admin/reset-user-password', { userId });
    if (!ok) { setMessage('Error: ' + data.error); return; }
    setMessage(
      `Password reset for ${userName}. Give them this one-time token (valid 30 min): ${data.resetToken}`
    );
  };

  const deleteUser = async (userId: string) => {
    if (!confirm('Delete this user? This will also delete all their scores.')) return;
    const { ok, data } = await adminPost('/api/admin/users', { action: 'delete', userId });
    if (!ok) { setMessage('Error: ' + data.error); return; }
    setMessage('User deleted');
    loadData();
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
              <p className="text-primary font-medium break-all">{message}</p>
            </CardContent>
          </Card>
        )}

        <div className="mb-6 flex space-x-2">
          {(['games', 'snake', 'connections', 'users'] as const).map((tab) => (
            <Button key={tab} onClick={() => setActiveTab(tab)}
              variant={activeTab === tab ? 'default' : 'outline'} className="px-6 capitalize">
              {tab === 'games' ? 'Wordo Games' : tab === 'snake' ? 'Snake Sessions' : tab === 'connections' ? 'Connections' : 'Users'}
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

        {activeTab === 'connections' && (
          <div className="space-y-6">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="text-2xl">Create Connections Puzzle</CardTitle>
                <CardDescription>
                  Fill in all four groups. Each group needs a category label and exactly 4 words
                  (comma-separated). All 16 words must be unique.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {connGroups.map((g, i) => (
                  <div key={g.difficulty} className="space-y-2 rounded-lg border p-4">
                    <div className="flex items-center gap-2">
                      <span className={`inline-block h-4 w-4 rounded ${CONNECTION_COLORS[i].swatch}`} />
                      <Label className="font-semibold">{CONNECTION_COLORS[i].label}</Label>
                    </div>
                    <Input
                      type="text"
                      value={g.label}
                      onChange={(e) =>
                        setConnGroups((prev) => prev.map((row, idx) => (idx === i ? { ...row, label: e.target.value } : row)))
                      }
                      placeholder="Category label (e.g. TYPES OF BASS)"
                      className="h-11"
                    />
                    <Input
                      type="text"
                      value={g.wordsText}
                      onChange={(e) =>
                        setConnGroups((prev) => prev.map((row, idx) => (idx === i ? { ...row, wordsText: e.target.value } : row)))
                      }
                      placeholder="4 words, comma-separated (e.g. LARGEMOUTH, DOUBLE, GUITAR, DRUM)"
                      className="h-11"
                    />
                  </div>
                ))}
                <Button onClick={createConnections} size="lg" className="px-8">Create Puzzle</Button>
              </CardContent>
            </Card>

            <Card className="shadow-lg">
              <CardHeader><CardTitle className="text-2xl">All Puzzles</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {connectionsGames.map((puzzle) => (
                    <div key={puzzle.id} className="flex items-center justify-between border-b pb-4 last:border-0">
                      <div>
                        <div className="text-sm font-medium">
                          {puzzle.groups.map((g) => g.label).join(' · ')}
                        </div>
                        <div className="text-sm text-muted-foreground">Created: {new Date(puzzle.created_at).toLocaleDateString()}</div>
                        {puzzle.is_active && <span className="inline-block mt-1 rounded bg-secondary/20 px-2 py-1 text-xs font-semibold text-secondary">ACTIVE</span>}
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={() => toggleConnectionsActive(puzzle.id, puzzle.is_active)} variant={puzzle.is_active ? 'destructive' : 'secondary'} size="sm">
                          {puzzle.is_active ? 'Deactivate' : 'Activate'}
                        </Button>
                        <Button onClick={() => deleteConnections(puzzle.id)} variant="destructive" size="sm">Delete</Button>
                      </div>
                    </div>
                  ))}
                  {connectionsGames.length === 0 && <p className="text-muted-foreground text-sm">No puzzles yet.</p>}
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
