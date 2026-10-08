import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session?.user || !(session.user as any).isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { userId } = await request.json();
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

  const db = getDb();

  await db.query(
    `DELETE FROM account WHERE "userId" = $1 AND "providerId" = 'credential'`,
    [userId]
  );

  // Generate a one-time token valid for 30 minutes
  const tokenBytes = new Uint8Array(32);
  crypto.getRandomValues(tokenBytes);
  const token = Buffer.from(tokenBytes).toString('hex');
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

  await db.query(
    `UPDATE "user" SET "resetToken" = $1, "resetTokenExpiresAt" = $2 WHERE id = $3`,
    [token, expiresAt, userId]
  );

  return NextResponse.json({ success: true, resetToken: token });
}
