import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { userId, gameId, foodEaten } = body as {
    userId: string;
    gameId: string;
    foodEaten: number;
  };

  if (!userId || !gameId || foodEaten === undefined) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const { data: game, error: gameError } = await supabase
    .from('snake_games')
    .select('is_active')
    .eq('id', gameId)
    .single();

  if (gameError || !game) {
    return NextResponse.json({ error: 'Game not found' }, { status: 404 });
  }

  if (!game.is_active) {
    return NextResponse.json({ error: 'Game is not active' }, { status: 400 });
  }

  const { error } = await supabase.from('snake_scores').insert({
    user_id: userId,
    snake_game_id: gameId,
    food_eaten: foodEaten,
  });

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Already played this session' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
