/*
  Warnings:

  - The values [INTERVIEW_FAILED] on the enum `SubmissionStatus` will be removed. If these variants are still used in the database, this will fail.
  - A unique constraint covering the columns `[sectionId,order]` on the table `ChecklistItem` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[order]` on the table `ChecklistSection` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "SubmissionStatus_new" AS ENUM ('NOT_SUBMITTED', 'SUBMITTED_WAITING', 'INTERVIEWED_PENDING', 'INTERVIEW_PASSED', 'INTERVIEW_FAILED_REAPPLIED');
ALTER TABLE "public"."CompanySubmission" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "CompanySubmission" ALTER COLUMN "status" TYPE "SubmissionStatus_new" USING ("status"::text::"SubmissionStatus_new");
ALTER TYPE "SubmissionStatus" RENAME TO "SubmissionStatus_old";
ALTER TYPE "SubmissionStatus_new" RENAME TO "SubmissionStatus";
DROP TYPE "public"."SubmissionStatus_old";
ALTER TABLE "CompanySubmission" ALTER COLUMN "status" SET DEFAULT 'NOT_SUBMITTED';
COMMIT;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "password" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "ChecklistItem_sectionId_order_key" ON "ChecklistItem"("sectionId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "ChecklistSection_order_key" ON "ChecklistSection"("order");
