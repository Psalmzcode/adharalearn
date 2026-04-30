import { Injectable, ForbiddenException } from '@nestjs/common';
import { IsString, IsOptional, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Module } from '@nestjs/common';

export class CreateWeeklyReportDto {
  @ApiProperty() @IsString() cohortId: string;
  @ApiProperty() @IsString() week: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() sessionCount?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() avgAttendance?: string;
  @ApiProperty() @IsString() summary: string;
  @ApiPropertyOptional() @IsOptional() @IsString() flaggedLearners?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() nextWeekPlan?: string;
}

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async submitWeekly(userId: string, dto: CreateWeeklyReportDto) {
    const facilitator = await this.prisma.facilitatorProfile.findUnique({ where: { userId } });
    if (!facilitator) throw new ForbiddenException('Facilitator profile not found');
    return this.prisma.weeklyReport.create({ data: { ...dto, facilitatorId: facilitator.id } });
  }

  getWeekly(cohortId?: string) {
    return this.prisma.weeklyReport.findMany({
      where: cohortId ? { cohortId } : {},
      include: {
        facilitator: { include: { user: { select: { firstName: true, lastName: true, avatarUrl: true } } } },
      },
      orderBy: { submittedAt: 'desc' },
    });
  }

  async getPlatformAnalytics() {
    const [learners, active, facilitators, cohorts, activeCohorts, revenue, certs, scholarships] =
      await Promise.all([
        this.prisma.learnerProfile.count(),
        this.prisma.enrollment.count({ where: { status: 'ACTIVE' } }),
        this.prisma.facilitatorProfile.count(),
        this.prisma.cohort.count(),
        this.prisma.cohort.count({ where: { status: 'ACTIVE' } }),
        this.prisma.payment.aggregate({ where: { status: 'SUCCESS' }, _sum: { amount: true }, _count: true }),
        this.prisma.certificate.count(),
        this.prisma.scholarship.aggregate({ where: { status: 'DISBURSED' }, _sum: { amount: true }, _count: true }),
      ]);
    const learnerTypeBreakdownRows = await this.prisma.learnerProfile.groupBy({
      by: ['learnerType'],
      _count: { _all: true },
    });

    const trackBreakdown = await this.prisma.track.findMany({
      include: { _count: { select: { cohorts: true } }, cohorts: { include: { _count: { select: { enrollments: true } } } } },
    });

    return {
      learners: { total: learners, active },
      facilitators,
      cohorts: { total: cohorts, active: activeCohorts },
      revenue: { total: revenue._sum.amount ?? 0, count: revenue._count },
      certificates: certs,
      scholarships: { count: scholarships._count, total: scholarships._sum.amount ?? 0 },
      tracks: trackBreakdown.map((t) => ({
        name: t.name,
        cohorts: t._count.cohorts,
        enrollments: t.cohorts.reduce((s, c) => s + c._count.enrollments, 0),
      })),
      learnerTypes: learnerTypeBreakdownRows.map((r) => ({
        type: r.learnerType,
        count: r._count._all,
      })),
    };
  }
}

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Post('weekly')
  @Roles(Role.FACILITATOR)
  submitWeekly(@CurrentUser('id') userId: string, @Body() dto: CreateWeeklyReportDto) {
    return this.reportsService.submitWeekly(userId, dto);
  }

  @Get('weekly')
  @Roles(Role.ADMIN, Role.FACILITATOR)
  getWeekly(@Query('cohortId') cohortId: string) {
    return this.reportsService.getWeekly(cohortId);
  }

  @Get('platform')
  @Roles(Role.ADMIN)
  getPlatform() {
    return this.reportsService.getPlatformAnalytics();
  }
}

@Module({ controllers: [ReportsController], providers: [ReportsService], exports: [ReportsService] })
export class ReportsModule {}
