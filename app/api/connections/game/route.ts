import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Group = { label: string; difficulty: string; words: string[] };

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const requestedUserId = searchParams.get('userId');

  const { data: activeGame, error: gameError } = await supabase
    .from('connections_games')
    .select('id, groups, is_active, created_at')
    .eq('is_active', true)
    .single();

  if (gameError || !activeGame) {
    return NextResponse.json({ error: 'No active game' }, { status: 404 });
  }

  const groups = activeGame.groups as Group[];
  // The 16 words are visible to the player; the grouping is the secret.
  const words = shuffle(groups.flatMap((g) => g.words));

  const base = { game: { id: activeGame.id }, words };

  if (!requestedUserId) {
    return NextResponse.json(base);
  }

  // Require a valid session that matches the requested user.
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user || session.user.id !== requestedUserId) {
    return NextResponse.json(base);
  }

  const { data: existingScore } = await supabase
    .from('connections_scores')
    .select('*')
    .eq('user_id', session.user.id)
    .eq('connections_game_id', activeGame.id)
    .single();

  if (!existingScore) {
    return NextResponse.json(base);
  }

  const revealGroup = (index: number) => ({
    index,
    label: groups[index].label,
    difficulty: groups[index].difficulty,
    words: groups[index].words,
  });

  if (!existingScore.is_complete) {
    // In progress: reveal only the groups already solved.
    const solved = (existingScore.solved as number[]) ?? [];
    return NextResponse.json({
      ...base,
      inProgress: true,
      mistakes: existingScore.mistakes,
      solvedGroups: solved.map(revealGroup),
    });
  }

  // Complete: reveal the full solution so the finished board renders.
  return NextResponse.json({
    ...base,
    alreadyPlayed: true,
    won: existingScore.won,
    mistakes: existingScore.mistakes,
    solvedGroups: groups.map((_, i) => revealGroup(i)),
  });
}
