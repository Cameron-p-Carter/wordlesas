import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabase-server';

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
  // Verify session — userId always comes from the session, never the client
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = session.user.id;

  const body = await request.json();
  const { guess, gameId } = body as { guess: string; gameId: string };

  if (!guess || !gameId) {
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

  // Load server-side guess history — do not trust client-supplied previous guesses
  const { data: existingScore } = await supabaseAdmin
    .from('scores')
    .select('guesses, is_complete')
    .eq('user_id', userId)
    .eq('game_id', gameId)
    .single();

  if (existingScore?.is_complete) {
    return NextResponse.json({ error: 'You have already completed this game' }, { status: 409 });
  }

  const previousGuesses: string[] = existingScore?.guesses ?? [];
  if (previousGuesses.length >= 5) {
    return NextResponse.json({ error: 'Maximum guesses reached' }, { status: 400 });
  }

  const evaluation = evaluateGuess(guess, game.word);
  const isCorrect = guess.toUpperCase() === game.word.toUpperCase();
  const allGuesses = [...previousGuesses, guess];
  const isLastGuess = allGuesses.length === 5;
  const gameOver = isCorrect || isLastGuess;

  let points = 0;
  if (gameOver && isCorrect) {
    points = 6 - allGuesses.length;
  }

  // Upsert on every guess so the server always holds the canonical state
  try {
    await supabaseAdmin.from('scores').upsert({
      user_id: userId,
      game_id: gameId,
      guesses_count: allGuesses.length,
      points,
      guesses: allGuesses,
      won: isCorrect,
      is_complete: gameOver,
    }, { onConflict: 'user_id,game_id' });
  } catch (err) {
    console.error('Error saving score:', err);
  }

  return NextResponse.json({
    evaluation,
    won: isCorrect,
    gameOver,
    word: gameOver && !isCorrect ? game.word.toUpperCase() : undefined,
  });
}
