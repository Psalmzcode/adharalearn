import { Controller, Get, Post, Put, Param, Body } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ScholarshipsService } from './scholarships.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
@ApiTags('Scholarships') @ApiBearerAuth() @Controller('scholarships')
export class ScholarshipsController {
  constructor(private s: ScholarshipsService) {}
  @Get() @Roles(Role.ADMIN) findAll() { return this.s.findAll(); }
  @Post() @Roles(Role.LEARNER,Role.ADMIN) apply(@Body() dto: any) { return this.s.apply(dto); }
  @Put(':id/review') @Roles(Role.ADMIN) review(@Param('id') id: string, @Body('status') status: 'APPROVED'|'REJECTED') { return this.s.review(id, status); }
  @Put(':id/disburse') @Roles(Role.ADMIN) disburse(@Param('id') id: string) { return this.s.disburse(id); }
}