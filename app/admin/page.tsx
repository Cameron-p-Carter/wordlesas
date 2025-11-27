'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase, Game, User } from '@/lib/supabase';

export default function AdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [games, setGames] = useState<Game[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [newWord, setNewWord] = useState('');
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'games' | 'users'>('games');

  useEffect(() => {
    if (!loading && (!user || !user.is_admin)) {
      router.push('/');
    } else if (user && user.is_admin) {
      loadData();
    }
  }, [user, loading, router]);

  const loadData = async () => {
    // Load games
    const { data: gamesData } = await supabase
      .from('games')
      .select('*')
      .order('created_at', { ascending: false });

    if (gamesData) setGames(gamesData);

    // Load users
    const { data: usersData } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: true });

    if (usersData) setUsers(usersData);
  };

  const createGame = async () => {
    if (newWord.length !== 5) {
      setMessage('Word must be exactly 5 letters');
      return;
    }

    try {
      const { error } = await supabase.from('games').insert({
        word: newWord.toUpperCase(),
        is_active: false,
      });

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
      // If activating, deactivate all other games first
      if (!currentState) {
        await supabase.from('games').update({ is_active: false }).neq('id', gameId);
      }

      const { error } = await supabase
        .from('games')
        .update({ is_active: !currentState })
        .eq('id', gameId);

      if (error) throw error;

      setMessage(currentState ? 'Game deactivated' : 'Game activated!');
      loadData();
    } catch (error: any) {
      setMessage('Error: ' + error.message);
    }
  };

  const deleteGame = async (gameId: string) => {
    if (!confirm('Are you sure you want to delete this game? This will also delete all scores.')) {
      return;
    }

    try {
      const { error } = await supabase.from('games').delete().eq('id', gameId);

      if (error) throw error;

      setMessage('Game deleted successfully');
      loadData();
    } catch (error: any) {
      setMessage('Error: ' + error.message);
    }
  };

  const toggleUserAdmin = async (userId: string, currentState: boolean) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ is_admin: !currentState })
        .eq('id', userId);

      if (error) throw error;

      setMessage('User updated successfully');
      loadData();
    } catch (error: any) {
      setMessage('Error: ' + error.message);
    }
  };

  const deleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This will also delete all their scores.')) {
      return;
    }

    try {
      const { error } = await supabase.from('users').delete().eq('id', userId);

      if (error) throw error;

      setMessage('User deleted successfully');
      loadData();
    } catch (error: any) {
      setMessage('Error: ' + error.message);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div>Loading...</div>
      </div>
    );
  }

  if (!user || !user.is_admin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between">
            <div className="flex items-center">
              <Link href="/" className="text-xl font-bold hover:text-blue-600">
                Wordle Clone - Admin
              </Link>
            </div>
            <div className="flex items-center">
              <Link
                href="/"
                className="rounded-md bg-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-300"
              >
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-6xl px-4 py-8">
        {message && (
          <div className="mb-4 rounded-md bg-blue-50 p-4 text-blue-700">
            {message}
          </div>
        )}

        <div className="mb-6 flex space-x-4 border-b">
          <button
            onClick={() => setActiveTab('games')}
            className={`px-4 py-2 font-semibold ${
              activeTab === 'games'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Games
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 font-semibold ${
              activeTab === 'users'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Users
          </button>
        </div>

        {activeTab === 'games' && (
          <div>
            <div className="mb-8 rounded-lg bg-white p-6 shadow">
              <h2 className="mb-4 text-xl font-bold">Create New Game</h2>
              <div className="flex gap-4">
                <input
                  type="text"
                  value={newWord}
                  onChange={(e) => setNewWord(e.target.value.toUpperCase())}
                  maxLength={5}
                  placeholder="Enter 5-letter word"
                  className="flex-1 rounded-md border border-gray-300 px-4 py-2 uppercase"
                />
                <button
                  onClick={createGame}
                  className="rounded-md bg-blue-600 px-6 py-2 text-white hover:bg-blue-700"
                >
                  Create Game
                </button>
              </div>
            </div>

            <div className="rounded-lg bg-white p-6 shadow">
              <h2 className="mb-4 text-xl font-bold">All Games</h2>
              <div className="space-y-4">
                {games.map((game) => (
                  <div
                    key={game.id}
                    className="flex items-center justify-between border-b pb-4"
                  >
                    <div>
                      <div className="font-mono text-2xl font-bold">{game.word}</div>
                      <div className="text-sm text-gray-600">
                        Created: {new Date(game.created_at).toLocaleDateString()}
                      </div>
                      {game.is_active && (
                        <span className="inline-block rounded bg-green-100 px-2 py-1 text-xs font-semibold text-green-800">
                          ACTIVE
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => toggleGameActive(game.id, game.is_active)}
                        className={`rounded-md px-4 py-2 text-sm font-semibold ${
                          game.is_active
                            ? 'bg-red-600 text-white hover:bg-red-700'
                            : 'bg-green-600 text-white hover:bg-green-700'
                        }`}
                      >
                        {game.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        onClick={() => deleteGame(game.id)}
                        className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-xl font-bold">All Users</h2>
            <div className="space-y-4">
              {users.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center justify-between border-b pb-4"
                >
                  <div>
                    <div className="text-lg font-semibold">{u.name}</div>
                    <div className="text-sm text-gray-600">
                      Joined: {new Date(u.created_at).toLocaleDateString()}
                    </div>
                    {u.is_admin && (
                      <span className="inline-block rounded bg-purple-100 px-2 py-1 text-xs font-semibold text-purple-800">
                        ADMIN
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => toggleUserAdmin(u.id, u.is_admin)}
                      className={`rounded-md px-4 py-2 text-sm font-semibold ${
                        u.is_admin
                          ? 'bg-gray-600 text-white hover:bg-gray-700'
                          : 'bg-purple-600 text-white hover:bg-purple-700'
                      }`}
                    >
                      {u.is_admin ? 'Remove Admin' : 'Make Admin'}
                    </button>
                    {u.id !== user.id && (
                      <button
                        onClick={() => deleteUser(u.id)}
                        className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
