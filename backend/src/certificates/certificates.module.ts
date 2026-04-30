import { Injectable } from '@nestjs/common';
import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { Controller, Get, Post, Delete, Param, Body, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Module } from '@nestjs/common';

export class IssueCertificateDto {
  @ApiProperty() @IsString() learnerId: string;
  @ApiProperty() @IsString() trackName: string;
  @ApiProperty() @IsString() cohortName: string;
  @ApiPropertyOptional() @IsOptional() @IsString() fileUrl?: string;
}

@Injectable()
export class CertificatesService {
  constructor(private prisma: PrismaService) {}

  getForLearner(userId: string) {
    return this.prisma.certificate.findMany({
      where: { learner: { userId } },
      orderBy: { issuedAt: 'desc' },
    });
  }

  getAll(cohortName?: string) {
    return this.prisma.certificate.findMany({
      where: cohortName ? { cohortName } : {},
      include: {
        learner: { include: { user: { select: { firstName: true, lastName: true, email: true } } } },
      },
      orderBy: { issuedAt: 'desc' },
    });
  }

  issue(dto: IssueCertificateDto) {
    return this.prisma.certificate.create({ data: dto });
  }

  revoke(id: string) {
    return this.prisma.certificate.delete({ where: { id } });
  }
}

@ApiTags('Certificates')
@ApiBearerAuth()
@Controller('certificates')
export class CertificatesController {
  constructor(private certificatesService: CertificatesService) {}

  @Get('mine')
  @Roles(Role.LEARNER)
  getForMe(@CurrentUser('id') userId: string) {
    return this.certificatesService.getForLearner(userId);
  }

  @Get()
  @Roles(Role.ADMIN)
  getAll(@Query('cohortName') cohortName: string) {
    return this.certificatesService.getAll(cohortName);
  }

  @Post()
  @Roles(Role.ADMIN)
  issue(@Body() dto: IssueCertificateDto) {
    return this.certificatesService.issue(dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  revoke(@Param('id') id: string) {
    return this.certificatesService.revoke(id);
  }
}

@Module({ controllers: [CertificatesController], providers: [CertificatesService], exports: [CertificatesService] })
export class CertificatesModule {}
