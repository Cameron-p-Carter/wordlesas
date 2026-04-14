'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

type LetterState = 'correct' | 'present' | 'absent' | 'empty';

type CellData = {
  letter: string;
  state: LetterState;
};

type GameInfo = {
  id: string;
  is_active: boolean;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
};

export default function WordleGame() {
  const { user } = useAuth();
  const [game, setGame] = useState<GameInfo | null>(null);
  const [currentGuess, setCurrentGuess] = useState('');
  const [guesses, setGuesses] = useState<CellData[][]>([]);
  const [submittedGuessStrings, setSubmittedGuessStrings] = useState<string[]>([]);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [hasPlayed, setHasPlayed] = useState(false);

  useEffect(() => {
    loadGame();
  }, [user]);

  const loadGame = async () => {
    try {
      const params = user?.id ? `?userId=${user.id}` : '';
      const res = await fetch(`/api/game${params}`);

      if (!res.ok) {
        setMessage('No active game. Please wait for admin to start a new game.');
        setLoading(false);
        return;
      }

      const data = await res.json();
      setGame(data.game);

      if (data.alreadyPlayed) {
        setHasPlayed(true);
        setGuesses(data.guesses);
        setGameOver(true);
        setWon(data.won);
        setMessage(data.won ? 'You already completed this word!' : 'You already attempted this word.');
      }

      setLoading(false);
    } catch (error) {
      console.error('Error loading game:', error);
      setLoading(false);
    }
  };

  const handleKeyPress = (key: string) => {
    if (gameOver || !game) return;

    if (key === 'ENTER') {
      if (currentGuess.length !== 5) {
        setMessage('Word must be 5 letters');
        return;
      }
      submitGuess();
    } else if (key === 'BACKSPACE') {
      setCurrentGuess(currentGuess.slice(0, -1));
      setMessage('');
    } else if (currentGuess.length < 5 && key.match(/^[A-Z]$/)) {
      setCurrentGuess(currentGuess + key);
      setMessage('');
    }
  };

  const submitGuess = async () => {
    if (!game || !user) return;

    try {
      const res = await fetch('/api/guess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guess: currentGuess,
          userId: user.id,
          gameId: game.id,
          previousGuesses: submittedGuessStrings,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        setMessage(err.error || 'Error submitting guess');
        return;
      }

      const result = await res.json();
      const newGuesses = [...guesses, result.evaluation];
      const newGuessStrings = [...submittedGuessStrings, currentGuess];

      setGuesses(newGuesses);
      setSubmittedGuessStrings(newGuessStrings);

      if (result.gameOver) {
        setGameOver(true);
        setWon(result.won);
        if (result.won) {
          setMessage(`Congratulations! You got it in ${newGuesses.length} ${newGuesses.length === 1 ? 'guess' : 'guesses'}!`);
        } else {
          setMessage(`Game Over! The word was ${result.word}`);
        }
      }

      setCurrentGuess('');
    } catch (error) {
      console.error('Error submitting guess:', error);
      setMessage('Error submitting guess. Please try again.');
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleKeyPress('ENTER');
      } else if (e.key === 'Backspace') {
        handleKeyPress('BACKSPACE');
      } else if (e.key.match(/^[a-zA-Z]$/)) {
        handleKeyPress(e.key.toUpperCase());
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentGuess, gameOver, game]);

  const getCellClass = (state: LetterState) => {
    switch (state) {
      case 'correct':
        return 'bg-green-500 text-white border-green-500 shadow-lg';
      case 'present':
        return 'bg-yellow-500 text-white border-yellow-500 shadow-lg';
      case 'absent':
        return 'bg-gray-400 text-white border-gray-400';
      default:
        return 'bg-white border-gray-300 hover:border-[#5ae0f6]/50 transition-all';
    }
  };

  if (loading) {
    return <div className="text-center">Loading game...</div>;
  }

  if (!game) {
    return <div className="text-center text-red-600">{message}</div>;
  }

  if (hasPlayed && gameOver) {
    return (
      <div className="mx-auto max-w-md">
        <h2 className="mb-6 text-center text-2xl font-bold">Your Game Result</h2>
        <div className="mb-4 space-y-2">
          {guesses.map((guess, i) => (
            <div key={i} className="flex justify-center gap-2">
              {guess.map((cell, j) => (
                <div
                  key={j}
                  className={`flex h-14 w-14 items-center justify-center border-2 text-2xl font-bold ${getCellClass(cell.state)}`}
                >
                  {cell.letter}
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className="rounded-md bg-blue-50 p-4 text-center">
          <p className="text-lg font-semibold">{message}</p>
        </div>
      </div>
    );
  }

  // Create grid of 5 rows
  const rows = [];
  for (let i = 0; i < 5; i++) {
    if (i < guesses.length) {
      rows.push(guesses[i]);
    } else if (i === guesses.length) {
      // Current guess row
      const currentRow: CellData[] = currentGuess.split('').map(letter => ({ letter, state: 'empty' as LetterState }));
      while (currentRow.length < 5) {
        currentRow.push({ letter: '', state: 'empty' });
      }
      rows.push(currentRow);
    } else {
      // Empty rows
      rows.push(Array(5).fill({ letter: '', state: 'empty' }));
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      {/* Premium header with glow effect */}
      <div className="mb-8 text-center relative">
        <div className="absolute inset-0 blur-3xl opacity-20 bg-gradient-to-r from-[#0c2080] via-[#5ae0f6] to-[#0c2080]"></div>
        <h2 className="relative text-4xl font-bold bg-gradient-to-r from-[#0c2080] to-[#5ae0f6] bg-clip-text text-transparent">
          Elite Word Challenge
        </h2>
        <p className="relative mt-2 text-sm text-muted-foreground">Guess the word in 5 attempts</p>
      </div>

      {message && (
        <div className={`mb-6 rounded-xl p-4 text-center font-medium shadow-lg ${
          gameOver
            ? won
              ? 'bg-gradient-to-r from-[#5ae0f6]/10 to-[#0c2080]/10 text-[#0c2080] border-2 border-[#5ae0f6]'
              : 'bg-red-50 text-red-700 border-2 border-red-200'
            : 'bg-yellow-50 text-yellow-700 border-2 border-yellow-200'
        }`}>
          {message}
        </div>
      )}

      {/* Game grid with premium styling */}
      <div className="mb-8 space-y-3 p-6 rounded-2xl bg-white/50 backdrop-blur-sm shadow-xl border border-white/20">
        {rows.map((row, i) => (
          <div key={i} className="flex justify-center gap-3">
            {row.map((cell, j) => (
              <div
                key={j}
                className={`flex h-16 w-16 items-center justify-center border-2 text-3xl font-bold rounded-lg transition-all duration-300 ${getCellClass(cell.state)}`}
                style={{ animationDelay: `${j * 0.1}s` }}
              >
                {cell.letter}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Premium keyboard */}
      <div className="space-y-2">
        {[
          ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
          ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
          ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'BACKSPACE'],
        ].map((row, i) => (
          <div key={i} className="flex justify-center gap-1.5">
            {row.map((key) => (
              <button
                key={key}
                onClick={() => handleKeyPress(key)}
                disabled={gameOver}
                className={`rounded-lg px-3 py-4 font-semibold transition-all duration-200 ${
                  key === 'ENTER' || key === 'BACKSPACE'
                    ? 'bg-[#0c2080] text-white px-5 hover:bg-[#0c2080]/90 shadow-lg'
                    : 'bg-gray-200 hover:bg-[#5ae0f6] hover:text-[#0c2080] hover:shadow-md'
                } ${gameOver ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {key === 'BACKSPACE' ? '⌫' : key}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
