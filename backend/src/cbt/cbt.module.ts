import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import {
  IsString, IsOptional, IsNumber, IsBoolean, IsArray,
  IsDateString, ValidateNested, Min, Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import {
  Controller, Get, Post, Put, Delete,
  Param, Body, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Module } from '@nestjs/common';

// ── DTOs ─────────────────────────────────────────────────────────────────────
export class CreateCbtSessionDto {
  @ApiProperty() @IsString() cohortId: string;
  @ApiPropertyOptional() @IsOptional() @IsString() moduleId?: string;
  @ApiProperty() @IsString() title: string;
  @ApiProperty() @IsNumber() @Min(10) durationMins: number;
  @ApiProperty() @IsNumber() totalMarks: number;
  @ApiProperty() @IsNumber() @Min(0) @Max(100) passScore: number;
  @ApiPropertyOptional() @IsOptional() @IsDateString() opensAt?: string;
}

export class CbtQuestionDto {
  @ApiProperty() @IsNumber() order: number;
  @ApiProperty() @IsString() question: string;
  @ApiProperty() @IsString() optionA: string;
  @ApiProperty() @IsString() optionB: string;
  @ApiProperty() @IsString() optionC: string;
  @ApiProperty() @IsString() optionD: string;
  @ApiProperty() @IsString() correctOption: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() marks?: number;
}

export class AddQuestionsDto {
  @ApiProperty({ type: [CbtQuestionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CbtQuestionDto)
  questions: CbtQuestionDto[];
}

export class AnswerDto {
  @ApiProperty() @IsString() questionId: string;
  @ApiProperty() @IsString() selected: string;
}

export class SubmitAttemptDto {
  @ApiProperty() @IsString() sessionId: string;
  @ApiProperty({ type: [AnswerDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AnswerDto)
  answers: AnswerDto[];
  @ApiPropertyOptional() @IsOptional() @IsNumber() timeTakenSecs?: number;
}

// ── SERVICE ───────────────────────────────────────────────────────────────────
@Injectable()
export class CbtService {
  constructor(private prisma: PrismaService) {}

  findSessionsByCohort(cohortId: string) {
    return this.prisma.cbtSession.findMany({
      where: { cohortId },
      include: {
        module: { select: { title: true, order: true } },
        _count: { select: { questions: true, attempts: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findSession(id: string, forLearner = false) {
    const session = await this.prisma.cbtSession.findUnique({
      where: { id },
      include: {
        questions: {
          select: forLearner
            ? { id: true, order: true, question: true, optionA: true, optionB: true, optionC: true, optionD: true, marks: true }
            : undefined,
          orderBy: { order: 'asc' },
        },
        _count: { select: { questions: true, attempts: true } },
      },
    });
    if (!session) throw new NotFoundException('CBT session not found');
    return session;
  }

  createSession(dto: CreateCbtSessionDto) {
    return this.prisma.cbtSession.create({
      data: {
        ...dto,
        ...(dto.opensAt && { opensAt: new Date(dto.opensAt) }),
      },
    });
  }

  async addQuestions(sessionId: string, dto: AddQuestionsDto) {
    const session = await this.prisma.cbtSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new NotFoundException('CBT session not found');
    // Remove existing questions and replace
    await this.prisma.cbtQuestion.deleteMany({ where: { sessionId } });
    return this.prisma.cbtQuestion.createMany({
      data: dto.questions.map((q) => ({ ...q, sessionId, marks: q.marks ?? 1 })),
    });
  }

  async publish(id: string) {
    const session = await this.prisma.cbtSession.findUnique({
      where: { id },
      include: { _count: { select: { questions: true } } },
    });
    if (!session) throw new NotFoundException('CBT session not found');
    if (session._count.questions === 0) throw new BadRequestException('Cannot publish a session with no questions');
    return this.prisma.cbtSession.update({ where: { id }, data: { isPublished: true } });
  }

  async unpublish(id: string) {
    return this.prisma.cbtSession.update({ where: { id }, data: { isPublished: false } });
  }

  async submit(userId: string, dto: SubmitAttemptDto) {
    const learner = await this.prisma.learnerProfile.findUnique({ where: { userId } });
    if (!learner) throw new ForbiddenException('Learner profile not found');

    // Check not already attempted
    const existing = await this.prisma.cbtAttempt.findUnique({
      where: { learnerId_sessionId: { learnerId: learner.id, sessionId: dto.sessionId } },
    });
    if (existing) throw new BadRequestException('You have already submitted this exam');

    // Get questions with correct answers for scoring
    const questions = await this.prisma.cbtQuestion.findMany({ where: { sessionId: dto.sessionId } });
    const session = await this.prisma.cbtSession.findUnique({ where: { id: dto.sessionId } });
    if (!session) throw new NotFoundException('CBT session not found');

    // Score the attempt
    let score = 0;
    const answerResults = dto.answers.map((a) => {
      const question = questions.find((q) => q.id === a.questionId);
      const isCorrect = question?.correctOption === a.selected;
      if (isCorrect && question) score += question.marks;
      return { questionId: a.questionId, selected: a.selected, isCorrect };
    });

    const passed = score >= session.passScore;

    const attempt = await this.prisma.cbtAttempt.create({
      data: {
        learnerId: learner.id,
        sessionId: dto.sessionId,
        score,
        passed,
        timeTakenSecs: dto.timeTakenSecs,
      },
    });

    return { ...attempt, totalMarks: session.totalMarks, passScore: session.passScore, answers: answerResults };
  }

  async getMyAttempts(userId: string) {
    return this.prisma.cbtAttempt.findMany({
      where: { learner: { userId } },
      include: {
        session: { select: { id: true, title: true, totalMarks: true, passScore: true, cohortId: true } },
      },
      orderBy: { submittedAt: 'desc' },
    });
  }

  async getAttemptResult(sessionId: string, userId: string) {
    const learner = await this.prisma.learnerProfile.findUnique({ where: { userId } });
    if (!learner) throw new NotFoundException('Learner not found');
    const attempt = await this.prisma.cbtAttempt.findUnique({
      where: { learnerId_sessionId: { learnerId: learner.id, sessionId } },
      include: { session: { include: { questions: { orderBy: { order: 'asc' } } } } },
    });
    if (!attempt) throw new NotFoundException('Attempt not found');
    return attempt;
  }

  async getSessionResults(sessionId: string) {
    return this.prisma.cbtAttempt.findMany({
      where: { sessionId },
      include: {
        learner: { include: { user: { select: { firstName: true, lastName: true, avatarUrl: true } } } },
      },
      orderBy: { score: 'desc' },
    });
  }

  async deleteSession(id: string) {
    return this.prisma.cbtSession.delete({ where: { id } });
  }
}

// ── CONTROLLER ────────────────────────────────────────────────────────────────
@ApiTags('CBT')
@ApiBearerAuth()
@Controller('cbt')
export class CbtController {
  constructor(private cbtService: CbtService) {}

  @Get('cohort/:cohortId')
  @Roles(Role.ADMIN, Role.FACILITATOR, Role.LEARNER)
  findByCohort(@Param('cohortId') cohortId: string) {
    return this.cbtService.findSessionsByCohort(cohortId);
  }

  @Get('attempts/me')
  @Roles(Role.LEARNER)
  getMyAttempts(@CurrentUser('id') userId: string) {
    return this.cbtService.getMyAttempts(userId);
  }

  @Get(':sessionId/result')
  @Roles(Role.LEARNER)
  getMyResult(@Param('sessionId') sessionId: string, @CurrentUser('id') userId: string) {
    return this.cbtService.getAttemptResult(sessionId, userId);
  }

  @Get(':sessionId/results')
  @Roles(Role.ADMIN, Role.FACILITATOR)
  getSessionResults(@Param('sessionId') sessionId: string) {
    return this.cbtService.getSessionResults(sessionId);
  }

  @Get(':id/take')
  @Roles(Role.LEARNER)
  getForLearner(@Param('id') id: string) {
    return this.cbtService.findSession(id, true);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.FACILITATOR)
  findOne(@Param('id') id: string) {
    return this.cbtService.findSession(id, false);
  }

  @Post('sessions')
  @Roles(Role.ADMIN, Role.FACILITATOR)
  createSession(@Body() dto: CreateCbtSessionDto) {
    return this.cbtService.createSession(dto);
  }

  @Post('sessions/:id/questions')
  @Roles(Role.ADMIN, Role.FACILITATOR)
  addQuestions(@Param('id') id: string, @Body() dto: AddQuestionsDto) {
    return this.cbtService.addQuestions(id, dto);
  }

  @Put('sessions/:id/publish')
  @Roles(Role.ADMIN, Role.FACILITATOR)
  publish(@Param('id') id: string) {
    return this.cbtService.publish(id);
  }

  @Put('sessions/:id/unpublish')
  @Roles(Role.ADMIN, Role.FACILITATOR)
  unpublish(@Param('id') id: string) {
    return this.cbtService.unpublish(id);
  }

  @Post('submit')
  @Roles(Role.LEARNER)
  submit(@CurrentUser('id') userId: string, @Body() dto: SubmitAttemptDto) {
    return this.cbtService.submit(userId, dto);
  }

  @Delete('sessions/:id')
  @Roles(Role.ADMIN, Role.FACILITATOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteSession(@Param('id') id: string) {
    return this.cbtService.deleteSession(id);
  }
}

@Module({
  controllers: [CbtController],
  providers: [CbtService],
  exports: [CbtService],
})
export class CbtModule {}
