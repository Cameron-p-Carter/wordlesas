import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase-server';

const DIFFICULTIES = ['yellow', 'green', 'blue', 'purple'] as const;
type Difficulty = (typeof DIFFICULTIES)[number];

type IncomingGroup = { label?: string; difficulty?: string; words?: string[] };

async function requireAdmin(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user || !(session.user as any).isAdmin) return null;
  return session;
}

function validateGroups(groups: IncomingGroup[]): { ok: true; clean: { label: string; difficulty: Difficulty; words: string[] }[] } | { ok: false; error: string } {
  if (!Array.isArray(groups) || groups.length !== 4) {
    return { ok: false, error: 'Exactly 4 groups are required' };
  }

  const clean: { label: string; difficulty: Difficulty; words: string[] }[] = [];
  const seenDifficulties = new Set<string>();
  const seenWords = new Set<string>();

  for (const group of groups) {
    const label = (group.label ?? '').trim();
    const difficulty = (group.difficulty ?? '').trim() as Difficulty;
    const words = (group.words ?? []).map((w) => (w ?? '').trim()).filter(Boolean);

    if (!label) return { ok: false, error: 'Every group needs a category label' };
    if (!DIFFICULTIES.includes(difficulty)) {
      return { ok: false, error: `Invalid difficulty "${group.difficulty}"` };
    }
    if (seenDifficulties.has(difficulty)) {
      return { ok: false, error: `Duplicate difficulty "${difficulty}" — use one of each color` };
    }
    seenDifficulties.add(difficulty);

    if (words.length !== 4) {
      return { ok: false, error: `Group "${label}" must have exactly 4 words` };
    }
    for (const w of words) {
      const key = w.toUpperCase();
      if (seenWords.has(key)) {
        return { ok: false, error: `Duplicate word "${w}" — all 16 words must be unique` };
      }
      seenWords.add(key);
    }

    clean.push({ label, difficulty, words });
  }

  return { ok: true, clean };
}

export async function POST(request: NextRequest) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { action, gameId, groups } = body as {
    action: string;
    gameId?: string;
    groups?: IncomingGroup[];
  };

  if (action === 'create') {
    const result = validateGroups(groups ?? []);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    const { error } = await supabaseAdmin
      .from('connections_games')
      .insert({ groups: result.clean, is_active: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  if (!gameId) return NextResponse.json({ error: 'gameId required' }, { status: 400 });

  if (action === 'activate') {
    await supabaseAdmin.from('connections_games').update({ is_active: false }).neq('id', gameId);
    const { error } = await supabaseAdmin.from('connections_games').update({ is_active: true }).eq('id', gameId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  if (action === 'deactivate') {
    const { error } = await supabaseAdmin.from('connections_games').update({ is_active: false }).eq('id', gameId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  if (action === 'delete') {
    const { error } = await supabaseAdmin.from('connections_games').delete().eq('id', gameId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
