import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma =
  global.__prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    datasources: process.env.DATABASE_URL
      ? { db: { url: process.env.DATABASE_URL.replace(/^'+|'+$/g, '') } }
      : undefined,
  });

if (process.env.NODE_ENV !== 'production') global.__prisma = prisma;

