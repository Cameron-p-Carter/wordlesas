import { betterAuth } from 'better-auth';
import { username } from 'better-auth/plugins';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

export const auth = betterAuth({
  database: new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:3000',
  plugins: [username()],
  emailAndPassword: {
    enabled: true,
    password: {
      hash: (password: string) => bcrypt.hash(password, 10),
      verify: ({ hash, password }: { hash: string; password: string }) =>
        bcrypt.compare(password, hash),
    },
  },
  user: {
    additionalFields: {
      isAdmin: { type: 'boolean', defaultValue: false, input: false },
    },
  },
});
