// =====================================================================
// API: รุ่น (Cohort) & รอบออกฝึก (Internship Window) — หน้า "รอบฝึกงาน & ปลดล็อก" ของ Super Admin
// mount ใต้ /api/admin (ผ่าน requireAdmin แล้ว) และจำกัดการแก้ไขเฉพาะ Staff / Admin
// =====================================================================
import express, { NextFunction, Request, Response } from "express";
import prisma from "../db";
import { ICT_MAJORS, findMajor } from "../utils/majors";
import { loadSuperAdminState } from "../utils/superAdminStore";
import {
  WINDOW_STATUS_LABEL,
  canSubmitInWindow,
  classYearOfCohort,
  cohortCodeOf,
  computeWindowStatus,
  isValidTerm,
  parseYmd,
  shiftDate,
  shiftTerm,
  termSortKey,
  todayYmdBangkok,
  ymd,
} from "../utils/internshipWindowRules";

const router = express.Router();

function requireStaffOrAdmin(req: Request, res: Response, next: NextFunction) {
  const ok = Boolean(
    (req as any).staff?.isStaff || req.session.user?.role === "STAFF" || req.session.user?.role === "ADMIN"
  );
  if (!ok) {
    return res.status(403).json({ success: false, message: "เฉพาะเจ้าหน้าที่คณะ (Staff) หรือ Admin เท่านั้น" });
  }
  next();
}

function serializeWindow(w: any, today: string) {
  const status = computeWindowStatus(w, today);
  return {
    id: w.id,
    cohortId: w.cohortId,
    majorCode: w.majorCode,
    term: w.term,
    termType: w.termType,
    isOptional: w.isOptional,
    openDate: ymd(w.openDate),
    closeDate: ymd(w.closeDate),
    internEndDate: ymd(w.internEndDate),
    isUnlocked: w.isUnlocked,
    extendedOpen: w.extendedOpen,
    isCompleted: w.isCompleted,
    completedAt: w.completedAt,
    note: w.note || "",
    status,
    statusLabel: WINDOW_STATUS_LABEL[status],
    studentCount: w._count?.students ?? 0,
  };
}

/** ข้อมูลฟิลด์รอบออกฝึกจาก body (เฉพาะที่ส่งมา) */
function windowFieldsFromBody(body: any) {
  const data: Record<string, any> = {};
  if (body.term !== undefined) data.term = String(body.term).trim();
  if (body.termType !== undefined) data.termType = body.termType === "SUMMER" ? "SUMMER" : "REGULAR";
  if (body.isOptional !== undefined) data.isOptional = Boolean(body.isOptional);
  if (body.openDate !== undefined) data.openDate = parseYmd(body.openDate);
  if (body.closeDate !== undefined) data.closeDate = parseYmd(body.closeDate);
  if (body.internEndDate !== undefined) data.internEndDate = parseYmd(body.internEndDate);
  if (body.isUnlocked !== undefined) data.isUnlocked = Boolean(body.isUnlocked);
  if (body.extendedOpen !== undefined) data.extendedOpen = Boolean(body.extendedOpen);
  if (body.note !== undefined) data.note = String(body.note || "").trim() || null;
  if (body.isCompleted !== undefined) {
    data.isCompleted = Boolean(body.isCompleted);
    data.completedAt = data.isCompleted ? new Date() : null;
  }
  return data;
}

function validateWindowData(data: Record<string, any>): string | null {
  if (data.term !== undefined && !isValidTerm(data.term)) {
    return "รูปแบบรอบเทอมไม่ถูกต้อง (ต้องเป็น เทอม/ปี พ.ศ. เช่น 1/2569 หรือ 3/2569)";
  }
  const open = ymd(data.openDate);
  const close = ymd(data.closeDate);
  if (open && close && open > close) return "วันเปิดยื่นต้องไม่เกินวันปิดยื่น";
  return null;
}

/** รายชื่อนิสิตของรุ่น (ใช้นับจำนวนรายสาขา และตรวจก่อนปิดรุ่น) */
async function getCohortStudents(code: string) {
  return prisma.student.findMany({
    where: { studentCode: { startsWith: code } },
    select: { id: true, studentCode: true, nameTh: true, major: true, internshipType: true },
  });
}

// ---------------------------------------------------------------------
// GET /super-admin/cohorts — รุ่นทั้งหมด + รอบออกฝึกรายสาขา + จำนวนนิสิต
// ---------------------------------------------------------------------
router.get("/super-admin/cohorts", async (_req: Request, res: Response) => {
  try {
    const today = todayYmdBangkok();
    const cohorts = await prisma.internshipCohort.findMany({
      orderBy: { code: "desc" },
      include: { windows: { include: { _count: { select: { students: true } } } } },
    });
    const allStudents = await prisma.student.findMany({ select: { studentCode: true, major: true } });

    const data = cohorts.map((c) => {
      const counts: Record<string, number> = {};
      for (const s of allStudents) {
        if (cohortCodeOf(s.studentCode) !== c.code) continue;
        const m = findMajor(s.major);
        if (m) counts[m.code] = (counts[m.code] || 0) + 1;
      }
      const windows = [...c.windows]
        .sort((a, b) => termSortKey(a.term) - termSortKey(b.term))
        .map((w) => serializeWindow(w, today));
      return {
        id: c.id,
        code: c.code,
        status: c.status,
        note: c.note || "",
        archivedAt: c.archivedAt,
        archivedBy: c.archivedBy,
        classYear: classYearOfCohort(c.code),
        majors: ICT_MAJORS.map((m) => ({
          code: m.code,
          name: m.name,
          prepSchedule: m.prepSchedule,
          internSchedule: m.internSchedule,
          studentCount: counts[m.code] || 0,
          windows: windows.filter((w) => w.majorCode === m.code),
        })),
      };
    });

    res.json({ success: true, today, cohorts: data });
  } catch (err) {
    console.error("GET /api/admin/super-admin/cohorts error:", err);
    res.status(500).json({ success: false, message: "โหลดข้อมูลรุ่นและรอบออกฝึกไม่สำเร็จ" });
  }
});

// ---------------------------------------------------------------------
// POST /super-admin/cohorts — สร้างรุ่นใหม่ (เลือกคัดลอกโครงสร้างรอบจากรุ่นอื่น + เลื่อนปีอัตโนมัติ)
// ---------------------------------------------------------------------
router.post("/super-admin/cohorts", requireStaffOrAdmin, async (req: Request, res: Response) => {
  try {
    const code = String(req.body.code || "").trim();
    const copyFromId = req.body.copyFromCohortId ? parseInt(req.body.copyFromCohortId, 10) : null;
    if (!/^\d{2}$/.test(code)) {
      return res.status(400).json({ success: false, message: "รหัสรุ่นต้องเป็นตัวเลข 2 หลัก เช่น 68" });
    }
    if (await prisma.internshipCohort.findUnique({ where: { code } })) {
      return res.status(400).json({ success: false, message: `มีรุ่น ${code} อยู่แล้ว` });
    }

    const cohort = await prisma.internshipCohort.create({ data: { code } });
    let copied = 0;
    if (copyFromId) {
      const source = await prisma.internshipCohort.findUnique({
        where: { id: copyFromId },
        include: { windows: true },
      });
      if (source) {
        const years = parseInt(code, 10) - parseInt(source.code, 10);
        for (const w of source.windows) {
          await prisma.internshipWindow.create({
            data: {
              cohortId: cohort.id,
              majorCode: w.majorCode,
              term: shiftTerm(w.term, years),
              termType: w.termType,
              isOptional: w.isOptional,
              openDate: shiftDate(w.openDate, years),
              closeDate: shiftDate(w.closeDate, years),
              internEndDate: shiftDate(w.internEndDate, years),
              note: w.note,
              sortOrder: w.sortOrder,
              // รุ่นใหม่เริ่มแบบล็อกไว้ก่อนเสมอ
              isUnlocked: false,
            },
          });
          copied++;
        }
      }
    }

    res.json({
      success: true,
      cohortId: cohort.id,
      message: copied
        ? `สร้างรุ่น ${code} และคัดลอกรอบออกฝึก ${copied} รอบ (เลื่อนปีให้แล้ว / สถานะล็อกทั้งหมด)`
        : `สร้างรุ่น ${code} เรียบร้อยแล้ว`,
    });
  } catch (err) {
    console.error("POST /api/admin/super-admin/cohorts error:", err);
    res.status(500).json({ success: false, message: "สร้างรุ่นไม่สำเร็จ" });
  }
});

// ---------------------------------------------------------------------
// POST /super-admin/cohorts/:id/archive — ปิดรุ่น / เก็บเข้าประวัติ
//   body.dryRun = true -> คืนรายชื่อนิสิตที่ยังไม่ได้หนังสือส่งตัว (ใช้แสดงคำเตือนก่อนยืนยัน)
//   ปิดจริง -> นิสิตที่ยังไม่ได้หนังสือส่งตัวถูกตั้งเป็น RETEST อัตโนมัติ
// ---------------------------------------------------------------------
router.post("/super-admin/cohorts/:id/archive", requireStaffOrAdmin, async (req: Request, res: Response) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const cohort = await prisma.internshipCohort.findUnique({ where: { id } });
    if (!cohort) return res.status(404).json({ success: false, message: "ไม่พบรุ่นนี้" });
    if (cohort.status === "ARCHIVED") {
      return res.status(400).json({ success: false, message: `รุ่น ${cohort.code} ถูกปิดไปแล้ว` });
    }

    const state = loadSuperAdminState();
    const students = await getCohortStudents(cohort.code);
    const pending = students.filter((s) => !state.docWorkflowMap[String(s.id)]?.dispatchLetterIssued);

    if (req.body.dryRun) {
      return res.json({
        success: true,
        totalStudents: students.length,
        pendingCount: pending.length,
        pendingStudents: pending.slice(0, 50).map((s) => ({ studentCode: s.studentCode, nameTh: s.nameTh })),
      });
    }

    const actor = req.session.user?.username || req.session.user?.email || "Staff";
    await prisma.$transaction([
      prisma.internshipCohort.update({
        where: { id },
        data: { status: "ARCHIVED", archivedAt: new Date(), archivedBy: String(actor) },
      }),
      prisma.student.updateMany({
        where: { id: { in: pending.map((s) => s.id) } },
        data: { internshipType: "RETEST" },
      }),
    ]);

    res.json({
      success: true,
      message:
        `ปิดรุ่น ${cohort.code} เรียบร้อยแล้ว` +
        (pending.length ? ` — นิสิตที่ยังไม่ได้หนังสือส่งตัว ${pending.length} คน ถูกตั้งเป็น "ตกค้าง (RETEST)"` : ""),
    });
  } catch (err) {
    console.error("POST /api/admin/super-admin/cohorts/:id/archive error:", err);
    res.status(500).json({ success: false, message: "ปิดรุ่นไม่สำเร็จ" });
  }
});

// POST /super-admin/cohorts/:id/restore — นำรุ่นที่ปิดแล้วกลับมาใช้งาน (สถานะ RETEST ของนิสิตไม่ถูกย้อนอัตโนมัติ)
router.post("/super-admin/cohorts/:id/restore", requireStaffOrAdmin, async (req: Request, res: Response) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const cohort = await prisma.internshipCohort.update({
      where: { id },
      data: { status: "ACTIVE", archivedAt: null, archivedBy: null },
    });
    res.json({ success: true, message: `เปิดใช้งานรุ่น ${cohort.code} อีกครั้งแล้ว` });
  } catch (err) {
    console.error("POST /api/admin/super-admin/cohorts/:id/restore error:", err);
    res.status(500).json({ success: false, message: "เปิดใช้งานรุ่นไม่สำเร็จ" });
  }
});

// POST /super-admin/cohorts/:id/bulk — ปลดล็อก / ล็อก ทุกรอบออกฝึกในรุ่น
router.post("/super-admin/cohorts/:id/bulk", requireStaffOrAdmin, async (req: Request, res: Response) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const action = req.body.action;
    if (action !== "UNLOCK_ALL" && action !== "LOCK_ALL") {
      return res.status(400).json({ success: false, message: "action ไม่ถูกต้อง" });
    }
    const cohort = await prisma.internshipCohort.findUnique({ where: { id } });
    if (!cohort || cohort.status === "ARCHIVED") {
      return res.status(400).json({ success: false, message: "รุ่นนี้ถูกปิดแล้วหรือไม่พบในระบบ" });
    }
    const result = await prisma.internshipWindow.updateMany({
      where: { cohortId: id, isCompleted: false },
      data: action === "UNLOCK_ALL" ? { isUnlocked: true } : { isUnlocked: false, extendedOpen: false },
    });
    res.json({
      success: true,
      message: `${action === "UNLOCK_ALL" ? "ปลดล็อก" : "ล็อก"}รอบออกฝึกของรุ่น ${cohort.code} แล้ว ${result.count} รอบ`,
    });
  } catch (err) {
    console.error("POST /api/admin/super-admin/cohorts/:id/bulk error:", err);
    res.status(500).json({ success: false, message: "อัปเดตสถานะไม่สำเร็จ" });
  }
});

// ---------------------------------------------------------------------
// POST /super-admin/windows — เพิ่ม/อัปเดตรอบออกฝึกให้หลายสาขาพร้อมกัน (ตาม term เดียวกัน)
// ---------------------------------------------------------------------
router.post("/super-admin/windows", requireStaffOrAdmin, async (req: Request, res: Response) => {
  try {
    const cohortId = parseInt(req.body.cohortId, 10);
    const majorCodes: string[] = Array.isArray(req.body.majorCodes) ? req.body.majorCodes : [];
    const validCodes = majorCodes.filter((c) => ICT_MAJORS.some((m) => m.code === c));
    if (!cohortId || validCodes.length === 0) {
      return res.status(400).json({ success: false, message: "กรุณาเลือกรุ่นและสาขาอย่างน้อย 1 สาขา" });
    }
    const cohort = await prisma.internshipCohort.findUnique({ where: { id: cohortId } });
    if (!cohort || cohort.status === "ARCHIVED") {
      return res.status(400).json({ success: false, message: "รุ่นนี้ถูกปิดแล้วหรือไม่พบในระบบ" });
    }

    const data = windowFieldsFromBody(req.body);
    if (!data.term) return res.status(400).json({ success: false, message: "กรุณาระบุรอบเทอม เช่น 1/2569" });
    const err = validateWindowData(data);
    if (err) return res.status(400).json({ success: false, message: err });

    let created = 0;
    let updated = 0;
    for (const majorCode of validCodes) {
      const key = { cohortId_majorCode_term: { cohortId, majorCode, term: data.term } };
      const exists = await prisma.internshipWindow.findUnique({ where: key });
      if (exists) {
        await prisma.internshipWindow.update({ where: key, data });
        updated++;
      } else {
        await prisma.internshipWindow.create({ data: { ...(data as any), cohortId, majorCode } });
        created++;
      }
    }
    res.json({
      success: true,
      message: `รอบ ${data.term}: เพิ่มใหม่ ${created} สาขา, อัปเดต ${updated} สาขา`,
    });
  } catch (err) {
    console.error("POST /api/admin/super-admin/windows error:", err);
    res.status(500).json({ success: false, message: "บันทึกรอบออกฝึกไม่สำเร็จ" });
  }
});

// PATCH /super-admin/windows/:id — แก้ไขรอบออกฝึก (รวมปลดล็อก / เปิดต่อพิเศษ / จบรอบ)
router.patch("/super-admin/windows/:id", requireStaffOrAdmin, async (req: Request, res: Response) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const current = await prisma.internshipWindow.findUnique({ where: { id }, include: { cohort: true } });
    if (!current) return res.status(404).json({ success: false, message: "ไม่พบรอบออกฝึกนี้" });
    if (current.cohort.status === "ARCHIVED") {
      return res.status(400).json({ success: false, message: "รุ่นนี้ถูกปิดแล้ว (อ่านอย่างเดียว)" });
    }

    const data = windowFieldsFromBody(req.body);
    const err = validateWindowData({
      ...data,
      openDate: data.openDate !== undefined ? data.openDate : current.openDate,
      closeDate: data.closeDate !== undefined ? data.closeDate : current.closeDate,
    });
    if (err) return res.status(400).json({ success: false, message: err });
    if (data.term && data.term !== current.term) {
      const dup = await prisma.internshipWindow.findUnique({
        where: { cohortId_majorCode_term: { cohortId: current.cohortId, majorCode: current.majorCode, term: data.term } },
      });
      if (dup) return res.status(400).json({ success: false, message: `สาขานี้มีรอบ ${data.term} อยู่แล้ว` });
    }
    // ล็อกรอบ -> ยกเลิก "เปิดต่อพิเศษ" ด้วย
    if (data.isUnlocked === false) data.extendedOpen = false;

    const w = await prisma.internshipWindow.update({
      where: { id },
      data,
      include: { _count: { select: { students: true } } },
    });
    res.json({ success: true, window: serializeWindow(w, todayYmdBangkok()) });
  } catch (err) {
    console.error("PATCH /api/admin/super-admin/windows/:id error:", err);
    res.status(500).json({ success: false, message: "บันทึกรอบออกฝึกไม่สำเร็จ" });
  }
});

// DELETE /super-admin/windows/:id — ลบได้เฉพาะรอบที่ยังไม่มีนิสิตเลือก
router.delete("/super-admin/windows/:id", requireStaffOrAdmin, async (req: Request, res: Response) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const w = await prisma.internshipWindow.findUnique({
      where: { id },
      include: { cohort: true, _count: { select: { students: true } } },
    });
    if (!w) return res.status(404).json({ success: false, message: "ไม่พบรอบออกฝึกนี้" });
    if (w.cohort.status === "ARCHIVED") {
      return res.status(400).json({ success: false, message: "รุ่นนี้ถูกปิดแล้ว (อ่านอย่างเดียว)" });
    }
    if (w._count.students > 0) {
      return res.status(400).json({
        success: false,
        message: `ลบไม่ได้: มีนิสิตเลือกรอบนี้แล้ว ${w._count.students} คน (ใช้การล็อกแทน)`,
      });
    }
    await prisma.internshipWindow.delete({ where: { id } });
    res.json({ success: true, message: `ลบรอบ ${w.term} ของสาขา ${w.majorCode} แล้ว` });
  } catch (err) {
    console.error("DELETE /api/admin/super-admin/windows/:id error:", err);
    res.status(500).json({ success: false, message: "ลบรอบออกฝึกไม่สำเร็จ" });
  }
});

// ---------------------------------------------------------------------
// GET /super-admin/students/:id/cohort-info — รุ่น / รอบออกฝึก / สถานะตกค้างของนิสิต (หน้ารายละเอียดนิสิต)
// PATCH /super-admin/students/:id/internship-type — พี่จอมตั้ง RETEST (ตกค้าง) / NEW รายคน
// ---------------------------------------------------------------------
router.get("/super-admin/students/:id/cohort-info", async (req: Request, res: Response) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const student = await prisma.student.findUnique({
      where: { id },
      select: { id: true, studentCode: true, major: true, internshipType: true, internshipWindow: { include: { cohort: true } } },
    });
    if (!student) return res.status(404).json({ success: false, message: "ไม่พบข้อมูลนิสิต" });

    const code = cohortCodeOf(student.studentCode);
    const cohort = code ? await prisma.internshipCohort.findUnique({ where: { code } }) : null;
    const w = student.internshipWindow;
    const status = w ? computeWindowStatus(w) : null;
    res.json({
      success: true,
      cohortCode: code || null,
      cohortStatus: cohort?.status || null,
      classYear: code ? classYearOfCohort(code) : null,
      majorCode: findMajor(student.major)?.code || null,
      internshipType: student.internshipType || "NEW",
      isStraggler: student.internshipType === "RETEST" || !cohort || cohort.status === "ARCHIVED",
      window: w
        ? {
            id: w.id,
            term: w.term,
            termType: w.termType,
            cohortCode: w.cohort.code,
            internEndDate: ymd(w.internEndDate),
            status,
            statusLabel: status ? WINDOW_STATUS_LABEL[status] : "",
          }
        : null,
    });
  } catch (err) {
    console.error("GET /api/admin/super-admin/students/:id/cohort-info error:", err);
    res.status(500).json({ success: false, message: "โหลดข้อมูลรุ่นของนิสิตไม่สำเร็จ" });
  }
});

router.patch("/super-admin/students/:id/internship-type", requireStaffOrAdmin, async (req: Request, res: Response) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const type = req.body.internshipType === "RETEST" ? "RETEST" : req.body.internshipType === "NEW" ? "NEW" : null;
    if (!type) return res.status(400).json({ success: false, message: "internshipType ต้องเป็น NEW หรือ RETEST" });
    const student = await prisma.student.update({
      where: { id },
      data: { internshipType: type },
      select: { studentCode: true, nameTh: true },
    });
    res.json({
      success: true,
      message:
        type === "RETEST"
          ? `ตั้ง ${student.studentCode} ${student.nameTh} เป็น "ตกค้าง (RETEST)" แล้ว — ยื่นรอบออกฝึกของรุ่นถัดไปได้`
          : `ยกเลิกสถานะตกค้างของ ${student.studentCode} ${student.nameTh} แล้ว`,
    });
  } catch (err) {
    console.error("PATCH /api/admin/super-admin/students/:id/internship-type error:", err);
    res.status(500).json({ success: false, message: "อัปเดตสถานะนิสิตไม่สำเร็จ" });
  }
});

/** สรุปสำหรับ badge เมนู: จำนวนสาขาที่มีรอบเปิดยื่นอยู่ (ในรุ่นที่ใช้งาน) */
export async function getOpenMajorsSummary() {
  const today = todayYmdBangkok();
  const windows = await prisma.internshipWindow.findMany({ where: { cohort: { status: "ACTIVE" } } });
  const open = new Set(
    windows.filter((w) => canSubmitInWindow(computeWindowStatus(w, today))).map((w) => w.majorCode)
  );
  return { openMajors: open.size, totalMajors: ICT_MAJORS.length };
}

export default router;
