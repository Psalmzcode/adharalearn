import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export class CreateSessionDto {
  cohortId: string;
  facilitatorId: string;
  title: string;
  type?: string;
  scheduledAt: string;
  durationMins?: number;
  zoomLink?: string;
}

@Injectable()
export class SessionsService {
  constructor(private prisma: PrismaService) {}

  findByCohort(cohortId: string) {
    return this.prisma.session.findMany({
      where: { cohortId },
      include: {
        facilitator: { include: { user: { select: { firstName: true, lastName: true, avatarUrl: true } } } },
        _count: { select: { attendance: true } },
      },
      orderBy: { scheduledAt: 'asc' },
    });
  }

  async findOne(id: string) {
    const session = await this.prisma.session.findUnique({
      where: { id },
      include: {
        facilitator: { include: { user: { select: { firstName: true, lastName: true } } } },
        attendance: {
          include: { learner: { include: { user: { select: { firstName: true, lastName: true, avatarUrl: true } } } } },
        },
      },
    });
    if (!session) throw new NotFoundException('Session not found');
    return session;
  }

  create(dto: CreateSessionDto) {
    return this.prisma.session.create({
      data: {
        title: dto.title,
        type: (dto.type as any) ?? 'LIVE',
        cohort: { connect: { id: dto.cohortId } },
        facilitator: { connect: { id: dto.facilitatorId } },
        scheduledAt: new Date(dto.scheduledAt),
        ...(dto.durationMins !== undefined && { durationMins: dto.durationMins }),
        ...(dto.zoomLink !== undefined && { zoomLink: dto.zoomLink }),
      },
    });
  }

  async update(id: string, dto: Partial<CreateSessionDto>) {
    await this.findOne(id);
    return this.prisma.session.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.type !== undefined && { type: dto.type as any }),
        ...(dto.cohortId !== undefined && { cohort: { connect: { id: dto.cohortId } } }),
        ...(dto.facilitatorId !== undefined && { facilitator: { connect: { id: dto.facilitatorId } } }),
        ...(dto.scheduledAt && { scheduledAt: new Date(dto.scheduledAt) }),
        ...(dto.durationMins !== undefined && { durationMins: dto.durationMins }),
        ...(dto.zoomLink !== undefined && { zoomLink: dto.zoomLink }),
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.session.delete({ where: { id } });
  }

  async bulkMarkAttendance(sessionId: string, records: { learnerId: string; present: boolean }[]) {
    return Promise.all(
      records.map((r) =>
        this.prisma.attendanceRecord.upsert({
          where: { learnerId_sessionId: { learnerId: r.learnerId, sessionId } },
          create: { learnerId: r.learnerId, sessionId, present: r.present, joinedAt: r.present ? new Date() : undefined },
          update: { present: r.present },
        }),
      ),
    );
  }

  markAttendance(sessionId: string, learnerId: string, present: boolean) {
    return this.prisma.attendanceRecord.upsert({
      where: { learnerId_sessionId: { learnerId, sessionId } },
      create: { learnerId, sessionId, present, joinedAt: present ? new Date() : undefined },
      update: { present },
    });
  }

  getMyAttendance(userId: string) {
    return this.prisma.attendanceRecord.findMany({
      where: { learner: { userId } },
      include: { session: { select: { id: true, title: true, scheduledAt: true, cohortId: true } } },
      orderBy: { session: { scheduledAt: 'desc' } },
    });
  }

  async getAttendanceSummary(cohortId: string) {
    const sessions = await this.prisma.session.findMany({ where: { cohortId }, select: { id: true } });
    const sessionIds = sessions.map((s) => s.id);
    const records = await this.prisma.attendanceRecord.findMany({
      where: { sessionId: { in: sessionIds } },
      include: { learner: { include: { user: { select: { firstName: true, lastName: true } } } } },
    });
    // Group by learner
    const byLearner: Record<string, { name: string; attended: number; total: number }> = {};
    for (const r of records) {
      const key = r.learnerId;
      if (!byLearner[key]) {
        byLearner[key] = {
          name: `${r.learner.user.firstName} ${r.learner.user.lastName}`,
          attended: 0,
          total: sessionIds.length,
        };
      }
      if (r.present) byLearner[key].attended++;
    }
    return Object.entries(byLearner).map(([learnerId, v]) => ({
      learnerId,
      ...v,
      pct: v.total ? Math.round((v.attended / v.total) * 100) : 0,
    }));
  }
}
