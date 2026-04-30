import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Module } from '@nestjs/common';

export class SendMessageDto {
  @ApiProperty() @IsString() recipientUserId: string;
  @ApiProperty() @IsString() text: string;
}

@Injectable()
export class MessagesService {
  constructor(private prisma: PrismaService) {}

  private async resolveProfiles(userIdA: string, userIdB: string) {
    const [userA, userB] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userIdA } }),
      this.prisma.user.findUnique({ where: { id: userIdB } }),
    ]);
    if (!userA || !userB) throw new NotFoundException('User not found');
    const learnerUser = userA.role === 'LEARNER' ? userA : userB;
    const facilitatorUser = userA.role === 'FACILITATOR' ? userA : userB;
    const [lp, fp] = await Promise.all([
      this.prisma.learnerProfile.findUnique({ where: { userId: learnerUser.id } }),
      this.prisma.facilitatorProfile.findUnique({ where: { userId: facilitatorUser.id } }),
    ]);
    if (!lp || !fp) throw new ForbiddenException('Invalid conversation parties');
    return { learnerId: lp.id, facilitatorId: fp.id };
  }

  async send(senderUserId: string, dto: SendMessageDto) {
    const { learnerId, facilitatorId } = await this.resolveProfiles(senderUserId, dto.recipientUserId);
    return this.prisma.message.create({
      data: { senderId: senderUserId, learnerId, facilitatorId, text: dto.text },
      include: { sender: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, role: true } } },
    });
  }

  async getConversation(userId: string, otherUserId: string) {
    const { learnerId, facilitatorId } = await this.resolveProfiles(userId, otherUserId);
    return this.prisma.message.findMany({
      where: { learnerId, facilitatorId },
      include: { sender: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, role: true } } },
      orderBy: { sentAt: 'asc' },
    });
  }

  async getConversations(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.role === 'LEARNER') {
      const lp = await this.prisma.learnerProfile.findUnique({ where: { userId } });
      if (!lp) return [];
      return this.prisma.message.findMany({
        where: { learnerId: lp.id },
        include: {
          facilitatorProfile: { include: { user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } } },
        },
        orderBy: { sentAt: 'desc' },
        distinct: ['facilitatorId'],
      });
    } else {
      const fp = await this.prisma.facilitatorProfile.findUnique({ where: { userId } });
      if (!fp) return [];
      return this.prisma.message.findMany({
        where: { facilitatorId: fp.id },
        include: {
          learnerProfile: { include: { user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } } },
        },
        orderBy: { sentAt: 'desc' },
        distinct: ['learnerId'],
      });
    }
  }
}

@ApiTags('Messages')
@ApiBearerAuth()
@Controller('messages')
export class MessagesController {
  constructor(private messagesService: MessagesService) {}

  @Get('conversations')
  @Roles(Role.LEARNER, Role.FACILITATOR)
  getConversations(@CurrentUser('id') userId: string) {
    return this.messagesService.getConversations(userId);
  }

  @Get('conversation/:otherUserId')
  @Roles(Role.LEARNER, Role.FACILITATOR)
  getConversation(@CurrentUser('id') userId: string, @Param('otherUserId') otherUserId: string) {
    return this.messagesService.getConversation(userId, otherUserId);
  }

  @Post()
  @Roles(Role.LEARNER, Role.FACILITATOR)
  send(@CurrentUser('id') userId: string, @Body() dto: SendMessageDto) {
    return this.messagesService.send(userId, dto);
  }
}

@Module({ controllers: [MessagesController], providers: [MessagesService], exports: [MessagesService] })
export class MessagesModule {}
