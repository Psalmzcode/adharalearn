import { Controller, Get, Post, Put, Delete, Param, Body, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CohortsService, CreateCohortDto } from './cohorts.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Cohorts')
@Controller('cohorts')
export class CohortsController {
  constructor(private cohortsService: CohortsService) {}

  @Get()
  @Public()
  findAll(@Query('status') status: string) { return this.cohortsService.findAll(status); }

  @Get(':id')
  @Public()
  findOne(@Param('id') id: string) { return this.cohortsService.findOne(id); }

  @Post()
  @ApiBearerAuth() @Roles(Role.ADMIN)
  create(@Body() dto: CreateCohortDto) { return this.cohortsService.create(dto); }

  @Put(':id')
  @ApiBearerAuth() @Roles(Role.ADMIN)
  update(@Param('id') id: string, @Body() dto: any) { return this.cohortsService.update(id, dto); }

  @Delete(':id')
  @ApiBearerAuth() @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) { return this.cohortsService.remove(id); }
}
