import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export class CreateCohortDto {
  name: string;
  trackId: string;
  facilitatorId?: string;
  startDate: string;
  endDate: string;
  maxLearners?: number;
  zoomLink?: string;
}

@Injectable()
export class CohortsService {
  constructor(private prisma: PrismaService) {}

  findAll(status?: string) {
    return this.prisma.cohort.findMany({
      where: status ? { status: status as any } : {},
      include: {
        track: true,
        facilitator: { include: { user: { select: { firstName: true, lastName: true, avatarUrl: true } } } },
        _count: { select: { enrollments: true, sessions: true } },
      },
      orderBy: { startDate: 'desc' },
    });
  }

  async findOne(id: string) {
    const cohort = await this.prisma.cohort.findUnique({
      where: { id },
      include: {
        track: true,
        facilitator: { include: { user: { select: { firstName: true, lastName: true, email: true, avatarUrl: true } } } },
        enrollments: {
          include: {
            learner: { include: { user: { select: { firstName: true, lastName: true, avatarUrl: true } } } },
            payments: true,
          },
        },
        sessions: { orderBy: { scheduledAt: 'asc' }, take: 5 },
        _count: { select: { enrollments: true, sessions: true, assignments: true } },
      },
    });
    if (!cohort) throw new NotFoundException('Cohort not found');
    return cohort;
  }

  create(dto: CreateCohortDto) {
    return this.prisma.cohort.create({
      data: {
        name: dto.name,
        track: { connect: { id: dto.trackId } },
        ...(dto.facilitatorId && { facilitator: { connect: { id: dto.facilitatorId } } }),
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        ...(dto.maxLearners !== undefined && { maxLearners: dto.maxLearners }),
        ...(dto.zoomLink !== undefined && { zoomLink: dto.zoomLink }),
      },
    });
  }

  async update(id: string, data: Partial<CreateCohortDto> & { status?: string }) {
    await this.findOne(id);
    return this.prisma.cohort.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.trackId && { track: { connect: { id: data.trackId } } }),
        ...(data.facilitatorId !== undefined && {
          facilitator: data.facilitatorId ? { connect: { id: data.facilitatorId } } : { disconnect: true },
        }),
        ...(data.startDate && { startDate: new Date(data.startDate) }),
        ...(data.endDate && { endDate: new Date(data.endDate) }),
        ...(data.maxLearners !== undefined && { maxLearners: data.maxLearners }),
        ...(data.zoomLink !== undefined && { zoomLink: data.zoomLink }),
        ...(data.status && { status: data.status as any }),
      },
    });
  }

  async remove(id: string) {
    const cohort = await this.prisma.cohort.findUnique({
      where: { id },
      include: { _count: { select: { enrollments: true } } },
    });
    if (!cohort) throw new NotFoundException('Cohort not found');
    if (cohort.status === 'ACTIVE') throw new ConflictException('Cannot delete an active cohort');
    if (cohort._count.enrollments > 0) throw new ConflictException('Cannot delete a cohort with enrolled learners');
    return this.prisma.cohort.delete({ where: { id } });
  }
}
