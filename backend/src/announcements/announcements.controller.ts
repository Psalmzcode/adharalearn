import { Controller, Get, Post, Delete, Body, Query, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AnnouncementsService } from './announcements.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Announcements')
@ApiBearerAuth()
@Controller('announcements')
export class AnnouncementsController {
  constructor(private announcementsService: AnnouncementsService) {}

  @Get() @Roles(Role.ADMIN, Role.FACILITATOR, Role.LEARNER)
  findAll(@Query('cohortId') cohortId: string, @Query('audience') audience: string) {
    return this.announcementsService.findAll(cohortId, audience);
  }

  @Post() @Roles(Role.ADMIN, Role.FACILITATOR)
  create(@Body() dto: any) { return this.announcementsService.create(dto); }

  @Delete(':id') @Roles(Role.ADMIN, Role.FACILITATOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) { return this.announcementsService.remove(id); }
}
