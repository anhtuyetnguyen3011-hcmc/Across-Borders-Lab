-- DropForeignKey
ALTER TABLE "PerformanceMetric" DROP CONSTRAINT "PerformanceMetric_scheduledPostId_fkey";

-- AlterTable
ALTER TABLE "PerformanceMetric" ALTER COLUMN "scheduledPostId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "PerformanceMetric" ADD CONSTRAINT "PerformanceMetric_scheduledPostId_fkey" FOREIGN KEY ("scheduledPostId") REFERENCES "ScheduledPost"("id") ON DELETE SET NULL ON UPDATE CASCADE;
