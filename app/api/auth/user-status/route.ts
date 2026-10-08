import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(request: NextRequest) {
  const username = request.nextUrl.searchParams.get('username');
  if (!username) return NextResponse.json({ error: 'Username required' }, { status: 400 });

  const db = getDb();
  const { rows: users } = await db.query(
    `SELECT id FROM "user" WHERE username = $1`,
    [username.trim().toLowerCase()]
  );

  return NextResponse.json({ exists: users.length > 0 });
}
