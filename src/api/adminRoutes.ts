import express, { Request, Response } from "express";
import multer from "multer";
import prisma from "../db";
import requireAdmin from "../auth/requireAdmin";
import { parseStudentSpreadsheet } from "../utils/studentImportParser";
import {
  loadSuperAdminState,
  saveSuperAdminState,
  calculateEventHours,
} from "../utils/superAdminStore";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB
});

const router = express.Router();

// ต้อง login + เป็น admin หรือ staff ทุก route ภายใต้ /api/admin
router.use(requireAdmin);

const STATUS_LABELS: Record<string, Record<string, string>> = {
  readiness: {
    approvedPlacement: "อนุมัติที่ฝึกงานแล้ว",
    cvApproved: "ตรวจCVผ่าน",
    trainingComplete: "ผ่านการตรวจชม.ครบ",
    cvNotReviewed: "ยังไม่ได้รีวิว CV",
    noDataOrHoursLack: "ไม่มีข้อมูล/ชม.ไม่ครบ",
  },
  training: {
    passedComplete: "ผ่านการตรวจชม.ครบ",
    completeNotChecked: "ชม.ครบ ยังไม่ตรวจ",
    checkedNotPass: "ตรวจแล้ว ยังไม่ผ่าน",
    hoursNotComplete: "ชั่วโมงยังไม่ครบ",
  },
  cv: {
    reviewed: "รีวิวCVแล้ว",
    notReviewed: "ยังไม่ได้รีวิว CV",
    failed: "ไม่ผ่าน CV",
    noCv: "ยังไม่ทำ CV",
  },
  placement: {
    approved: "อนุมัติที่ฝึกงานแล้ว",
    rejected: "ไม่อนุมัติที่ฝึกงาน",
    pending: "รอผล",
  },
};

function categorizeStudent(s: any) {
  const approvedTrainings = (s.trainingRecords || []).filter((t: any) => t.status === "APPROVED");
  const softHours = approvedTrainings
    .filter((t: any) => t.skillType === "SOFT")
    .reduce((sum: number, t: any) => sum + t.hours, 0);
  const hardHours = approvedTrainings
    .filter((t: any) => t.skillType === "HARD")
    .reduce((sum: number, t: any) => sum + t.hours, 0);
  const isTrainingComplete = softHours >= 12 && hardHours >= 18;
  const hasRejectedTraining = (s.trainingRecords || []).some((t: any) => t.status === "REJECTED");
  const hasPendingTraining = (s.trainingRecords || []).some((t: any) => t.status === "PENDING");

  // 1. สถานะการอบรม (Training)
  let trainingCategory = "hoursNotComplete";
  if (isTrainingComplete) {
    if (hasPendingTraining) {
      trainingCategory = "completeNotChecked";
    } else {
      trainingCategory = "passedComplete";
    }
  } else if (hasRejectedTraining) {
    trainingCategory = "checkedNotPass";
  } else {
    trainingCategory = "hoursNotComplete";
  }

  // 2. สถานะ CV
  let cvCategory = "noCv";
  if (!s.cv) {
    cvCategory = "noCv";
  } else if (s.cv.status === "APPROVED") {
    cvCategory = "reviewed";
  } else if (s.cv.status === "REJECTED") {
    cvCategory = "failed";
  } else {
    cvCategory = "notReviewed";
  }

  // 3. สถานะอนุมัติฝึกงาน (Placement)
  let placementCategory: string | null = null;
  if (s.placement) {
    if (s.placement.status === "APPROVED") {
      placementCategory = "approved";
    } else if (s.placement.status === "REJECTED") {
      placementCategory = "rejected";
    } else {
      placementCategory = "pending";
    }
  }

  // 4. สถานะความพร้อม (Readiness)
  let readinessCategory = "noDataOrHoursLack";
  if (s.placement && s.placement.status === "APPROVED") {
    readinessCategory = "approvedPlacement";
  } else if (s.cv && s.cv.status === "APPROVED") {
    readinessCategory = "cvApproved";
  } else if (isTrainingComplete) {
    readinessCategory = "trainingComplete";
  } else if (s.cv && s.cv.status === "PENDING") {
    readinessCategory = "cvNotReviewed";
  } else {
    readinessCategory = "noDataOrHoursLack";
  }

  // Overall status (สถานะรวมที่แสดงเป็น Badge เริ่มต้นในตาราง)
  let overallStatus = "ยังไม่มีข้อมูล";
  let statusCategory = "none";

  if (s.placement && s.placement.status === "APPROVED") {
    overallStatus = "อนุมัติที่ฝึกงานแล้ว";
    statusCategory = "placement_approved";
  } else if (s.placement && s.placement.status === "REJECTED") {
    overallStatus = "ไม่อนุมัติที่ฝึกงาน";
    statusCategory = "placement_rejected";
  } else if (s.placement && s.placement.status === "PENDING") {
    overallStatus = "รออนุมัติที่ฝึกงาน";
    statusCategory = "placement_pending";
  } else if (s.companies && s.companies.some((c: any) => c.submission && c.submission.status === "INTERVIEW_PASSED")) {
    overallStatus = "สัมภาษณ์ผ่านแล้ว";
    statusCategory = "interview_passed";
  } else if (s.cv && s.cv.status === "APPROVED" && isTrainingComplete) {
    overallStatus = "ตรวจCVผ่าน + ชม.ครบ";
    statusCategory = "ready";
  } else if (s.cv && s.cv.status === "APPROVED") {
    overallStatus = "รีวิวCVผ่านแล้ว";
    statusCategory = "cv_approved";
  } else if (s.cv && s.cv.status === "REJECTED") {
    overallStatus = "CVไม่ผ่าน";
    statusCategory = "cv_rejected";
  } else if (s.cv && s.cv.status === "PENDING") {
    overallStatus = "ยังไม่ได้รีวิว CV";
    statusCategory = "cv_pending";
  } else if (isTrainingComplete && !hasRejectedTraining) {
    overallStatus = "ผ่านการตรวจชม.ครบ";
    statusCategory = "training_complete";
  } else if (hasRejectedTraining) {
    overallStatus = "ชั่วโมงอบรมไม่ผ่าน";
    statusCategory = "training_rejected";
  } else if (s.trainingRecords && s.trainingRecords.length > 0) {
    overallStatus = "ชั่วโมงอบรมยังไม่ครบ";
    statusCategory = "training_incomplete";
  } else {
    overallStatus = "ยังไม่มีข้อมูล";
    statusCategory = "none";
  }

  return {
    softHours,
    hardHours,
    isTrainingComplete,
    hasRejectedTraining,
    hasPendingTraining,
    trainingCategory,
    cvCategory,
    placementCategory,
    readinessCategory,
    overallStatus,
    statusCategory,
    readinessLabel: STATUS_LABELS.readiness[readinessCategory],
    trainingLabel: STATUS_LABELS.training[trainingCategory],
    cvLabel: STATUS_LABELS.cv[cvCategory],
    placementLabel: placementCategory ? STATUS_LABELS.placement[placementCategory] : "-",
  };
}

// [REQ-06] ตรวจสอบว่าสถานประกอบการที่ยื่นฝึกงานจริง ตรงกับ 1 ในบริษัทที่ผ่านการอนุมัติใน Checklist หรือไม่
function checkPlacementMatchesChecklist(placement: any, companies: any[]): boolean {
  if (!placement) return false;
  const approvedList = (companies || []).filter((c: any) => c.checklistStatus === "APPROVED");
  if (approvedList.length === 0) return false;

  if (placement.companyId && approvedList.some((c: any) => c.id === placement.companyId)) {
    return true;
  }

  const targetName = (placement.companyNameTh || "").trim().toLowerCase();
  if (!targetName) return false;

  return approvedList.some((c: any) => {
    const cName = (c.name || "").trim().toLowerCase();
    return cName && (cName === targetName || cName.includes(targetName) || targetName.includes(cName));
  });
}

// Helper: กรองขอบเขตสาขาวิชา (Department Scoping สำหรับอาจารย์ประจำวิชาแต่ละสาขา vs เจ้าหน้าที่คณะ/Admin กลาง)
function filterStudentsByScope(students: any[], req: Request): any[] {
  const isCentralOrStaff = Boolean(
    req.staff?.isStaff ||
      req.session.user?.role === "STAFF" ||
      (req.session.user?.role === "ADMIN" && !req.staff?.department)
  );
  const dept = req.staff?.department;
  const majorQuery = (req.query.major as string | undefined)?.trim();

  let filtered = students;
  if (!isCentralOrStaff && dept) {
    const deptLower = dept.toLowerCase();
    filtered = filtered.filter((s) => {
      const m = `${s.major || ""} ${s.curriculum || ""}`.toLowerCase();
      return m.includes(deptLower);
    });
  }
  if (majorQuery) {
    const qLower = majorQuery.toLowerCase();
    filtered = filtered.filter((s) => {
      const m = `${s.major || ""} ${s.curriculum || ""}`.toLowerCase();
      return m.includes(qLower);
    });
  }
  return filtered;
}

// ==========================================
// 1. Dashboard Summary — สรุปสถิตินิสิตทั้งหมด (กราฟวงกลม 4 อัน + สรุปจำนวน)
// ==========================================
router.get("/dashboard-summary", async (req: Request, res: Response) => {
  try {
    // ดึงนิสิตทั้งหมดพร้อมข้อมูลที่เกี่ยวข้อง
    const allStudentsRaw = await prisma.student.findMany({
      include: {
        user: true,
        cv: true,
        trainingRecords: true,
        companies: { include: { submission: true } },
        placement: true,
        advisor: { include: { user: true } },
      },
    });

    let students = filterStudentsByScope(allStudentsRaw, req);
    if (req.query.yearPrefix) {
      students = students.filter((s) => s.studentCode && s.studentCode.startsWith(String(req.query.yearPrefix)));
    }
    if (req.query.semester) {
      students = students.filter((s) => (s.semester || "2") === String(req.query.semester));
    }

    // ตรวจสอบและสร้างข้อมูล Staff ให้อัตโนมัติสำหรับ User ที่มี role ADVISOR / STAFF / ADMIN (ถ้ายังไม่มีในตาราง Staff)
    const staffUsers = await prisma.user.findMany({
      where: { role: { in: ["ADVISOR", "STAFF", "ADMIN"] } },
      include: { staff: true },
    });

    for (const u of staffUsers) {
      if (!u.staff) {
        await prisma.staff.create({
          data: {
            userId: u.id,
            name: u.username || u.email,
            isCourseAdmin: u.role === "ADMIN",
            isAdvisor: u.role === "ADVISOR",
            isStaff: u.role === "STAFF",
            isSupervisor: false,
          },
        });
      }
    }

    // ดึงอาจารย์ที่ปรึกษาทั้งหมด
    const advisors = await prisma.staff.findMany({
      where: {
        OR: [{ isAdvisor: true }, { user: { role: "ADVISOR" } }],
      },
      include: {
        user: true,
        studentsAdvised: {
          include: {
            companies: true,
          },
        },
      },
    });

    const activeStudents = students.filter((s) => !s.isDropped);
    const droppedStudents = students.filter((s) => s.isDropped);
    const totalStudents = activeStudents.length;
    const totalDropped = droppedStudents.length;

    // --- กราฟ 1: สถานะความพร้อม ---
    const readinessStats: Record<string, number> = {
      approvedPlacement: 0,
      cvApproved: 0,
      noDataOrHoursLack: 0,
      trainingComplete: 0,
      cvNotReviewed: 0,
    };

    // --- กราฟ 2: สถานะการอบรม ---
    const trainingStats: Record<string, number> = {
      passedComplete: 0,
      completeNotChecked: 0,
      checkedNotPass: 0,
      hoursNotComplete: 0,
    };

    // --- กราฟ 3: สถานะการตรวจ CV ---
    const cvStats: Record<string, number> = {
      reviewed: 0,
      notReviewed: 0,
      failed: 0,
      noCv: 0,
    };

    // --- กราฟ 4: สถานะอนุมัติฝึกงาน ---
    const placementStats: Record<string, number> = {
      pending: 0,
      approved: 0,
      rejected: 0,
    };

    activeStudents.forEach((s) => {
      const cats = categorizeStudent(s);
      readinessStats[cats.readinessCategory]++;
      trainingStats[cats.trainingCategory]++;
      cvStats[cats.cvCategory]++;
      if (cats.placementCategory) {
        placementStats[cats.placementCategory]++;
      }
    });

    // --- สรุปอาจารย์ที่ปรึกษา ---
    const advisorSummary = advisors.map((adv) => {
      const activeAdvised = adv.studentsAdvised.filter((stu) => !stu.isDropped);
      const totalAdvised = activeAdvised.length;
      let checklistReviewed = 0;
      let checklistNotReviewed = 0;

      activeAdvised.forEach((stu) => {
        stu.companies.forEach((c) => {
          if (c.checklistStatus === "APPROVED" || c.checklistStatus === "REJECTED") {
            checklistReviewed++;
          } else {
            checklistNotReviewed++;
          }
        });
      });

      return {
        id: adv.id,
        name: adv.name,
        department: adv.department,
        totalAdvised,
        checklistReviewed,
        checklistNotReviewed,
      };
    });

    // จำนวนนิสิตที่มี/ไม่มีอาจารย์ที่ปรึกษา (คำนวณจากนิสิตปกติที่ยังไม่ดรอป)
    const studentsWithAdvisor = activeStudents.filter((s) => s.advisorId !== null).length;
    const studentsWithoutAdvisor = totalStudents - studentsWithAdvisor;

    res.json({
      success: true,
      totalStudents,
      totalDropped,
      studentsWithAdvisor,
      studentsWithoutAdvisor,
      readinessStats,
      trainingStats,
      cvStats,
      placementStats,
      advisorSummary,
    });
  } catch (err) {
    console.error("GET /api/admin/dashboard-summary error:", err);
    res.status(500).json({ success: false, message: "ดึงข้อมูลสรุปไม่สำเร็จ" });
  }
});

// ==========================================
// 2. รายชื่อนิสิตทั้งหมด (พร้อม pagination, search, filter)
// ==========================================
router.get("/students", async (req: Request, res: Response) => {
  try {
    const { page = "1", limit = "12", search, status: filterStatus, chartType, chartKey } = req.query as Record<string, string | undefined>;
    const pageNum = parseInt(page || "1", 10);
    const limitNum = parseInt(limit || "12", 10);
    const skip = (pageNum - 1) * limitNum;

    // ดึงนิสิตทั้งหมดพร้อมข้อมูลที่เกี่ยวข้อง
    const allStudentsRaw = await prisma.student.findMany({
      include: {
        user: true,
        cv: true,
        trainingRecords: true,
        companies: { include: { submission: true } },
        placement: true,
        advisor: { include: { user: true } },
        supervisor: { include: { user: true } },
      },
      orderBy: { studentCode: "desc" },
    });

    const allStudents = filterStudentsByScope(allStudentsRaw, req);

    // Map สถานะแต่ละคนด้วยฟังก์ชัน categorizeStudent เดียวกัน
    let mapped = allStudents.map((s) => {
      const cats = categorizeStudent(s);

      let activeStatus = cats.overallStatus;
      if (chartType === "readiness") activeStatus = cats.readinessLabel;
      else if (chartType === "training") activeStatus = cats.trainingLabel;
      else if (chartType === "cv") activeStatus = cats.cvLabel;
      else if (chartType === "placement") activeStatus = cats.placementLabel;

      const isMatchedWithChecklist = s.placement
        ? checkPlacementMatchesChecklist(s.placement, s.companies || [])
        : null;

      return {
        id: s.id,
        userId: s.userId,
        studentCode: s.studentCode,
        nameTh: s.nameTh,
        nameEn: s.nameEn,
        nickname: s.nickname,
        major: s.major,
        year: s.year,
        semester: s.semester || "2",
        academicYear: s.academicYear,
        advisorName: s.advisor ? s.advisor.name : null,
        advisorId: s.advisorId,
        supervisorName: s.supervisor ? s.supervisor.name : null,
        supervisorId: s.supervisorId,
        overallStatus: cats.overallStatus,
        statusCategory: cats.statusCategory,
        activeStatus,
        trainingCategory: cats.trainingCategory,
        cvCategory: cats.cvCategory,
        placementCategory: cats.placementCategory,
        readinessCategory: cats.readinessCategory,
        cvStatus: s.cv ? s.cv.status : null,
        isDropped: s.isDropped,
        dropReason: s.dropReason,
        droppedAt: s.droppedAt,
        trainingApprovedSoft: cats.softHours,
        trainingApprovedHard: cats.hardHours,
        isTrainingComplete: cats.isTrainingComplete,
        placementStatus: s.placement ? s.placement.status : null,
        isMatchedWithChecklist,
        hasChecklistApproved: (s.companies || []).some((c: any) => c.checklistStatus === "APPROVED"),
      };
    });

    mapped.sort((a, b) => {
      try {
        const codeA = BigInt(a.studentCode);
        const codeB = BigInt(b.studentCode);
        return codeA === codeB ? 0 : codeA > codeB ? -1 : 1;
      } catch {
        return a.studentCode.localeCompare(b.studentCode);
      }
    });

    // กรองตาม viewDropped (นิสิตปกติ vs นิสิตที่ดรอป)
    const isViewDropped = req.query.viewDropped === "true";
    if (isViewDropped) {
      mapped = mapped.filter((s) => s.isDropped);
    } else {
      mapped = mapped.filter((s) => !s.isDropped);
    }

    // Filter ตาม legacy status
    if (filterStatus) {
      mapped = mapped.filter((s) => s.statusCategory === filterStatus);
    }

    // Filter ตาม search
    if (search) {
      const q = search.toLowerCase();
      mapped = mapped.filter(
        (s) =>
          s.studentCode.toLowerCase().includes(q) ||
          s.nameTh.toLowerCase().includes(q) ||
          (s.nameEn && s.nameEn.toLowerCase().includes(q))
      );
    }

    // Filter ตามปีของรหัสนิสิต (2 หลักแรก เช่น 67, 68)
    const yearPrefix = req.query.yearPrefix as string | undefined;
    if (yearPrefix) {
      mapped = mapped.filter((s) => s.studentCode && s.studentCode.startsWith(yearPrefix));
    }

    // Filter ตาม dropdown "สถานะ" (ผ่าน/ไม่ผ่าน แต่ละหมวด)
    const statusFilter = req.query.statusFilter as string | undefined;
    if (statusFilter) {
      switch (statusFilter) {
        case "training_passed":
          mapped = mapped.filter((s) => s.isTrainingComplete);
          break;
        case "training_not_checked":
          mapped = mapped.filter((s) => s.trainingCategory === "completeNotChecked");
          break;
        case "training_failed":
          mapped = mapped.filter((s) => s.trainingCategory === "checkedNotPass" || !s.isTrainingComplete);
          break;
        case "training_incomplete":
          mapped = mapped.filter((s) => s.trainingCategory === "hoursNotComplete");
          break;
        case "cv_approved":
        case "cv_passed":
          mapped = mapped.filter((s) => s.cvStatus === "APPROVED");
          break;
        case "cv_pending":
          mapped = mapped.filter((s) => s.cvStatus === "PENDING" || s.cvCategory === "notReviewed");
          break;
        case "cv_rejected":
        case "cv_failed":
          mapped = mapped.filter((s) => s.cvStatus === "REJECTED");
          break;
        case "cv_none":
          mapped = mapped.filter((s) => !s.cvStatus || s.cvCategory === "noCv");
          break;
        case "checklist_approved":
        case "checklist_passed":
          mapped = mapped.filter((s) => s.hasChecklistApproved);
          break;
        case "checklist_pending":
        case "checklist_failed":
          mapped = mapped.filter((s) => !s.hasChecklistApproved);
          break;
        case "interview_passed":
          mapped = mapped.filter((s) => s.placementStatus === "APPROVED" || s.hasChecklistApproved);
          break;
        case "placement_approved":
          mapped = mapped.filter((s) => s.placementStatus === "APPROVED");
          break;
        case "placement_pending":
          mapped = mapped.filter((s) => s.placementStatus !== "APPROVED");
          break;
        case "placement_rejected":
          mapped = mapped.filter((s) => s.placementStatus === "REJECTED");
          break;
      }
    }

    // Filter ตาม dropdown "อาจารย์ที่ปรึกษา"
    const advisorFilterName = req.query.advisorFilter as string | undefined;
    if (advisorFilterName) {
      mapped = mapped.filter((s) => s.advisorName === advisorFilterName);
    }

    // Filter ตาม dropdown "Soft/Hard Skill"
    const skillFilter = req.query.skillFilter as string | undefined;
    if (skillFilter) {
      switch (skillFilter) {
        case "lack_soft":
          mapped = mapped.filter((s) => (s.trainingApprovedSoft || 0) < 12);
          break;
        case "lack_hard":
          mapped = mapped.filter((s) => (s.trainingApprovedHard || 0) < 18);
          break;
        case "lack_both":
          mapped = mapped.filter((s) => (s.trainingApprovedSoft || 0) < 12 && (s.trainingApprovedHard || 0) < 18);
          break;
      }
    }

    // สถิติสำหรับกราฟวงกลมทั้ง 4 อัน
    const chartStats: {
      totalStudents: number;
      readinessStats: Record<string, number>;
      trainingStats: Record<string, number>;
      cvStats: Record<string, number>;
      placementStats: Record<string, number>;
    } = {
      totalStudents: mapped.length,
      readinessStats: { approvedPlacement: 0, cvApproved: 0, noDataOrHoursLack: 0, trainingComplete: 0, cvNotReviewed: 0 },
      trainingStats: { passedComplete: 0, completeNotChecked: 0, checkedNotPass: 0, hoursNotComplete: 0 },
      cvStats: { reviewed: 0, notReviewed: 0, failed: 0, noCv: 0 },
      placementStats: { pending: 0, approved: 0, rejected: 0 },
    };
    mapped.forEach((s) => {
      chartStats.readinessStats[s.readinessCategory] = (chartStats.readinessStats[s.readinessCategory] || 0) + 1;
      chartStats.trainingStats[s.trainingCategory] = (chartStats.trainingStats[s.trainingCategory] || 0) + 1;
      chartStats.cvStats[s.cvCategory] = (chartStats.cvStats[s.cvCategory] || 0) + 1;
      if (s.placementCategory) {
        chartStats.placementStats[s.placementCategory] = (chartStats.placementStats[s.placementCategory] || 0) + 1;
      }
    });

    // กรองตาม chartType และ chartKey
    if (chartType && chartKey) {
      if (chartType === "readiness") {
        mapped = mapped.filter((s) => s.readinessCategory === chartKey);
      } else if (chartType === "training") {
        mapped = mapped.filter((s) => s.trainingCategory === chartKey);
      } else if (chartType === "cv") {
        mapped = mapped.filter((s) => s.cvCategory === chartKey);
      } else if (chartType === "placement") {
        mapped = mapped.filter((s) => s.placementCategory === chartKey);
      }
    }

    const total = mapped.length;
    const paginated = mapped.slice(skip, skip + limitNum);

    res.json({
      success: true,
      students: paginated,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      chartStats,
    });
  } catch (err) {
    console.error("GET /api/admin/students error:", err);
    res.status(500).json({ success: false, message: "ดึงรายชื่อนิสิตไม่สำเร็จ" });
  }
});

// ==========================================
// 3. ดูข้อมูลนิสิตรายบุคคล
// ==========================================
router.get("/students/:studentId", async (req: Request, res: Response) => {
  try {
    const studentId = parseInt(req.params.studentId as string, 10);
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        user: true,
        cv: true,
        trainingRecords: { orderBy: { createdAt: "asc" } },
        companies: {
          include: {
            answers: { include: { checklistItem: { include: { section: true } } } },
            submission: true,
          },
        },
        placement: true,
        advisor: { include: { user: true } },
        supervisor: { include: { user: true } },
      },
    });

    if (!student) {
      return res.status(404).json({ success: false, message: "ไม่พบข้อมูลนิสิต" });
    }

    // คำนวณสรุปชั่วโมง
    const approvedTrainings = student.trainingRecords.filter(t => t.status === "APPROVED");
    const totalSoft = student.trainingRecords.filter(t => t.skillType === "SOFT").reduce((sum, t) => sum + t.hours, 0);
    const totalHard = student.trainingRecords.filter(t => t.skillType === "HARD").reduce((sum, t) => sum + t.hours, 0);
    const approvedSoft = approvedTrainings.filter(t => t.skillType === "SOFT").reduce((sum, t) => sum + t.hours, 0);
    const approvedHard = approvedTrainings.filter(t => t.skillType === "HARD").reduce((sum, t) => sum + t.hours, 0);

    const isMatchedWithChecklist = student.placement
      ? checkPlacementMatchesChecklist(student.placement, student.companies || [])
      : false;

    res.json({
      success: true,
      student: {
        id: student.id,
        studentCode: student.studentCode,
        nameTh: student.nameTh,
        nameEn: student.nameEn,
        nickname: student.nickname,
        faculty: student.faculty,
        curriculum: student.curriculum,
        academicYear: student.academicYear,
        studentStatus: student.studentStatus,
        internshipType: student.internshipType,
        year: student.year,
        major: student.major,
        gpa: student.gpa,
        phone: student.phone,
        lineId: student.lineId,
        facebook: student.facebook,
        profileImageUrl: student.profileImageUrl,
        stage: student.stage,
        email: student.user.email,
        advisorName: student.advisor ? student.advisor.name : null,
        advisorId: student.advisorId,
        supervisorName: student.supervisor ? student.supervisor.name : null,
        supervisorId: student.supervisorId,
        isDropped: student.isDropped,
        dropReason: student.dropReason,
        droppedAt: student.droppedAt,
      },
      cv: student.cv,
      trainings: student.trainingRecords,
      trainingSummary: { totalSoft, totalHard, approvedSoft, approvedHard },
      companies: student.companies,
      placement: student.placement
        ? {
            ...student.placement,
            isMatchedWithChecklist,
          }
        : null,
    });
  } catch (err) {
    console.error("GET /api/admin/students/:id error:", err);
    res.status(500).json({ success: false, message: "ดึงข้อมูลนิสิตไม่สำเร็จ" });
  }
});

// ==========================================
// 4. ตั้งสถานะ CV ของนิสิต (อาจารย์ประจำวิชา / Course Admin)
// ==========================================
router.put("/students/:studentId/cv-status", async (req: Request, res: Response) => {
  const isPureStaff = Boolean(
    (req.staff?.isStaff || req.session.user!.role === "STAFF") &&
      !req.staff?.isCourseAdmin &&
      req.session.user!.role !== "ADMIN"
  );
  if (isPureStaff) {
    return res.status(403).json({ success: false, message: "เจ้าหน้าที่ไม่มีสิทธิ์ตรวจอนุมัติ CV" });
  }
  try {
    const studentId = parseInt(req.params.studentId as string, 10);
    const { status, note } = req.body; // APPROVED or REJECTED

    const cv = await prisma.studentCV.findUnique({ where: { studentId } });
    if (!cv) {
      return res.status(404).json({ success: false, message: "ไม่พบ CV ของนิสิต" });
    }

    const updated = await prisma.studentCV.update({
      where: { studentId },
      data: {
        status,
        note: note || null,
        reviewedById: req.session.user!.id,
        reviewedAt: new Date(),
      },
    });

    res.json({ success: true, cv: updated });
  } catch (err) {
    console.error("PUT /api/admin/students/:id/cv-status error:", err);
    res.status(500).json({ success: false, message: "อัพเดตสถานะ CV ไม่สำเร็จ" });
  }
});

// ==========================================
// 5. ตั้งสถานะ Training Record ของนิสิต (อาจารย์ประจำวิชา / Course Admin)
// ==========================================
router.put("/students/:studentId/training/:trainingId/status", async (req: Request, res: Response) => {
  const isPureStaff = Boolean(
    (req.staff?.isStaff || req.session.user!.role === "STAFF") &&
      !req.staff?.isCourseAdmin &&
      req.session.user!.role !== "ADMIN"
  );
  if (isPureStaff) {
    return res.status(403).json({ success: false, message: "เจ้าหน้าที่ไม่มีสิทธิ์ตรวจอนุมัติชั่วโมงอบรม" });
  }
  try {
    const trainingId = parseInt(req.params.trainingId as string, 10);
    const { status, note } = req.body;

    const updated = await prisma.trainingRecord.update({
      where: { id: trainingId },
      data: {
        status,
        note: note || null,
        reviewedById: req.session.user!.id,
        reviewedAt: new Date(),
      },
    });

    res.json({ success: true, training: updated });
  } catch (err) {
    console.error("PUT /api/admin/students/:id/training/:id/status error:", err);
    res.status(500).json({ success: false, message: "อัพเดตสถานะการอบรมไม่สำเร็จ" });
  }
});

// ==========================================
// 5.1 เพิ่มชั่วโมงเตรียมความพร้อม / กิจกรรมคณะ (Hackathon, Project Day, Co-op UP)
// ==========================================
router.post("/students/:studentId/trainings", async (req: Request, res: Response) => {
  try {
    const studentId = parseInt(req.params.studentId as string, 10);
    const { title, skillType, hours, academicYear } = req.body;

    if (!hours || isNaN(hours) || parseInt(hours, 10) <= 0) {
      return res.status(400).json({ success: false, message: "กรุณาระบุจำนวนชั่วโมงให้ถูกต้อง" });
    }

    const normalizedSkillType = String(skillType || "HARD").toLowerCase().includes("soft") ? "SOFT" : "HARD";
    const isStaffIssuer = Boolean(req.staff?.isStaff && !req.staff?.isCourseAdmin);
    const source = isStaffIssuer ? "STAFF_IMPORT" : "ADMIN_IMPORT";

    const training = await prisma.trainingRecord.create({
      data: {
        studentId,
        title: title ? String(title).trim() : `กิจกรรมเตรียมความพร้อม (${normalizedSkillType})`,
        skillType: normalizedSkillType,
        hours: parseInt(hours, 10),
        academicYear: academicYear ? String(academicYear).trim() : null,
        source,
        status: "APPROVED",
        reviewedById: req.session.user!.id,
        reviewedAt: new Date(),
      },
    });

    res.json({
      success: true,
      message: "เพิ่มชั่วโมงเตรียมความพร้อมสำเร็จ (อนุมัติอัตโนมัติ)",
      training,
    });
  } catch (err) {
    console.error("POST /api/admin/students/:id/trainings error:", err);
    res.status(500).json({ success: false, message: "เพิ่มชั่วโมงอบรมไม่สำเร็จ" });
  }
});

// ==========================================
// 6. ตั้งสถานะอนุมัติที่ฝึกงาน (อาจารย์ที่ปรึกษาเป็นหลัก)
// ==========================================
router.put("/students/:studentId/placement-status", async (req: Request, res: Response) => {
  const canReviewPlacement = Boolean(
    req.staff?.isAdvisor ||
      req.session.user!.role === "ADVISOR" ||
      req.session.user!.role === "ADMIN"
  );
  if (!canReviewPlacement) {
    return res.status(403).json({
      success: false,
      message: "อาจารย์ที่ปรึกษาเท่านั้นที่เป็นผู้ตรวจและให้สถานะข้อมูลบริษัทที่เข้าฝึกงาน",
    });
  }
  try {
    const studentId = parseInt(req.params.studentId as string, 10);
    const { status, note } = req.body;

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: { companies: true },
    });

    if (!student) {
      return res.status(404).json({ success: false, message: "ไม่พบข้อมูลนิสิต" });
    }

    if (
      req.session.user!.role !== "ADMIN" &&
      req.staff &&
      student.advisorId !== req.staff.id
    ) {
      return res.status(403).json({
        success: false,
        message: "ไม่มีสิทธิ์อนุมัติที่ฝึกงานของนิสิตที่ไม่ได้อยู่ในความดูแล",
      });
    }

    const updated = await prisma.internshipPlacement.upsert({
      where: { studentId },
      create: {
        studentId,
        status,
        note: note || null,
        reviewedById: req.session.user!.id,
        reviewedAt: new Date(),
      },
      update: {
        status,
        note: note || null,
        reviewedById: req.session.user!.id,
        reviewedAt: new Date(),
      },
    });

    const isMatchedWithChecklist = checkPlacementMatchesChecklist(
      updated,
      student.companies || []
    );

    res.json({
      success: true,
      placement: {
        ...updated,
        isMatchedWithChecklist,
      },
    });
  } catch (err) {
    console.error("PUT /api/admin/students/:id/placement-status error:", err);
    res.status(500).json({ success: false, message: "อัพเดตสถานะอนุมัติฝึกงานไม่สำเร็จ" });
  }
});

// ==========================================
// 7. Batch ตั้งสถานะนิสิตหลายคนพร้อมกัน
// ==========================================
router.put("/students/batch-status", async (req: Request, res: Response) => {
  const isPureStaff = Boolean(
    (req.staff?.isStaff || req.session.user!.role === "STAFF") &&
      !req.staff?.isCourseAdmin &&
      req.session.user!.role !== "ADMIN"
  );
  if (isPureStaff) {
    return res.status(403).json({ success: false, message: "เจ้าหน้าที่ไม่มีสิทธิ์ตั้งสถานะนิสิต" });
  }
  try {
    const { studentIds, statusType, statusValue, note } = req.body;

    if (!studentIds || !studentIds.length) {
      return res.status(400).json({ success: false, message: "กรุณาเลือกนิสิตอย่างน้อย 1 คน" });
    }

    const reviewData = {
      status: statusValue,
      note: note || null,
      reviewedById: req.session.user!.id,
      reviewedAt: new Date(),
    };

    let updatedCount = 0;

    if (statusType === "cv") {
      const result = await prisma.studentCV.updateMany({
        where: { studentId: { in: studentIds.map(Number) } },
        data: reviewData,
      });
      updatedCount = result.count;
    } else if (statusType === "training") {
      const result = await prisma.trainingRecord.updateMany({
        where: {
          studentId: { in: studentIds.map(Number) },
          status: "PENDING",
        },
        data: reviewData,
      });
      updatedCount = result.count;
    } else if (statusType === "placement") {
      const canReviewPlacement = Boolean(
        req.staff?.isAdvisor ||
          req.session.user!.role === "ADVISOR" ||
          req.session.user!.role === "ADMIN"
      );
      if (!canReviewPlacement) {
        return res.status(403).json({ success: false, message: "อาจารย์ที่ปรึกษาเท่านั้นที่เป็นผู้ตรวจและให้สถานะข้อมูลบริษัทที่เข้าฝึกงาน" });
      }
      const result = await prisma.internshipPlacement.updateMany({
        where: { studentId: { in: studentIds.map(Number) } },
        data: reviewData,
      });
      updatedCount = result.count;
    } else {
      return res.status(400).json({ success: false, message: "statusType ไม่ถูกต้อง" });
    }

    res.json({ success: true, updatedCount });
  } catch (err) {
    console.error("PUT /api/admin/students/batch-status error:", err);
    res.status(500).json({ success: false, message: "ตั้งสถานะไม่สำเร็จ" });
  }
});

// ==========================================
// 8. Batch ตั้งอาจารย์ที่ปรึกษาให้นิสิตหลายคน
// ==========================================
router.put("/students/batch-advisor", async (req: Request, res: Response) => {
  const isPureStaff = Boolean(
    (req.staff?.isStaff || req.session.user!.role === "STAFF") &&
      !req.staff?.isCourseAdmin &&
      req.session.user!.role !== "ADMIN"
  );
  if (isPureStaff) {
    return res.status(403).json({ success: false, message: "เจ้าหน้าที่ไม่มีสิทธิ์ตั้งอาจารย์ที่ปรึกษา" });
  }
  try {
    const { studentIds, advisorId } = req.body;

    if (!studentIds || !studentIds.length || !advisorId) {
      return res.status(400).json({ success: false, message: "กรุณาเลือกนิสิตและอาจารย์ที่ปรึกษา" });
    }

    // ตรวจว่า advisor มีอยู่จริง
    const advisor = await prisma.staff.findUnique({ where: { id: parseInt(advisorId, 10) } });
    if (!advisor) {
      return res.status(404).json({ success: false, message: "ไม่พบอาจารย์ที่ปรึกษา" });
    }

    const result = await prisma.student.updateMany({
      where: { id: { in: studentIds.map(Number) } },
      data: { advisorId: parseInt(advisorId, 10) },
    });

    res.json({ success: true, updatedCount: result.count });
  } catch (err) {
    console.error("PUT /api/admin/students/batch-advisor error:", err);
    res.status(500).json({ success: false, message: "ตั้งอาจารย์ที่ปรึกษาไม่สำเร็จ" });
  }
});

// ==========================================
// 8.05 Batch ตั้งอาจารย์นิเทศก์ให้นิสิตหลายคน (Supervisor Assignment)
// ==========================================
router.put("/students/batch-supervisor", async (req: Request, res: Response) => {
  const isPureStaff = Boolean(
    (req.staff?.isStaff || req.session.user!.role === "STAFF") &&
      !req.staff?.isCourseAdmin &&
      req.session.user!.role !== "ADMIN"
  );
  if (isPureStaff) {
    return res.status(403).json({ success: false, message: "เจ้าหน้าที่ไม่มีสิทธิ์ตั้งอาจารย์นิเทศก์" });
  }
  try {
    const { studentIds, supervisorId } = req.body;

    if (!studentIds || !studentIds.length || !supervisorId) {
      return res.status(400).json({ success: false, message: "กรุณาเลือกนิสิตและอาจารย์นิเทศก์" });
    }

    const supervisor = await prisma.staff.findUnique({ where: { id: parseInt(supervisorId, 10) } });
    if (!supervisor) {
      return res.status(404).json({ success: false, message: "ไม่พบอาจารย์นิเทศก์" });
    }

    const result = await prisma.student.updateMany({
      where: { id: { in: studentIds.map(Number) } },
      data: { supervisorId: parseInt(supervisorId, 10) },
    });

    res.json({ success: true, updatedCount: result.count });
  } catch (err) {
    console.error("PUT /api/admin/students/batch-supervisor error:", err);
    res.status(500).json({ success: false, message: "ตั้งอาจารย์นิเทศก์ไม่สำเร็จ" });
  }
});

// ==========================================
// 8.1 ดรอปนิสิต (Drop Student)
// ==========================================
router.put("/students/drop", async (req: Request, res: Response) => {
  const isPureStaff = Boolean(
    (req.staff?.isStaff || req.session.user!.role === "STAFF") &&
      !req.staff?.isCourseAdmin &&
      req.session.user!.role !== "ADMIN"
  );
  if (isPureStaff) {
    return res.status(403).json({ success: false, message: "เจ้าหน้าที่ไม่มีสิทธิ์ดรอปนิสิต" });
  }
  try {
    const { studentIds, reason } = req.body;
    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({ success: false, message: "กรุณาเลือกนิสิตอย่างน้อย 1 คน" });
    }

    const dropReason = (reason && reason.trim()) ? reason.trim() : "ถอนรายวิชาฝึกงาน";

    const result = await prisma.student.updateMany({
      where: { id: { in: studentIds.map(Number) } },
      data: {
        isDropped: true,
        dropReason,
        droppedAt: new Date(),
      },
    });

    res.json({
      success: true,
      message: `ดรอปนิสิตสำเร็จ (${result.count} คน)`,
      updatedCount: result.count,
    });
  } catch (err) {
    console.error("PUT /api/admin/students/drop error:", err);
    res.status(500).json({ success: false, message: "ดรอปนิสิตไม่สำเร็จ" });
  }
});

// ==========================================
// 8.2 กู้คืนสถานะนิสิตที่ถูกดรอป (Restore Student)
// ==========================================
router.put("/students/restore", async (req: Request, res: Response) => {
  const isPureStaff = Boolean(
    (req.staff?.isStaff || req.session.user!.role === "STAFF") &&
      !req.staff?.isCourseAdmin &&
      req.session.user!.role !== "ADMIN"
  );
  if (isPureStaff) {
    return res.status(403).json({ success: false, message: "เจ้าหน้าที่ไม่มีสิทธิ์กู้คืนสถานะนิสิต" });
  }
  try {
    const { studentIds } = req.body;
    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({ success: false, message: "กรุณาเลือกนิสิตอย่างน้อย 1 คน" });
    }

    const result = await prisma.student.updateMany({
      where: { id: { in: studentIds.map(Number) } },
      data: {
        isDropped: false,
        dropReason: null,
        droppedAt: null,
      },
    });

    res.json({
      success: true,
      message: `กู้คืนสถานะนิสิตสำเร็จ (${result.count} คน)`,
      updatedCount: result.count,
    });
  } catch (err) {
    console.error("PUT /api/admin/students/restore error:", err);
    res.status(500).json({ success: false, message: "กู้คืนสถานะนิสิตไม่สำเร็จ" });
  }
});

// ==========================================
// 9. ดึงรายชื่ออาจารย์ที่ปรึกษาทั้งหมด (สำหรับ Filter & Modal ตามสาขาวิชา)
// ==========================================
router.get("/advisors", async (req: Request, res: Response) => {
  try {
    const isCentralOrStaff = Boolean(
      req.staff?.isStaff ||
        req.session.user?.role === "STAFF" ||
        (req.session.user?.role === "ADMIN" && !req.staff?.department)
    );
    const dept = req.staff?.department;
    const majorQuery = (req.query.major as string | undefined)?.trim();

    // หากระบุ query major มา ให้ใช้ค่านั้น (ถ้าไม่ใช่ ALL)
    // หากไม่ระบุ หรือเป็น ALL แต่ user ไม่ใช่ส่วนกลางและมี dept (เช่น อาจารย์ประจำวิชา) ให้ใช้ dept ของ user
    let targetMajor: string | null = null;
    if (majorQuery && majorQuery !== "ALL") {
      targetMajor = majorQuery;
    } else if (!isCentralOrStaff && dept) {
      targetMajor = dept;
    }

    const advisorUsers = await prisma.user.findMany({
      where: { role: { in: ["ADVISOR", "STAFF", "ADMIN"] } },
      include: { staff: true },
    });

    for (const u of advisorUsers) {
      if (!u.staff) {
        await prisma.staff.create({
          data: {
            userId: u.id,
            name: u.username || u.email,
            isCourseAdmin: u.role === "ADMIN",
            isAdvisor: u.role === "ADVISOR",
            isStaff: u.role === "STAFF",
            isSupervisor: false,
          },
        });
      }
    }

    const advisors = await prisma.staff.findMany({
      where: {
        OR: [{ isAdvisor: true }, { user: { role: "ADVISOR" } }],
      },
      include: {
        user: true,
        studentsAdvised: {
          select: {
            id: true,
            major: true,
            curriculum: true,
            isDropped: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    let resultAdvisors: Array<{
      id: number;
      name: string;
      email: string;
      department: string | null;
      studentCount: number;
    }> = [];

    if (targetMajor) {
      const targetLower = targetMajor.toLowerCase();
      const matchesTarget = (str?: string | null) => {
        if (!str) return false;
        const s = str.toLowerCase();
        return s.includes(targetLower) || targetLower.includes(s);
      };

      resultAdvisors = advisors
        .map((a) => {
          const advisedInMajor = a.studentsAdvised.filter(
            (s) => !s.isDropped && (matchesTarget(s.major) || matchesTarget(s.curriculum))
          );
          const belongsToDept = matchesTarget(a.department);
          const hasStudentsInMajor = advisedInMajor.length > 0;

          // ถ้าอาจารย์ไม่ได้สังกัดสาขานี้ และไม่ได้มีนิสิตในสาขานี้ ไม่ต้องแสดงในตัวกรอง
          if (!belongsToDept && !hasStudentsInMajor) {
            return null;
          }

          return {
            id: a.id,
            name: a.name,
            email: a.user.email,
            department: a.department,
            studentCount: advisedInMajor.length,
          };
        })
        .filter((a): a is NonNullable<typeof a> => a !== null);
    } else {
      resultAdvisors = advisors.map((a) => ({
        id: a.id,
        name: a.name,
        email: a.user.email,
        department: a.department,
        studentCount: a.studentsAdvised.filter((s) => !s.isDropped).length,
      }));
    }

    res.json({
      success: true,
      advisors: resultAdvisors,
    });
  } catch (err) {
    console.error("GET /api/admin/advisors error:", err);
    res.status(500).json({ success: false, message: "ดึงรายชื่ออาจารย์ไม่สำเร็จ" });
  }
});

// ==========================================
// 9.1 ดึงรายชื่ออาจารย์นิเทศก์ & จัดการ Multi-Role ของบุคลากร (Staff)
// ==========================================
router.get("/supervisors", async (_req: Request, res: Response) => {
  try {
    const supervisors = await prisma.staff.findMany({
      where: {
        OR: [{ isSupervisor: true }, { isAdvisor: true }, { isCourseAdmin: true }],
      },
      include: { user: true, studentsSupervised: true },
      orderBy: { name: "asc" },
    });

    res.json({
      success: true,
      supervisors: supervisors.map((s) => ({
        id: s.id,
        name: s.name,
        email: s.user.email,
        department: s.department,
        isSupervisor: s.isSupervisor,
        studentCount: s.studentsSupervised.length,
      })),
    });
  } catch (err) {
    console.error("GET /api/admin/supervisors error:", err);
    res.status(500).json({ success: false, message: "ดึงรายชื่ออาจารย์นิเทศก์ไม่สำเร็จ" });
  }
});

router.get("/staff", async (_req: Request, res: Response) => {
  try {
    const allStaff = await prisma.staff.findMany({
      include: {
        user: true,
        studentsAdvised: true,
        studentsSupervised: true,
      },
      orderBy: { id: "asc" },
    });

    res.json({
      success: true,
      staff: allStaff.map((s) => ({
        id: s.id,
        userId: s.userId,
        name: s.name,
        email: s.user.email,
        userRole: s.user.role,
        department: s.department,
        isCourseAdmin: s.isCourseAdmin,
        isAdvisor: s.isAdvisor,
        isSupervisor: s.isSupervisor,
        isStaff: s.isStaff,
        advisedCount: s.studentsAdvised.length,
        supervisedCount: s.studentsSupervised.length,
      })),
    });
  } catch (err) {
    console.error("GET /api/admin/staff error:", err);
    res.status(500).json({ success: false, message: "ดึงข้อมูลบุคลากรไม่สำเร็จ" });
  }
});

// อัปเดตสิทธิ์บุคลากรพร้อมกันหลายคน (Batch Save Roles)
router.put("/staff/batch-roles", async (req: Request, res: Response) => {
  try {
    const { updates } = req.body;
    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ success: false, message: "ไม่มีข้อมูลที่ต้องการอัปเดต" });
    }

    await prisma.$transaction(
      updates.map((u: any) =>
        prisma.staff.update({
          where: { id: parseInt(String(u.id), 10) },
          data: {
            isCourseAdmin: u.isCourseAdmin !== undefined ? Boolean(u.isCourseAdmin) : undefined,
            isAdvisor: u.isAdvisor !== undefined ? Boolean(u.isAdvisor) : undefined,
            isSupervisor: u.isSupervisor !== undefined ? Boolean(u.isSupervisor) : undefined,
            isStaff: u.isStaff !== undefined ? Boolean(u.isStaff) : undefined,
            department: u.department !== undefined ? (u.department ? String(u.department).trim() : null) : undefined,
          },
        })
      )
    );

    res.json({
      success: true,
      message: `บันทึกสิทธิ์บุคลากรทั้งหมด ${updates.length} ท่านเรียบร้อยแล้ว`,
    });
  } catch (err) {
    console.error("PUT /api/admin/staff/batch-roles error:", err);
    res.status(500).json({ success: false, message: "บันทึกสิทธิ์บุคลากรไม่สำเร็จ" });
  }
});

router.put("/staff/:staffId/roles", async (req: Request, res: Response) => {
  try {
    const staffId = parseInt(req.params.staffId as string, 10);
    const { isCourseAdmin, isAdvisor, isSupervisor, isStaff, department } = req.body;

    const updated = await prisma.staff.update({
      where: { id: staffId },
      data: {
        isCourseAdmin: isCourseAdmin !== undefined ? Boolean(isCourseAdmin) : undefined,
        isAdvisor: isAdvisor !== undefined ? Boolean(isAdvisor) : undefined,
        isSupervisor: isSupervisor !== undefined ? Boolean(isSupervisor) : undefined,
        isStaff: isStaff !== undefined ? Boolean(isStaff) : undefined,
        department: department !== undefined ? (department ? String(department).trim() : null) : undefined,
      },
    });

    res.json({
      success: true,
      message: "อัปเดตบทบาทบุคลากรสำเร็จ",
      staff: updated,
    });
  } catch (err) {
    console.error("PUT /api/admin/staff/:staffId/roles error:", err);
    res.status(500).json({ success: false, message: "อัปเดตบทบาทบุคลากรไม่สำเร็จ" });
  }
});

// ==========================================
// Export ข้อมูลนิสิตแบบละเอียด (สำหรับ CSV)
// ==========================================
router.get("/export", async (req: Request, res: Response) => {
  try {
    const students = await prisma.student.findMany({
      include: {
        user: true,
        cv: true,
        trainingRecords: true,
        companies: {
          include: {
            submission: true,
          },
        },
        placement: true,
        advisor: true,
      },
      orderBy: { studentCode: "asc" },
    });

    let exportData = students.map((s) => {
      // 5. ชั่วโมงอบรม Soft Skill & Hard Skill ที่ Approved
      const approvedTrainings = (s.trainingRecords || []).filter((t: any) => t.status === "APPROVED");
      const softHours = approvedTrainings
        .filter((t: any) => t.skillType === "SOFT")
        .reduce((sum: number, t: any) => sum + t.hours, 0);
      const hardHours = approvedTrainings
        .filter((t: any) => t.skillType === "HARD")
        .reduce((sum: number, t: any) => sum + t.hours, 0);
      const totalHours = softHours + hardHours;
      const isTrainingComplete = softHours >= 12 && hardHours >= 18;
      const trainingProgress = isTrainingComplete
        ? `ผ่านครบ ${totalHours} ชม. (Soft ${softHours}/12, Hard ${hardHours}/18)`
        : `ยังไม่ครบ (Soft ${softHours}/12, Hard ${hardHours}/18)`;

      // 6. สถานะ CV
      let cvStatus = "ยังไม่ส่ง CV";
      if (s.cv) {
        if (s.cv.status === "APPROVED") cvStatus = "ผ่าน";
        else if (s.cv.status === "REJECTED") cvStatus = "ไม่ผ่าน";
        else cvStatus = "รอตรวจ";
      }

      // 7. สถานะ Checklist
      const companies = s.companies || [];
      let checklistStatus = "ยังไม่มีข้อมูล";
      if (companies.length > 0) {
        const hasApproved = companies.some((c: any) => c.checklistStatus === "APPROVED");
        const allRejected = companies.every((c: any) => c.checklistStatus === "REJECTED");
        if (hasApproved) checklistStatus = "ผ่าน";
        else if (allRejected) checklistStatus = "ไม่ผ่าน";
        else checklistStatus = "รอผล";
      }

      // 8. ผลการสมัคร/สัมภาษณ์
      const submissions = companies.map((c: any) => c.submission).filter(Boolean);
      let interviewStatus = "ยังไม่ได้ยื่น";
      if (submissions.some((sub: any) => sub.status === "INTERVIEW_PASSED")) {
        interviewStatus = "สัมภาษณ์ผ่านแล้ว";
      } else if (submissions.some((sub: any) => sub.status === "INTERVIEWED_PENDING")) {
        interviewStatus = "สัมภาษณ์แล้ว รอผล";
      } else if (submissions.some((sub: any) => sub.status === "SUBMITTED_WAITING")) {
        interviewStatus = "ยื่นแล้ว รอสัมภาษณ์";
      } else if (submissions.some((sub: any) => sub.status === "INTERVIEW_FAILED_REAPPLIED")) {
        interviewStatus = "สัมภาษณ์ไม่ผ่าน ยื่นเพิ่มแล้ว";
      } else {
        interviewStatus = "ยังไม่ได้ยื่น";
      }

      // ข้อมูล Placement และบริษัท
      const p = s.placement;
      const passedCompany = companies.find((c: any) => c.submission && c.submission.status === "INTERVIEW_PASSED");
      const companyNameTh = (p && p.companyNameTh) || (passedCompany ? passedCompany.name : "");

      // 17. สถานะอนุมัติที่ฝึกงาน
      let placementStatus = "ยังไม่ระบุที่ฝึกงาน";
      if (p) {
        if (p.status === "APPROVED") placementStatus = "อนุมัติแล้ว";
        else if (p.status === "REJECTED") placementStatus = "ไม่อนุมัติ";
        else placementStatus = "รออนุมัติ";
      }

      // 18. สถานะในระบบ
      const dropStatus = s.isDropped
        ? `ดรอป${s.dropReason ? ` (${s.dropReason})` : ""}`
        : "ปกติ";

      const cats = categorizeStudent(s);
      return {
        id: s.id,
        studentCode: s.studentCode,
        nameTh: s.nameTh,
        phone: s.phone || "",
        advisorName: s.advisor ? s.advisor.name : "",
        trainingProgress,
        cvStatus,
        checklistStatus,
        interviewStatus,
        companyNameTh,
        position: p ? (p.position || "") : "",
        contactPersonName: p ? (p.contactPersonName || "") : "",
        contactPersonPosition: p ? (p.contactPersonPosition || "") : "",
        companyAddress: p ? (p.companyAddress || "") : "",
        province: p ? (p.province || "") : "",
        companyPhone: p ? ([p.companyPhone1, p.companyPhone2].filter(Boolean).join(", ")) : "",
        companyEmail: p ? (p.companyEmail || "") : "",
        placementStatus,
        dropStatus,
        // ฟิลด์เพิ่มเติมเผื่อใช้งาน
        year: s.year,
        email: s.user ? s.user.email : "",
        lineId: s.lineId || "",
        facebook: s.facebook || "",
        cvLink: s.cv ? s.cv.fileUrl : "",
        softHours,
        hardHours,
        totalHours,
        isDropped: s.isDropped,
        dropReason: s.dropReason || "",
        isTrainingComplete,
        readinessCategory: cats.readinessCategory,
        trainingCategory: cats.trainingCategory,
        cvCategory: cats.cvCategory,
        placementCategory: cats.placementCategory,
      };
    });

    // 1. กรองตาม IDs (เฉพาะรายการที่เลือกผ่าน checkbox)
    if (req.query.ids) {
      const idList = String(req.query.ids).split(",").map((id) => parseInt(id.trim(), 10)).filter(Boolean);
      if (idList.length > 0) {
        const idSet = new Set(idList);
        exportData = exportData.filter((s) => idSet.has(s.id));
      }
    } else if (req.query.all !== "true") {
      // 2. กรองตามเงื่อนไข (Filtered)
      if (req.query.viewDropped === "true") {
        exportData = exportData.filter((s) => s.isDropped);
      } else if (req.query.viewDropped === "false") {
        exportData = exportData.filter((s) => !s.isDropped);
      }

      // กรองตาม search
      if (req.query.search) {
        const q = String(req.query.search).toLowerCase();
        exportData = exportData.filter(
          (s) =>
            (s.studentCode && s.studentCode.toLowerCase().includes(q)) ||
            (s.nameTh && s.nameTh.toLowerCase().includes(q))
        );
      }

      // กรองตาม yearPrefix
      if (req.query.yearPrefix) {
        exportData = exportData.filter((s) => s.studentCode && s.studentCode.startsWith(String(req.query.yearPrefix)));
      }

      // กรองตาม statusFilter
      if (req.query.statusFilter) {
        switch (req.query.statusFilter) {
          case "training_passed":
            exportData = exportData.filter((s) => s.isTrainingComplete);
            break;
          case "training_failed":
            exportData = exportData.filter((s) => !s.isTrainingComplete);
            break;
          case "cv_passed":
            exportData = exportData.filter((s) => s.cvStatus === "ผ่าน");
            break;
          case "cv_failed":
            exportData = exportData.filter((s) => s.cvStatus !== "ผ่าน");
            break;
          case "checklist_passed":
            exportData = exportData.filter((s) => s.checklistStatus === "ผ่าน");
            break;
          case "checklist_failed":
            exportData = exportData.filter((s) => s.checklistStatus !== "ผ่าน");
            break;
          case "placement_approved":
            exportData = exportData.filter((s) => s.placementStatus === "อนุมัติแล้ว");
            break;
          case "placement_pending":
            exportData = exportData.filter((s) => s.placementStatus !== "อนุมัติแล้ว");
            break;
        }
      }

      // กรองตาม advisorFilter
      if (req.query.advisorFilter) {
        exportData = exportData.filter((s) => s.advisorName === req.query.advisorFilter);
      }

      // กรองตาม skillFilter
      if (req.query.skillFilter) {
        switch (req.query.skillFilter) {
          case "lack_soft":
            exportData = exportData.filter((s) => (s.softHours || 0) < 12);
            break;
          case "lack_hard":
            exportData = exportData.filter((s) => (s.hardHours || 0) < 18);
            break;
          case "lack_both":
            exportData = exportData.filter((s) => (s.softHours || 0) < 12 && (s.hardHours || 0) < 18);
            break;
        }
      }

      // กรองตาม chartType และ chartKey
      if (req.query.chartType && req.query.chartKey) {
        const ct = req.query.chartType;
        const ck = req.query.chartKey;
        if (ct === "readiness") exportData = exportData.filter((s) => s.readinessCategory === ck);
        else if (ct === "training") exportData = exportData.filter((s) => s.trainingCategory === ck);
        else if (ct === "cv") exportData = exportData.filter((s) => s.cvCategory === ck);
        else if (ct === "placement") exportData = exportData.filter((s) => s.placementCategory === ck);
      }
    }

    res.json({ success: true, data: exportData });
  } catch (err) {
    console.error("GET /api/admin/export error:", err);
    res.status(500).json({ success: false, message: "ดึงข้อมูล Export ไม่สำเร็จ" });
  }
});

// =========================================================================
// 8. นำเข้ารายชื่อนิสิตจากไฟล์ REG Excel / CSV (Preview & Confirm)
// =========================================================================

// POST /api/admin/students/import-preview: วิเคราะห์ไฟล์และแสดงผลสรุปก่อนบันทึก (พร้อมตรวจจับข้อมูลอัปเดต [REQ-03])
router.post("/students/import-preview", upload.single("file"), async (req: Request, res: Response) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ success: false, message: "กรุณาเลือกไฟล์ Excel (.xlsx) หรือ .csv" });
    }

    const customAcademicYear = req.body.academicYear ? parseInt(req.body.academicYear, 10) : null;
    const isCentralOrStaff = Boolean(
      req.staff?.isStaff ||
        req.session.user?.role === "STAFF" ||
        (req.session.user?.role === "ADMIN" && !req.staff?.department)
    );
    const result = parseStudentSpreadsheet(req.file.buffer, customAcademicYear, {
      targetDepartment: req.staff?.department || "วิศวกรรมซอฟต์แวร์",
      allowAllMajors: isCentralOrStaff,
    });

    // [REQ-03] ตรวจสอบว่ามีนิสิตคนใดอยู่ในฐานข้อมูลแล้วบ้าง และมีฟิลด์ใดที่จะถูกอัปเดต
    const codes = result.matchedStudents.map((s) => s.studentCode);
    const existingStudents = await prisma.student.findMany({
      where: { studentCode: { in: codes } },
      include: { trainingRecords: true },
    });
    const existingMap = new Map(existingStudents.map((st) => [st.studentCode, st]));

    let newCount = 0;
    let updateCount = 0;
    let unchangedCount = 0;
    const updatePreview: Array<{ studentCode: string; nameTh: string; changes: string[] }> = [];

    for (const s of result.matchedStudents) {
      const existing = existingMap.get(s.studentCode);
      if (!existing) {
        newCount++;
        continue;
      }

      const changes: string[] = [];
      if (s.nameTh && s.nameTh !== existing.nameTh) {
        changes.push(`ชื่อ-สกุล: ${existing.nameTh} -> ${s.nameTh}`);
      }
      if (typeof s.gpa === "number" && s.gpa !== existing.gpa) {
        changes.push(`GPAX: ${existing.gpa ?? "-"} -> ${s.gpa}`);
      }
      if (s.year && s.year !== existing.year) {
        changes.push(`ชั้นปี: ${existing.year} -> ${s.year}`);
      }
      if (s.major && s.major !== existing.major) {
        changes.push(`สาขา: ${existing.major ?? "-"} -> ${s.major}`);
      }
      if (s.studentStatus && s.studentStatus !== existing.studentStatus) {
        changes.push(`สถานะ: ${existing.studentStatus ?? "-"} -> ${s.studentStatus}`);
      }
      if (typeof s.softSkillHours === "number") {
        const currentSoft = existing.trainingRecords
          .filter((t) => t.skillType === "SOFT" && t.source === "STAFF_IMPORT")
          .reduce((sum, t) => sum + t.hours, 0);
        if (currentSoft !== s.softSkillHours) {
          changes.push(`ชั่วโมง Soft Skill (Co-op): ${currentSoft} -> ${s.softSkillHours} ชม.`);
        }
      }
      if (typeof s.hardSkillHours === "number") {
        const currentHard = existing.trainingRecords
          .filter((t) => t.skillType === "HARD" && t.source === "STAFF_IMPORT")
          .reduce((sum, t) => sum + t.hours, 0);
        if (currentHard !== s.hardSkillHours) {
          changes.push(`ชั่วโมง Hard Skill (Co-op): ${currentHard} -> ${s.hardSkillHours} ชม.`);
        }
      }

      if (changes.length > 0) {
        updateCount++;
        updatePreview.push({
          studentCode: s.studentCode,
          nameTh: s.nameTh || existing.nameTh,
          changes,
        });
      } else {
        unchangedCount++;
      }
    }

    res.json({
      success: true,
      summary: {
        ...result.summary,
        newCount,
        updateCount,
        unchangedCount,
      },
      updatePreview,
      matchedStudents: result.matchedStudents,
      skippedStudents: result.skippedStudents,
    });
  } catch (err: any) {
    console.error("POST /api/admin/students/import-preview error:", err);
    res.status(400).json({
      success: false,
      message: err.message || "เกิดข้อผิดพลาดในการอ่านไฟล์",
    });
  }
});

// POST /api/admin/students/import-confirm: ยืนยันบันทึกข้อมูลนิสิตลงฐานข้อมูล (Upsert โดยไม่ลบข้อมูลเดิม [REQ-02, REQ-03])
router.post("/students/import-confirm", async (req: Request, res: Response) => {
  try {
    const { students } = req.body;
    if (!Array.isArray(students) || students.length === 0) {
      return res.status(400).json({ success: false, message: "ไม่มีรายชื่อนิสิตที่ต้องนำเข้า" });
    }

    let successCount = 0;
    let createdCount = 0;
    let updatedCount = 0;
    let unchangedCount = 0;
    const updatedDetails: Array<{ studentCode: string; nameTh: string; changes: string[] }> = [];
    const errors: any[] = [];

    for (const s of students) {
      if (!s.studentCode || !s.email) continue;

      try {
        const studentCodeStr = String(s.studentCode).trim();
        const existing = await prisma.student.findUnique({
          where: { studentCode: studentCodeStr },
          include: { trainingRecords: true },
        });

        // 1. Upsert User (อีเมลมหาวิทยาลัยสำหรับ Login ผ่าน MSAL / Microsoft OAuth)
        const user = await prisma.user.upsert({
          where: { email: s.email.toLowerCase().trim() },
          update: {
            username: s.nameTh || s.studentCode,
          },
          create: {
            email: s.email.toLowerCase().trim(),
            username: s.nameTh || s.studentCode,
            role: "STUDENT",
            password: null,
          },
        });

        // 2. Upsert Student Profile (เปรียบเทียบและอัปเดตเฉพาะเรคอร์ดที่มีการเปลี่ยนแปลง ไม่ลบข้อมูลเดิม)
        const changes: string[] = [];
        if (existing) {
          if (s.nameTh && s.nameTh !== existing.nameTh) {
            changes.push(`ชื่อ-สกุล: ${existing.nameTh} -> ${s.nameTh}`);
          }
          if (typeof s.gpa === "number" && s.gpa !== existing.gpa) {
            changes.push(`GPAX: ${existing.gpa ?? "-"} -> ${s.gpa}`);
          }
          if (s.year && s.year !== existing.year) {
            changes.push(`ชั้นปี: ${existing.year} -> ${s.year}`);
          }
          if (s.major && s.major !== existing.major) {
            changes.push(`สาขา: ${existing.major ?? "-"} -> ${s.major}`);
          }
          if (s.studentStatus && s.studentStatus !== existing.studentStatus) {
            changes.push(`สถานะ: ${existing.studentStatus ?? "-"} -> ${s.studentStatus}`);
          }
        }

        const studentRecord = await prisma.student.upsert({
          where: { studentCode: studentCodeStr },
          update: {
            nameTh: s.nameTh || undefined,
            year: s.year || undefined,
            major: s.major || undefined,
            curriculum: s.curriculum || undefined,
            studentStatus: s.studentStatus || undefined,
            gpa: typeof s.gpa === "number" ? s.gpa : undefined,
          },
          create: {
            userId: user.id,
            studentCode: studentCodeStr,
            nameTh: s.nameTh || `นิสิต ${studentCodeStr}`,
            nameEn: s.nameEn || "-",
            year: s.year || 1,
            major: s.major || "วิศวกรรมซอฟต์แวร์",
            curriculum: s.curriculum || null,
            studentStatus: s.studentStatus || "กำลังศึกษา",
            gpa: typeof s.gpa === "number" ? s.gpa : null,
          },
        });

        // 3. หากในไฟล์มีชั่วโมงเตรียมความพร้อมจากระบบ Co-op (softSkillHours / hardSkillHours) ให้อัปเดตใน TrainingRecord (source: STAFF_IMPORT)
        if (typeof s.softSkillHours === "number" && s.softSkillHours >= 0) {
          const existingSoft = existing?.trainingRecords.find(
            (t) => t.skillType === "SOFT" && t.source === "STAFF_IMPORT"
          );
          if (!existingSoft && s.softSkillHours > 0) {
            await prisma.trainingRecord.create({
              data: {
                studentId: studentRecord.id,
                title: "ชั่วโมงเตรียมความพร้อม Soft Skill (นำเข้าจากระบบ Co-op)",
                skillType: "SOFT",
                hours: s.softSkillHours,
                source: "STAFF_IMPORT",
                status: "APPROVED",
                reviewedById: req.session.user!.id,
                reviewedAt: new Date(),
              },
            });
            if (existing) changes.push(`Soft Skill (Co-op): 0 -> ${s.softSkillHours} ชม.`);
          } else if (existingSoft && existingSoft.hours !== s.softSkillHours) {
            await prisma.trainingRecord.update({
              where: { id: existingSoft.id },
              data: {
                hours: s.softSkillHours,
                status: "APPROVED",
                reviewedById: req.session.user!.id,
                reviewedAt: new Date(),
              },
            });
            changes.push(`Soft Skill (Co-op): ${existingSoft.hours} -> ${s.softSkillHours} ชม.`);
          }
        }

        if (typeof s.hardSkillHours === "number" && s.hardSkillHours >= 0) {
          const existingHard = existing?.trainingRecords.find(
            (t) => t.skillType === "HARD" && t.source === "STAFF_IMPORT"
          );
          if (!existingHard && s.hardSkillHours > 0) {
            await prisma.trainingRecord.create({
              data: {
                studentId: studentRecord.id,
                title: "ชั่วโมงเตรียมความพร้อม Hard Skill (นำเข้าจากระบบ Co-op)",
                skillType: "HARD",
                hours: s.hardSkillHours,
                source: "STAFF_IMPORT",
                status: "APPROVED",
                reviewedById: req.session.user!.id,
                reviewedAt: new Date(),
              },
            });
            if (existing) changes.push(`Hard Skill (Co-op): 0 -> ${s.hardSkillHours} ชม.`);
          } else if (existingHard && existingHard.hours !== s.hardSkillHours) {
            await prisma.trainingRecord.update({
              where: { id: existingHard.id },
              data: {
                hours: s.hardSkillHours,
                status: "APPROVED",
                reviewedById: req.session.user!.id,
                reviewedAt: new Date(),
              },
            });
            changes.push(`Hard Skill (Co-op): ${existingHard.hours} -> ${s.hardSkillHours} ชม.`);
          }
        }

        if (!existing) {
          createdCount++;
        } else if (changes.length > 0) {
          updatedCount++;
          updatedDetails.push({
            studentCode: studentCodeStr,
            nameTh: s.nameTh || existing.nameTh,
            changes,
          });
        } else {
          unchangedCount++;
        }

        successCount++;
      } catch (rowErr: any) {
        console.error(`Import student error for ${s.studentCode}:`, rowErr);
        errors.push({ studentCode: s.studentCode, error: rowErr.message });
      }
    }

    res.json({
      success: true,
      importedCount: successCount,
      createdCount,
      updatedCount,
      unchangedCount,
      updatedDetails,
      failedCount: errors.length,
      errors: errors.slice(0, 10),
    });
  } catch (err) {
    console.error("POST /api/admin/students/import-confirm error:", err);
    res.status(500).json({ success: false, message: "เกิดข้อผิดพลาดในการบันทึกข้อมูลเข้าสู่ระบบ" });
  }
});

// =========================================================================
// 9. SUPER ADMIN (พี่จอม - เจ้าหน้าที่คณะ) COMMAND CENTER ENDPOINTS
//    - จัดการรอบปีการศึกษา & Unlock สาขาวิชา (8 สาขา)
//    - สร้างกิจกรรมอบรมภายใน (สูงสุด 6 ชม./วัน) & ระบบ Check-in ด้วยรหัสนิสิต
//    - จัดการฐานข้อมูลสถานประกอบการกลาง (Company Master Data & Confirm บริษัทใหม่)
//    - ระบบออกหนังสือขอความอนุเคราะห์ (+แบบตอบรับ), ตรวจใบตอบรับ, ออกหนังสือส่งตัว & Archive
//    - ส่งออกข้อมูลเชื่อมโยงระบบ Co-op ICT ของพี่แดง (Co-op 01)
// =========================================================================

router.get("/super-admin/overview", async (req: Request, res: Response) => {
  try {
    const state = loadSuperAdminState();

    // ดึงนิสิตทั้งหมดพร้อมข้อมูลที่เกี่ยวข้องจากฐานข้อมูลจริง
    const allStudents = await prisma.student.findMany({
      where: { isDropped: false },
      include: {
        user: true,
        cv: true,
        trainingRecords: true,
        companies: {
          include: { submission: true },
          orderBy: { updatedAt: "desc" },
        },
        placement: true,
        advisor: true,
        supervisor: true,
      },
      orderBy: { studentCode: "asc" },
    });

    // ซิงค์บริษัทที่นิสิตกรอกในระบบ (Company / InternshipPlacement) หากยังไม่มีใน Master Data ให้ขึ้นเป็น PENDING_REVIEW อัตโนมัติ
    const normalizeName = (n: string) => n.replace(/\s+/g, "").toLowerCase();
    const existingMasterNames = new Set(
      state.companyMasterData.map((c) => normalizeName(c.nameTh))
    );
    let stateModified = false;

    for (const st of allStudents) {
      for (const comp of st.companies || []) {
        const cleanName = (comp.name || "").trim();
        if (!cleanName) continue;
        const norm = normalizeName(cleanName);
        if (!existingMasterNames.has(norm)) {
          existingMasterNames.add(norm);
          state.companyMasterData.unshift({
            id: `COMP-NEW-${comp.id}`,
            nameTh: cleanName,
            nameEn: "-",
            province: st.placement?.province || "รอระบุจังหวัด",
            address: st.placement?.companyAddress || "รอตรวจสอบที่อยู่จากนิสิต",
            hrContactName: st.placement?.contactPersonName || "-",
            hrPhone: st.placement?.companyPhone1 || "-",
            hrEmail: st.placement?.companyEmail || "-",
            recommendedPositions: st.placement?.position || "นักศึกษาฝึกงาน / สหกิจศึกษา",
            status: "PENDING_REVIEW",
            submittedByStudentCode: st.studentCode,
            submittedByStudentName: st.nameTh,
            createdAt: comp.createdAt ? comp.createdAt.toISOString() : new Date().toISOString(),
          });
          stateModified = true;
        }
      }
    }

    if (stateModified) {
      saveSuperAdminState(state);
    }

    // นับจำนวนนิสิตในแต่ละสาขาวิชาสำหรับแสดงในหน้า Unlock สาขา
    const majorCounts: Record<string, number> = {};
    for (const rule of state.majorUnlockRules) {
      majorCounts[rule.code] = allStudents.filter((s) => {
        const m = `${s.major || ""} ${s.curriculum || ""}`;
        return m.includes(rule.majorName);
      }).length;
    }

    // สร้างรายการคิวงานเอกสารราชการ (Document Workflow Queue)
    // นโยบายใหม่: นิสิตยื่นได้ทีละ 1 บริษัท -> ที่ปรึกษาอนุมัติ Checklist -> ออกหนังสือขอความอนุเคราะห์ (+แบบตอบรับ) -> บริษัทส่งใบตอบรับ (รับ/ปฏิเสธ) -> ถ้ารับ พี่จอมอนุมัติและออกหนังสือส่งตัว
    const documentQueue = allStudents.map((s) => {
      const cat = categorizeStudent(s);
      const activeCompany =
        (s.companies || []).find((c) => c.checklistStatus === "APPROVED") ||
        (s.companies || [])[0] ||
        null;

      const companyName =
        s.placement?.companyNameTh ||
        activeCompany?.name ||
        "";
      const position = s.placement?.position || "นิสิตฝึกงาน / สหกิจศึกษา";
      const checklistStatus = activeCompany?.checklistStatus || "NONE";
      const wfKey = String(s.id);
      const wf = state.docWorkflowMap[wfKey] || {
        studentId: s.id,
        studentCode: s.studentCode,
        companyName,
        interviewDate: "",
        requestLetterIssued: false,
        companyResponseStatus: s.placement?.status === "APPROVED" ? "ACCEPTED" : "NOT_SENT",
        dispatchLetterIssued: s.placement?.status === "APPROVED",
        isLocked: s.placement?.status === "APPROVED",
      };

      const studentArchives = state.archivedApplications.filter(
        (a) => a.studentCode === s.studentCode || a.studentId === s.id
      );

      return {
        studentId: s.id,
        studentCode: s.studentCode,
        nameTh: s.nameTh,
        major: s.major || "วิศวกรรมซอฟต์แวร์",
        year: s.year,
        gpa: s.gpa,
        phone: s.phone || "-",
        email: s.user?.email || "-",
        advisorName: s.advisor?.name || "ยังไม่ระบุ",
        supervisorName: s.supervisor?.name || "ยังไม่ระบุ",
        softHours: cat.softHours,
        hardHours: cat.hardHours,
        cvStatus: s.cv?.status || "NONE",
        cvFileUrl: s.cv?.fileUrl || null,
        companyId: activeCompany?.id || null,
        companyName: companyName || "ยังไม่ยื่นบริษัท",
        position,
        companyAddress: s.placement?.companyAddress || "-",
        companyProvince: s.placement?.province || "-",
        contactPersonName: s.placement?.contactPersonName || "ฝ่ายทรัพยากรบุคคล (HR)",
        contactPersonPhone: s.placement?.companyPhone1 || "-",
        checklistStatus,
        interviewDate: wf.interviewDate || "2026-02-15",
        requestLetterIssued: Boolean(wf.requestLetterIssued),
        requestLetterDocNo: wf.requestLetterDocNo || "",
        requestLetterDate: wf.requestLetterDate || "",
        companyResponseStatus: wf.companyResponseStatus || "NOT_SENT",
        companyResponseFileName: wf.companyResponseFileName || "",
        companyResponseFileUrl: wf.companyResponseFileUrl || "",
        companyResponseNote: wf.companyResponseNote || "",
        dispatchLetterIssued: Boolean(wf.dispatchLetterIssued),
        dispatchLetterDocNo: wf.dispatchLetterDocNo || "",
        dispatchLetterDate: wf.dispatchLetterDate || "",
        isLocked: Boolean(wf.isLocked),
        unlockedByAdmin: Boolean(wf.unlockedByAdmin),
        archiveCount: studentArchives.length,
        archives: studentArchives,
      };
    });

    // จัดกลุ่มนิสิตที่ไปบริษัทเดียวกัน (สำหรับออกหนังสือขอความอนุเคราะห์แบบรวมรายชื่อแนบท้าย Group Letter)
    const companyGroupsMap: Record<
      string,
      {
        companyName: string;
        students: Array<{
          studentId: number;
          studentCode: string;
          nameTh: string;
          major: string;
          position: string;
          checklistStatus: string;
          requestLetterIssued: boolean;
        }>;
      }
    > = {};

    for (const item of documentQueue) {
      if (!item.companyName || item.companyName === "ยังไม่ยื่นบริษัท") continue;
      const key = item.companyName.trim();
      if (!companyGroupsMap[key]) {
        companyGroupsMap[key] = { companyName: key, students: [] };
      }
      companyGroupsMap[key].students.push({
        studentId: item.studentId,
        studentCode: item.studentCode,
        nameTh: item.nameTh,
        major: item.major,
        position: item.position,
        checklistStatus: item.checklistStatus,
        requestLetterIssued: item.requestLetterIssued,
      });
    }

    res.json({
      success: true,
      academicConfig: state.academicConfig,
      majorUnlockRules: state.majorUnlockRules.map((r) => ({
        ...r,
        studentCount: majorCounts[r.code] || 0,
      })),
      trainingEvents: state.trainingEvents,
      companyMasterData: state.companyMasterData,
      pendingMasterCompaniesCount: state.companyMasterData.filter(
        (c) => c.status === "PENDING_REVIEW"
      ).length,
      documentQueue,
      companyGroups: Object.values(companyGroupsMap),
      archivedApplications: state.archivedApplications,
    });
  } catch (err) {
    console.error("GET /api/admin/super-admin/overview error:", err);
    res.status(500).json({ success: false, message: "โหลดข้อมูล Super Admin ไม่สำเร็จ" });
  }
});

// 9.1 บันทึกตั้งค่าปีการศึกษา / ภาคการศึกษา / เลขที่หนังสือราชการเริ่มต้น
router.post("/super-admin/academic-config", async (req: Request, res: Response) => {
  try {
    const state = loadSuperAdminState();
    const { currentAcademicYear, currentSemester, defaultDocPrefix, deanSignatory, deanPosition } =
      req.body;

    if (currentAcademicYear) state.academicConfig.currentAcademicYear = String(currentAcademicYear).trim();
    if (currentSemester) state.academicConfig.currentSemester = String(currentSemester).trim();
    if (defaultDocPrefix !== undefined) state.academicConfig.defaultDocPrefix = String(defaultDocPrefix).trim();
    if (deanSignatory !== undefined) state.academicConfig.deanSignatory = String(deanSignatory).trim();
    if (deanPosition !== undefined) state.academicConfig.deanPosition = String(deanPosition).trim();
    state.academicConfig.updatedAt = new Date().toISOString();

    saveSuperAdminState(state);
    res.json({
      success: true,
      message: "บันทึกการตั้งค่าปีการศึกษาและค่าเริ่มต้นหนังสือราชการเรียบร้อยแล้ว",
      academicConfig: state.academicConfig,
    });
  } catch (err) {
    console.error("POST /api/admin/super-admin/academic-config error:", err);
    res.status(500).json({ success: false, message: "บันทึกการตั้งค่าไม่สำเร็จ" });
  }
});

// 9.2 ปลดล็อก / ล็อก รอบการยื่นขอฝึกงานตามสาขาวิชา (Major Unlocking)
router.post("/super-admin/major-unlock", async (req: Request, res: Response) => {
  try {
    const state = loadSuperAdminState();
    const { code, isUnlocked, targetTerm, openDate, closeDate, note, bulkAction } = req.body;

    if (bulkAction === "UNLOCK_ALL" || bulkAction === "LOCK_ALL") {
      const unlockFlag = bulkAction === "UNLOCK_ALL";
      state.majorUnlockRules = state.majorUnlockRules.map((r) => ({
        ...r,
        isUnlocked: unlockFlag,
        updatedAt: new Date().toISOString(),
      }));
      saveSuperAdminState(state);
      return res.json({
        success: true,
        message: unlockFlag
          ? "ปลดล็อกระบบยื่นขอฝึกงานครบทั้ง 8 สาขาวิชาแล้ว"
          : "ล็อกระบบยื่นขอฝึกงานทั้ง 8 สาขาวิชาชั่วคราวแล้ว",
        majorUnlockRules: state.majorUnlockRules,
      });
    }

    const rule = state.majorUnlockRules.find((r) => r.code === code);
    if (!rule) {
      return res.status(404).json({ success: false, message: "ไม่พบรหัสสาขาวิชาที่ระบุ" });
    }

    if (typeof isUnlocked === "boolean") rule.isUnlocked = isUnlocked;
    if (targetTerm !== undefined) rule.targetTerm = String(targetTerm).trim();
    if (openDate !== undefined) rule.openDate = String(openDate).trim();
    if (closeDate !== undefined) rule.closeDate = String(closeDate).trim();
    if (note !== undefined) rule.note = String(note).trim();
    rule.updatedAt = new Date().toISOString();

    saveSuperAdminState(state);
    res.json({
      success: true,
      message: `อัปเดตสถานะสาขาวิชา${rule.majorName} (${rule.code}) เป็น "${rule.isUnlocked ? "ปลดล็อกให้ยื่นฝึกงาน" : "ล็อกชั่วคราว"}" เรียบร้อยแล้ว`,
      rule,
    });
  } catch (err) {
    console.error("POST /api/admin/super-admin/major-unlock error:", err);
    res.status(500).json({ success: false, message: "อัปเดตสถานะการปลดล็อกสาขาไม่สำเร็จ" });
  }
});

// 9.3 สร้างกิจกรรมอบรมภายในคณะ (คำนวณชั่วโมงอัตโนมัติ สูงสุดไม่เกิน 6 ชม./วัน)
router.post("/super-admin/events", async (req: Request, res: Response) => {
  try {
    const state = loadSuperAdminState();
    const { title, skillType, eventDate, startTime, endTime, targetMajor, targetYear, location, academicYear } =
      req.body;

    if (!title || ! String(title).trim()) {
      return res.status(400).json({ success: false, message: "กรุณาระบุชื่อกิจกรรมอบรม" });
    }

    const { rawHours, creditedHours } = calculateEventHours(
      startTime || "09:00",
      endTime || "16:00"
    );

    const newEvent = {
      id: `EVT-${Date.now().toString().slice(-6)}`,
      title: String(title).trim(),
      skillType: (skillType === "HARD" ? "HARD" : "SOFT") as "SOFT" | "HARD",
      eventDate: eventDate || new Date().toISOString().slice(0, 10),
      startTime: startTime || "09:00",
      endTime: endTime || "16:00",
      rawHours,
      creditedHours,
      targetMajor: targetMajor || "ALL",
      targetYear: targetYear || "ALL",
      location: location || "คณะเทคโนโลยีสารสนเทศและการสื่อสาร ม.พะเยา",
      academicYear: academicYear || state.academicConfig.currentAcademicYear,
      createdBy: req.session?.user?.username || "พี่จอม (Super Admin)",
      createdAt: new Date().toISOString(),
      checkIns: [],
    };

    state.trainingEvents.unshift(newEvent);
    saveSuperAdminState(state);

    res.json({
      success: true,
      message: `สร้างกิจกรรม "${newEvent.title}" สำเร็จ (คำนวณชั่วโมงสุทธิ ${creditedHours} ชม. จากเวลาจริง ${rawHours} ชม. ตามเกณฑ์สูงสุดไม่เกิน 6 ชม./วัน)`,
      event: newEvent,
    });
  } catch (err) {
    console.error("POST /api/admin/super-admin/events error:", err);
    res.status(500).json({ success: false, message: "สร้างกิจกรรมอบรมไม่สำเร็จ" });
  }
});

// 9.4 ลบกิจกรรมอบรม
router.delete("/super-admin/events/:eventId", async (req: Request, res: Response) => {
  try {
    const state = loadSuperAdminState();
    const { eventId } = req.params;
    state.trainingEvents = state.trainingEvents.filter((e) => e.id !== eventId);
    saveSuperAdminState(state);
    res.json({ success: true, message: "ลบกิจกรรมอบรมเรียบร้อยแล้ว" });
  } catch (err) {
    console.error("DELETE /api/admin/super-admin/events error:", err);
    res.status(500).json({ success: false, message: "ลบกิจกรรมไม่สำเร็จ" });
  }
});

// 9.5 บันทึก Check-in นิสิตเข้ากิจกรรมด้วยรหัสนิสิต (จากใบเซ็นชื่อหน้างาน -> เข้าระบบและบวกชั่วโมงเข้า Dashboard ทันที)
router.post("/super-admin/events/:eventId/checkin", async (req: Request, res: Response) => {
  try {
    const state = loadSuperAdminState();
    const { eventId } = req.params;
    const { studentCodesInput } = req.body;

    const event = state.trainingEvents.find((e) => e.id === eventId);
    if (!event) {
      return res.status(404).json({ success: false, message: "ไม่พบกิจกรรมอบรมนี้" });
    }

    const rawText = Array.isArray(studentCodesInput)
      ? studentCodesInput.join("\n")
      : String(studentCodesInput || "");
    const codes = Array.from(
      new Set(
        rawText
          .split(/[\s,;,\n\r\t]+/)
          .map((c) => c.trim())
          .filter((c) => c.length >= 4)
      )
    );

    if (codes.length === 0) {
      return res.status(400).json({
        success: false,
        message: "กรุณากรอกหรือวางรหัสนิสิตอย่างน้อย 1 รหัส",
      });
    }

    const matchedStudents = await prisma.student.findMany({
      where: { studentCode: { in: codes } },
    });
    const studentMap = new Map(matchedStudents.map((s) => [s.studentCode, s]));

    let addedCount = 0;
    let duplicateCount = 0;
    const notFoundCodes: string[] = [];
    const checkedInDetails: Array<{ studentCode: string; nameTh: string; major: string; hours: number }> = [];

    for (const code of codes) {
      if (event.checkIns.some((c) => c.studentCode === code)) {
        duplicateCount++;
        continue;
      }

      const dbStudent = studentMap.get(code);
      if (!dbStudent) {
        notFoundCodes.push(code);
        continue;
      }

      // บันทึกชั่วโมงอบรมเข้าตาราง TrainingRecord จริงในฐานข้อมูลพร้อมสถานะ APPROVED ทันที!
      const record = await prisma.trainingRecord.create({
        data: {
          studentId: dbStudent.id,
          title: `[Check-in กิจกรรมคณะ] ${event.title}`,
          skillType: event.skillType,
          hours: event.creditedHours,
          academicYear: event.academicYear,
          source: "STAFF_IMPORT",
          status: "APPROVED",
          note: `บันทึก Check-in หน้างานโดยพี่จอม เมื่อวันที่ ${event.eventDate} (${event.startTime}-${event.endTime} น.)`,
          reviewedById: req.session?.user?.id || null,
          reviewedAt: new Date(),
        },
      });

      const checkInItem = {
        studentCode: dbStudent.studentCode,
        nameTh: dbStudent.nameTh,
        major: dbStudent.major || "วิศวกรรมซอฟต์แวร์",
        checkedInAt: new Date().toISOString(),
        trainingRecordId: record.id,
      };

      event.checkIns.unshift(checkInItem);
      checkedInDetails.push({
        studentCode: dbStudent.studentCode,
        nameTh: dbStudent.nameTh,
        major: checkInItem.major,
        hours: event.creditedHours,
      });
      addedCount++;
    }

    saveSuperAdminState(state);

    res.json({
      success: true,
      message: `บันทึก Check-in สำเร็จ ${addedCount} คน (+${event.creditedHours} ชม. ${event.skillType} Skill เข้าแดชบอร์ดนิสิตทันที)`,
      addedCount,
      duplicateCount,
      notFoundCodes,
      checkedInDetails,
      event,
    });
  } catch (err) {
    console.error("POST /api/admin/super-admin/events/:eventId/checkin error:", err);
    res.status(500).json({ success: false, message: "บันทึก Check-in ไม่สำเร็จ" });
  }
});

// [DELETE ALL / FILTERED Check-in] ลบนิสิตทั้งหมดในกิจกรรม หรือเฉพาะสาขาที่กำหนด พร้อมหักชั่วโมงคืน
router.delete("/super-admin/events/:eventId/checkin-all", async (req: Request, res: Response) => {
  try {
    const state = loadSuperAdminState();
    const eventId = String(req.params.eventId);
    const major = req.query.major ? String(req.query.major) : "ALL";
    const year = req.query.year ? String(req.query.year) : "ALL";

    const event = state.trainingEvents.find((e) => e.id === eventId);
    if (!event) {
      return res.status(404).json({ success: false, message: "ไม่พบกิจกรรมอบรมนี้" });
    }

    // หานิสิตที่จะลบ (ทั้งหมด หรือ เฉพาะสาขา/ชั้นปีที่กรอง)
    const targetsToDelete = event.checkIns.filter((c) => {
      if (major && major !== "ALL" && c.major !== major) {
        return false;
      }
      if (year && year !== "ALL") {
        const y = c.studentCode ? c.studentCode.substring(0, 2) : "";
        if (y !== year) return false;
      }
      return true;
    });

    if (targetsToDelete.length === 0) {
      return res.status(400).json({ success: false, message: "ไม่พบนิสิตที่ตรงกับเงื่อนไขที่จะลบ" });
    }

    // 1. ดึง recordId ทั้งหมดที่จะลบออกจาก Neon DB
    const recordIdsToDelete = targetsToDelete
      .map((c) => c.trainingRecordId)
      .filter((id): id is number => typeof id === "number");

    if (recordIdsToDelete.length > 0) {
      await prisma.trainingRecord.deleteMany({
        where: { id: { in: recordIdsToDelete } },
      });
    }

    // สำหรับรายการที่ fallback: ลบตาม studentCode + event.title
    const targetStudentCodes = targetsToDelete.map((c) => c.studentCode);
    const matchedStudents = await prisma.student.findMany({
      where: { studentCode: { in: targetStudentCodes } },
      select: { id: true },
    });
    const studentIds = matchedStudents.map((s) => s.id);
    if (studentIds.length > 0) {
      await prisma.trainingRecord.deleteMany({
        where: {
          studentId: { in: studentIds },
          title: `[Check-in กิจกรรมคณะ] ${event.title}`,
        },
      });
    }

    // 2. ลบออกจากอาเรย์ event.checkIns
    const targetCodesSet = new Set(targetStudentCodes);
    event.checkIns = event.checkIns.filter((c) => !targetCodesSet.has(c.studentCode));

    saveSuperAdminState(state);

    const scopeDesc = major && major !== "ALL" ? `สาขา${major}` : "ทั้งหมด";
    res.json({
      success: true,
      message: `ยกเลิก Check-in นิสิต${scopeDesc} สำเร็จ ${targetsToDelete.length} คน (หักชั่วโมงคืนเรียบร้อย)`,
      deletedCount: targetsToDelete.length,
      event,
    });
  } catch (err) {
    console.error("DELETE /api/admin/super-admin/events/:eventId/checkin-all error:", err);
    res.status(500).json({ success: false, message: "ยกเลิก Check-in ทั้งหมดไม่สำเร็จ" });
  }
});

// [DELETE Check-in] ลบนิสิตออกจาก Check-in กิจกรรมอบรม และหักชั่วโมงคืนทันที
router.delete("/super-admin/events/:eventId/checkin/:studentCode", async (req: Request, res: Response) => {
  try {
    const state = loadSuperAdminState();
    const eventId = String(req.params.eventId);
    const studentCode = String(req.params.studentCode);

    const event = state.trainingEvents.find((e) => e.id === eventId);
    if (!event) {
      return res.status(404).json({ success: false, message: "ไม่พบกิจกรรมอบรมนี้" });
    }

    const checkInIdx = event.checkIns.findIndex((c) => c.studentCode === studentCode);
    if (checkInIdx === -1) {
      return res.status(404).json({ success: false, message: "ไม่พบนิสิตคนนี้ในรายการ Check-in ของกิจกรรมนี้" });
    }

    const checkInItem = event.checkIns[checkInIdx];

    // 1. ลบชั่วโมงอบรมออกจากฐานข้อมูลจริง (PostgreSQL / Neon DB)
    if (checkInItem.trainingRecordId) {
      try {
        await prisma.trainingRecord.delete({
          where: { id: checkInItem.trainingRecordId },
        });
      } catch (dbErr) {
        console.warn("Could not delete training record by id, searching by student and title fallback:", dbErr);
        const student = await prisma.student.findUnique({ where: { studentCode } });
        if (student) {
          await prisma.trainingRecord.deleteMany({
            where: {
              studentId: student.id,
              title: `[Check-in กิจกรรมคณะ] ${event.title}`,
            },
          });
        }
      }
    } else {
      const student = await prisma.student.findUnique({ where: { studentCode } });
      if (student) {
        await prisma.trainingRecord.deleteMany({
          where: {
            studentId: student.id,
            title: `[Check-in กิจกรรมคณะ] ${event.title}`,
          },
        });
      }
    }

    // 2. ลบออกจากอาเรย์ checkIns ใน state
    event.checkIns.splice(checkInIdx, 1);
    saveSuperAdminState(state);

    res.json({
      success: true,
      message: `ยกเลิก Check-in และหักชั่วโมงคืนให้นิสิต ${studentCode} สำเร็จ`,
      event,
    });
  } catch (err) {
    console.error("DELETE /api/admin/super-admin/events/:eventId/checkin error:", err);
    res.status(500).json({ success: false, message: "ยกเลิก Check-in ไม่สำเร็จ" });
  }
});

// 9.6 เพิ่ม / แก้ไขข้อมูลบริษัทในฐานข้อมูลกลาง (Company Master Data)
router.post("/super-admin/companies", async (req: Request, res: Response) => {
  try {
    const state = loadSuperAdminState();
    const {
      id,
      nameTh,
      nameEn,
      province,
      address,
      hrContactName,
      hrPhone,
      hrEmail,
      recommendedPositions,
      status,
    } = req.body;

    if (!nameTh || !String(nameTh).trim()) {
      return res.status(400).json({ success: false, message: "กรุณาระบุชื่อสถานประกอบการ (ภาษาไทย/ชื่อทางการ)" });
    }

    const cleanNameTh = String(nameTh).trim();

    if (id) {
      const existing = state.companyMasterData.find((c) => c.id === id);
      if (!existing) {
        return res.status(404).json({ success: false, message: "ไม่พบข้อมูลบริษัทในระบบ" });
      }
      const oldName = existing.nameTh;
      existing.nameTh = cleanNameTh;
      if (nameEn !== undefined) existing.nameEn = String(nameEn).trim();
      if (province !== undefined) existing.province = String(province).trim();
      if (address !== undefined) existing.address = String(address).trim();
      if (hrContactName !== undefined) existing.hrContactName = String(hrContactName).trim();
      if (hrPhone !== undefined) existing.hrPhone = String(hrPhone).trim();
      if (hrEmail !== undefined) existing.hrEmail = String(hrEmail).trim();
      if (recommendedPositions !== undefined)
        existing.recommendedPositions = String(recommendedPositions).trim();
      if (status) existing.status = status;
      if (status === "VERIFIED" || status === "PARTNER") {
        existing.verifiedAt = new Date().toISOString();
      }

      // หากมีการแก้ชื่อมาตรฐาน ให้อัปเดตชื่อในตาราง Company ของนิสิตให้ตรงกันอัตโนมัติ
      if (oldName && oldName !== cleanNameTh) {
        await prisma.company.updateMany({
          where: { name: oldName },
          data: { name: cleanNameTh },
        });
      }

      saveSuperAdminState(state);
      return res.json({
        success: true,
        message: `อัปเดตข้อมูลสถานประกอบการ "${cleanNameTh}" ใน Master Data เรียบร้อยแล้ว`,
        company: existing,
      });
    }

    const newCompany = {
      id: `COMP-M${Date.now().toString().slice(-5)}`,
      nameTh: cleanNameTh,
      nameEn: String(nameEn || "-").trim(),
      province: String(province || "กรุงเทพมหานคร").trim(),
      address: String(address || "-").trim(),
      hrContactName: String(hrContactName || "ฝ่ายทรัพยากรบุคคล (HR)").trim(),
      hrPhone: String(hrPhone || "-").trim(),
      hrEmail: String(hrEmail || "-").trim(),
      recommendedPositions: String(recommendedPositions || "Software Developer / IT Support").trim(),
      status: (status || "VERIFIED") as "VERIFIED" | "PARTNER" | "PENDING_REVIEW" | "BLACKLIST",
      createdAt: new Date().toISOString(),
      verifiedAt: new Date().toISOString(),
    };

    state.companyMasterData.unshift(newCompany);
    saveSuperAdminState(state);

    res.json({
      success: true,
      message: `เพิ่ม "${newCompany.nameTh}" เข้าสู่ฐานข้อมูลกลาง (Master Data) เรียบร้อยแล้ว`,
      company: newCompany,
    });
  } catch (err) {
    console.error("POST /api/admin/super-admin/companies error:", err);
    res.status(500).json({ success: false, message: "บันทึกข้อมูลสถานประกอบการไม่สำเร็จ" });
  }
});

// 9.7 พี่จอมกดยืนยัน (Confirm) บริษัทใหม่ที่นิสิตกรอกเข้าสู่ Master Data หรือยุบรวมชื่อซ้ำ (Merge Duplicate)
router.post("/super-admin/companies/:id/confirm", async (req: Request, res: Response) => {
  try {
    const state = loadSuperAdminState();
    const { id } = req.params;
    const { standardizedNameTh, province, address, status, mergeIntoCompanyId } = req.body;

    const target = state.companyMasterData.find((c) => c.id === id);
    if (!target) {
      return res.status(404).json({ success: false, message: "ไม่พบรายการบริษัทนี้" });
    }

    const originalName = target.nameTh;

    // กรณียุบรวมกับบริษัทที่มีอยู่แล้วใน Master Data (แก้ปัญหานิสิตพิมพ์สะกดไม่ตรงกัน)
    if (mergeIntoCompanyId) {
      const masterComp = state.companyMasterData.find((c) => c.id === mergeIntoCompanyId);
      if (!masterComp) {
        return res.status(404).json({ success: false, message: "ไม่พบบริษัทหลักที่ต้องการยุบรวม" });
      }
      await prisma.company.updateMany({
        where: { name: originalName },
        data: { name: masterComp.nameTh },
      });
      await prisma.internshipPlacement.updateMany({
        where: { companyNameTh: originalName },
        data: { companyNameTh: masterComp.nameTh },
      });
      state.companyMasterData = state.companyMasterData.filter((c) => c.id !== id);
      saveSuperAdminState(state);

      return res.json({
        success: true,
        message: `ยุบรวมชื่อ "${originalName}" เข้ากับ "${masterComp.nameTh}" ใน Master Data เรียบร้อยแล้ว`,
      });
    }

    // กรณียืนยันเพิ่มเข้าเป็นบริษัทมาตรฐานใน Master Data
    const finalName = standardizedNameTh ? String(standardizedNameTh).trim() : originalName;
    target.nameTh = finalName;
    if (province) target.province = String(province).trim();
    if (address) target.address = String(address).trim();
    target.status = status === "PARTNER" ? "PARTNER" : "VERIFIED";
    target.verifiedAt = new Date().toISOString();

    if (finalName !== originalName) {
      await prisma.company.updateMany({
        where: { name: originalName },
        data: { name: finalName },
      });
      await prisma.internshipPlacement.updateMany({
        where: { companyNameTh: originalName },
        data: { companyNameTh: finalName },
      });
    }

    saveSuperAdminState(state);
    res.json({
      success: true,
      message: `ยืนยัน (Confirm) "${finalName}" เข้าสู่ฐานข้อมูลสถานประกอบการกลาง (Master Data) เรียบร้อยแล้ว`,
      company: target,
    });
  } catch (err) {
    console.error("POST /api/admin/super-admin/companies/:id/confirm error:", err);
    res.status(500).json({ success: false, message: "ยืนยันข้อมูลบริษัทไม่สำเร็จ" });
  }
});

// 9.8 ออกหนังสือขอความอนุเคราะห์ฝึกงาน (+ แนบแบบฟอร์มใบตอบรับ) รองรับทั้งเดี่ยวและกลุ่มบริษัทเดียวกัน
router.post("/super-admin/documents/issue-request-letter", async (req: Request, res: Response) => {
  try {
    const state = loadSuperAdminState();
    const { studentIds, docNo, letterDate, interviewDate, companyName } = req.body;

    const ids: number[] = Array.isArray(studentIds)
      ? studentIds.map((n) => Number(n)).filter((n) => !isNaN(n))
      : [Number(studentIds)].filter((n) => !isNaN(n));

    if (ids.length === 0) {
      return res.status(400).json({ success: false, message: "กรุณาเลือกนิสิตอย่างน้อย 1 คน" });
    }

    const students = await prisma.student.findMany({
      where: { id: { in: ids } },
      include: { companies: true, placement: true },
    });

    const finalDocNo =
      docNo ||
      `${state.academicConfig.defaultDocPrefix}ว ${String(Math.floor(100 + Math.random() * 899))}`;
    const finalDate = letterDate || new Date().toISOString().slice(0, 10);
    const batchId = `REQ-BATCH-${Date.now().toString().slice(-6)}`;

    for (const s of students) {
      const wfKey = String(s.id);
      const compName =
        companyName ||
        s.placement?.companyNameTh ||
        s.companies?.[0]?.name ||
        "สถานประกอบการ";
      const existingWf = state.docWorkflowMap[wfKey];

      state.docWorkflowMap[wfKey] = {
        studentId: s.id,
        studentCode: s.studentCode,
        companyName: compName,
        interviewDate: interviewDate || existingWf?.interviewDate || "2026-02-15",
        requestLetterIssued: true,
        requestLetterDocNo: finalDocNo,
        requestLetterDate: finalDate,
        requestLetterBatchId: batchId,
        companyResponseStatus:
          existingWf?.companyResponseStatus && existingWf.companyResponseStatus !== "NOT_SENT"
            ? existingWf.companyResponseStatus
            : "WAITING_RESPONSE",
        dispatchLetterIssued: existingWf?.dispatchLetterIssued || false,
        dispatchLetterDocNo: existingWf?.dispatchLetterDocNo,
        dispatchLetterDate: existingWf?.dispatchLetterDate,
        isLocked: true,
      };
    }

    saveSuperAdminState(state);

    res.json({
      success: true,
      message:
        ids.length > 1
          ? `ออกหนังสือขอความอนุเคราะห์แบบรวมกลุ่ม (${ids.length} คน) เลขที่ ${finalDocNo} พร้อมแบบฟอร์มใบตอบรับเรียบร้อยแล้ว`
          : `ออกหนังสือขอความอนุเคราะห์ เลขที่ ${finalDocNo} พร้อมแบบฟอร์มใบตอบรับเรียบร้อยแล้ว`,
      docNo: finalDocNo,
      letterDate: finalDate,
      studentCount: ids.length,
    });
  } catch (err) {
    console.error("POST /api/admin/super-admin/documents/issue-request-letter error:", err);
    res.status(500).json({ success: false, message: "ออกหนังสือขอความอนุเคราะห์ไม่สำเร็จ" });
  }
});

// 9.9 บันทึกผลใบตอบรับจากสถานประกอบการ (รับเข้าฝึกงาน vs ปฏิเสธ -> เก็บเข้า Archive และปลดล็อกให้ยื่นบริษัทใหม่)
router.post("/super-admin/documents/record-company-response", async (req: Request, res: Response) => {
  try {
    const state = loadSuperAdminState();
    const { studentId, responseStatus, note, fileName } = req.body;

    const student = await prisma.student.findUnique({
      where: { id: Number(studentId) },
      include: { companies: true, placement: true },
    });

    if (!student) {
      return res.status(404).json({ success: false, message: "ไม่พบข้อมูลนิสิต" });
    }

    const wfKey = String(student.id);
    const activeComp =
      student.companies.find((c) => c.checklistStatus === "APPROVED") || student.companies[0];
    const companyName =
      student.placement?.companyNameTh || activeComp?.name || "สถานประกอบการ";
    const position = student.placement?.position || "นิสิตฝึกงาน / สหกิจศึกษา";

    // กรณีบริษัทส่งแบบตอบรับว่า "ปฏิเสธ" (REJECTED):
    // ย้ายข้อมูลบริษัทเดิมเข้า Archive แบบย่อ และปลดล็อกให้นิสิตยื่น Checklist บริษัทแห่งใหม่ได้ทันที!
    if (responseStatus === "REJECTED") {
      state.archivedApplications.unshift({
        id: `ARCH-${Date.now().toString().slice(-6)}`,
        studentId: student.id,
        studentCode: student.studentCode,
        studentName: student.nameTh,
        major: student.major || "วิศวกรรมซอฟต์แวร์",
        companyName,
        position,
        reason: "COMPANY_REJECTED",
        note: note || "สถานประกอบการแจ้งปฏิเสธในใบตอบรับ (ปลดล็อกให้ยื่นบริษัทแห่งใหม่แล้ว)",
        archivedAt: new Date().toISOString(),
      });

      // ลบหรือรีเซ็ต Company เดิมในตาราง Company เพื่อปลดล็อกให้นิสิตยื่น Checklist บริษัทแห่งใหม่ได้ทีละ 1 แห่ง
      if (activeComp) {
        await prisma.companyChecklistAnswer.deleteMany({
          where: { companyId: activeComp.id },
        });
        await prisma.companySubmission.deleteMany({
          where: { companyId: activeComp.id },
        });
        await prisma.company.delete({
          where: { id: activeComp.id },
        });
      }

      if (student.placement) {
        await prisma.internshipPlacement.update({
          where: { id: student.placement.id },
          data: {
            status: "REJECTED",
            note: note || "สถานประกอบการปฏิเสธการรับเข้าฝึกงาน (ปลดล็อกให้ยื่นบริษัทใหม่)",
          },
        });
      }

      state.docWorkflowMap[wfKey] = {
        studentId: student.id,
        studentCode: student.studentCode,
        companyName: "รอเลือกบริษัทใหม่ (ปลดล็อกแล้ว)",
        requestLetterIssued: false,
        companyResponseStatus: "REJECTED",
        companyResponseNote: note || "บริษัทปฏิเสธ — เก็บประวัติเข้า Archive แล้ว",
        dispatchLetterIssued: false,
        isLocked: false,
      };

      saveSuperAdminState(state);
      return res.json({
        success: true,
        message: `บันทึกผล "บริษัทปฏิเสธ" เรียบร้อยแล้ว ระบบได้ย้าย "${companyName}" เข้าสู่ Archive และปลดล็อกให้ ${student.nameTh} ยื่น Checklist บริษัทแห่งใหม่ได้ทันที`,
      });
    }

    // กรณีบริษัทตอบรับ "รับเข้าฝึกงาน" (ACCEPTED)
    const existingWf = state.docWorkflowMap[wfKey];
    state.docWorkflowMap[wfKey] = {
      studentId: student.id,
      studentCode: student.studentCode,
      companyName,
      interviewDate: existingWf?.interviewDate || "2026-02-15",
      requestLetterIssued: true,
      requestLetterDocNo:
        existingWf?.requestLetterDocNo || `${state.academicConfig.defaultDocPrefix}ว 0142`,
      requestLetterDate: existingWf?.requestLetterDate || new Date().toISOString().slice(0, 10),
      companyResponseStatus: "ACCEPTED",
      companyResponseFileName: fileName || `ใบตอบรับ_${student.studentCode}.pdf`,
      companyResponseUploadedAt: new Date().toISOString(),
      companyResponseNote: note || "สถานประกอบการตอบรับเข้าฝึกงานเรียบร้อยแล้ว",
      dispatchLetterIssued: existingWf?.dispatchLetterIssued || false,
      dispatchLetterDocNo: existingWf?.dispatchLetterDocNo,
      dispatchLetterDate: existingWf?.dispatchLetterDate,
      isLocked: true,
    };

    saveSuperAdminState(state);
    res.json({
      success: true,
      message: `ยืนยันผลใบตอบรับ "รับเข้าฝึกงาน" ของ ${student.nameTh} (${companyName}) เรียบร้อยแล้ว พร้อมสำหรับการอนุมัติออกหนังสือส่งตัว`,
    });
  } catch (err) {
    console.error("POST /api/admin/super-admin/documents/record-company-response error:", err);
    res.status(500).json({ success: false, message: "บันทึกผลใบตอบรับไม่สำเร็จ" });
  }
});

// 9.10 พี่จอมอนุมัติและออก "หนังสือส่งตัวนิสิตเข้าฝึกงาน" (Dispatch Letter)
router.post("/super-admin/documents/issue-dispatch-letter", async (req: Request, res: Response) => {
  try {
    const state = loadSuperAdminState();
    const { studentIds, docNo, letterDate } = req.body;

    const ids: number[] = Array.isArray(studentIds)
      ? studentIds.map((n) => Number(n)).filter((n) => !isNaN(n))
      : [Number(studentIds)].filter((n) => !isNaN(n));

    if (ids.length === 0) {
      return res.status(400).json({ success: false, message: "กรุณาเลือกนิสิตอย่างน้อย 1 คน" });
    }

    const students = await prisma.student.findMany({
      where: { id: { in: ids } },
      include: { companies: true, placement: true },
    });

    const finalDocNo =
      docNo ||
      `${state.academicConfig.defaultDocPrefix}ว ${String(Math.floor(500 + Math.random() * 499))}`;
    const finalDate = letterDate || new Date().toISOString().slice(0, 10);

    for (const s of students) {
      const wfKey = String(s.id);
      const compName =
        s.placement?.companyNameTh || s.companies?.[0]?.name || "สถานประกอบการ";
      const existingWf = state.docWorkflowMap[wfKey];

      state.docWorkflowMap[wfKey] = {
        studentId: s.id,
        studentCode: s.studentCode,
        companyName: compName,
        interviewDate: existingWf?.interviewDate || "2026-02-15",
        requestLetterIssued: true,
        requestLetterDocNo:
          existingWf?.requestLetterDocNo || `${state.academicConfig.defaultDocPrefix}ว 0142`,
        requestLetterDate: existingWf?.requestLetterDate || finalDate,
        companyResponseStatus: "ACCEPTED",
        companyResponseFileName:
          existingWf?.companyResponseFileName || `ใบตอบรับ_${s.studentCode}.pdf`,
        dispatchLetterIssued: true,
        dispatchLetterDocNo: finalDocNo,
        dispatchLetterDate: finalDate,
        isLocked: true,
      };

      // อัปเดตสถานะในตาราง InternshipPlacement & Student ให้เป็น APPROVED / READY
      if (s.placement) {
        await prisma.internshipPlacement.update({
          where: { id: s.placement.id },
          data: {
            status: "APPROVED",
            reviewedById: req.session?.user?.id || null,
            reviewedAt: new Date(),
          },
        });
      } else {
        await prisma.internshipPlacement.create({
          data: {
            studentId: s.id,
            companyId: s.companies?.[0]?.id || null,
            companyNameTh: compName,
            position: "นิสิตฝึกงาน / สหกิจศึกษา",
            status: "APPROVED",
            reviewedById: req.session?.user?.id || null,
            reviewedAt: new Date(),
          },
        });
      }

      await prisma.student.update({
        where: { id: s.id },
        data: { stage: "READY" },
      });
    }

    saveSuperAdminState(state);

    res.json({
      success: true,
      message: `อนุมัติและออกหนังสือส่งตัวนิสิตเข้าฝึกงาน เลขที่ ${finalDocNo} จำนวน ${ids.length} คน เรียบร้อยแล้ว`,
      docNo: finalDocNo,
      letterDate: finalDate,
    });
  } catch (err) {
    console.error("POST /api/admin/super-admin/documents/issue-dispatch-letter error:", err);
    res.status(500).json({ success: false, message: "ออกหนังสือส่งตัวไม่สำเร็จ" });
  }
});

// 9.11 ปลดล็อกการออกหนังสือซ้ำกรณีฉุกเฉิน (Executive / Super Admin Override)
router.post("/super-admin/documents/toggle-lock", async (req: Request, res: Response) => {
  try {
    const state = loadSuperAdminState();
    const { studentId } = req.body;
    const wfKey = String(studentId);
    const wf = state.docWorkflowMap[wfKey];
    if (!wf) {
      return res.status(404).json({ success: false, message: "ไม่พบประวัติการออกหนังสือของนิสิตคนนี้" });
    }
    wf.isLocked = !wf.isLocked;
    wf.unlockedByAdmin = !wf.isLocked;
    saveSuperAdminState(state);
    res.json({
      success: true,
      message: wf.isLocked
        ? "ล็อกสถานะการออกหนังสือแล้ว"
        : "ปลดล็อกให้นิสิตสามารถแก้ไขบริษัท/ออกหนังสือใหม่กรณีฉุกเฉินเรียบร้อยแล้ว",
      workflow: wf,
    });
  } catch (err) {
    console.error("POST /api/admin/super-admin/documents/toggle-lock error:", err);
    res.status(500).json({ success: false, message: "สลับสถานะล็อกไม่สำเร็จ" });
  }
});


// =====================================================================
// 10. ระบบตั้งค่าและจัดการ CHECKLIST บริษัท (สำหรับ Super Admin / Staff)
// =====================================================================

// ตรวจสอบสิทธิ์เฉพาะ Staff / Super Admin
function requireSuperAdminStaff(req: Request, res: Response, next: Function) {
  const isSuperAdmin = Boolean(
    req.staff?.isStaff ||
    req.session.user?.role === "STAFF" ||
    req.session.user?.role === "ADMIN"
  );
  if (!isSuperAdmin) {
    return res.status(403).json({
      success: false,
      message: "เฉพาะเจ้าหน้าที่คณะ (Staff/Super Admin) เท่านั้นที่สามารถจัดการตั้งค่า Checklist ได้",
    });
  }
  next();
}

// 10.1 ดึงรายการเวอร์ชันทั้งหมด
router.get("/checklist-versions", requireSuperAdminStaff, async (_req: Request, res: Response) => {
  try {
    const versions = await prisma.checklistVersion.findMany({
      orderBy: [{ status: "asc" }, { id: "desc" }],
      include: {
        sections: {
          orderBy: { order: "asc" },
          include: {
            items: {
              orderBy: { order: "asc" },
              include: {
                _count: { select: { answers: true } },
              },
            },
          },
        },
        _count: {
          select: { companies: true },
        },
      },
    });

    res.json({ success: true, versions });
  } catch (err) {
    console.error("GET /api/admin/checklist-versions error:", err);
    res.status(500).json({ success: false, message: "ดึงรายการเวอร์ชัน Checklist ไม่สำเร็จ" });
  }
});

// 10.2 สร้างเวอร์ชันใหม่ (หรือคัดลอกจากเวอร์ชันเดิม)
router.post("/checklist-versions", requireSuperAdminStaff, async (req: Request, res: Response) => {
  try {
    const { versionName, description, cloneFromVersionId } = req.body;
    if (!versionName || !String(versionName).trim()) {
      return res.status(400).json({ success: false, message: "กรุณาระบุชื่อเวอร์ชัน เช่น v2.0 (ปีการศึกษา 2568)" });
    }

    const cleanName = String(versionName).trim();
    const cleanDesc = description ? String(description).trim() : null;

    // สร้าง Version ใหม่
    const newVersion = await prisma.checklistVersion.create({
      data: {
        versionName: cleanName,
        description: cleanDesc,
        status: "DRAFT",
      },
    });

    // หากเลือกคัดลอกจากเวอร์ชันเดิม
    if (cloneFromVersionId) {
      const sourceVersion = await prisma.checklistVersion.findUnique({
        where: { id: parseInt(String(cloneFromVersionId), 10) },
        include: {
          sections: {
            include: { items: true },
            orderBy: { order: "asc" },
          },
        },
      });

      if (sourceVersion && sourceVersion.sections.length > 0) {
        for (const sec of sourceVersion.sections) {
          await prisma.checklistSection.create({
            data: {
              versionId: newVersion.id,
              title: sec.title,
              order: sec.order,
              items: {
                create: sec.items.map((it) => ({
                  order: it.order,
                  description: it.description,
                  placeholder: it.placeholder,
                  isRequired: it.isRequired,
                  isActive: it.isActive,
                })),
              },
            },
          });
        }
      }
    }

    res.json({
      success: true,
      message: `สร้างเวอร์ชัน ${newVersion.versionName} สำเร็จ`,
      version: newVersion,
    });
  } catch (err) {
    console.error("POST /api/admin/checklist-versions error:", err);
    res.status(500).json({ success: false, message: "สร้างเวอร์ชันใหม่ไม่สำเร็จ" });
  }
});

// 10.3 เปิดใช้งานเวอร์ชัน (Activate Version)
router.put("/checklist-versions/:id/activate", requireSuperAdminStaff, async (req: Request, res: Response) => {
  try {
    const versionId = parseInt(String(req.params.id), 10);
    const target = await prisma.checklistVersion.findUnique({
      where: { id: versionId },
      include: { sections: { include: { items: true } } },
    });

    if (!target) {
      return res.status(404).json({ success: false, message: "ไม่พบเวอร์ชันที่ต้องการเปิดใช้งาน" });
    }

    if (target.sections.length === 0) {
      return res.status(400).json({ success: false, message: "ไม่สามารถเปิดใช้งานเวอร์ชันที่ไม่มีหมวดคำถามได้" });
    }

    // อัปเดตเวอร์ชันเดิมที่เป็น ACTIVE ให้เป็น ARCHIVED
    await prisma.checklistVersion.updateMany({
      where: { status: "ACTIVE" },
      data: { status: "ARCHIVED" },
    });

    // ตั้งเวอร์ชันเป้าหมายเป็น ACTIVE
    const updated = await prisma.checklistVersion.update({
      where: { id: versionId },
      data: { status: "ACTIVE" },
    });

    res.json({
      success: true,
      message: `เปิดใช้งาน ${updated.versionName} เรียบร้อยแล้ว นิสิตที่เริ่มทำ Checklist ใหม่จะใช้เกณฑ์ชุดนี้`,
      version: updated,
    });
  } catch (err) {
    console.error("PUT /api/admin/checklist-versions/:id/activate error:", err);
    res.status(500).json({ success: false, message: "เปิดใช้งานเวอร์ชันไม่สำเร็จ" });
  }
});

// 10.4 แก้ไขข้อมูลเวอร์ชัน (ชื่อ/คำอธิบาย)
router.put("/checklist-versions/:id", requireSuperAdminStaff, async (req: Request, res: Response) => {
  try {
    const versionId = parseInt(String(req.params.id), 10);
    const { versionName, description } = req.body;

    const updated = await prisma.checklistVersion.update({
      where: { id: versionId },
      data: {
        versionName: versionName ? String(versionName).trim() : undefined,
        description: description !== undefined ? (description ? String(description).trim() : null) : undefined,
      },
    });

    res.json({ success: true, message: "แก้ไขข้อมูลเวอร์ชันเรียบร้อยแล้ว", version: updated });
  } catch (err) {
    console.error("PUT /api/admin/checklist-versions/:id error:", err);
    res.status(500).json({ success: false, message: "แก้ไขข้อมูลเวอร์ชันไม่สำเร็จ" });
  }
});

// 10.5 ลบเวอร์ชัน (เฉพาะ DRAFT และไม่มีบริษัทใช้อยู่)
router.delete("/checklist-versions/:id", requireSuperAdminStaff, async (req: Request, res: Response) => {
  try {
    const versionId = parseInt(String(req.params.id), 10);
    const target = await prisma.checklistVersion.findUnique({
      where: { id: versionId },
      include: {
        _count: { select: { companies: true } },
      },
    });

    if (!target) {
      return res.status(404).json({ success: false, message: "ไม่พบเวอร์ชันที่ต้องการลบ" });
    }

    if (target.status === "ACTIVE") {
      return res.status(400).json({ success: false, message: "ไม่สามารถลบเวอร์ชันที่กำลังเปิดใช้งานอยู่ได้" });
    }

    if (target._count.companies > 0) {
      return res.status(400).json({
        success: false,
        message: `ไม่สามารถลบเวอร์ชันนี้ได้เนื่องจากมีประวัตินิสิต ${target._count.companies} บริษัท ผูกอยู่กับเวอร์ชันนี้`,
      });
    }

    // ลบ Sections และ Items ที่ผูกอยู่ (Cascade)
    await prisma.checklistItem.deleteMany({
      where: { section: { versionId } },
    });
    await prisma.checklistSection.deleteMany({
      where: { versionId },
    });
    await prisma.checklistVersion.delete({
      where: { id: versionId },
    });

    res.json({ success: true, message: `ลบเวอร์ชัน ${target.versionName} เรียบร้อยแล้ว` });
  } catch (err) {
    console.error("DELETE /api/admin/checklist-versions/:id error:", err);
    res.status(500).json({ success: false, message: "ลบเวอร์ชันไม่สำเร็จ" });
  }
});

// 10.6 เพิ่มหมวดหลักใหม่ (Checklist Section)
router.post("/checklist-sections", requireSuperAdminStaff, async (req: Request, res: Response) => {
  try {
    const { versionId, title } = req.body;
    if (!versionId || !title || !String(title).trim()) {
      return res.status(400).json({ success: false, message: "กรุณาระบุชื่อหมวดหลัก" });
    }

    const vId = parseInt(versionId, 10);
    const maxOrderSec = await prisma.checklistSection.findFirst({
      where: { versionId: vId },
      orderBy: { order: "desc" },
    });
    const newOrder = maxOrderSec ? maxOrderSec.order + 1 : 1;

    const section = await prisma.checklistSection.create({
      data: {
        versionId: vId,
        title: String(title).trim(),
        order: newOrder,
      },
    });

    res.json({ success: true, message: "เพิ่มหมวดหลักเรียบร้อยแล้ว", section });
  } catch (err) {
    console.error("POST /api/admin/checklist-sections error:", err);
    res.status(500).json({ success: false, message: "เพิ่มหมวดหลักไม่สำเร็จ" });
  }
});

// 10.7 แก้ไขหมวดหลัก (Checklist Section)
router.put("/checklist-sections/:id", requireSuperAdminStaff, async (req: Request, res: Response) => {
  try {
    const sectionId = parseInt(String(req.params.id), 10);
    const { title } = req.body;

    if (!title || !String(title).trim()) {
      return res.status(400).json({ success: false, message: "กรุณาระบุชื่อหมวดหลัก" });
    }

    const section = await prisma.checklistSection.update({
      where: { id: sectionId },
      data: { title: String(title).trim() },
    });

    res.json({ success: true, message: "แก้ไขชื่อหมวดหลักเรียบร้อยแล้ว", section });
  } catch (err) {
    console.error("PUT /api/admin/checklist-sections/:id error:", err);
    res.status(500).json({ success: false, message: "แก้ไขหมวดหลักไม่สำเร็จ" });
  }
});

// 10.8 ลบหมวดหลัก (Checklist Section)
router.delete("/checklist-sections/:id", requireSuperAdminStaff, async (req: Request, res: Response) => {
  try {
    const sectionId = parseInt(String(req.params.id), 10);

    // ตรวจสอบว่ามีคำตอบของนิสิตในข้อใดข้อหนึ่งของหมวดนี้หรือไม่
    const answersCount = await prisma.companyChecklistAnswer.count({
      where: { checklistItem: { sectionId } },
    });

    if (answersCount > 0) {
      return res.status(400).json({
        success: false,
        message: `ไม่สามารถลบหมวดนี้ได้เนื่องจากมีคำตอบของนิสิต ${answersCount} รายการผูกอยู่ แนะนำให้ปิดใช้งานข้อในหมวดแทน`,
      });
    }

    await prisma.checklistItem.deleteMany({ where: { sectionId } });
    await prisma.checklistSection.delete({ where: { id: sectionId } });

    res.json({ success: true, message: "ลบหมวดหลักเรียบร้อยแล้ว" });
  } catch (err) {
    console.error("DELETE /api/admin/checklist-sections/:id error:", err);
    res.status(500).json({ success: false, message: "ลบหมวดหลักไม่สำเร็จ" });
  }
});

// 10.9 เพิ่มข้อย่อย (Checklist Item)
router.post("/checklist-items", requireSuperAdminStaff, async (req: Request, res: Response) => {
  try {
    const { sectionId, description, placeholder, isRequired } = req.body;
    if (!sectionId || !description || !String(description).trim()) {
      return res.status(400).json({ success: false, message: "กรุณาระบุข้อความคำถาม/เกณฑ์การพิจารณา" });
    }

    const sId = parseInt(sectionId, 10);
    const maxOrderItem = await prisma.checklistItem.findFirst({
      where: { sectionId: sId },
      orderBy: { order: "desc" },
    });
    const newOrder = maxOrderItem ? maxOrderItem.order + 1 : 1;

    const item = await prisma.checklistItem.create({
      data: {
        sectionId: sId,
        order: newOrder,
        description: String(description).trim(),
        placeholder: placeholder ? String(placeholder).trim() : null,
        isRequired: Boolean(isRequired),
        isActive: true,
      },
    });

    res.json({ success: true, message: "เพิ่มข้อย่อยเรียบร้อยแล้ว", item });
  } catch (err) {
    console.error("POST /api/admin/checklist-items error:", err);
    res.status(500).json({ success: false, message: "เพิ่มข้อย่อยไม่สำเร็จ" });
  }
});

// 10.10 แก้ไขข้อย่อย (Checklist Item)
router.put("/checklist-items/:id", requireSuperAdminStaff, async (req: Request, res: Response) => {
  try {
    const itemId = parseInt(String(req.params.id), 10);
    const { description, placeholder, isRequired, isActive } = req.body;

    const item = await prisma.checklistItem.update({
      where: { id: itemId },
      data: {
        description: description ? String(description).trim() : undefined,
        placeholder: placeholder !== undefined ? (placeholder ? String(placeholder).trim() : null) : undefined,
        isRequired: isRequired !== undefined ? Boolean(isRequired) : undefined,
        isActive: isActive !== undefined ? Boolean(isActive) : undefined,
      },
    });

    res.json({ success: true, message: "แก้ไขข้อย่อยเรียบร้อยแล้ว", item });
  } catch (err) {
    console.error("PUT /api/admin/checklist-items/:id error:", err);
    res.status(500).json({ success: false, message: "แก้ไขข้อย่อยไม่สำเร็จ" });
  }
});

// 10.11 ลบข้อย่อย (Checklist Item)
router.delete("/checklist-items/:id", requireSuperAdminStaff, async (req: Request, res: Response) => {
  try {
    const itemId = parseInt(String(req.params.id), 10);

    const answersCount = await prisma.companyChecklistAnswer.count({
      where: { checklistItemId: itemId },
    });

    if (answersCount > 0) {
      return res.status(400).json({
        success: false,
        message: `ไม่สามารถลบข้อนี้ได้เนื่องจากมีนิสิตเคยตอบแล้ว ${answersCount} รายการ กรุณากดปุ่ม "ปิดใช้งาน (ซ่อน)" แทน`,
      });
    }

    await prisma.checklistItem.delete({ where: { id: itemId } });
    res.json({ success: true, message: "ลบข้อย่อยเรียบร้อยแล้ว" });
  } catch (err) {
    console.error("DELETE /api/admin/checklist-items/:id error:", err);
    res.status(500).json({ success: false, message: "ลบข้อย่อยไม่สำเร็จ" });
  }
});

// 10.12 สลับลำดับหมวดหลัก หรือ ข้อย่อย (Move Up / Down)
router.post("/checklist-reorder", requireSuperAdminStaff, async (req: Request, res: Response) => {
  try {
    const { type, id, direction } = req.body; // type: 'section' | 'item', direction: 'up' | 'down'
    if (!type || !id || !direction) {
      return res.status(400).json({ success: false, message: "ข้อมูลไม่ครบถ้วน" });
    }

    const targetId = parseInt(id, 10);

    if (type === "section") {
      const current = await prisma.checklistSection.findUnique({ where: { id: targetId } });
      if (!current) return res.status(404).json({ success: false, message: "ไม่พบหมวดนี้" });

      const sibling = await prisma.checklistSection.findFirst({
        where: {
          versionId: current.versionId,
          order: direction === "up" ? { lt: current.order } : { gt: current.order },
        },
        orderBy: { order: direction === "up" ? "desc" : "asc" },
      });

      if (!sibling) {
        return res.json({ success: true, message: "อยู่ลำดับแรกหรือลำดับสุดท้ายแล้ว" });
      }

      // สลับ order ผ่าน transaction
      const currentOrder = current.order;
      const siblingOrder = sibling.order;

      await prisma.$transaction([
        prisma.checklistSection.update({ where: { id: current.id }, data: { order: -9999 } }),
        prisma.checklistSection.update({ where: { id: sibling.id }, data: { order: currentOrder } }),
        prisma.checklistSection.update({ where: { id: current.id }, data: { order: siblingOrder } }),
      ]);

      return res.json({ success: true, message: "จัดลำดับหมวดใหม่เรียบร้อยแล้ว" });
    }

    if (type === "item") {
      const current = await prisma.checklistItem.findUnique({ where: { id: targetId } });
      if (!current) return res.status(404).json({ success: false, message: "ไม่พบข้อนี้" });

      const sibling = await prisma.checklistItem.findFirst({
        where: {
          sectionId: current.sectionId,
          order: direction === "up" ? { lt: current.order } : { gt: current.order },
        },
        orderBy: { order: direction === "up" ? "desc" : "asc" },
      });

      if (!sibling) {
        return res.json({ success: true, message: "อยู่ลำดับแรกหรือลำดับสุดท้ายแล้ว" });
      }

      const currentOrder = current.order;
      const siblingOrder = sibling.order;

      await prisma.$transaction([
        prisma.checklistItem.update({ where: { id: current.id }, data: { order: -9999 } }),
        prisma.checklistItem.update({ where: { id: sibling.id }, data: { order: currentOrder } }),
        prisma.checklistItem.update({ where: { id: current.id }, data: { order: siblingOrder } }),
      ]);

      return res.json({ success: true, message: "จัดลำดับข้อใหม่เรียบร้อยแล้ว" });
    }

    res.status(400).json({ success: false, message: "ประเภทไม่ถูกต้อง" });
  } catch (err) {
    console.error("POST /api/admin/checklist-reorder error:", err);
    res.status(500).json({ success: false, message: "จัดลำดับไม่สำเร็จ" });
  }
});

export default router;
