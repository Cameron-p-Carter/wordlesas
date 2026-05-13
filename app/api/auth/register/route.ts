import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  const { username, password } = await request.json();

  if (!username?.trim() || !password) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
  }

  const db = getDb();
  const name = username.trim();

  const { rows: existing } = await db.query(
    `SELECT id FROM "user" WHERE username = $1`,
    [name]
  );
  if (existing.length > 0) {
    return NextResponse.json({ error: 'Username already taken' }, { status: 409 });
  }

  const userId = crypto.randomUUID();
  await db.query(
    `INSERT INTO "user" (id, name, username, "isAdmin", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, false, NOW(), NOW())`,
    [userId, name, name]
  );

  const hash = await bcrypt.hash(password, 10);
  await db.query(
    `INSERT INTO account (id, "userId", "accountId", "providerId", password, "createdAt", "updatedAt")
     VALUES ($1, $2, $3, 'credential', $4, NOW(), NOW())`,
    [crypto.randomUUID(), userId, userId, hash]
  );

  return NextResponse.json({ success: true });
}
