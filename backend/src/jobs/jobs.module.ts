import { Injectable } from '@nestjs/common';
import { IsString, IsOptional, IsArray, IsBoolean, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { Controller, Get, Post, Put, Delete, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { Module } from '@nestjs/common';

export class CreateJobDto {
  @ApiProperty() @IsString() title: string;
  @ApiProperty() @IsString() company: string;
  @ApiProperty() @IsString() location: string;
  @ApiPropertyOptional() @IsOptional() @IsString() type?: string;
  @ApiProperty() @IsString() description: string;
  @ApiProperty() @IsString() applyUrl: string;
  @ApiPropertyOptional() @IsOptional() @IsString() salary?: string;
  @ApiPropertyOptional() @IsOptional() @IsArray() skills?: string[];
  @ApiPropertyOptional() @IsOptional() @IsDateString() expiresAt?: string;
}

@Injectable()
export class JobsService {
  constructor(private prisma: PrismaService) {}

  findAll(activeOnly = true) {
    return this.prisma.jobListing.findMany({
      where: {
        ...(activeOnly && { isActive: true }),
        OR: activeOnly ? [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] : undefined,
      },
      orderBy: { postedAt: 'desc' },
    });
  }

  findBySkills(skills: string[]) {
    return this.prisma.jobListing.findMany({
      where: {
        isActive: true,
        skills: { hasSome: skills },
      },
      orderBy: { postedAt: 'desc' },
    });
  }

  create(dto: CreateJobDto) {
    return this.prisma.jobListing.create({
      data: {
        ...dto,
        ...(dto.expiresAt && { expiresAt: new Date(dto.expiresAt) }),
        skills: dto.skills ?? [],
      },
    });
  }

  update(id: string, dto: Partial<CreateJobDto> & { isActive?: boolean }) {
    return this.prisma.jobListing.update({ where: { id }, data: dto });
  }

  remove(id: string) {
    return this.prisma.jobListing.delete({ where: { id } });
  }
}

@ApiTags('Jobs')
@Controller('jobs')
export class JobsController {
  constructor(private jobsService: JobsService) {}

  @Get()
  @Public()
  findAll(@Query('skills') skills: string) {
    if (skills) return this.jobsService.findBySkills(skills.split(','));
    return this.jobsService.findAll();
  }

  @Post()
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  create(@Body() dto: CreateJobDto) { return this.jobsService.create(dto); }

  @Put(':id')
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  update(@Param('id') id: string, @Body() dto: any) { return this.jobsService.update(id, dto); }

  @Delete(':id')
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) { return this.jobsService.remove(id); }
}

@Module({ controllers: [JobsController], providers: [JobsService], exports: [JobsService] })
export class JobsModule {}
