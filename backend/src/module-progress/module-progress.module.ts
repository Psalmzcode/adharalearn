import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Controller, Get, Post, Delete, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Module } from '@nestjs/common';

@Injectable()
export class ModuleProgressService {
  constructor(private prisma: PrismaService) {}

  async getMyCompletions(userId: string) {
    return this.prisma.moduleCompletion.findMany({
      where: { learner: { userId } },
      select: { moduleId: true, completedAt: true },
    });
  }

  async markComplete(userId: string, moduleId: string) {
    const learner = await this.prisma.learnerProfile.findUnique({ where: { userId } });
    if (!learner) throw new Error('Learner not found');

    const completion = await this.prisma.moduleCompletion.upsert({
      where: { learnerId_moduleId: { learnerId: learner.id, moduleId } },
      create: { learnerId: learner.id, moduleId },
      update: {},
    });

    // Recalculate enrollment progress for active cohort
    const module = await this.prisma.module.findUnique({
      where: { id: moduleId },
      include: { track: { include: { modules: { select: { id: true } } } } },
    });
    if (module) {
      const totalModules = module.track.modules.length;
      const completedCount = await this.prisma.moduleCompletion.count({
        where: {
          learnerId: learner.id,
          moduleId: { in: module.track.modules.map((m) => m.id) },
        },
      });
      const progress = totalModules > 0 ? Math.round((completedCount / totalModules) * 100) : 0;
      await this.prisma.enrollment.updateMany({
        where: { learnerId: learner.id, cohort: { trackId: module.trackId }, status: 'ACTIVE' },
        data: { progress },
      });
    }

    return completion;
  }

  async unmarkComplete(userId: string, moduleId: string) {
    const learner = await this.prisma.learnerProfile.findUnique({ where: { userId } });
    if (!learner) return;
    await this.prisma.moduleCompletion.deleteMany({
      where: { learnerId: learner.id, moduleId },
    });
    return { deleted: true };
  }

  async getBadges(userId: string) {
    const completions = await this.prisma.moduleCompletion.findMany({
      where: { learner: { userId } },
      include: { module: { select: { title: true, order: true } } },
      orderBy: { completedAt: 'asc' },
    });
    return completions.map((c) => ({
      moduleId: c.moduleId,
      moduleTitle: c.module.title,
      moduleOrder: c.module.order,
      completedAt: c.completedAt,
    }));
  }
}

@ApiTags('Module Progress')
@ApiBearerAuth()
@Controller('module-progress')
export class ModuleProgressController {
  constructor(private moduleProgressService: ModuleProgressService) {}

  @Get('mine')
  @Roles(Role.LEARNER)
  getMine(@CurrentUser('id') userId: string) {
    return this.moduleProgressService.getMyCompletions(userId);
  }

  @Get('badges/mine')
  @Roles(Role.LEARNER)
  getBadges(@CurrentUser('id') userId: string) {
    return this.moduleProgressService.getBadges(userId);
  }

  @Post('complete/:moduleId')
  @Roles(Role.LEARNER)
  markComplete(@CurrentUser('id') userId: string, @Param('moduleId') moduleId: string) {
    return this.moduleProgressService.markComplete(userId, moduleId);
  }

  @Delete('complete/:moduleId')
  @Roles(Role.LEARNER)
  @HttpCode(HttpStatus.NO_CONTENT)
  unmarkComplete(@CurrentUser('id') userId: string, @Param('moduleId') moduleId: string) {
    return this.moduleProgressService.unmarkComplete(userId, moduleId);
  }
}

@Module({ controllers: [ModuleProgressController], providers: [ModuleProgressService], exports: [ModuleProgressService] })
export class ModuleProgressModule {}
