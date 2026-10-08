import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
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
  const requestedUserId = searchParams.get('userId');

  const { data: activeGame, error: gameError } = await supabase
    .from('games')
    .select('id, is_active, start_date, end_date, created_at')
    .eq('is_active', true)
    .single();

  if (gameError || !activeGame) {
    return NextResponse.json({ error: 'No active game' }, { status: 404 });
  }

  if (!requestedUserId) {
    return NextResponse.json({ game: activeGame });
  }

  // Require a valid session and verify it belongs to the requesting user
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user || session.user.id !== requestedUserId) {
    return NextResponse.json({ game: activeGame });
  }

  const userId = session.user.id;

  const { data: existingScore } = await supabase
    .from('scores')
    .select('*')
    .eq('user_id', userId)
    .eq('game_id', activeGame.id)
    .single();

  if (!existingScore) {
    return NextResponse.json({ game: activeGame });
  }

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

  if (!existingScore.is_complete) {
    return NextResponse.json({
      game: activeGame,
      inProgress: true,
      guesses: evaluatedGuesses,
      guessStrings: existingScore.guesses,
    });
  }

  return NextResponse.json({
    game: activeGame,
    alreadyPlayed: true,
    won: existingScore.won,
    guesses: evaluatedGuesses,
  });
}
