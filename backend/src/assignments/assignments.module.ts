import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { IsString, IsOptional, IsDateString, IsNumber, IsBoolean, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import {
  Controller, Get, Post, Put, Delete,
  Param, Body, Query, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Module } from '@nestjs/common';

// ── DTOs ─────────────────────────────────────────────────────────────────────
export class CreateAssignmentDto {
  @ApiProperty() @IsString() cohortId: string;
  @ApiPropertyOptional() @IsOptional() @IsString() moduleId?: string;
  @ApiProperty() @IsString() title: string;
  @ApiProperty() @IsString() description: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() dueAt?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(1) maxScore?: number;
}

export class UpdateAssignmentDto {
  @ApiPropertyOptional() @IsOptional() @IsString() title?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() dueAt?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() maxScore?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isPublished?: boolean;
}

export class SubmitAssignmentDto {
  @ApiProperty() @IsString() assignmentId: string;
  @ApiPropertyOptional() @IsOptional() @IsString() repoUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() deployedUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

// ── SERVICE ───────────────────────────────────────────────────────────────────
@Injectable()
export class AssignmentsService {
  constructor(private prisma: PrismaService) {}

  findByCohort(cohortId: string, publishedOnly = false) {
    return this.prisma.assignment.findMany({
      where: { cohortId, ...(publishedOnly && { isPublished: true }) },
      include: {
        module: { select: { title: true, order: true } },
        _count: { select: { submissions: true } },
      },
      orderBy: { dueAt: 'asc' },
    });
  }

  async findOne(id: string) {
    const a = await this.prisma.assignment.findUnique({
      where: { id },
      include: {
        module: { select: { title: true, order: true } },
        submissions: {
          include: {
            learner: { include: { user: { select: { firstName: true, lastName: true, avatarUrl: true } } } },
            grade: true,
          },
        },
      },
    });
    if (!a) throw new NotFoundException('Assignment not found');
    return a;
  }

  create(dto: CreateAssignmentDto) {
    return this.prisma.assignment.create({
      data: {
        ...dto,
        ...(dto.dueAt && { dueAt: new Date(dto.dueAt) }),
      },
    });
  }

  async update(id: string, dto: UpdateAssignmentDto) {
    await this.findOne(id);
    return this.prisma.assignment.update({
      where: { id },
      data: {
        ...dto,
        ...(dto.dueAt && { dueAt: new Date(dto.dueAt) }),
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.assignment.delete({ where: { id } });
  }

  async submit(userId: string, dto: SubmitAssignmentDto) {
    const learner = await this.prisma.learnerProfile.findUnique({ where: { userId } });
    if (!learner) throw new ForbiddenException('Learner profile not found');

    return this.prisma.submission.upsert({
      where: { learnerId_assignmentId: { learnerId: learner.id, assignmentId: dto.assignmentId } },
      create: {
        learnerId: learner.id,
        assignmentId: dto.assignmentId,
        repoUrl: dto.repoUrl,
        deployedUrl: dto.deployedUrl,
        notes: dto.notes,
        status: 'SUBMITTED',
        submittedAt: new Date(),
      },
      update: {
        repoUrl: dto.repoUrl,
        deployedUrl: dto.deployedUrl,
        notes: dto.notes,
        status: 'SUBMITTED',
        submittedAt: new Date(),
      },
    });
  }

  async getMySubmissions(userId: string, cohortId?: string) {
    return this.prisma.submission.findMany({
      where: {
        learner: { userId },
        ...(cohortId && { assignment: { cohortId } }),
      },
      include: {
        assignment: { select: { id: true, title: true, maxScore: true, dueAt: true, cohortId: true } },
        grade: true,
      },
      orderBy: { submittedAt: 'desc' },
    });
  }
}

// ── CONTROLLER ────────────────────────────────────────────────────────────────
@ApiTags('Assignments')
@ApiBearerAuth()
@Controller('assignments')
export class AssignmentsController {
  constructor(private assignmentsService: AssignmentsService) {}

  @Get('cohort/:cohortId')
  @Roles(Role.ADMIN, Role.FACILITATOR, Role.LEARNER)
  findByCohort(@Param('cohortId') cohortId: string, @CurrentUser('role') role: Role) {
    return this.assignmentsService.findByCohort(cohortId, role === Role.LEARNER);
  }

  @Get('submissions/me')
  @Roles(Role.LEARNER)
  getMySubmissions(@CurrentUser('id') userId: string, @Query('cohortId') cohortId: string) {
    return this.assignmentsService.getMySubmissions(userId, cohortId);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.FACILITATOR)
  findOne(@Param('id') id: string) {
    return this.assignmentsService.findOne(id);
  }

  @Post()
  @Roles(Role.ADMIN, Role.FACILITATOR)
  create(@Body() dto: CreateAssignmentDto) {
    return this.assignmentsService.create(dto);
  }

  @Post('submit')
  @Roles(Role.LEARNER)
  submit(@CurrentUser('id') userId: string, @Body() dto: SubmitAssignmentDto) {
    return this.assignmentsService.submit(userId, dto);
  }

  @Put(':id')
  @Roles(Role.ADMIN, Role.FACILITATOR)
  update(@Param('id') id: string, @Body() dto: UpdateAssignmentDto) {
    return this.assignmentsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.FACILITATOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.assignmentsService.remove(id);
  }
}

@Module({
  controllers: [AssignmentsController],
  providers: [AssignmentsService],
  exports: [AssignmentsService],
})
export class AssignmentsModule {}
