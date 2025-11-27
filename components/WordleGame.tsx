'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, Game } from '@/lib/supabase';

type LetterState = 'correct' | 'present' | 'absent' | 'empty';

type CellData = {
  letter: string;
  state: LetterState;
};

export default function WordleGame() {
  const { user } = useAuth();
  const [game, setGame] = useState<Game | null>(null);
  const [currentGuess, setCurrentGuess] = useState('');
  const [guesses, setGuesses] = useState<CellData[][]>([]);
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
      // Get active game
      const { data: activeGame, error: gameError } = await supabase
        .from('games')
        .select('*')
        .eq('is_active', true)
        .single();

      if (gameError || !activeGame) {
        setMessage('No active game. Please wait for admin to start a new game.');
        setLoading(false);
        return;
      }

      setGame(activeGame);

      // Check if user has already played this game
      const { data: existingScore } = await supabase
        .from('scores')
        .select('*')
        .eq('user_id', user?.id)
        .eq('game_id', activeGame.id)
        .single();

      if (existingScore) {
        setHasPlayed(true);
        setGuesses(existingScore.guesses.map((guess: string) => evaluateGuess(guess, activeGame.word)));
        setGameOver(true);
        setWon(existingScore.won);
        setMessage(existingScore.won ? 'You already completed this word!' : 'You already attempted this word.');
      }

      setLoading(false);
    } catch (error) {
      console.error('Error loading game:', error);
      setLoading(false);
    }
  };

  const evaluateGuess = (guess: string, targetWord: string): CellData[] => {
    const result: CellData[] = [];
    const target = targetWord.toUpperCase();
    const guessUpper = guess.toUpperCase();
    const targetLetters = target.split('');
    const guessLetters = guessUpper.split('');

    // First pass: mark correct letters
    const used = new Array(5).fill(false);
    for (let i = 0; i < 5; i++) {
      if (guessLetters[i] === targetLetters[i]) {
        result[i] = { letter: guessLetters[i], state: 'correct' };
        used[i] = true;
      } else {
        result[i] = { letter: guessLetters[i], state: 'absent' };
      }
    }

    // Second pass: mark present letters
    for (let i = 0; i < 5; i++) {
      if (result[i].state !== 'correct') {
        const letterIndex = targetLetters.findIndex(
          (letter, index) => letter === guessLetters[i] && !used[index]
        );
        if (letterIndex !== -1) {
          result[i].state = 'present';
          used[letterIndex] = true;
        }
      }
    }

    return result;
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

    const evaluation = evaluateGuess(currentGuess, game.word);
    const newGuesses = [...guesses, evaluation];
    setGuesses(newGuesses);

    const isCorrect = currentGuess.toUpperCase() === game.word.toUpperCase();
    const isLastGuess = newGuesses.length === 5;

    if (isCorrect || isLastGuess) {
      setGameOver(true);
      setWon(isCorrect);

      // Calculate points: 1 guess = 5 points, 2 = 4, 3 = 3, 4 = 2, 5 = 1, fail = 0
      let points = 0;
      if (isCorrect) {
        points = 6 - newGuesses.length;
      }

      // Save score
      try {
        await supabase.from('scores').insert({
          user_id: user.id,
          game_id: game.id,
          guesses_count: newGuesses.length,
          points: points,
          guesses: newGuesses.map(g => g.map(c => c.letter).join('')),
          won: isCorrect,
        });

        setMessage(isCorrect ? `Congratulations! You got it in ${newGuesses.length} ${newGuesses.length === 1 ? 'guess' : 'guesses'}!` : `Game Over! The word was ${game.word.toUpperCase()}`);
      } catch (error) {
        console.error('Error saving score:', error);
      }
    }

    setCurrentGuess('');
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
        return 'bg-green-500 text-white border-green-500';
      case 'present':
        return 'bg-yellow-500 text-white border-yellow-500';
      case 'absent':
        return 'bg-gray-400 text-white border-gray-400';
      default:
        return 'bg-white border-gray-300';
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
    <div className="mx-auto max-w-md">
      <h2 className="mb-6 text-center text-2xl font-bold">Wordle</h2>

      {message && (
        <div className={`mb-4 rounded-md p-3 text-center ${gameOver ? 'bg-blue-50 text-blue-700' : 'bg-yellow-50 text-yellow-700'}`}>
          {message}
        </div>
      )}

      <div className="mb-6 space-y-2">
        {rows.map((row, i) => (
          <div key={i} className="flex justify-center gap-2">
            {row.map((cell, j) => (
              <div
                key={j}
                className={`flex h-14 w-14 items-center justify-center border-2 text-2xl font-bold transition-colors ${getCellClass(cell.state)}`}
              >
                {cell.letter}
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="space-y-2">
        {[
          ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
          ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
          ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'BACKSPACE'],
        ].map((row, i) => (
          <div key={i} className="flex justify-center gap-1">
            {row.map((key) => (
              <button
                key={key}
                onClick={() => handleKeyPress(key)}
                disabled={gameOver}
                className={`rounded px-3 py-4 font-semibold ${
                  key === 'ENTER' || key === 'BACKSPACE'
                    ? 'bg-gray-500 text-white px-4'
                    : 'bg-gray-200'
                } ${gameOver ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-300'}`}
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
