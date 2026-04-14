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

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  const { data: activeGame, error: gameError } = await supabase
    .from('games')
    .select('id, is_active, start_date, end_date, created_at')
    .eq('is_active', true)
    .single();

  if (gameError || !activeGame) {
    return NextResponse.json({ error: 'No active game' }, { status: 404 });
  }

  if (!userId) {
    return NextResponse.json({ game: activeGame });
  }

  const { data: existingScore } = await supabase
    .from('scores')
    .select('*')
    .eq('user_id', userId)
    .eq('game_id', activeGame.id)
    .single();

  if (!existingScore) {
    return NextResponse.json({ game: activeGame });
  }

  // User already played — fetch the word only on the server to reconstruct evaluations
  const { data: gameWithWord } = await supabase
    .from('games')
    .select('word')
    .eq('id', activeGame.id)
    .single();

  const evaluatedGuesses = gameWithWord
    ? (existingScore.guesses as string[]).map((guess: string) =>
        evaluateGuess(guess, gameWithWord.word)
      )
    : [];

  return NextResponse.json({
    game: activeGame,
    alreadyPlayed: true,
    won: existingScore.won,
    guesses: evaluatedGuesses,
  });
}
