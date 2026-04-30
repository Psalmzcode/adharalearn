import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
@Injectable()
export class CurriculumService {
  constructor(private prisma: PrismaService) {}
  getModules(trackId: string) { return this.prisma.module.findMany({ where:{ trackId }, orderBy:{ order:'asc' } }); }
  getAssignments(cohortId: string) { return this.prisma.assignment.findMany({ where:{ cohortId }, orderBy:{ dueAt:'asc' }, include:{ module:{ select:{ title:true,order:true } } } }); }
  submitAssignment(data: { learnerId:string; assignmentId:string; repoUrl?:string; deployedUrl?:string; notes?:string }) {
    return this.prisma.submission.upsert({ where:{ learnerId_assignmentId:{ learnerId:data.learnerId,assignmentId:data.assignmentId } }, create:{ ...data,status:'SUBMITTED',submittedAt:new Date() }, update:{ ...data,status:'SUBMITTED',submittedAt:new Date() } });
  }
  getMySubmissions(userId: string) { return this.prisma.submission.findMany({ where:{ learner:{ userId } }, include:{ assignment:{ select:{ title:true,maxScore:true,dueAt:true } }, grade:true } }); }
}