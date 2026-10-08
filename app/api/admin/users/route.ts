import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase-server';

async function requireAdmin(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user || !(session.user as any).isAdmin) return null;
  return session;
}

export async function POST(request: NextRequest) {
  const session = await requireAdmin(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { action, userId, isAdmin: targetIsAdmin } = body as {
    action: string;
    userId?: string;
    isAdmin?: boolean;
  };

  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

  if (action === 'toggleAdmin') {
    const { error } = await supabaseAdmin
      .from('user')
      .update({ isAdmin: targetIsAdmin })
      .eq('id', userId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  if (action === 'delete') {
    if (userId === session.user.id) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
    }
    const { error } = await supabaseAdmin.from('user').delete().eq('id', userId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
