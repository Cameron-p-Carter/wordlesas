import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type LetterState = 'correct' | 'present' | 'absent';
type CellData = { letter: string; state: LetterState };

function evaluateGuess(guess: string, targetWord: string): CellData[] {
  const result: CellData[] = [];
  const target = targetWord.toUpperCase();
  const guessUpper = guess.toUpperCase();
  const targetLetters = target.split('');
  const guessLetters = guessUpper.split('');

  const used = new Array(5).fill(false);
  for (let i = 0; i < 5; i++) {
    if (guessLetters[i] === targetLetters[i]) {
      result[i] = { letter: guessLetters[i], state: 'correct' };
      used[i] = true;
    } else {
      result[i] = { letter: guessLetters[i], state: 'absent' };
    }
  }

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
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { guess, userId, gameId, previousGuesses } = body as {
    guess: string;
    userId: string;
    gameId: string;
    previousGuesses: string[];
  };

  if (!guess || !userId || !gameId) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  if (guess.length !== 5) {
    return NextResponse.json({ error: 'Guess must be 5 letters' }, { status: 400 });
  }

  // Fetch the word server-side — never sent to the client
  const { data: game, error: gameError } = await supabase
    .from('games')
    .select('word, is_active')
    .eq('id', gameId)
    .single();

  if (gameError || !game) {
    return NextResponse.json({ error: 'Game not found' }, { status: 404 });
  }

  if (!game.is_active) {
    return NextResponse.json({ error: 'Game is not active' }, { status: 400 });
  }

  const evaluation = evaluateGuess(guess, game.word);
  const isCorrect = guess.toUpperCase() === game.word.toUpperCase();
  const allGuesses = [...previousGuesses, guess];
  const isLastGuess = allGuesses.length === 5;
  const gameOver = isCorrect || isLastGuess;

  if (gameOver) {
    let points = 0;
    if (isCorrect) {
      points = 6 - allGuesses.length;
    }

    try {
      await supabase.from('scores').insert({
        user_id: userId,
        game_id: gameId,
        guesses_count: allGuesses.length,
        points,
        guesses: allGuesses,
        won: isCorrect,
      });
    } catch (err) {
      console.error('Error saving score:', err);
    }
  }

  return NextResponse.json({
    evaluation,
    won: isCorrect,
    gameOver,
    // Only reveal the word when the game is over
    word: gameOver && !isCorrect ? game.word.toUpperCase() : undefined,
  });
}
