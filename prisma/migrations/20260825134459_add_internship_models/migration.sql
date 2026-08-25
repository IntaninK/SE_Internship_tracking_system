/*
  Warnings:

  - Added the required column `password` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `role` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "Role" AS ENUM ('STUDENT', 'ADVISOR', 'COURSE_INSTRUCTOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "InternshipStage" AS ENUM ('PENDING_DOCUMENTS', 'PENDING_APPROVAL', 'READY');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "SkillType" AS ENUM ('SOFT', 'HARD');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('NOT_SUBMITTED', 'SUBMITTED_WAITING', 'INTERVIEWED_PENDING', 'INTERVIEW_PASSED', 'INTERVIEW_FAILED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "password" TEXT NOT NULL,
ADD COLUMN     "role" "Role" NOT NULL;

-- CreateTable
CREATE TABLE "Student" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "studentCode" TEXT NOT NULL,
    "nameTh" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "major" TEXT,
    "gpa" DOUBLE PRECISION,
    "phone" TEXT,
    "lineId" TEXT,
    "facebook" TEXT,
    "profileImageUrl" TEXT,
    "advisorId" INTEGER,
    "stage" "InternshipStage" NOT NULL DEFAULT 'PENDING_DOCUMENTS',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Staff" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentCV" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileName" TEXT,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "note" TEXT,
    "reviewedById" INTEGER,
    "reviewedAt" TIMESTAMP(3),
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentCV_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingRecord" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "skillType" "SkillType" NOT NULL,
    "hours" INTEGER NOT NULL,
    "certificateFileUrl" TEXT,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "note" TEXT,
    "reviewedById" INTEGER,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrainingRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistSection" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "ChecklistSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistItem" (
    "id" SERIAL NOT NULL,
    "sectionId" INTEGER NOT NULL,
    "order" INTEGER NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "ChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Company" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "checklistStatus" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "checklistNote" TEXT,
    "reviewedById" INTEGER,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyChecklistAnswer" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "checklistItemId" INTEGER NOT NULL,
    "checked" BOOLEAN NOT NULL DEFAULT false,
    "detail" TEXT,

    CONSTRAINT "CompanyChecklistAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanySubmission" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'NOT_SUBMITTED',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanySubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InternshipPlacement" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "companyId" INTEGER,
    "position" TEXT,
    "companyNameTh" TEXT,
    "contactPersonName" TEXT,
    "contactPersonPosition" TEXT,
    "companyAddress" TEXT,
    "companyPhone1" TEXT,
    "companyPhone2" TEXT,
    "companyEmail" TEXT,
    "province" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InternshipPlacement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Student_userId_key" ON "Student"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Student_studentCode_key" ON "Student"("studentCode");

-- CreateIndex
CREATE UNIQUE INDEX "Staff_userId_key" ON "Staff"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentCV_studentId_key" ON "StudentCV"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyChecklistAnswer_companyId_checklistItemId_key" ON "CompanyChecklistAnswer"("companyId", "checklistItemId");

-- CreateIndex
CREATE UNIQUE INDEX "CompanySubmission_companyId_key" ON "CompanySubmission"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "InternshipPlacement_studentId_key" ON "InternshipPlacement"("studentId");

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_advisorId_fkey" FOREIGN KEY ("advisorId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Staff" ADD CONSTRAINT "Staff_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentCV" ADD CONSTRAINT "StudentCV_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingRecord" ADD CONSTRAINT "TrainingRecord_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistItem" ADD CONSTRAINT "ChecklistItem_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "ChecklistSection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Company" ADD CONSTRAINT "Company_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyChecklistAnswer" ADD CONSTRAINT "CompanyChecklistAnswer_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyChecklistAnswer" ADD CONSTRAINT "CompanyChecklistAnswer_checklistItemId_fkey" FOREIGN KEY ("checklistItemId") REFERENCES "ChecklistItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanySubmission" ADD CONSTRAINT "CompanySubmission_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternshipPlacement" ADD CONSTRAINT "InternshipPlacement_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
