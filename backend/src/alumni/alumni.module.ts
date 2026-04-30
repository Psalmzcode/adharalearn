import { Injectable } from '@nestjs/common';
import { IsString, IsOptional, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { Controller, Get, Post, Put, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Module } from '@nestjs/common';

export class UpdateAlumniDto {
  @ApiPropertyOptional() @IsOptional() @IsString() jobTitle?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() company?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() portfolioUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() githubUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() linkedInUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() bio?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isHireable?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isPublic?: boolean;
}

const INCLUDE = {
  user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
  cohort: { include: { track: { select: { name: true, slug: true } } } },
};

@Injectable()
export class AlumniService {
  constructor(private prisma: PrismaService) {}

  findAll(trackSlug?: string, hireable?: boolean) {
    return this.prisma.alumniProfile.findMany({
      where: {
        isPublic: true,
        ...(hireable && { isHireable: true }),
        ...(trackSlug && { cohort: { track: { slug: trackSlug } } }),
      },
      include: INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findMe(userId: string) {
    return this.prisma.alumniProfile.findUnique({ where: { userId }, include: INCLUDE });
  }

  async createOrUpdate(userId: string, dto: UpdateAlumniDto) {
    // Find their completed enrollment to get cohort + track info
    const enrollment = await this.prisma.enrollment.findFirst({
      where: { learner: { userId }, status: 'COMPLETED' },
      include: { cohort: { include: { track: true } } },
      orderBy: { completedAt: 'desc' },
    });
    const cohortId = enrollment?.cohortId ?? '';
    const trackName = enrollment?.cohort?.track?.name ?? '';

    return this.prisma.alumniProfile.upsert({
      where: { userId },
      create: { userId, cohortId, trackName, ...dto },
      update: dto,
      include: INCLUDE,
    });
  }

  update(userId: string, dto: UpdateAlumniDto) {
    return this.prisma.alumniProfile.update({ where: { userId }, data: dto, include: INCLUDE });
  }

  // Admin: create alumni record when marking enrollment complete
  async createForGraduate(userId: string, cohortId: string, trackName: string) {
    return this.prisma.alumniProfile.upsert({
      where: { userId },
      create: { userId, cohortId, trackName },
      update: {},
    });
  }
}

@ApiTags('Alumni')
@Controller('alumni')
export class AlumniController {
  constructor(private alumniService: AlumniService) {}

  @Get()
  @Public()
  findAll(@Query('track') track: string, @Query('hireable') hireable: string) {
    return this.alumniService.findAll(track, hireable === 'true');
  }

  @Get('me')
  @ApiBearerAuth()
  @Roles(Role.LEARNER)
  findMe(@CurrentUser('id') userId: string) {
    return this.alumniService.findMe(userId);
  }

  @Post('me')
  @ApiBearerAuth()
  @Roles(Role.LEARNER)
  createOrUpdate(@CurrentUser('id') userId: string, @Body() dto: UpdateAlumniDto) {
    return this.alumniService.createOrUpdate(userId, dto);
  }

  @Put('me')
  @ApiBearerAuth()
  @Roles(Role.LEARNER)
  update(@CurrentUser('id') userId: string, @Body() dto: UpdateAlumniDto) {
    return this.alumniService.update(userId, dto);
  }
}

@Module({ controllers: [AlumniController], providers: [AlumniService], exports: [AlumniService] })
export class AlumniModule {}
