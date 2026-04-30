import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { IsString, IsNumber, IsOptional, IsBoolean, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { Controller, Get, Post, Put, Delete, Param, Body, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { Module } from '@nestjs/common';

// ── DTOs ─────────────────────────────────────────────────────────────────────
export class CreateTrackDto {
  @ApiProperty() @IsString() name: string;
  @ApiProperty() @IsString() slug: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiProperty() @IsNumber() @Min(1) duration: number;
  @ApiProperty() @IsNumber() @Min(0) price: number;
}
export class UpdateTrackDto extends PartialType(CreateTrackDto) {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}

// ── SERVICE ───────────────────────────────────────────────────────────────────
@Injectable()
export class TracksService {
  constructor(private prisma: PrismaService) {}

  findAll(includeInactive = false) {
    return this.prisma.track.findMany({
      where: includeInactive ? {} : { isActive: true },
      include: {
        _count: { select: { cohorts: true, modules: true } },
      },
      orderBy: { price: 'asc' },
    });
  }

  async findOne(id: string) {
    const track = await this.prisma.track.findUnique({
      where: { id },
      include: {
        modules: { orderBy: { order: 'asc' } },
        cohorts: {
          where: { status: { in: ['UPCOMING', 'ACTIVE'] } },
          include: {
            facilitator: { include: { user: { select: { firstName: true, lastName: true } } } },
            _count: { select: { enrollments: true } },
          },
        },
      },
    });
    if (!track) throw new NotFoundException('Track not found');
    return track;
  }

  async create(dto: CreateTrackDto) {
    const exists = await this.prisma.track.findUnique({ where: { slug: dto.slug } });
    if (exists) throw new ConflictException(`Track slug "${dto.slug}" already exists`);
    return this.prisma.track.create({ data: dto });
  }

  async update(id: string, dto: UpdateTrackDto) {
    await this.findOne(id);
    return this.prisma.track.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    const track = await this.prisma.track.findUnique({
      where: { id },
      include: { _count: { select: { cohorts: true } } },
    });
    if (!track) throw new NotFoundException('Track not found');
    if (track._count.cohorts > 0) throw new ConflictException('Cannot delete a track that has cohorts');
    return this.prisma.track.delete({ where: { id } });
  }
}

// ── CONTROLLER ────────────────────────────────────────────────────────────────
@ApiTags('Tracks')
@Controller('tracks')
export class TracksController {
  constructor(private tracksService: TracksService) {}

  @Get()
  @Public()
  findAll(@Query('includeInactive') includeInactive: string) {
    return this.tracksService.findAll(includeInactive === 'true');
  }

  @Get(':id')
  @Public()
  findOne(@Param('id') id: string) {
    return this.tracksService.findOne(id);
  }

  @Post()
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  create(@Body() dto: CreateTrackDto) {
    return this.tracksService.create(dto);
  }

  @Put(':id')
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateTrackDto) {
    return this.tracksService.update(id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.tracksService.remove(id);
  }
}



// ── MODULE MANAGEMENT ─────────────────────────────────────────────────────────

export class CreateModuleDto {
  @ApiProperty() @IsString() title: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiProperty() @IsNumber() @Min(1) order: number;
  @ApiPropertyOptional() @IsOptional() @IsString() videoUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notesUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() durationMins?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isPublished?: boolean;
}

export class UpdateModuleDto extends PartialType(CreateModuleDto) {}

@Injectable()
export class ModulesService {
  constructor(private prisma: PrismaService) {}

  findByTrack(trackId: string) {
    return this.prisma.module.findMany({ where: { trackId }, orderBy: { order: 'asc' } });
  }

  create(trackId: string, dto: CreateModuleDto) {
    return this.prisma.module.create({ data: { trackId, ...dto } });
  }

  async update(id: string, dto: UpdateModuleDto) {
    const mod = await this.prisma.module.findUnique({ where: { id } });
    if (!mod) throw new NotFoundException('Module not found');
    return this.prisma.module.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    const mod = await this.prisma.module.findUnique({ where: { id } });
    if (!mod) throw new NotFoundException('Module not found');
    return this.prisma.module.delete({ where: { id } });
  }
}

@ApiTags('Modules')
@ApiBearerAuth()
@Controller('modules')
export class ModulesController {
  constructor(private modulesService: ModulesService) {}

  @Get('track/:trackId')
  @Roles(Role.ADMIN, Role.FACILITATOR)
  findByTrack(@Param('trackId') trackId: string) {
    return this.modulesService.findByTrack(trackId);
  }

  @Post('track/:trackId')
  @Roles(Role.ADMIN)
  create(@Param('trackId') trackId: string, @Body() dto: CreateModuleDto) {
    return this.modulesService.create(trackId, dto);
  }

  @Put(':id')
  @Roles(Role.ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateModuleDto) {
    return this.modulesService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.modulesService.remove(id);
  }
}

// ── MODULE ────────────────────────────────────────────────────────────────────
@Module({
  controllers: [TracksController, ModulesController],
  providers: [TracksService, ModulesService],
  exports: [TracksService, ModulesService],
})
export class TracksModule {}
