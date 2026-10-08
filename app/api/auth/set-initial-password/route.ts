import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  const { username, password, token } = await request.json();

  if (!username || !password || !token) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
  }

  const db = getDb();

  const { rows: users } = await db.query(
    `SELECT id, "resetToken", "resetTokenExpiresAt" FROM "user" WHERE username = $1`,
    [username.trim().toLowerCase()]
  );

  // Use a generic error message to avoid confirming whether a username exists
  const invalidTokenError = NextResponse.json({ error: 'Invalid or expired reset token' }, { status: 400 });

  if (users.length === 0) return invalidTokenError;

  const user = users[0];

  if (!user.resetToken || user.resetToken !== token) return invalidTokenError;
  if (!user.resetTokenExpiresAt || new Date(user.resetTokenExpiresAt) < new Date()) {
    return invalidTokenError;
  }

  const { rows: accounts } = await db.query(
    `SELECT id FROM account WHERE "userId" = $1 AND "providerId" = 'credential'`,
    [user.id]
  );
  if (accounts.length > 0) {
    return NextResponse.json({ error: 'Password already set — please log in normally' }, { status: 409 });
  }

  const hash = await bcrypt.hash(password, 10);
  await db.query(
    `INSERT INTO account (id, "userId", "accountId", "providerId", password, "createdAt", "updatedAt")
     VALUES ($1, $2, $3, 'credential', $4, NOW(), NOW())`,
    [crypto.randomUUID(), user.id, user.id, hash]
  );

  // Consume the token so it cannot be reused
  await db.query(
    `UPDATE "user" SET "resetToken" = NULL, "resetTokenExpiresAt" = NULL WHERE id = $1`,
    [user.id]
  );

  return NextResponse.json({ success: true });
}
