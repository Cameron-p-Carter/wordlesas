import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  const { data: activeGame, error: gameError } = await supabase
    .from('snake_games')
    .select('id, is_active, created_at')
    .eq('is_active', true)
    .single();

  if (gameError || !activeGame) {
    return NextResponse.json({ error: 'No active snake game' }, { status: 404 });
  }

  if (!userId) {
    return NextResponse.json({ game: activeGame });
  }

  const { data: existingScore } = await supabase
    .from('snake_scores')
    .select('*')
    .eq('user_id', userId)
    .eq('snake_game_id', activeGame.id)
    .single();

  if (existingScore) {
    return NextResponse.json({
      game: activeGame,
      alreadyPlayed: true,
      foodEaten: existingScore.food_eaten,
    });
  }

  return NextResponse.json({ game: activeGame });
}
