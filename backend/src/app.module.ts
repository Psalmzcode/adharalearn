import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { TracksModule } from './tracks/tracks.module';
import { CohortsModule } from './cohorts/cohorts.module';
import { LearnersModule } from './learners/learners.module';
import { FacilitatorsModule } from './facilitators/facilitators.module';
import { EnrollmentsModule } from './enrollments/enrollments.module';
import { AssignmentsModule } from './assignments/assignments.module';
import { CurriculumModule } from './curriculum/curriculum.module';
import { SessionsModule } from './sessions/sessions.module';
import { GradesModule } from './grades/grades.module';
import { CbtModule } from './cbt/cbt.module';
import { ScholarshipsModule } from './scholarships/scholarships.module';
import { AnnouncementsModule } from './announcements/announcements.module';
import { MessagesModule } from './messages/messages.module';
import { NotificationsModule } from './notifications/notifications.module';
import { CertificatesModule } from './certificates/certificates.module';
import { PaymentsModule } from './payments/payments.module';
import { ReportsModule } from './reports/reports.module';
import { CohortChatModule } from './cohort-chat/cohort-chat.module';
import { ModuleProgressModule } from './module-progress/module-progress.module';
import { JobsModule } from './jobs/jobs.module';
import { AlumniModule } from './alumni/alumni.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    PrismaModule,
    AuthModule,
    TracksModule,
    CohortsModule,
    LearnersModule,
    FacilitatorsModule,
    EnrollmentsModule,
    AssignmentsModule,
    CurriculumModule,
    SessionsModule,
    GradesModule,
    CbtModule,
    ScholarshipsModule,
    AnnouncementsModule,
    MessagesModule,
    NotificationsModule,
    CertificatesModule,
    PaymentsModule,
    ReportsModule,
    CohortChatModule,
    ModuleProgressModule,
    JobsModule,
    AlumniModule,
  ],
})
export class AppModule {}
