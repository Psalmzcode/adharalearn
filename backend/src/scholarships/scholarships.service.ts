import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
@Injectable()
export class ScholarshipsService {
  constructor(private prisma: PrismaService) {}
  findAll() { return this.prisma.scholarship.findMany({ include:{ learner:{ include:{ user:{ select:{ firstName:true,lastName:true,email:true } } } } }, orderBy:{ appliedAt:'desc' } }); }
  apply(data: any) { return this.prisma.scholarship.create({ data }); }
  review(id: string, status: 'APPROVED'|'REJECTED', reviewedAt=new Date()) { return this.prisma.scholarship.update({ where:{ id }, data:{ status,reviewedAt } }); }
  disburse(id: string) { return this.prisma.scholarship.update({ where:{ id }, data:{ status:'DISBURSED',disbursedAt:new Date() } }); }
}