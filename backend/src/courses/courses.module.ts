import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { IsBoolean, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiBearerAuth, ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { Controller, Get, Post, Put, Delete, Param, Body, Query, HttpCode, HttpStatus, Req } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Module } from '@nestjs/common';
import axios from 'axios';
import * as crypto from 'crypto';
import { Request } from 'express';
 
// ── DTOs ─────────────────────────────────────────────────────────────────────
export class CreateCourseDto {
  @ApiProperty() @IsString() slug: string;
  @ApiProperty() @IsString() title: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional({ enum: ['SELF_PACED', 'COHORT'] })
  @IsOptional() @IsString() mode?: 'SELF_PACED' | 'COHORT';
  @ApiProperty() @IsNumber() @Min(0) price: number;
  @ApiPropertyOptional() @IsOptional() @IsString() currency?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isPublished?: boolean;
}
 
export class UpdateCourseDto {
  @ApiPropertyOptional() @IsOptional() @IsString() slug?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() title?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional({ enum: ['SELF_PACED', 'COHORT'] })
  @IsOptional() @IsString() mode?: 'SELF_PACED' | 'COHORT';
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) price?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() currency?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isPublished?: boolean;
}
 
export class CreateLessonDto {
  @ApiProperty() @IsString() moduleId: string;
  @ApiProperty() @IsNumber() @Min(1) order: number;
  @ApiProperty() @IsString() title: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() videoUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notesUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(1) durationMins?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isPublished?: boolean;
}
 
export class UpdateLessonDto {
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(1) order?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() title?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() videoUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notesUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(1) durationMins?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isPublished?: boolean;
}
 
export class InitiateCoursePurchaseDto {
  @ApiProperty() @IsString() courseId: string;
  @ApiProperty() @IsString() callbackUrl: string;
}

export class CreateCourseModuleDto {
  @ApiProperty() @IsString() courseId: string;
  @ApiProperty() @IsNumber() @Min(1) order: number;
  @ApiProperty() @IsString() title: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isFree?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) price?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() currency?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isPublished?: boolean;
}

export class UpdateCourseModuleDto {
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(1) order?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() title?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isFree?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) price?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() currency?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isPublished?: boolean;
}

export class InitiateModulePurchaseDto {
  @ApiProperty() @IsString() moduleId: string;
  @ApiProperty() @IsString() callbackUrl: string;
}

export class CompleteModuleDto {
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) score?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() passed?: boolean;
}
 
// ── SERVICES ─────────────────────────────────────────────────────────────────
@Injectable()
export class CoursesService {
  constructor(private prisma: PrismaService) {}
 
  listPublic() {
    return this.prisma.course.findMany({
      where: { isPublished: true },
      select: { id: true, slug: true, title: true, description: true, mode: true, price: true, currency: true, isPublished: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }
 
  async getPublic(slug: string) {
    const course = await this.prisma.course.findUnique({
      where: { slug },
      select: {
        id: true, slug: true, title: true, description: true, mode: true, price: true, currency: true, isPublished: true,
        modules: {
          where: { isPublished: true },
          select: {
            id: true, order: true, title: true, description: true, isFree: true, price: true, currency: true, isPublished: true,
            lessons: {
              where: { isPublished: true },
              select: { id: true, order: true, title: true, description: true, durationMins: true, isPublished: true },
              orderBy: { order: 'asc' },
            },
          },
          orderBy: { order: 'asc' },
        },
      },
    });
    if (!course || !course.isPublished) throw new NotFoundException('Course not found');
    return course;
  }
 
  // Admin
  listAdmin() {
    return this.prisma.course.findMany({
      include: { _count: { select: { lessons: true, purchases: true, modules: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }
 
  create(dto: CreateCourseDto) {
    return this.prisma.course.create({
      data: {
        slug: dto.slug,
        title: dto.title,
        description: dto.description,
        mode: (dto.mode as any) ?? 'SELF_PACED',
        price: dto.price,
        currency: dto.currency ?? 'NGN',
        isPublished: dto.isPublished ?? false,
      },
    });
  }
 
  async update(id: string, dto: UpdateCourseDto) {
    return this.prisma.course.update({
      where: { id },
      data: {
        ...(dto.slug !== undefined && { slug: dto.slug }),
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.mode !== undefined && { mode: dto.mode as any }),
        ...(dto.price !== undefined && { price: dto.price }),
        ...(dto.currency !== undefined && { currency: dto.currency }),
        ...(dto.isPublished !== undefined && { isPublished: dto.isPublished }),
      },
    });
  }
 
  async remove(id: string) {
    return this.prisma.course.delete({ where: { id } });
  }
 
  // Modules (Admin)
  listModules(courseId: string) {
    return this.prisma.courseModule.findMany({
      where: { courseId },
      include: { _count: { select: { lessons: true, purchases: true, completions: true } } },
      orderBy: { order: 'asc' },
    });
  }
 
  createModule(dto: CreateCourseModuleDto) {
    return this.prisma.courseModule.create({
      data: {
        courseId: dto.courseId,
        order: dto.order,
        title: dto.title,
        description: dto.description,
        isFree: dto.isFree ?? false,
        price: dto.isFree ? null : (dto.price ?? null),
        currency: dto.currency ?? 'NGN',
        isPublished: dto.isPublished ?? false,
      },
    });
  }
 
  updateModule(id: string, dto: UpdateCourseModuleDto) {
    return this.prisma.courseModule.update({
      where: { id },
      data: {
        ...(dto.order !== undefined && { order: dto.order }),
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.isFree !== undefined && { isFree: dto.isFree }),
        ...(dto.price !== undefined && { price: dto.price }),
        ...(dto.currency !== undefined && { currency: dto.currency }),
        ...(dto.isPublished !== undefined && { isPublished: dto.isPublished }),
      } as any,
    });
  }
 
  removeModule(id: string) {
    return this.prisma.courseModule.delete({ where: { id } });
  }

  // Lessons (Admin)
  listLessons(moduleId: string) {
    return this.prisma.lesson.findMany({ where: { moduleId }, orderBy: { order: 'asc' } });
  }

  createLesson(dto: CreateLessonDto) {
    return this.prisma.lesson.create({
      data: {
        moduleId: dto.moduleId,
        order: dto.order,
        title: dto.title,
        description: dto.description,
        videoUrl: dto.videoUrl,
        notesUrl: dto.notesUrl,
        durationMins: dto.durationMins,
        isPublished: dto.isPublished ?? false,
      },
    });
  }

  updateLesson(id: string, dto: UpdateLessonDto) {
    return this.prisma.lesson.update({ where: { id }, data: dto as any });
  }

  removeLesson(id: string) {
    return this.prisma.lesson.delete({ where: { id } });
  }
 
  // Learner access
  async myCourses(userId: string) {
    const [coursePurchases, modulePurchases] = await Promise.all([
      this.prisma.coursePurchase.findMany({ where: { userId, status: 'SUCCESS' }, include: { course: true } }),
      this.prisma.courseModulePurchase.findMany({ where: { userId, status: 'SUCCESS' }, include: { module: { include: { course: true } } } }),
    ]);
    const courseMap = new Map<string, any>();
    coursePurchases.forEach((p) => courseMap.set(p.courseId, p.course));
    modulePurchases.forEach((p) => courseMap.set(p.module.courseId, p.module.course));
    return Array.from(courseMap.values()).map((c) => ({
      id: c.id, slug: c.slug, title: c.title, description: c.description, mode: c.mode, price: c.price, currency: c.currency,
    }));
  }
 
  async myCourseOutline(userId: string, slug: string) {
    const course = await this.prisma.course.findUnique({
      where: { slug },
      include: {
        modules: {
          where: { isPublished: true },
          include: { lessons: { where: { isPublished: true }, orderBy: { order: 'asc' } } },
          orderBy: { order: 'asc' },
        },
      },
    });
    if (!course) throw new NotFoundException('Course not found');

    const [coursePurchase, modulePurchases, completions, certs] = await Promise.all([
      this.prisma.coursePurchase.findFirst({ where: { userId, courseId: course.id, status: 'SUCCESS' } }),
      this.prisma.courseModulePurchase.findMany({ where: { userId, status: 'SUCCESS', module: { courseId: course.id } }, select: { moduleId: true } }),
      this.prisma.courseModuleCompletion.findMany({ where: { userId, module: { courseId: course.id } } }),
      this.prisma.courseModuleCertificate.findMany({ where: { userId, module: { courseId: course.id } } }),
    ]);

    const purchasedModules = new Set(modulePurchases.map((p) => p.moduleId));
    const completedModules = new Set(completions.map((c) => c.moduleId));
    const certMap = new Map(certs.map((c) => [c.moduleId, c]));

    const unlockedByCourse = !!coursePurchase;
    const modules = course.modules.map((m) => {
      const unlocked = unlockedByCourse || m.isFree || purchasedModules.has(m.id);
      const completed = completedModules.has(m.id);
      const cert = certMap.get(m.id) ?? null;
      return {
        id: m.id,
        order: m.order,
        title: m.title,
        description: m.description,
        isFree: m.isFree,
        price: m.price,
        currency: m.currency,
        unlocked,
        completed,
        certificate: cert ? { code: cert.code, fileUrl: cert.fileUrl, issuedAt: cert.issuedAt } : null,
        lessons: unlocked ? m.lessons : m.lessons.map((l) => ({ id: l.id, order: l.order, title: l.title, description: l.description, durationMins: l.durationMins, isPublished: l.isPublished })),
      };
    });

    return { id: course.id, slug: course.slug, title: course.title, description: course.description, modules };
  }
}
 
@Injectable()
export class CoursePurchasesService {
  constructor(private prisma: PrismaService, private config: ConfigService) {}
 
  async initiate(userId: string, dto: InitiateCoursePurchaseDto) {
    const course = await this.prisma.course.findUnique({ where: { id: dto.courseId } });
    if (!course || !course.isPublished) throw new NotFoundException('Course not found');
 
    // Create (or reuse) a pending purchase
    const purchase = await this.prisma.coursePurchase.upsert({
      where: { userId_courseId: { userId, courseId: course.id } },
      create: { userId, courseId: course.id, amount: Number(course.price), currency: course.currency, status: 'PENDING' },
      update: { amount: Number(course.price), currency: course.currency, status: 'PENDING', paidAt: null },
    });
 
    // Paystack init (optional in local dev; requires PAYSTACK_SECRET_KEY)
    const secret = this.config.get('PAYSTACK_SECRET_KEY');
    if (!secret) {
      return {
        purchaseId: purchase.id,
        authorizationUrl: null,
        amount: Number(course.price),
        message: 'PAYSTACK_SECRET_KEY not set; purchase created as PENDING.',
      };
    }
 
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
 
    const res = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      { email: user.email, amount: Number(course.price) * 100, reference: purchase.id, callback_url: dto.callbackUrl },
      { headers: { Authorization: `Bearer ${secret}` } },
    );
 
    await this.prisma.coursePurchase.update({
      where: { id: purchase.id },
      data: { paystackRef: res.data.data.reference },
    });
 
    return {
      purchaseId: purchase.id,
      authorizationUrl: res.data.data.authorization_url,
      amount: Number(course.price),
    };
  }
 
  async verify(ref: string) {
    const secret = this.config.get('PAYSTACK_SECRET_KEY');
    if (!secret) throw new ForbiddenException('PAYSTACK_SECRET_KEY not configured');
    const res = await axios.get(`https://api.paystack.co/transaction/verify/${ref}`, {
      headers: { Authorization: `Bearer ${secret}` },
    });
    const status = res.data.data.status === 'success' ? 'SUCCESS' : 'FAILED';
    const purchase = await this.prisma.coursePurchase.findFirst({ where: { paystackRef: ref } });
    if (!purchase) throw new NotFoundException('Purchase not found');
    return this.prisma.coursePurchase.update({
      where: { id: purchase.id },
      data: { status: status as any, ...(status === 'SUCCESS' ? { paidAt: new Date() } : {}) },
    });
  }
 
  async webhook(rawBody: Buffer, signature: string) {
    const secret = this.config.get('PAYSTACK_WEBHOOK_SECRET', '');
    if (!secret) return { received: false };
    const hash = crypto.createHmac('sha512', secret).update(rawBody).digest('hex');
    if (hash !== signature) return { received: false };
    const event = JSON.parse(rawBody.toString());
    if (event.event === 'charge.success') {
      const p = await this.prisma.coursePurchase.findFirst({ where: { paystackRef: event.data.reference } });
      if (p && p.status !== 'SUCCESS') {
        await this.prisma.coursePurchase.update({ where: { id: p.id }, data: { status: 'SUCCESS', paidAt: new Date() } });
      }
    }
    return { received: true };
  }
}

@Injectable()
export class ModulePurchasesService {
  constructor(private prisma: PrismaService, private config: ConfigService) {}

  async initiate(userId: string, dto: InitiateModulePurchaseDto) {
    const mod = await this.prisma.courseModule.findUnique({ where: { id: dto.moduleId }, include: { course: true } });
    if (!mod || !mod.isPublished) throw new NotFoundException('Module not found');
    if (mod.isFree) throw new BadRequestException('Module is free');
    if (!mod.price) throw new BadRequestException('Module price not set');

    const purchase = await this.prisma.courseModulePurchase.upsert({
      where: { userId_moduleId: { userId, moduleId: mod.id } },
      create: { userId, moduleId: mod.id, amount: Number(mod.price), currency: mod.currency, status: 'PENDING' },
      update: { amount: Number(mod.price), currency: mod.currency, status: 'PENDING', paidAt: null },
    });

    const secret = this.config.get('PAYSTACK_SECRET_KEY');
    if (!secret) {
      return { purchaseId: purchase.id, authorizationUrl: null, amount: Number(mod.price), message: 'PAYSTACK_SECRET_KEY not set; purchase created as PENDING.' };
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const res = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      { email: user.email, amount: Number(mod.price) * 100, reference: purchase.id, callback_url: dto.callbackUrl },
      { headers: { Authorization: `Bearer ${secret}` } },
    );

    await this.prisma.courseModulePurchase.update({ where: { id: purchase.id }, data: { paystackRef: res.data.data.reference } });
    return { purchaseId: purchase.id, authorizationUrl: res.data.data.authorization_url, amount: Number(mod.price) };
  }

  async verify(ref: string) {
    const secret = this.config.get('PAYSTACK_SECRET_KEY');
    if (!secret) throw new ForbiddenException('PAYSTACK_SECRET_KEY not configured');
    const res = await axios.get(`https://api.paystack.co/transaction/verify/${ref}`, {
      headers: { Authorization: `Bearer ${secret}` },
    });
    const status = res.data.data.status === 'success' ? 'SUCCESS' : 'FAILED';
    const purchase = await this.prisma.courseModulePurchase.findFirst({ where: { paystackRef: ref } });
    if (!purchase) throw new NotFoundException('Purchase not found');
    return this.prisma.courseModulePurchase.update({
      where: { id: purchase.id },
      data: { status: status as any, ...(status === 'SUCCESS' ? { paidAt: new Date() } : {}) },
    });
  }

  async webhook(rawBody: Buffer, signature: string) {
    const secret = this.config.get('PAYSTACK_WEBHOOK_SECRET', '');
    if (!secret) return { received: false };
    const hash = crypto.createHmac('sha512', secret).update(rawBody).digest('hex');
    if (hash !== signature) return { received: false };
    const event = JSON.parse(rawBody.toString());
    if (event.event === 'charge.success') {
      const p = await this.prisma.courseModulePurchase.findFirst({ where: { paystackRef: event.data.reference } });
      if (p && p.status !== 'SUCCESS') {
        await this.prisma.courseModulePurchase.update({ where: { id: p.id }, data: { status: 'SUCCESS', paidAt: new Date() } });
      }
    }
    return { received: true };
  }
}

@Injectable()
export class ModuleCompletionService {
  constructor(private prisma: PrismaService) {}

  async complete(userId: string, moduleId: string, dto: CompleteModuleDto) {
    const mod = await this.prisma.courseModule.findUnique({ where: { id: moduleId } });
    if (!mod) throw new NotFoundException('Module not found');

    // Must have access (free, module purchased, or course purchased)
    const [coursePurchase, modulePurchase] = await Promise.all([
      this.prisma.coursePurchase.findFirst({ where: { userId, courseId: mod.courseId, status: 'SUCCESS' } }),
      this.prisma.courseModulePurchase.findFirst({ where: { userId, moduleId, status: 'SUCCESS' } }),
    ]);
    if (!mod.isFree && !coursePurchase && !modulePurchase) throw new ForbiddenException('Module locked');

    const completion = await this.prisma.courseModuleCompletion.upsert({
      where: { userId_moduleId: { userId, moduleId } },
      create: { userId, moduleId, score: dto.score, passed: dto.passed ?? true },
      update: { score: dto.score, passed: dto.passed ?? true, completedAt: new Date() },
    });

    // Issue module certificate if passed
    let certificate: any = null;
    if (completion.passed) {
      certificate = await this.prisma.courseModuleCertificate.upsert({
        where: { userId_moduleId: { userId, moduleId } },
        create: { userId, moduleId, code: `MOD-${Math.random().toString(36).slice(2, 8).toUpperCase()}${Date.now().toString().slice(-4)}` },
        update: {},
      });
    }

    return { completion, certificate };
  }
}
 
// ── CONTROLLERS ───────────────────────────────────────────────────────────────
@ApiTags('Courses')
@Controller('courses')
export class CoursesController {
  constructor(private s: CoursesService) {}
 
  @Get()
  @Public()
  listPublic() { return this.s.listPublic(); }
 
  @Get(':slug')
  @Public()
  getPublic(@Param('slug') slug: string) { return this.s.getPublic(slug); }
 
  @Get('me/mine')
  @ApiBearerAuth()
  @Roles(Role.LEARNER, Role.ADMIN, Role.FACILITATOR)
  myCourses(@CurrentUser('id') userId: string) { return this.s.myCourses(userId); }
 
  @Get('me/outline/:slug')
  @ApiBearerAuth()
  @Roles(Role.LEARNER, Role.ADMIN, Role.FACILITATOR)
  myCourseOutline(@CurrentUser('id') userId: string, @Param('slug') slug: string) { return this.s.myCourseOutline(userId, slug); }
 
  // Admin endpoints
  @Get('admin/all')
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  listAdmin() { return this.s.listAdmin(); }
 
  @Post('admin')
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  create(@Body() dto: CreateCourseDto) { return this.s.create(dto); }
 
  @Put('admin/:id')
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateCourseDto) { return this.s.update(id, dto); }
 
  @Delete('admin/:id')
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) { return this.s.remove(id); }
 
  // Lessons admin
  @Get('admin/:courseId/modules')
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  listModules(@Param('courseId') courseId: string) { return this.s.listModules(courseId); }
 
  @Post('admin/modules')
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  createModule(@Body() dto: CreateCourseModuleDto) { return this.s.createModule(dto); }
 
  @Put('admin/modules/:id')
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  updateModule(@Param('id') id: string, @Body() dto: UpdateCourseModuleDto) { return this.s.updateModule(id, dto); }
 
  @Delete('admin/modules/:id')
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  removeModule(@Param('id') id: string) { return this.s.removeModule(id); }

  // Lessons per module admin
  @Get('admin/modules/:moduleId/lessons')
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  listModuleLessons(@Param('moduleId') moduleId: string) { return this.s.listLessons(moduleId); }

  @Post('admin/lessons')
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  createLesson(@Body() dto: CreateLessonDto) { return this.s.createLesson(dto); }

  @Put('admin/lessons/:id')
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  updateLesson(@Param('id') id: string, @Body() dto: UpdateLessonDto) { return this.s.updateLesson(id, dto); }

  @Delete('admin/lessons/:id')
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  removeLesson(@Param('id') id: string) { return this.s.removeLesson(id); }
}
 
@ApiTags('Course Purchases')
@Controller('course-purchases')
export class CoursePurchasesController {
  constructor(private s: CoursePurchasesService) {}
 
  @Post('initiate')
  @ApiBearerAuth()
  @Roles(Role.LEARNER, Role.ADMIN)
  initiate(@CurrentUser('id') userId: string, @Body() dto: InitiateCoursePurchaseDto) { return this.s.initiate(userId, dto); }
 
  @Get('verify/:ref')
  @ApiBearerAuth()
  @Roles(Role.LEARNER, Role.ADMIN)
  verify(@Param('ref') ref: string) { return this.s.verify(ref); }
 
  @Post('webhook')
  @Public()
  @HttpCode(HttpStatus.OK)
  webhook(@Req() req: Request) {
    const sig = req.headers['x-paystack-signature'] as string;
    const raw = (req as any).rawBody ?? Buffer.from(JSON.stringify(req.body));
    return this.s.webhook(raw, sig);
  }
}

@ApiTags('Module Purchases')
@Controller('module-purchases')
export class ModulePurchasesController {
  constructor(private s: ModulePurchasesService) {}

  @Post('initiate')
  @ApiBearerAuth()
  @Roles(Role.LEARNER, Role.ADMIN)
  initiate(@CurrentUser('id') userId: string, @Body() dto: InitiateModulePurchaseDto) { return this.s.initiate(userId, dto); }

  @Get('verify/:ref')
  @ApiBearerAuth()
  @Roles(Role.LEARNER, Role.ADMIN)
  verify(@Param('ref') ref: string) { return this.s.verify(ref); }

  @Post('webhook')
  @Public()
  @HttpCode(HttpStatus.OK)
  webhook(@Req() req: Request) {
    const sig = req.headers['x-paystack-signature'] as string;
    const raw = (req as any).rawBody ?? Buffer.from(JSON.stringify(req.body));
    return this.s.webhook(raw, sig);
  }
}

@ApiTags('Module Completion')
@Controller('module-completions')
export class ModuleCompletionsController {
  constructor(private s: ModuleCompletionService) {}

  @Post(':moduleId/complete')
  @ApiBearerAuth()
  @Roles(Role.LEARNER, Role.ADMIN)
  complete(@CurrentUser('id') userId: string, @Param('moduleId') moduleId: string, @Body() dto: CompleteModuleDto) {
    return this.s.complete(userId, moduleId, dto);
  }
}
 
@Module({
  controllers: [CoursesController, CoursePurchasesController, ModulePurchasesController, ModuleCompletionsController],
  providers: [CoursesService, CoursePurchasesService, ModulePurchasesService, ModuleCompletionService],
  exports: [CoursesService],
})
export class CoursesModule {}

