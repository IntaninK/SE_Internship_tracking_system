// รอบออกฝึก: ฟังก์ชันที่ต้องใช้ฐานข้อมูล (ฟังก์ชันคำนวณล้วนอยู่ใน ./internshipWindowRules)
import prisma from "../db";
import type { InternshipCohort, InternshipWindow } from "@prisma/client";
import { findMajor } from "./majors";
import {
  type WindowStatus,
  canSubmitInWindow,
  cohortCodeOf,
  computeWindowStatus,
  termSortKey,
  todayYmdBangkok,
} from "./internshipWindowRules";

export * from "./internshipWindowRules";

export type WindowWithStatus = InternshipWindow & { cohort: InternshipCohort; status: WindowStatus };

/**
 * รอบออกฝึกที่นิสิต "ยื่นได้ตอนนี้"
 * - ปกติ: รอบของสาขาตัวเอง ในรุ่นตัวเอง
 * - นิสิตตกค้าง (internshipType = RETEST / รุ่นของตัวเองถูกปิดหรือไม่มีในระบบ): ยื่นรอบของรุ่นถัดไปได้ด้วย
 */
export async function getStudentWindowEligibility(student: {
  studentCode: string;
  major: string | null;
  internshipType?: string | null;
}) {
  const major = findMajor(student.major);
  const ownCode = cohortCodeOf(student.studentCode);
  if (!major || !ownCode) {
    const none: WindowWithStatus[] = [];
    return { majorCode: major?.code || null, ownCohort: null, isStraggler: false, windows: none, openWindows: none };
  }

  const ownCohort = await prisma.internshipCohort.findUnique({ where: { code: ownCode } });
  const isStraggler =
    student.internshipType === "RETEST" || !ownCohort || ownCohort.status === "ARCHIVED";

  const windows = await prisma.internshipWindow.findMany({
    where: {
      majorCode: major.code,
      cohort: isStraggler
        ? { status: "ACTIVE", code: { gte: ownCode } }
        : { code: ownCode },
    },
    include: { cohort: true },
  });
  windows.sort((a, b) => termSortKey(a.term) - termSortKey(b.term));

  const today = todayYmdBangkok();
  const withStatus: WindowWithStatus[] = windows.map((w) => ({ ...w, status: computeWindowStatus(w, today) }));
  return {
    majorCode: major.code,
    ownCohort,
    isStraggler,
    windows: withStatus,
    openWindows: withStatus.filter((w) => canSubmitInWindow(w.status)),
  };
}


/**
 * นิสิต "กำลังฝึกงาน" อยู่หรือไม่ (ใช้ล็อก CV / ชั่วโมงอบรมเป็นอ่านอย่างเดียว)
 * = ออกหนังสือส่งตัวแล้ว และรอบออกฝึกของนิสิตยังไม่จบ (ยังไม่ถึงวันสิ้นสุดการฝึก / พี่จอมยังไม่กด "จบรอบ")
 * ถ้าหารอบออกฝึกไม่ได้ (ข้อมูลเก่าก่อนมีระบบรุ่น) จะไม่ล็อก เพราะไม่รู้วันจบ
 */
export async function getInternshipLock(
  student: { studentCode: string; major: string | null; internshipWindowId?: number | null },
  dispatchLetterIssued: boolean,
  currentTerm?: string | null
): Promise<{ locked: boolean; message: string; window: InternshipWindow | null }> {
  const none = { locked: false, message: "", window: null };
  if (!dispatchLetterIssued) return none;

  let window: InternshipWindow | null = null;
  if (student.internshipWindowId) {
    window = await prisma.internshipWindow.findUnique({ where: { id: student.internshipWindowId } });
  }
  if (!window) {
    const major = findMajor(student.major);
    const code = cohortCodeOf(student.studentCode);
    if (major && code) {
      const own = await prisma.internshipWindow.findMany({
        where: { majorCode: major.code, cohort: { code } },
      });
      const termOnly = String(currentTerm || "").match(/[123]\/\d{4}/)?.[0];
      window = own.find((w) => w.term === termOnly) || (own.length === 1 ? own[0] : null);
    }
  }
  if (!window) return none;

  if (computeWindowStatus(window) === "COMPLETED") return { ...none, window };
  const end = window.internEndDate ? window.internEndDate.toISOString().slice(0, 10) : "";
  return {
    locked: true,
    window,
    message:
      `อยู่ระหว่างฝึกงาน (รอบ ${window.term}) — ไม่สามารถแก้ไข CV และชั่วโมงอบรมได้ในช่วงนี้` +
      (end ? ` จะแก้ไขได้อีกครั้งหลังวันที่ ${end}` : " จะแก้ไขได้อีกครั้งเมื่อเจ้าหน้าที่ปิดรอบการฝึก"),
  };
}
