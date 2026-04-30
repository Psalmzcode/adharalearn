import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnnouncementsService {
  constructor(private prisma: PrismaService) {}

  findAll(cohortId?: string, audience?: string) {
    return this.prisma.announcement.findMany({
      where: {
        ...(cohortId && { cohortId }),
        ...(audience && { audience }),
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  create(data: { cohortId?: string; title: string; body: string; audience?: string }) {
    return this.prisma.announcement.create({ data: { ...data, audience: data.audience ?? 'ALL' } });
  }

  remove(id: string) {
    return this.prisma.announcement.delete({ where: { id } });
  }
}
