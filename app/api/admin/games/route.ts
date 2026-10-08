import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase-server';

async function requireAdmin(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user || !(session.user as any).isAdmin) return null;
  return session;
}

export async function POST(request: NextRequest) {
  if (!await requireAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { action, gameId, word } = body as {
    action: string;
    gameId?: string;
    word?: string;
  };

  if (action === 'create') {
    if (!word || word.length !== 5) {
      return NextResponse.json({ error: 'Word must be exactly 5 letters' }, { status: 400 });
    }
    const { error } = await supabaseAdmin.from('games').insert({ word: word.toUpperCase(), is_active: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  if (!gameId) return NextResponse.json({ error: 'gameId required' }, { status: 400 });

  if (action === 'activate') {
    await supabaseAdmin.from('games').update({ is_active: false }).neq('id', gameId);
    const { error } = await supabaseAdmin.from('games').update({ is_active: true }).eq('id', gameId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  if (action === 'deactivate') {
    const { error } = await supabaseAdmin.from('games').update({ is_active: false }).eq('id', gameId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  if (action === 'delete') {
    const { error } = await supabaseAdmin.from('games').delete().eq('id', gameId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
