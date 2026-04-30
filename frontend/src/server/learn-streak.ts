import { prisma } from '@/server/prisma';

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export async function bumpLearnStreak(userId: string) {
  const today = startOfDay(new Date());

  const cur = await prisma.learnStreak.findUnique({ where: { userId } });
  const last = cur?.lastDate ? startOfDay(cur.lastDate) : null;

  let nextCount = cur?.count ?? 0;
  if (!last) nextCount = 1;
  else {
    const diffDays = Math.round((today.getTime() - last.getTime()) / 86400000);
    if (diffDays === 0) nextCount = cur!.count;
    else if (diffDays === 1) nextCount = (cur!.count ?? 0) + 1;
    else nextCount = 1;
  }

  await prisma.learnStreak.upsert({
    where: { userId },
    create: { userId, count: nextCount, lastDate: today },
    update: { count: nextCount, lastDate: today },
  });

  if (nextCount >= 3) {
    await prisma.userBadge.upsert({
      where: { userId_key: { userId, key: 'STREAK_3_DAYS' } },
      create: { userId, key: 'STREAK_3_DAYS' },
      update: {},
    });
  }

  return { count: nextCount, lastDate: today };
}
