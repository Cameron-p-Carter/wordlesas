import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(request: NextRequest) {
  const username = request.nextUrl.searchParams.get('username');
  if (!username) return NextResponse.json({ error: 'Username required' }, { status: 400 });

  const db = getDb();

  const { rows: users } = await db.query(
    `SELECT id FROM "user" WHERE username = $1`,
    [username.trim()]
  );

  if (users.length === 0) return NextResponse.json({ exists: false });

  const { rows: accounts } = await db.query(
    `SELECT id FROM account WHERE "userId" = $1 AND "providerId" = 'credential'`,
    [users[0].id]
  );

  return NextResponse.json({ exists: true, hasPassword: accounts.length > 0 });
}
