import { Injectable, NotFoundException } from '@nestjs/common';
import { IsString, IsOptional, IsUrl } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { Controller, Get, Put, Delete, Param, Body, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { LearnerType, Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Module } from '@nestjs/common';

// ── DTOs ─────────────────────────────────────────────────────────────────────
export class UpdateLearnerDto {
  @ApiPropertyOptional({ enum: LearnerType }) @IsOptional() learnerType?: LearnerType;
  @ApiPropertyOptional() @IsOptional() @IsString() currentStage?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() location?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() source?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() bio?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() portfolioUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() linkedInUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() githubUrl?: string;
}

// ── SERVICE ───────────────────────────────────────────────────────────────────
@Injectable()
export class LearnersService {
  constructor(private prisma: PrismaService) {}

  private LEARNER_INCLUDE = {
    user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, avatarUrl: true, createdAt: true } },
    enrollments: {
      include: {
        cohort: { include: { track: { select: { name: true, slug: true } } } },
        payments: true,
      },
    },
    certificates: true,
    _count: { select: { submissions: true, certificates: true } },
  };

  findAll(cohortId?: string, status?: string) {
    return this.prisma.learnerProfile.findMany({
      where: {
        ...(cohortId && { enrollments: { some: { cohortId } } }),
        ...(status && { enrollments: { some: { status: status as any } } }),
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } },
        enrollments: {
          include: { cohort: { include: { track: { select: { name: true } } } } },
          orderBy: { appliedAt: 'desc' },
          take: 1,
        },
        _count: { select: { submissions: true } },
      },
      orderBy: { user: { firstName: 'asc' } },
    });
  }

  async findOne(id: string) {
    const learner = await this.prisma.learnerProfile.findUnique({
      where: { id },
      include: this.LEARNER_INCLUDE,
    });
    if (!learner) throw new NotFoundException('Learner not found');
    return learner;
  }

  async findMe(userId: string) {
    const learner = await this.prisma.learnerProfile.findUnique({
      where: { userId },
      include: this.LEARNER_INCLUDE,
    });
    if (!learner) throw new NotFoundException('Learner profile not found');
    return learner;
  }

  async update(id: string, dto: UpdateLearnerDto) {
    await this.findOne(id);
    return this.prisma.learnerProfile.update({ where: { id }, data: dto });
  }

  async updateMe(userId: string, dto: UpdateLearnerDto) {
    const learner = await this.prisma.learnerProfile.findUnique({ where: { userId } });
    if (!learner) throw new NotFoundException('Learner profile not found');
    return this.prisma.learnerProfile.update({ where: { userId }, data: dto });
  }

  async updateProgress(id: string, progress: number) {
    return this.prisma.learnerProfile.update({
      where: { id },
      data: { streak: { increment: 0 }, lastActive: new Date() },
    });
  }

  async incrementStreak(userId: string) {
    return this.prisma.learnerProfile.update({
      where: { userId },
      data: { streak: { increment: 1 }, lastActive: new Date() },
    });
  }

  // At-risk: attendance < 75% OR submitted less than 50% of assignments in cohort
  async getAtRisk(cohortId: string) {
    const enrollments = await this.prisma.enrollment.findMany({
      where: { cohortId, status: 'ACTIVE' },
      include: {
        learner: {
          include: {
            user: { select: { firstName: true, lastName: true, email: true, avatarUrl: true } },
            attendance: {
              include: { session: { select: { cohortId: true } } },
              where: { session: { cohortId } },
            },
            submissions: {
              include: { assignment: { select: { cohortId: true } } },
              where: { assignment: { cohortId } },
            },
          },
        },
      },
    });

    const totalSessions = await this.prisma.session.count({ where: { cohortId } });
    const totalAssignments = await this.prisma.assignment.count({ where: { cohortId } });

    return enrollments
      .map((e) => {
        const attended = e.learner.attendance.filter((a) => a.present).length;
        const submitted = e.learner.submissions.filter((s) => s.status !== 'NOT_SUBMITTED').length;
        const attendancePct = totalSessions ? Math.round((attended / totalSessions) * 100) : 100;
        const submissionPct = totalAssignments ? Math.round((submitted / totalAssignments) * 100) : 100;
        const isAtRisk = attendancePct < 75 || submissionPct < 50;
        return {
          enrollmentId: e.id,
          learnerId: e.learner.id,
          name: `${e.learner.user.firstName} ${e.learner.user.lastName}`,
          email: e.learner.user.email,
          avatarUrl: e.learner.user.avatarUrl,
          attendancePct,
          submissionPct,
          isAtRisk,
          issues: [
            ...(attendancePct < 75 ? [`Low attendance (${attendancePct}%)`] : []),
            ...(submissionPct < 50 ? [`${totalAssignments - submitted} missing assignments`] : []),
          ],
        };
      })
      .filter((l) => l.isAtRisk);
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.learnerProfile.delete({ where: { id } });
  }
}

// ── CONTROLLER ────────────────────────────────────────────────────────────────
@ApiTags('Learners')
@ApiBearerAuth()
@Controller('learners')
export class LearnersController {
  constructor(private learnersService: LearnersService) {}

  @Get()
  @Roles(Role.ADMIN, Role.FACILITATOR)
  findAll(@Query('cohortId') cohortId: string, @Query('status') status: string) {
    return this.learnersService.findAll(cohortId, status);
  }

  @Get('me')
  @Roles(Role.LEARNER)
  findMe(@CurrentUser('id') userId: string) {
    return this.learnersService.findMe(userId);
  }

  @Get('at-risk/:cohortId')
  @Roles(Role.ADMIN, Role.FACILITATOR)
  getAtRisk(@Param('cohortId') cohortId: string) {
    return this.learnersService.getAtRisk(cohortId);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.FACILITATOR)
  findOne(@Param('id') id: string) {
    return this.learnersService.findOne(id);
  }

  @Put('me')
  @Roles(Role.LEARNER)
  updateMe(@CurrentUser('id') userId: string, @Body() dto: UpdateLearnerDto) {
    return this.learnersService.updateMe(userId, dto);
  }

  @Put('streak/increment')
  @Roles(Role.LEARNER)
  incrementStreak(@CurrentUser('id') userId: string) {
    return this.learnersService.incrementStreak(userId);
  }

  @Put(':id')
  @Roles(Role.ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateLearnerDto) {
    return this.learnersService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.learnersService.remove(id);
  }
}

// ── MODULE ────────────────────────────────────────────────────────────────────
@Module({
  controllers: [LearnersController],
  providers: [LearnersService],
  exports: [LearnersService],
})
export class LearnersModule {}
