'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

type Difficulty = 'yellow' | 'green' | 'blue' | 'purple';

type SolvedGroup = {
  index: number;
  label: string;
  difficulty: Difficulty;
  words: string[];
};

type Status = 'loading' | 'no_game' | 'playing' | 'won' | 'lost';

const MAX_MISTAKES = 4;

const DIFFICULTY_CLASS: Record<Difficulty, string> = {
  yellow: 'bg-[#f9df6d]',
  green: 'bg-[#a0c35a]',
  blue: 'bg-[#b0c4ef]',
  purple: 'bg-[#ba81c5]',
};

const norm = (w: string) => w.trim().toUpperCase();

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function ConnectionsGame() {
  const { user } = useAuth();
  const [status, setStatus] = useState<Status>('loading');
  const [gameId, setGameId] = useState('');
  const [words, setWords] = useState<string[]>([]);
  const [selection, setSelection] = useState<string[]>([]);
  const [solvedGroups, setSolvedGroups] = useState<SolvedGroup[]>([]);
  const [mistakes, setMistakes] = useState(0);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadGame = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/connections/game?userId=${user.id}`);
      if (!res.ok) {
        setStatus('no_game');
        return;
      }
      const data = await res.json();
      setGameId(data.game.id);

      const solved: SolvedGroup[] = data.solvedGroups ?? [];
      setSolvedGroups(solved);
      setMistakes(data.mistakes ?? 0);

      const solvedWords = new Set(solved.flatMap((g) => g.words.map(norm)));
      setWords((data.words as string[]).filter((w) => !solvedWords.has(norm(w))));

      if (data.alreadyPlayed) {
        setStatus(data.won ? 'won' : 'lost');
        setMessage(data.won ? 'You solved this one!' : 'You already attempted this puzzle.');
      } else {
        setStatus('playing');
      }
    } catch (err) {
      console.error('Error loading connections game:', err);
      setStatus('no_game');
    }
  }, [user]);

  useEffect(() => {
    loadGame();
  }, [loadGame]);

  const toggleWord = (word: string) => {
    if (status !== 'playing' || submitting) return;
    setMessage('');
    setSelection((prev) => {
      if (prev.includes(word)) return prev.filter((w) => w !== word);
      if (prev.length >= 4) return prev;
      return [...prev, word];
    });
  };

  const submitGuess = async () => {
    if (status !== 'playing' || selection.length !== 4 || submitting) return;
    setSubmitting(true);
    setMessage('');
    try {
      const res = await fetch('/api/connections/guess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId, selection }),
      });
      const result = await res.json();
      if (!res.ok) {
        setMessage(result.error || 'Error submitting guess');
        setSubmitting(false);
        return;
      }

      if (result.correct && result.group) {
        const solvedWords = new Set((result.group.words as string[]).map(norm));
        setSolvedGroups((prev) => [...prev, result.group]);
        setWords((prev) => prev.filter((w) => !solvedWords.has(norm(w))));
        setSelection([]);
        if (result.won) {
          setStatus('won');
          setMessage('Solved it! 🎉');
        }
      } else {
        setMistakes(result.mistakes);
        setSelection([]);
        if (result.gameOver && result.solution) {
          setSolvedGroups(result.solution);
          setWords([]);
          setStatus('lost');
          setMessage('Game over — out of tries.');
        } else {
          setMessage(result.oneAway ? 'One away…' : 'Not a group — try again.');
        }
      }
    } catch (err) {
      console.error('Error submitting guess:', err);
      setMessage('Error submitting guess. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (status === 'loading') {
    return <div className="text-center">Loading game...</div>;
  }

  if (status === 'no_game') {
    return (
      <div className="text-center text-muted-foreground">
        No active Connections puzzle. Please wait for the admin to start one.
      </div>
    );
  }

  const finished = status === 'won' || status === 'lost';
  const mistakesRemaining = MAX_MISTAKES - mistakes;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 text-center">
        <h2 className="text-3xl font-bold text-primary">Connections</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Create four groups of four! Select four words you think go together.
        </p>
      </div>

      {message && (
        <div
          className={`mb-4 rounded-xl p-3 text-center font-medium ${
            status === 'won'
              ? 'bg-green-50 text-green-700 border-2 border-green-200'
              : status === 'lost'
              ? 'bg-red-50 text-red-700 border-2 border-red-200'
              : 'bg-yellow-50 text-yellow-800 border-2 border-yellow-200'
          }`}
        >
          {message}
        </div>
      )}

      {/* Solved / revealed groups */}
      <div className="mb-3 space-y-2">
        {solvedGroups.map((g) => (
          <div
            key={g.index}
            className={`rounded-lg px-4 py-3 text-center text-gray-900 ${DIFFICULTY_CLASS[g.difficulty]}`}
          >
            <div className="text-xs font-bold uppercase tracking-wide">{g.label}</div>
            <div className="mt-1 font-semibold uppercase">{g.words.join(', ')}</div>
          </div>
        ))}
      </div>

      {/* Remaining word grid */}
      {words.length > 0 && (
        <div className="mb-6 grid grid-cols-4 gap-2">
          {words.map((word) => {
            const selected = selection.includes(word);
            return (
              <button
                key={word}
                onClick={() => toggleWord(word)}
                disabled={finished || submitting}
                className={`flex h-16 items-center justify-center rounded-lg px-1 text-center text-sm font-bold uppercase transition-all sm:text-base ${
                  selected
                    ? 'bg-[#0c2080] text-white scale-95'
                    : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
                } ${finished ? 'cursor-not-allowed opacity-70' : ''}`}
              >
                {word}
              </button>
            );
          })}
        </div>
      )}

      {/* Mistakes remaining */}
      {!finished && (
        <div className="mb-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <span>Mistakes remaining:</span>
          <div className="flex gap-1.5">
            {Array.from({ length: MAX_MISTAKES }).map((_, i) => (
              <span
                key={i}
                className={`h-4 w-4 rounded-full ${
                  i < mistakesRemaining ? 'bg-gray-700' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Controls */}
      {!finished && (
        <div className="flex justify-center gap-2">
          <button
            onClick={() => setWords((prev) => shuffle(prev))}
            disabled={submitting}
            className="rounded-full border-2 border-gray-800 px-5 py-2.5 font-semibold text-gray-800 transition-colors hover:bg-gray-100 disabled:opacity-50"
          >
            Shuffle
          </button>
          <button
            onClick={() => setSelection([])}
            disabled={submitting || selection.length === 0}
            className="rounded-full border-2 border-gray-800 px-5 py-2.5 font-semibold text-gray-800 transition-colors hover:bg-gray-100 disabled:opacity-40"
          >
            Deselect all
          </button>
          <button
            onClick={submitGuess}
            disabled={submitting || selection.length !== 4}
            className="rounded-full bg-[#0c2080] px-6 py-2.5 font-semibold text-white transition-colors hover:bg-[#0c2080]/90 disabled:opacity-40"
          >
            {submitting ? 'Checking…' : 'Submit'}
          </button>
        </div>
      )}
    </div>
  );
}
