import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export class GradeDto { submissionId: string; facilitatorId: string; score: number; feedback?: string; }

@Injectable()
export class GradesService {
  constructor(private prisma: PrismaService) {}

  async grade(dto: GradeDto) {
    // Verify submission exists
    const submission = await this.prisma.submission.findUnique({ where: { id: dto.submissionId } });
    if (!submission) throw new NotFoundException('Submission not found');

    const grade = await this.prisma.grade.upsert({
      where: { submissionId: dto.submissionId },
      create: dto,
      update: { score: dto.score, feedback: dto.feedback },
    });
    // Update submission status
    await this.prisma.submission.update({ where: { id: dto.submissionId }, data: { status: 'GRADED' } });
    return grade;
  }

  async bulkGrade(grades: GradeDto[]) {
    return Promise.all(grades.map((g) => this.grade(g)));
  }

  getByAssignment(assignmentId: string) {
    return this.prisma.submission.findMany({
      where: { assignmentId },
      include: {
        learner: { include: { user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } } },
        grade: true,
      },
      orderBy: { submittedAt: 'desc' },
    });
  }

  getMyGrades(userId: string) {
    return this.prisma.submission.findMany({
      where: { learner: { userId } },
      include: {
        assignment: { select: { title: true, maxScore: true, dueAt: true, cohortId: true } },
        grade: true,
      },
      orderBy: { submittedAt: 'desc' },
    });
  }
}
