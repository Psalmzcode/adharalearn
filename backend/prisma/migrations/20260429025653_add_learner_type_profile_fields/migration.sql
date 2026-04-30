-- CreateEnum
CREATE TYPE "LearnerType" AS ENUM ('STUDENT', 'SCHOOL_LEAVER', 'NYSC', 'JOB_SEEKER', 'CAREER_SWITCHER', 'OTHER');

-- AlterTable
ALTER TABLE "LearnerProfile" ADD COLUMN     "currentStage" TEXT,
ADD COLUMN     "learnerType" "LearnerType" NOT NULL DEFAULT 'OTHER',
ADD COLUMN     "location" TEXT,
ADD COLUMN     "source" TEXT;
