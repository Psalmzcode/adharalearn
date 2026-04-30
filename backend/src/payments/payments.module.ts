import { Injectable, NotFoundException } from '@nestjs/common';
import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { Controller, Get, Post, Param, Body, Query, HttpCode, HttpStatus, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Module } from '@nestjs/common';
import * as crypto from 'crypto';
import axios from 'axios';
import { Request } from 'express';

export class InitiatePaymentDto {
  @ApiProperty() @IsString() enrollmentId: string;
  @ApiProperty() @IsString() type: string;
  @ApiProperty() @IsString() callbackUrl: string;
}

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService, private config: ConfigService) {}

  async initiate(userId: string, dto: InitiatePaymentDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id: dto.enrollmentId },
      include: { cohort: { include: { track: true } } },
    });
    if (!enrollment) throw new NotFoundException('Enrollment not found');

    const price = Number(enrollment.cohort.track.price);
    const amount = dto.type === 'FULL' ? price : Math.ceil(price / 2);

    const payment = await this.prisma.payment.create({
      data: { enrollmentId: dto.enrollmentId, amount, type: dto.type as any, status: 'PENDING' },
    });

    const res = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      { email: user.email, amount: amount * 100, reference: payment.id, callback_url: dto.callbackUrl },
      { headers: { Authorization: `Bearer ${this.config.get('PAYSTACK_SECRET_KEY')}` } },
    );

    await this.prisma.payment.update({ where: { id: payment.id }, data: { paystackRef: res.data.data.reference } });
    return { paymentId: payment.id, authorizationUrl: res.data.data.authorization_url, amount };
  }

  async verify(reference: string) {
    const res = await axios.get(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: { Authorization: `Bearer ${this.config.get('PAYSTACK_SECRET_KEY')}` },
    });
    const status = res.data.data.status === 'success' ? 'SUCCESS' : 'FAILED';
    const payment = await this.prisma.payment.findFirst({ where: { paystackRef: reference } });
    if (!payment) throw new NotFoundException('Payment not found');
    return this.prisma.payment.update({ where: { id: payment.id }, data: { status } });
  }

  async webhook(rawBody: Buffer, signature: string) {
    const hash = crypto.createHmac('sha512', this.config.get('PAYSTACK_WEBHOOK_SECRET', ''))
      .update(rawBody).digest('hex');
    if (hash !== signature) return { received: false };
    const event = JSON.parse(rawBody.toString());
    if (event.event === 'charge.success') {
      const payment = await this.prisma.payment.findFirst({ where: { paystackRef: event.data.reference } });
      if (payment?.status !== 'SUCCESS') {
        await this.prisma.payment.update({ where: { id: payment!.id }, data: { status: 'SUCCESS' } });
      }
    }
    return { received: true };
  }

  getAll(enrollmentId?: string) {
    return this.prisma.payment.findMany({
      where: enrollmentId ? { enrollmentId } : {},
      include: {
        enrollment: {
          include: {
            learner: { include: { user: { select: { firstName: true, lastName: true } } } },
            cohort: { include: { track: { select: { name: true } } } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getSummary() {
    const [agg, pending, failed] = await Promise.all([
      this.prisma.payment.aggregate({ where: { status: 'SUCCESS' }, _sum: { amount: true }, _count: true }),
      this.prisma.payment.count({ where: { status: 'PENDING' } }),
      this.prisma.payment.count({ where: { status: 'FAILED' } }),
    ]);
    return { totalRevenue: agg._sum.amount ?? 0, successful: agg._count, pending, failed };
  }
}

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Get()
  @ApiBearerAuth() @Roles(Role.ADMIN)
  getAll(@Query('enrollmentId') enrollmentId: string) { return this.paymentsService.getAll(enrollmentId); }

  @Get('summary')
  @ApiBearerAuth() @Roles(Role.ADMIN)
  getSummary() { return this.paymentsService.getSummary(); }

  @Post('initiate')
  @ApiBearerAuth() @Roles(Role.LEARNER, Role.ADMIN)
  initiate(@CurrentUser('id') userId: string, @Body() dto: InitiatePaymentDto) { return this.paymentsService.initiate(userId, dto); }

  @Get('verify/:ref')
  @ApiBearerAuth() @Roles(Role.LEARNER, Role.ADMIN)
  verify(@Param('ref') ref: string) { return this.paymentsService.verify(ref); }

  @Post('webhook')
  @Public() @HttpCode(HttpStatus.OK)
  webhook(@Req() req: Request) {
    const sig = req.headers['x-paystack-signature'] as string;
    const raw = (req as any).rawBody ?? Buffer.from(JSON.stringify(req.body));
    return this.paymentsService.webhook(raw, sig);
  }
}

@Module({ controllers: [PaymentsController], providers: [PaymentsService], exports: [PaymentsService] })
export class PaymentsModule {}
