import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  const { username, password } = await request.json();

  if (!username || !password) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
  }

  const db = getDb();

  const { rows: users } = await db.query(
    `SELECT id FROM "user" WHERE username = $1`,
    [username.trim().toLowerCase()]
  );
  if (users.length === 0) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const userId = users[0].id;

  const { rows: accounts } = await db.query(
    `SELECT id FROM account WHERE "userId" = $1 AND "providerId" = 'credential'`,
    [userId]
  );
  if (accounts.length > 0) {
    return NextResponse.json({ error: 'Password already set — please log in normally' }, { status: 409 });
  }

  const hash = await bcrypt.hash(password, 10);
  await db.query(
    `INSERT INTO account (id, "userId", "accountId", "providerId", password, "createdAt", "updatedAt")
     VALUES ($1, $2, $3, 'credential', $4, NOW(), NOW())`,
    [crypto.randomUUID(), userId, userId, hash]
  );

  return NextResponse.json({ success: true });
}
