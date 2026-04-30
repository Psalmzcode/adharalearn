import { Controller, Get, Post, Put, Delete, Param, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { SessionsService, CreateSessionDto } from './sessions.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Sessions')
@ApiBearerAuth()
@Controller('sessions')
export class SessionsController {
  constructor(private sessionsService: SessionsService) {}

  @Get('cohort/:cohortId') @Roles(Role.ADMIN, Role.FACILITATOR, Role.LEARNER)
  findByCohort(@Param('cohortId') cohortId: string) { return this.sessionsService.findByCohort(cohortId); }

  @Get('attendance/me') @Roles(Role.LEARNER)
  getMyAttendance(@CurrentUser('id') userId: string) { return this.sessionsService.getMyAttendance(userId); }

  @Get('attendance/cohort/:cohortId') @Roles(Role.ADMIN, Role.FACILITATOR)
  getAttendanceSummary(@Param('cohortId') cohortId: string) { return this.sessionsService.getAttendanceSummary(cohortId); }

  @Get(':id') @Roles(Role.ADMIN, Role.FACILITATOR)
  findOne(@Param('id') id: string) { return this.sessionsService.findOne(id); }

  @Post() @Roles(Role.ADMIN, Role.FACILITATOR)
  create(@Body() dto: CreateSessionDto) { return this.sessionsService.create(dto); }

  @Put(':id') @Roles(Role.ADMIN, Role.FACILITATOR)
  update(@Param('id') id: string, @Body() dto: any) { return this.sessionsService.update(id, dto); }

  @Delete(':id') @Roles(Role.ADMIN, Role.FACILITATOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) { return this.sessionsService.remove(id); }

  @Post(':id/attendance') @Roles(Role.FACILITATOR, Role.ADMIN)
  markAttendance(@Param('id') sessionId: string, @Body() body: { learnerId: string; present: boolean }) {
    return this.sessionsService.markAttendance(sessionId, body.learnerId, body.present);
  }

  @Post(':id/attendance/bulk') @Roles(Role.FACILITATOR, Role.ADMIN)
  bulkMarkAttendance(@Param('id') sessionId: string, @Body() body: { records: { learnerId: string; present: boolean }[] }) {
    return this.sessionsService.bulkMarkAttendance(sessionId, body.records);
  }
}
