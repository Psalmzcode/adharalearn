import { Controller, Get, Post, Put, Delete, Param, Body, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { EnrollmentsService, CreateEnrollmentDto } from './enrollments.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Enrollments')
@ApiBearerAuth()
@Controller('enrollments')
export class EnrollmentsController {
  constructor(private enrollmentsService: EnrollmentsService) {}

  @Get() @Roles(Role.ADMIN, Role.FACILITATOR)
  findAll(@Query('cohortId') cohortId: string, @Query('status') status: string) { return this.enrollmentsService.findAll(cohortId, status); }

  @Get('me') @Roles(Role.LEARNER)
  findMine(@CurrentUser('id') userId: string) { return this.enrollmentsService.findMine(userId); }

  @Get(':id') @Roles(Role.ADMIN, Role.FACILITATOR)
  findOne(@Param('id') id: string) { return this.enrollmentsService.findOne(id); }

  @Post() @Roles(Role.ADMIN, Role.LEARNER)
  create(@Body() dto: CreateEnrollmentDto) { return this.enrollmentsService.create(dto); }

  @Put(':id/approve') @Roles(Role.ADMIN)
  approve(@Param('id') id: string) { return this.enrollmentsService.approve(id); }

  @Put(':id/withdraw') @Roles(Role.ADMIN)
  withdraw(@Param('id') id: string) { return this.enrollmentsService.withdraw(id); }

  @Put(':id/complete') @Roles(Role.ADMIN)
  complete(@Param('id') id: string) { return this.enrollmentsService.complete(id); }

  @Put('progress') @Roles(Role.ADMIN, Role.FACILITATOR)
  updateProgress(@Body() body: { learnerId: string; cohortId: string; progress: number }) {
    return this.enrollmentsService.updateProgress(body.learnerId, body.cohortId, body.progress);
  }

  @Delete(':id') @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) { return this.enrollmentsService.remove(id); }
}
