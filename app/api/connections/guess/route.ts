import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabase-server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const MAX_MISTAKES = 4;

type Group = { label: string; difficulty: string; words: string[] };

const norm = (w: string) => w.trim().toUpperCase();

export async function POST(request: NextRequest) {
  // userId always comes from the session, never the client.
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = session.user.id;

  const body = await request.json();
  const { gameId, selection } = body as { gameId: string; selection: string[] };

  if (!gameId || !Array.isArray(selection)) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const picked = selection.map(norm);
  if (picked.length !== 4 || new Set(picked).size !== 4) {
    return NextResponse.json({ error: 'Select exactly 4 distinct words' }, { status: 400 });
  }

  // Fetch the puzzle server-side — the grouping never comes from the client.
  const { data: game, error: gameError } = await supabase
    .from('connections_games')
    .select('groups, is_active')
    .eq('id', gameId)
    .single();

  if (gameError || !game) {
    return NextResponse.json({ error: 'Game not found' }, { status: 404 });
  }
  if (!game.is_active) {
    return NextResponse.json({ error: 'Game is not active' }, { status: 400 });
  }

  const groups = game.groups as Group[];
  const validWords = new Set(groups.flatMap((g) => g.words.map(norm)));
  if (!picked.every((w) => validWords.has(w))) {
    return NextResponse.json({ error: 'Selection contains an unknown word' }, { status: 400 });
  }

  // Load canonical server-side state — never trust client-supplied progress.
  const { data: existingScore } = await supabaseAdmin
    .from('connections_scores')
    .select('mistakes, solved, guesses, is_complete')
    .eq('user_id', userId)
    .eq('connections_game_id', gameId)
    .single();

  if (existingScore?.is_complete) {
    return NextResponse.json({ error: 'You have already completed this game' }, { status: 409 });
  }

  const solved: number[] = existingScore?.solved ?? [];
  let mistakes: number = existingScore?.mistakes ?? 0;
  const guesses: string[][] = existingScore?.guesses ?? [];

  const solvedWords = new Set(solved.flatMap((i) => groups[i].words.map(norm)));
  if (picked.some((w) => solvedWords.has(w))) {
    return NextResponse.json({ error: 'Selection includes an already-solved word' }, { status: 400 });
  }

  // Evaluate against the unsolved groups only.
  const pickedSet = new Set(picked);
  let matchedIndex = -1;
  let maxOverlap = 0;
  groups.forEach((g, i) => {
    if (solved.includes(i)) return;
    const overlap = g.words.reduce((n, w) => n + (pickedSet.has(norm(w)) ? 1 : 0), 0);
    if (overlap === 4) matchedIndex = i;
    if (overlap > maxOverlap) maxOverlap = overlap;
  });

  const correct = matchedIndex !== -1;
  const oneAway = !correct && maxOverlap === 3;

  const newSolved = correct ? [...solved, matchedIndex] : solved;
  if (!correct) mistakes += 1;
  const newGuesses = [...guesses, picked];

  const won = newSolved.length === 4;
  const lost = mistakes >= MAX_MISTAKES;
  const gameOver = won || lost;
  const points = won ? 5 - mistakes : 0;

  try {
    await supabaseAdmin.from('connections_scores').upsert(
      {
        user_id: userId,
        connections_game_id: gameId,
        mistakes,
        solved: newSolved,
        guesses: newGuesses,
        points,
        won,
        is_complete: gameOver,
      },
      { onConflict: 'user_id,connections_game_id' }
    );
  } catch (err) {
    console.error('Error saving connections score:', err);
  }

  return NextResponse.json({
    correct,
    oneAway,
    group: correct
      ? {
          index: matchedIndex,
          label: groups[matchedIndex].label,
          difficulty: groups[matchedIndex].difficulty,
          words: groups[matchedIndex].words,
        }
      : undefined,
    mistakes,
    solved: newSolved,
    gameOver,
    won,
    // Reveal the full solution only when the game is lost.
    solution: lost
      ? groups.map((g, i) => ({ index: i, label: g.label, difficulty: g.difficulty, words: g.words }))
      : undefined,
  });
}
