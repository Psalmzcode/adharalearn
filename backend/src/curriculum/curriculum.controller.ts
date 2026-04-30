import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CurriculumService } from './curriculum.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role } from '@prisma/client';
@ApiTags('Curriculum') @ApiBearerAuth() @Controller('curriculum')
export class CurriculumController {
  constructor(private s: CurriculumService) {}
  @Get('modules/:trackId') @Roles(Role.ADMIN,Role.FACILITATOR,Role.LEARNER) getModules(@Param('trackId') id: string) { return this.s.getModules(id); }
  @Get('assignments/:cohortId') @Roles(Role.ADMIN,Role.FACILITATOR,Role.LEARNER) getAssignments(@Param('cohortId') id: string) { return this.s.getAssignments(id); }
  @Get('submissions/me') @Roles(Role.LEARNER) getMySubmissions(@CurrentUser('id') userId: string) { return this.s.getMySubmissions(userId); }
  @Post('submit') @Roles(Role.LEARNER) submitAssignment(@Body() dto: any) { return this.s.submitAssignment(dto); }
}