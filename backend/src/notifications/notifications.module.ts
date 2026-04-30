import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Module } from '@nestjs/common';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async getForUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        learnerProfile: { include: { enrollments: { select: { cohortId: true }, where: { status: 'ACTIVE' } } } },
        facilitatorProfile: { include: { cohorts: { select: { id: true }, where: { status: 'ACTIVE' } } } },
      },
    });
    if (!user) throw new NotFoundException('User not found');

    const cohortIds = user.role === 'LEARNER'
      ? (user.learnerProfile?.enrollments.map((e) => e.cohortId) ?? [])
      : (user.facilitatorProfile?.cohorts.map((c) => c.id) ?? []);

    return this.prisma.announcement.findMany({
      where: {
        OR: [
          { cohortId: null, audience: 'ALL' },
          ...(cohortIds.length > 0 ? [{ cohortId: { in: cohortIds } }] : []),
          ...(user.role === 'LEARNER' ? [{ audience: 'LEARNERS', cohortId: { in: cohortIds } }] : []),
          ...(user.role === 'FACILITATOR' ? [{ audience: 'FACILITATORS' }] : []),
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });
  }
}

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @Get()
  @Roles(Role.LEARNER, Role.FACILITATOR, Role.ADMIN)
  getMyNotifications(@CurrentUser('id') userId: string) {
    return this.notificationsService.getForUser(userId);
  }
}

@Module({ controllers: [NotificationsController], providers: [NotificationsService], exports: [NotificationsService] })
export class NotificationsModule {}
