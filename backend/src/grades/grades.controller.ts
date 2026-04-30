import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { GradesService } from './grades.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Grades')
@ApiBearerAuth()
@Controller('grades')
export class GradesController {
  constructor(private gradesService: GradesService) {}

  @Post() @Roles(Role.FACILITATOR, Role.ADMIN)
  grade(@Body() dto: any) { return this.gradesService.grade(dto); }

  @Post('bulk') @Roles(Role.FACILITATOR, Role.ADMIN)
  bulkGrade(@Body() body: { grades: any[] }) { return this.gradesService.bulkGrade(body.grades); }

  @Get('assignment/:id') @Roles(Role.FACILITATOR, Role.ADMIN)
  getByAssignment(@Param('id') id: string) { return this.gradesService.getByAssignment(id); }

  @Get('me') @Roles(Role.LEARNER)
  getMyGrades(@CurrentUser('id') userId: string) { return this.gradesService.getMyGrades(userId); }
}
