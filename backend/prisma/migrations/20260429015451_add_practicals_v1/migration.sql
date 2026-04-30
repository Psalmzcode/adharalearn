-- CreateEnum
CREATE TYPE "PracticalScope" AS ENUM ('MODULE', 'BUNDLE', 'TRACK');

-- CreateEnum
CREATE TYPE "PracticalSubmissionStatus" AS ENUM ('SUBMITTED', 'APPROVED', 'CHANGES_REQUESTED', 'REJECTED');

-- CreateTable
CREATE TABLE "PracticalTemplate" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "scope" "PracticalScope" NOT NULL DEFAULT 'MODULE',
    "moduleId" TEXT,
    "bundleId" TEXT,
    "title" TEXT NOT NULL,
    "briefMd" TEXT NOT NULL,
    "instructionsMd" TEXT,
    "requiredForCompletion" BOOLEAN NOT NULL DEFAULT true,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PracticalTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PracticalSubmission" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "moduleId" TEXT,
    "repoUrl" TEXT,
    "liveUrl" TEXT,
    "fileUrl" TEXT,
    "submissionText" TEXT,
    "status" "PracticalSubmissionStatus" NOT NULL DEFAULT 'SUBMITTED',
    "feedback" TEXT,
    "score" INTEGER,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PracticalSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PracticalTemplate_courseId_scope_idx" ON "PracticalTemplate"("courseId", "scope");

-- CreateIndex
CREATE INDEX "PracticalTemplate_moduleId_idx" ON "PracticalTemplate"("moduleId");

-- CreateIndex
CREATE INDEX "PracticalTemplate_bundleId_idx" ON "PracticalTemplate"("bundleId");

-- CreateIndex
CREATE INDEX "PracticalSubmission_userId_status_idx" ON "PracticalSubmission"("userId", "status");

-- CreateIndex
CREATE INDEX "PracticalSubmission_templateId_status_idx" ON "PracticalSubmission"("templateId", "status");

-- AddForeignKey
ALTER TABLE "PracticalTemplate" ADD CONSTRAINT "PracticalTemplate_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticalTemplate" ADD CONSTRAINT "PracticalTemplate_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "CourseModule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticalTemplate" ADD CONSTRAINT "PracticalTemplate_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "CourseBundle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticalSubmission" ADD CONSTRAINT "PracticalSubmission_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "PracticalTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticalSubmission" ADD CONSTRAINT "PracticalSubmission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticalSubmission" ADD CONSTRAINT "PracticalSubmission_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "CourseModule"("id") ON DELETE SET NULL ON UPDATE CASCADE;
