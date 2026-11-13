// =====================================================================
// รุ่น (Cohort) & รอบออกฝึก (Internship Window): ตัวช่วยคำนวณสถานะและสิทธิ์ยื่นของนิสิต
// - สถานะคำนวณจากวันที่ทุกครั้ง (Auto-lock เมื่อพ้นวันปิด) ไม่ต้องมี cron
// - พี่จอม Override ได้ด้วย extendedOpen (เปิดต่อพิเศษ) และ isCompleted (จบรอบ)
// =====================================================================
import { calculateCurrentAcademicYear } from "./studentImportParser";

export type WindowStatus =
  | "LOCKED"       // พี่จอมยังไม่ปลดล็อก
  | "NOT_YET_OPEN" // ปลดล็อกแล้วแต่ยังไม่ถึงวันเปิด
  | "OPEN"         // เปิดให้ยื่น
  | "EXTENDED"     // พ้นวันปิดแล้วแต่พี่จอมเปิดต่อพิเศษ
  | "EXPIRED"      // พ้นวันปิด (ล็อกอัตโนมัติ)
  | "COMPLETED";   // จบรอบ (กดเอง หรือพ้นวันสิ้นสุดการฝึก)

export const WINDOW_STATUS_LABEL: Record<WindowStatus, string> = {
  LOCKED: "ล็อกอยู่",
  NOT_YET_OPEN: "ยังไม่ถึงวันเปิด",
  OPEN: "เปิดยื่น",
  EXTENDED: "เปิดต่อพิเศษ",
  EXPIRED: "หมดเวลา (ล็อกอัตโนมัติ)",
  COMPLETED: "จบรอบแล้ว",
};

interface WindowLike {
  openDate: Date | null;
  closeDate: Date | null;
  internEndDate: Date | null;
  isUnlocked: boolean;
  extendedOpen: boolean;
  isCompleted: boolean;
}

/** วันที่ปัจจุบันตามเวลาไทย รูปแบบ YYYY-MM-DD */
export function todayYmdBangkok(now: Date = new Date()): string {
  return new Date(now.getTime() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** แปลงค่า @db.Date (UTC เที่ยงคืน) เป็น YYYY-MM-DD */
export function ymd(d: Date | null | undefined): string {
  return d ? d.toISOString().slice(0, 10) : "";
}

/** แปลง "YYYY-MM-DD" จากฟอร์มเป็น Date สำหรับคอลัมน์ @db.Date (ค่าว่าง = null) */
export function parseYmd(v: unknown): Date | null {
  const s = String(v ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T00:00:00.000Z`);
  return isNaN(d.getTime()) ? null : d;
}

export function computeWindowStatus(w: WindowLike, today: string = todayYmdBangkok()): WindowStatus {
  const end = ymd(w.internEndDate);
  if (w.isCompleted || (end && today > end)) return "COMPLETED";
  if (!w.isUnlocked) return "LOCKED";
  const open = ymd(w.openDate);
  const close = ymd(w.closeDate);
  if (open && today < open) return "NOT_YET_OPEN";
  if (close && today > close) return w.extendedOpen ? "EXTENDED" : "EXPIRED";
  return "OPEN";
}

export function canSubmitInWindow(status: WindowStatus): boolean {
  return status === "OPEN" || status === "EXTENDED";
}

/** รหัสรุ่นจากรหัสนิสิต เช่น "67023110" -> "67" */
export function cohortCodeOf(studentCode: string): string {
  const m = String(studentCode || "").match(/^(\d{2})/);
  return m ? m[1] : "";
}

/** ชั้นปีปัจจุบันของรุ่น เช่น รุ่น 67 ในปีการศึกษา 2569 = ปี 3 */
export function classYearOfCohort(cohortCode: string, academicYear: number = calculateCurrentAcademicYear()): number | null {
  const n = parseInt(cohortCode, 10);
  if (isNaN(n)) return null;
  return academicYear - (2500 + n) + 1;
}

/** เลื่อนปีของรอบเทอม เช่น ("2/2568", 1) -> "2/2569" */
export function shiftTerm(term: string, years: number): string {
  return String(term).replace(/(\d{4})\s*$/, (y) => String(parseInt(y, 10) + years));
}

/** คีย์เรียงรอบเทอมตามเวลา เช่น "2/2568" -> 25682, "3/2569" -> 25693 */
export function termSortKey(term: string): number {
  const m = String(term).match(/^\s*(\d)\s*\/\s*(\d{4})/);
  return m ? parseInt(m[2], 10) * 10 + parseInt(m[1], 10) : Number.MAX_SAFE_INTEGER;
}

export function isValidTerm(term: string): boolean {
  return /^[123]\/\d{4}$/.test(String(term).trim());
}

export function shiftDate(d: Date | null, years: number): Date | null {
  if (!d) return null;
  const nd = new Date(d.getTime());
  nd.setUTCFullYear(nd.getUTCFullYear() + years);
  return nd;
}

/**
 * เลือกรอบออกฝึกที่จะผูกกับนิสิตตอนยื่น Checklist
 * - มีรอบเปิดรอบเดียว -> ผูกอัตโนมัติ (ไม่ต้องให้เลือก)
 * - มีหลายรอบ (เช่น Summer + เทอม 1 เปิดพร้อมกัน / นิสิตตกค้างเลือกข้ามรุ่น) -> ต้องระบุ requestedId
 */
export function resolveSubmissionWindow<T extends { id: number }>(
  openWindows: T[],
  requestedId?: unknown,
  currentAssignedId?: number | null
): { window: T | null; error?: string } {
  if (openWindows.length === 0) {
    return { window: null, error: "สาขาของคุณยังไม่เปิดรอบยื่นขอฝึกงาน (รอปลดล็อกจากเจ้าหน้าที่คณะ)" };
  }
  const reqId = requestedId !== undefined && requestedId !== null && requestedId !== "" ? Number(requestedId) : null;
  if (reqId) {
    const found = openWindows.find((w) => w.id === reqId);
    if (!found) return { window: null, error: "รอบออกฝึกที่เลือกไม่ได้เปิดรับยื่นแล้ว กรุณาเลือกใหม่" };
    return { window: found };
  }
  if (openWindows.length === 1) return { window: openWindows[0] };
  const current = currentAssignedId ? openWindows.find((w) => w.id === currentAssignedId) : null;
  if (current) return { window: current };
  return { window: null, error: "มีรอบออกฝึกเปิดรับมากกว่า 1 รอบ กรุณาเลือกรอบที่ต้องการฝึก" };
}

/** ข้อความแสดงรอบ เช่น "3/2569 (Summer · ไม่บังคับ)" */
export function windowDisplayLabel(w: { term: string; termType: string; isOptional: boolean }): string {
  const tags = [w.termType === "SUMMER" ? "Summer" : "", w.isOptional ? "ไม่บังคับ" : ""].filter(Boolean);
  return tags.length ? `${w.term} (${tags.join(" · ")})` : w.term;
}
