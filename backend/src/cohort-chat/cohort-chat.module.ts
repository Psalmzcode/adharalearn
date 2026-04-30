import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { Controller, Get, Post, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Module } from '@nestjs/common';

export class SendCohortMessageDto {
  @ApiProperty() @IsString() text: string;
}

@Injectable()
export class CohortChatService {
  constructor(private prisma: PrismaService) {}

  async getMessages(cohortId: string, limit = 100) {
    return this.prisma.cohortMessage.findMany({
      where: { cohortId },
      include: {
        sender: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, role: true } },
      },
      orderBy: { sentAt: 'asc' },
      take: limit,
    });
  }

  async send(userId: string, cohortId: string, dto: SendCohortMessageDto) {
    // Verify sender belongs to this cohort (or is facilitator/admin)
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new ForbiddenException('User not found');

    if (user.role === 'LEARNER') {
      const enrollment = await this.prisma.enrollment.findFirst({
        where: { learner: { userId }, cohortId, status: 'ACTIVE' },
      });
      if (!enrollment) throw new ForbiddenException('Not enrolled in this cohort');
    }

    return this.prisma.cohortMessage.create({
      data: { cohortId, senderId: userId, text: dto.text },
      include: {
        sender: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, role: true } },
      },
    });
  }
}

@ApiTags('Cohort Chat')
@ApiBearerAuth()
@Controller('cohort-chat')
export class CohortChatController {
  constructor(private cohortChatService: CohortChatService) {}

  @Get(':cohortId')
  @Roles(Role.LEARNER, Role.FACILITATOR, Role.ADMIN)
  getMessages(@Param('cohortId') cohortId: string) {
    return this.cohortChatService.getMessages(cohortId);
  }

  @Post(':cohortId')
  @Roles(Role.LEARNER, Role.FACILITATOR, Role.ADMIN)
  send(
    @CurrentUser('id') userId: string,
    @Param('cohortId') cohortId: string,
    @Body() dto: SendCohortMessageDto,
  ) {
    return this.cohortChatService.send(userId, cohortId, dto);
  }
}

@Module({ controllers: [CohortChatController], providers: [CohortChatService], exports: [CohortChatService] })
export class CohortChatModule {}
