import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export class CreateEnrollmentDto {
  learnerId: string;
  cohortId: string;
  paymentPlan?: string; // FULL | INSTALMENT
}

@Injectable()
export class EnrollmentsService {
  constructor(private prisma: PrismaService) {}

  findAll(cohortId?: string, status?: string) {
    return this.prisma.enrollment.findMany({
      where: {
        ...(cohortId && { cohortId }),
        ...(status && { status: status as any }),
      },
      include: {
        learner: { include: { user: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } } } },
        cohort: { include: { track: { select: { name: true, slug: true } } } },
        payments: { orderBy: { createdAt: 'desc' } },
      },
      orderBy: { appliedAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id },
      include: {
        learner: { include: { user: true } },
        cohort: { include: { track: true, facilitator: { include: { user: true } } } },
        payments: true,
      },
    });
    if (!enrollment) throw new NotFoundException('Enrollment not found');
    return enrollment;
  }

  findMine(userId: string) {
    return this.prisma.enrollment.findMany({
      where: { learner: { userId } },
      include: {
        cohort: {
          include: {
            track: true,
            facilitator: { include: { user: { select: { firstName: true, lastName: true, avatarUrl: true } } } },
          },
        },
        payments: true,
      },
    });
  }

  async create(dto: CreateEnrollmentDto) {
    const existing = await this.prisma.enrollment.findUnique({
      where: { learnerId_cohortId: { learnerId: dto.learnerId, cohortId: dto.cohortId } },
    });
    if (existing) throw new ConflictException('Already enrolled in this cohort');
    return this.prisma.enrollment.create({ data: dto });
  }

  // Admin approve: PENDING → ACTIVE
  async approve(id: string) {
    await this.findOne(id);
    return this.prisma.enrollment.update({
      where: { id },
      data: { status: 'ACTIVE', startedAt: new Date() },
    });
  }

  // Admin reject / withdraw
  async withdraw(id: string) {
    await this.findOne(id);
    return this.prisma.enrollment.update({ where: { id }, data: { status: 'WITHDRAWN' } });
  }

  async complete(id: string) {
    await this.findOne(id);
    return this.prisma.enrollment.update({
      where: { id },
      data: { status: 'COMPLETED', completedAt: new Date() },
    });
  }

  async updateProgress(learnerId: string, cohortId: string, progress: number) {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { learnerId_cohortId: { learnerId, cohortId } },
    });
    if (!enrollment) throw new NotFoundException('Enrollment not found');
    return this.prisma.enrollment.update({
      where: { id: enrollment.id },
      data: { progress: Math.min(100, Math.max(0, progress)) },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.enrollment.delete({ where: { id } });
  }
}
