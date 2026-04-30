import { Injectable, NotFoundException } from '@nestjs/common';
import { IsOptional, IsString, IsArray } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { Controller, Get, Put, Delete, Param, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Module } from '@nestjs/common';

export class UpdateFacilitatorDto {
  @ApiPropertyOptional() @IsOptional() @IsString() bio?: string;
  @ApiPropertyOptional() @IsOptional() @IsArray() specialties?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() linkedInUrl?: string;
}

@Injectable()
export class FacilitatorsService {
  constructor(private prisma: PrismaService) {}

  private INCLUDE = {
    user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, avatarUrl: true } },
    cohorts: {
      include: {
        track: { select: { name: true, slug: true } },
        _count: { select: { enrollments: true } },
      },
    },
    _count: { select: { sessions: true, reports: true, grades: true } },
  };

  findAll() {
    return this.prisma.facilitatorProfile.findMany({
      include: this.INCLUDE,
      orderBy: { user: { firstName: 'asc' } },
    });
  }

  async findOne(id: string) {
    const fac = await this.prisma.facilitatorProfile.findUnique({ where: { id }, include: this.INCLUDE });
    if (!fac) throw new NotFoundException('Facilitator not found');
    return fac;
  }

  async findMe(userId: string) {
    const fac = await this.prisma.facilitatorProfile.findUnique({ where: { userId }, include: this.INCLUDE });
    if (!fac) throw new NotFoundException('Facilitator profile not found');
    return fac;
  }

  async update(id: string, dto: UpdateFacilitatorDto) {
    await this.findOne(id);
    return this.prisma.facilitatorProfile.update({ where: { id }, data: dto });
  }

  async updateMe(userId: string, dto: UpdateFacilitatorDto) {
    const fac = await this.prisma.facilitatorProfile.findUnique({ where: { userId } });
    if (!fac) throw new NotFoundException('Facilitator profile not found');
    return this.prisma.facilitatorProfile.update({ where: { userId }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.facilitatorProfile.delete({ where: { id } });
  }

  // Summary stats for admin
  async getStats(facilitatorId: string) {
    const [sessions, reports, grades, latestCohort] = await Promise.all([
      this.prisma.session.count({ where: { facilitatorId } }),
      this.prisma.weeklyReport.count({ where: { facilitatorId } }),
      this.prisma.grade.count({ where: { facilitatorId } }),
      this.prisma.cohort.findFirst({
        where: { facilitatorId, status: 'ACTIVE' },
        include: { _count: { select: { enrollments: true } } },
      }),
    ]);
    return { sessions, reports, grades, activeCohort: latestCohort };
  }
}

@ApiTags('Facilitators')
@ApiBearerAuth()
@Controller('facilitators')
export class FacilitatorsController {
  constructor(private facilitatorsService: FacilitatorsService) {}

  @Get()
  @Roles(Role.ADMIN)
  findAll() {
    return this.facilitatorsService.findAll();
  }

  @Get('me')
  @Roles(Role.FACILITATOR)
  findMe(@CurrentUser('id') userId: string) {
    return this.facilitatorsService.findMe(userId);
  }

  @Get(':id/stats')
  @Roles(Role.ADMIN)
  getStats(@Param('id') id: string) {
    return this.facilitatorsService.getStats(id);
  }

  @Get(':id')
  @Roles(Role.ADMIN)
  findOne(@Param('id') id: string) {
    return this.facilitatorsService.findOne(id);
  }

  @Put('me')
  @Roles(Role.FACILITATOR)
  updateMe(@CurrentUser('id') userId: string, @Body() dto: UpdateFacilitatorDto) {
    return this.facilitatorsService.updateMe(userId, dto);
  }

  @Put(':id')
  @Roles(Role.ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateFacilitatorDto) {
    return this.facilitatorsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.facilitatorsService.remove(id);
  }
}

@Module({
  controllers: [FacilitatorsController],
  providers: [FacilitatorsService],
  exports: [FacilitatorsService],
})
export class FacilitatorsModule {}
