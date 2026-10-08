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
  const { action, sessionId } = body as { action: string; sessionId?: string };

  if (action === 'create') {
    const { error } = await supabaseAdmin.from('snake_games').insert({ is_active: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  if (!sessionId) return NextResponse.json({ error: 'sessionId required' }, { status: 400 });

  if (action === 'activate') {
    await supabaseAdmin.from('snake_games').update({ is_active: false }).neq('id', sessionId);
    const { error } = await supabaseAdmin.from('snake_games').update({ is_active: true }).eq('id', sessionId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  if (action === 'deactivate') {
    const { error } = await supabaseAdmin.from('snake_games').update({ is_active: false }).eq('id', sessionId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  if (action === 'delete') {
    const { error } = await supabaseAdmin.from('snake_games').delete().eq('id', sessionId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
