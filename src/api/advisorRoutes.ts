import express, { Request, Response } from "express";
import prisma from "../db";
import requireAdvisor from "../auth/requireAdvisor";

const router = express.Router();

// ต้องผ่าน requireAdvisor ทุก route
router.use(requireAdvisor);

// Helper function: จัดกลุ่ม Checklist Status ของนิสิต
function getStudentChecklistStatus(s: any) {
  const companies = s.companies || [];
  if (companies.length === 0) {
    return { key: "pending", label: "รอผล", status: "PENDING" };
  }

  const hasApproved = companies.some((c: any) => c.checklistStatus === "APPROVED");
  const allRejected = companies.every((c: any) => c.checklistStatus === "REJECTED");

  if (hasApproved) {
    return { key: "reviewed", label: "อาจารย์รีวิวแล้ว", status: "APPROVED" };
  } else if (allRejected) {
    return { key: "failed", label: "ไม่ผ่าน / ทำ checklist เพิ่ม", status: "REJECTED" };
  } else {
    return { key: "pending", label: "รอผล", status: "PENDING" };
  }
}

// Helper function: จัดกลุ่ม Readiness Status ของนิสิต
function getStudentReadinessStatus(s: any) {
  const approvedTrainings = (s.trainingRecords || []).filter((t: any) => t.status === "APPROVED");
  const softHours = approvedTrainings
    .filter((t: any) => t.skillType === "SOFT")
    .reduce((sum: number, t: any) => sum + t.hours, 0);
  const hardHours = approvedTrainings
    .filter((t: any) => t.skillType === "HARD")
    .reduce((sum: number, t: any) => sum + t.hours, 0);
  const isTrainingComplete = softHours >= 12 && hardHours >= 18;

  const hasPlacement = s.placement && (s.placement.status === "APPROVED" || s.placement.status === "PENDING");
  const hasPassedInterview = s.companies && s.companies.some((c: any) => c.submission && c.submission.status === "INTERVIEW_PASSED");

  if (hasPlacement || hasPassedInterview) {
    return { key: "registered", label: "ยื่นสมัครสำเร็จ" };
  } else if (s.cv && s.cv.status === "APPROVED") {
    return { key: "cvApproved", label: "ตรวจCVผ่าน" };
  } else if (isTrainingComplete) {
    return { key: "trainingComplete", label: "ตรวจชม.อบรมครบ" };
  } else if (s.trainingRecords && s.trainingRecords.length > 0) {
    return { key: "hoursIncomplete", label: "ชั่วโมงอบรมยังไม่ครบ" };
  } else {
    return { key: "noData", label: "ยังไม่มีข้อมูล" };
  }
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

// ==========================================

// Helper: คำนวณระดับความวิกฤตของนิสิต (Risk Priority: 1 วิกฤตสุด -> 5 เบาสุด)
function getStudentRiskPriority(s: any): number {
  // Rank 1: วิกฤตสูงสุด - ยังไม่มีข้อมูลใดๆ หรือยังไม่เริ่มทำอะไรเลย
  const isNoData = s.readinessStatusKey === "noData" ||
    (!s.cvStatus &&
      (s.trainingApprovedSoft || 0) === 0 &&
      (s.trainingApprovedHard || 0) === 0 &&
      s.checklistStatusCode !== "APPROVED" &&
      !s.placementStatus);
  if (isNoData) return 1;

  // Rank 2: มีปัญหา / ติดขัด / ถูกปฏิเสธ / บริษัทไม่ตรง Checklist [REQ-06]
  const hasIssue = s.placementStatus === "REJECTED" ||
    s.isMatchedWithChecklist === false ||
    s.cvStatus === "REJECTED" ||
    s.checklistStatusCode === "REJECTED";
  if (hasIssue) return 2;

  // Rank 3: ตกเกณฑ์ / ชั่วโมงไม่ครบ / ยังไม่ทำ CV
  const isLacking = !s.isTrainingComplete ||
    (s.trainingApprovedSoft || 0) < 12 ||
    (s.trainingApprovedHard || 0) < 18 ||
    s.readinessStatusKey === "hoursIncomplete" ||
    !s.cvStatus;
  if (isLacking) return 3;

  // Rank 4: อยู่ระหว่างรอดำเนินการ / รอตรวจ
  const isPending = s.placementStatus === "PENDING" ||
    s.hasPendingPlacement ||
    s.hasPendingChecklist ||
    s.cvStatus === "PENDING" ||
    s.checklistStatusCode === "PENDING";
  if (isPending) return 4;

  // Rank 5: เบาสุด / ปลอดภัย
  return 5;
}

// 1. Dashboard Summary ของอาจารย์ที่ปรึกษา / อาจารย์นิเทศก์
// ==========================================
router.get("/dashboard-summary", async (req: Request, res: Response) => {
  try {
    const advisorStaffId = req.staff!.id;
    const isSupervisorMode =
      req.query.roleMode === "SUPERVISOR" ||
      (req.session.user?.activeRole === "SUPERVISOR" && !req.query.roleMode);

    const whereClause = isSupervisorMode
      ? { supervisorId: advisorStaffId, isDropped: false }
      : { advisorId: advisorStaffId, isDropped: false };

    // นิสิตที่อาจารย์คนนี้ดูแล (เฉพาะที่ยังไม่ดรอป)
    const students = await prisma.student.findMany({
      where: whereClause,
      include: {
        user: true,
        cv: true,
        trainingRecords: true,
        companies: { include: { submission: true } },
        placement: true,
      },
    });

    const totalStudents = students.length;

    // กราฟ 1: สถานะ Checklist ของนิสิต (อาจารย์รีวิวแล้ว, รอผล, ไม่ผ่าน/ทำchecklist เพิ่ม)
    const checklistStats: Record<string, number> = {
      reviewed: 0, // อาจารย์รีวิวแล้ว
      pending: 0,  // รอผล
      failed: 0,   // ไม่ผ่าน / ทำ checklist เพิ่ม
    };

    // กราฟ 2: สถานะความพร้อม (ยื่นสมัครสำเร็จ, ตรวจCVผ่าน, ยังไม่มีข้อมูล, ชั่วโมงอบรมยังไม่ครบ, ตรวจชม.อบรมครบ)
    const readinessStats: Record<string, number> = {
      registered: 0,
      cvApproved: 0,
      noData: 0,
      hoursIncomplete: 0,
      trainingComplete: 0,
    };

    let pendingChecklistCount = 0;
    let pendingPlacementCount = 0;
    let mismatchedPlacementCount = 0;

    students.forEach((s) => {
      const cStatus = getStudentChecklistStatus(s);
      checklistStats[cStatus.key]++;

      const rStatus = getStudentReadinessStatus(s);
      readinessStats[rStatus.key]++;

      if ((s.companies || []).some((c) => c.checklistStatus === "PENDING")) {
        pendingChecklistCount++;
      }
      if (s.placement && s.placement.status === "PENDING") {
        pendingPlacementCount++;
      }
      if (s.placement && !checkPlacementMatchesChecklist(s.placement, s.companies || [])) {
        mismatchedPlacementCount++;
      }
    });

    res.json({
      success: true,
      advisorName: req.staff!.name,
      totalStudents,
      checklistStats,
      readinessStats,
      pendingChecklistCount,
      pendingPlacementCount,
      mismatchedPlacementCount,
    });
  } catch (err) {
    console.error("GET /api/advisor/dashboard-summary error:", err);
    res.status(500).json({ success: false, message: "ดึงข้อมูลสรุปไม่สำเร็จ" });
  }
});

// ==========================================
// 2. รายชื่อนิสิตที่อาจารย์คนนี้เป็นที่ปรึกษา / อาจารย์นิเทศก์
// ==========================================
router.get("/students", async (req: Request, res: Response) => {
  try {
    const advisorStaffId = req.staff!.id;
    const { page, limit, search, chartType, chartKey } = req.query as Record<string, string | undefined>;
    const pageNum = parseInt(page || "1", 10);
    const limitNum = parseInt(limit || "12", 10);
    const skip = (pageNum - 1) * limitNum;

    const isSupervisorMode =
      req.query.roleMode === "SUPERVISOR" ||
      (req.session.user?.activeRole === "SUPERVISOR" && !req.query.roleMode);

    const whereClause = isSupervisorMode
      ? { supervisorId: advisorStaffId, isDropped: false }
      : { advisorId: advisorStaffId, isDropped: false };

    const allStudents = await prisma.student.findMany({
      where: whereClause,
      include: {
        user: true,
        cv: true,
        trainingRecords: true,
        companies: { include: { submission: true } },
        placement: true,
      },
      orderBy: { studentCode: "desc" },
    });

    let mapped = allStudents.map((s) => {
      const cStatus = getStudentChecklistStatus(s);
      const rStatus = getStudentReadinessStatus(s);

      const approvedTrainings = (s.trainingRecords || []).filter((t) => t.status === "APPROVED");
      const softHours = approvedTrainings
        .filter((t) => t.skillType === "SOFT")
        .reduce((sum, t) => sum + t.hours, 0);
      const hardHours = approvedTrainings
        .filter((t) => t.skillType === "HARD")
        .reduce((sum, t) => sum + t.hours, 0);
      const isTrainingComplete = softHours >= 12 && hardHours >= 18;
      const cvStatus = s.cv ? s.cv.status : "NONE";
      const placementStatus = s.placement ? s.placement.status : "NONE";
      const isMatchedWithChecklist = s.placement
        ? checkPlacementMatchesChecklist(s.placement, s.companies || [])
        : null;
      const hasPendingChecklist = (s.companies || []).some((c) => c.checklistStatus === "PENDING");
      const hasPendingPlacement = Boolean(s.placement && s.placement.status === "PENDING");

      return {
        id: s.id,
        studentCode: s.studentCode,
        nameTh: s.nameTh,
        nameEn: s.nameEn,
        major: s.major,
        nickname: s.nickname || (s.major ? `ปี ${s.year}` : "-"),
        email: s.user.email,
        phone: s.phone,
        semester: s.semester || "2",
        academicYear: s.academicYear,
        advisorName: req.staff!.name,
        checklistStatusKey: cStatus.key,
        checklistStatusLabel: cStatus.label,
        checklistStatusCode: cStatus.status,
        readinessStatusKey: rStatus.key,
        readinessStatusLabel: rStatus.label,
        companiesCount: s.companies.length,
        isTrainingComplete,
        trainingApprovedSoft: softHours,
        trainingApprovedHard: hardHours,
        cvStatus,
        placementStatus,
        isMatchedWithChecklist,
        hasPendingChecklist,
        hasPendingPlacement,
      };
    });

    const sortBy = (req.query.sortBy as string) || "critical";
    mapped.sort((a: any, b: any) => {
      if (sortBy === "critical") {
        const pA = getStudentRiskPriority(a);
        const pB = getStudentRiskPriority(b);
        if (pA !== pB) {
          return pA - pB;
        }
        try {
          const codeA = BigInt(a.studentCode);
          const codeB = BigInt(b.studentCode);
          return codeA === codeB ? 0 : codeA > codeB ? -1 : 1;
        } catch {
          return (a.studentCode || "").localeCompare(b.studentCode || "");
        }
      } else if (sortBy === "studentCode_desc") {
        try {
          const codeA = BigInt(a.studentCode);
          const codeB = BigInt(b.studentCode);
          return codeA === codeB ? 0 : codeA > codeB ? -1 : 1;
        } catch {
          return (b.studentCode || "").localeCompare(a.studentCode || "");
        }
      } else if (sortBy === "studentCode_asc") {
        try {
          const codeA = BigInt(a.studentCode);
          const codeB = BigInt(b.studentCode);
          return codeA === codeB ? 0 : codeA < codeB ? -1 : 1;
        } catch {
          return (a.studentCode || "").localeCompare(b.studentCode || "");
        }
      } else if (sortBy === "name_asc") {
        return (a.nameTh || "").localeCompare(b.nameTh || "", "th");
      }
      return 0;
    });

    // กรองตาม Search query
    if (search) {
      const q = search.toLowerCase();
      mapped = mapped.filter(
        (s) =>
          s.studentCode.toLowerCase().includes(q) ||
          s.nameTh.toLowerCase().includes(q) ||
          (s.nameEn && s.nameEn.toLowerCase().includes(q)) ||
          s.email.toLowerCase().includes(q)
      );
    }

    // Filter ตามปีของรหัสนิสิต (2 หลักแรก เช่น 67, 68)
    const yearPrefix = req.query.yearPrefix as string | undefined;
    if (yearPrefix) {
      mapped = mapped.filter((s) => s.studentCode && s.studentCode.startsWith(yearPrefix));
    }

    // Filter ตาม dropdown "สถานะ"
    const statusFilter = req.query.statusFilter as string | undefined;
    if (statusFilter) {
      switch (statusFilter) {
        case "training_passed":
          mapped = mapped.filter((s) => s.isTrainingComplete);
          break;
        case "training_incomplete":
        case "training_failed":
          mapped = mapped.filter((s) => !s.isTrainingComplete);
          break;
        case "cv_approved":
        case "cv_passed":
          mapped = mapped.filter((s) => s.cvStatus === "APPROVED");
          break;
        case "cv_pending":
        case "cv_rejected":
        case "cv_failed":
          mapped = mapped.filter((s) => s.cvStatus !== "APPROVED");
          break;
        case "checklist_approved":
        case "checklist_passed":
          mapped = mapped.filter((s) => s.checklistStatusCode === "APPROVED");
          break;
        case "checklist_pending":
        case "checklist_rejected":
        case "checklist_failed":
          mapped = mapped.filter((s) => s.checklistStatusCode !== "APPROVED");
          break;
        case "placement_approved":
          mapped = mapped.filter((s) => s.placementStatus === "APPROVED");
          break;
        case "placement_pending":
          mapped = mapped.filter((s) => s.placementStatus !== "APPROVED");
          break;
      }
    }

    // Filter ตาม dropdown "Skill" (Soft/Hard skill)
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

    // สถิติสำหรับกราฟวงกลม: คำนวณจากข้อมูลที่ผ่าน filter ค้นหา/ปี/สถานะ/skill แล้ว
    const chartStats: {
      totalStudents: number;
      checklistStats: Record<string, number>;
      readinessStats: Record<string, number>;
    } = {
      totalStudents: mapped.length,
      checklistStats: { reviewed: 0, pending: 0, failed: 0 },
      readinessStats: { registered: 0, cvApproved: 0, noData: 0, hoursIncomplete: 0, trainingComplete: 0 },
    };

    mapped.forEach((s) => {
      chartStats.checklistStats[s.checklistStatusKey] = (chartStats.checklistStats[s.checklistStatusKey] || 0) + 1;
      chartStats.readinessStats[s.readinessStatusKey] = (chartStats.readinessStats[s.readinessStatusKey] || 0) + 1;
    });

    // กรองตาม Chart ที่คลิกถ้ามี
    if (chartType && chartKey) {
      if (chartType === "checklist") {
        mapped = mapped.filter((s) => s.checklistStatusKey === chartKey);
      } else if (chartType === "readiness") {
        mapped = mapped.filter((s) => s.readinessStatusKey === chartKey);
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
    console.error("GET /api/advisor/students error:", err);
    res.status(500).json({ success: false, message: "ดึงรายชื่อนิสิตไม่สำเร็จ" });
  }
});

// ==========================================
// 3. Batch ตั้งสถานะ Checklist นิสิตหลายคนพร้อมกัน
// ==========================================
router.put("/batch-checklist-status", async (req: Request, res: Response) => {
  try {
    const advisorStaffId = req.staff!.id;
    const { studentIds, status, note } = req.body;

    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({ success: false, message: "กรุณาเลือกนิสิตอย่างน้อย 1 คน" });
    }

    if (!["APPROVED", "REJECTED", "PENDING"].includes(status)) {
      return res.status(400).json({ success: false, message: "สถานะไม่ถูกต้อง" });
    }

    // ตรวจสอบว่าเป็นนิสิตของอาจารย์คนนี้จริง
    const validStudents = await prisma.student.findMany({
      where: {
        id: { in: studentIds.map((id: any) => parseInt(id, 10)) },
        advisorId: advisorStaffId,
      },
      select: { id: true },
    });

    const validIds = validStudents.map((s) => s.id);
    if (validIds.length === 0) {
      return res.status(403).json({ success: false, message: "ไม่มีนิสิตในความดูแลที่ตรงกับที่เลือก" });
    }

    // อัปเดตสถานะ Checklist ของทุกบริษัทที่นิสิตส่ง
    const updateResult = await prisma.company.updateMany({
      where: { studentId: { in: validIds } },
      data: {
        checklistStatus: status,
        checklistNote: note || null,
        reviewedById: req.session.user!.id,
        reviewedAt: new Date(),
      },
    });

    res.json({
      success: true,
      message: `อัปเดตสถานะ Checklist ให้กับนิสิต ${validIds.length} คน (${updateResult.count} บริษัท) เรียบร้อยแล้ว`,
    });
  } catch (err) {
    console.error("PUT /api/advisor/batch-checklist-status error:", err);
    res.status(500).json({ success: false, message: "บันทึกสถานะไม่สำเร็จ" });
  }
});

// ==========================================
// 3.1 Batch ตั้งสถานะนิสิต (Checklist หรือ ข้อมูลบริษัทที่เข้าฝึกงาน)
// ==========================================
router.put("/batch-status", async (req: Request, res: Response) => {
  try {
    const advisorStaffId = req.staff!.id;
    const { studentIds, statusType, status, note } = req.body;

    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({ success: false, message: "กรุณาเลือกนิสิตอย่างน้อย 1 คน" });
    }

    if (!["checklist", "placement"].includes(statusType)) {
      return res.status(400).json({ success: false, message: "ประเภทสถานะไม่ถูกต้อง (ต้องเป็น checklist หรือ placement)" });
    }

    if (!["APPROVED", "REJECTED", "PENDING"].includes(status)) {
      return res.status(400).json({ success: false, message: "สถานะไม่ถูกต้อง" });
    }

    // ตรวจสอบว่าเป็นนิสิตของอาจารย์ที่ปรึกษาคนนี้จริง
    const validStudents = await prisma.student.findMany({
      where: {
        id: { in: studentIds.map((id: any) => parseInt(id, 10)) },
        advisorId: advisorStaffId,
      },
      select: { id: true },
    });

    const validIds = validStudents.map((s) => s.id);
    if (validIds.length === 0) {
      return res.status(403).json({ success: false, message: "ไม่มีนิสิตในความดูแลที่ตรงกับที่เลือก" });
    }

    if (statusType === "checklist") {
      const updateResult = await prisma.company.updateMany({
        where: { studentId: { in: validIds } },
        data: {
          checklistStatus: status,
          checklistNote: note || null,
          reviewedById: req.session.user!.id,
          reviewedAt: new Date(),
        },
      });

      return res.json({
        success: true,
        message: `อัปเดตสถานะ Checklist ให้กับนิสิต ${validIds.length} คน (${updateResult.count} บริษัท) เรียบร้อยแล้ว`,
      });
    } else if (statusType === "placement") {
      await Promise.all(
        validIds.map((sid) =>
          prisma.internshipPlacement.upsert({
            where: { studentId: sid },
            create: {
              studentId: sid,
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
          })
        )
      );

      return res.json({
        success: true,
        message: `อัปเดตสถานะที่ฝึกงานให้กับนิสิต ${validIds.length} คน เรียบร้อยแล้ว`,
      });
    }
  } catch (err) {
    console.error("PUT /api/advisor/batch-status error:", err);
    res.status(500).json({ success: false, message: "บันทึกสถานะไม่สำเร็จ" });
  }
});

// ==========================================
// 4. ดู Checklist ของนิสิตรายบุคคล (สำหรับอาจารย์ที่ปรึกษา)
// ==========================================
router.get("/students/:studentId/checklist", async (req: Request, res: Response) => {
  try {
    const advisorStaffId = req.staff!.id;
    const studentId = parseInt(req.params.studentId as string, 10);

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        user: true,
        placement: true,
        companies: {
          include: {
            answers: {
              include: {
                checklistItem: {
                  include: { section: true },
                },
              },
            },
          },
          orderBy: { id: "asc" },
        },
      },
    });

    if (!student) {
      return res.status(404).json({ success: false, message: "ไม่พบข้อมูลนิสิต" });
    }

    const isCourseAdminOrStaff = Boolean(
      req.staff?.isCourseAdmin ||
        req.staff?.isStaff ||
        req.session.user!.role === "ADMIN" ||
        req.session.user!.role === "STAFF"
    );

    // ตรวจสอบสิทธิ์ (ถ้าไม่ใช่ ADMIN / STAFF ต้องเป็นอาจารย์ที่ปรึกษาหรือนิเทศก์ของนิสิต)
    if (
      !isCourseAdminOrStaff &&
      student.advisorId !== advisorStaffId &&
      student.supervisorId !== advisorStaffId
    ) {
      return res.status(403).json({
        success: false,
        message: "คุณไม่มีสิทธิ์เข้าดู Checklist ของนิสิตที่ไม่ได้อยู่ในความดูแล",
      });
    }

    // ดึง Checklist Template ตามเวอร์ชันที่นิสิตยื่น (หรือ Active Version)
    const primaryCompany = student.companies?.[0];
    const targetVersionId = primaryCompany?.checklistVersionId;

    let targetVersion = targetVersionId
      ? await prisma.checklistVersion.findUnique({
          where: { id: targetVersionId },
          include: {
            sections: {
              orderBy: { order: "asc" },
              include: { items: { orderBy: { order: "asc" } } },
            },
          },
        })
      : null;

    if (!targetVersion) {
      targetVersion = await prisma.checklistVersion.findFirst({
        where: { status: "ACTIVE" },
        include: {
          sections: {
            orderBy: { order: "asc" },
            include: { items: { orderBy: { order: "asc" } } },
          },
        },
      });
    }

    if (!targetVersion) {
      targetVersion = await prisma.checklistVersion.findFirst({
        orderBy: { id: "asc" },
        include: {
          sections: {
            orderBy: { order: "asc" },
            include: { items: { orderBy: { order: "asc" } } },
          },
        },
      });
    }

    const sections = targetVersion?.sections || [];

    const canReview = Boolean(
      student.advisorId &&
      advisorStaffId &&
      student.advisorId === advisorStaffId
    );

    const isMatchedWithChecklist = student.placement
      ? checkPlacementMatchesChecklist(student.placement, student.companies || [])
      : false;

    res.json({
      success: true,
      canReview,
      student: {
        id: student.id,
        studentCode: student.studentCode,
        nameTh: student.nameTh,
        nameEn: student.nameEn,
        nickname: student.nickname,
        year: student.year,
        major: student.major,
        gpa: student.gpa,
        email: student.user.email,
        phone: student.phone,
        lineId: student.lineId,
      },
      sections,
      companies: student.companies,
      placement: student.placement
        ? {
            ...student.placement,
            isMatchedWithChecklist,
          }
        : null,
    });
  } catch (err) {
    console.error("GET /api/advisor/students/:id/checklist error:", err);
    res.status(500).json({ success: false, message: "ดึงข้อมูล Checklist นิสิตไม่สำเร็จ" });
  }
});

// ==========================================
// 5. บันทึกผลการตรวจ Checklist ของบริษัทใดบริษัทหนึ่ง
// ==========================================
router.put("/companies/:companyId/checklist-review", async (req: Request, res: Response) => {
  try {
    const advisorStaffId = req.staff!.id;
    const companyId = parseInt(req.params.companyId as string, 10);
    const { status, note } = req.body;

    if (!["APPROVED", "REJECTED", "PENDING"].includes(status)) {
      return res.status(400).json({ success: false, message: "สถานะไม่ถูกต้อง" });
    }

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: { student: true },
    });

    if (!company) {
      return res.status(404).json({ success: false, message: "ไม่พบบริษัท" });
    }

    // สิทธิ์การตรวจประเมิน Checklist:
    // ต้องเป็นอาจารย์ที่ปรึกษาของนิสิตคนนี้เท่านั้น (advisorId ของนิสิตตรงกับ staff id ของผู้ตรวจ)
    if (
      !company.student.advisorId ||
      !advisorStaffId ||
      company.student.advisorId !== advisorStaffId
    ) {
      return res.status(403).json({
        success: false,
        message: "ไม่มีสิทธิ์ประเมิน Checklist (สิทธิ์นี้เป็นของอาจารย์ที่ปรึกษาที่ดูแลนิสิตคนนี้เท่านั้น)",
      });
    }

    const updated = await prisma.company.update({
      where: { id: companyId },
      data: {
        checklistStatus: status,
        checklistNote: note || null,
        reviewedById: req.session.user!.id,
        reviewedAt: new Date(),
      },
    });

    res.json({
      success: true,
      message: "บันทึกผลการตรวจ Checklist เรียบร้อยแล้ว",
      company: updated,
    });
  } catch (err) {
    console.error("PUT /api/advisor/companies/:id/checklist-review error:", err);
    res.status(500).json({ success: false, message: "บันทึกผลตรวจไม่สำเร็จ" });
  }
});

// ==========================================
// 6. Export ข้อมูลนิสิตแบบละเอียด (สำหรับ CSV)
// ==========================================
router.get("/export", async (req: Request, res: Response) => {
  try {
    const advisorStaffId = req.staff!.id;

    const students = await prisma.student.findMany({
      where: { advisorId: advisorStaffId },
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
      const approvedTrainings = (s.trainingRecords || []).filter((t) => t.status === "APPROVED");
      const softHours = approvedTrainings
        .filter((t) => t.skillType === "SOFT")
        .reduce((sum, t) => sum + t.hours, 0);
      const hardHours = approvedTrainings
        .filter((t) => t.skillType === "HARD")
        .reduce((sum, t) => sum + t.hours, 0);
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
        const hasApproved = companies.some((c) => c.checklistStatus === "APPROVED");
        const allRejected = companies.every((c) => c.checklistStatus === "REJECTED");
        if (hasApproved) checklistStatus = "ผ่าน";
        else if (allRejected) checklistStatus = "ไม่ผ่าน";
        else checklistStatus = "รอผล";
      }

      // 8. ผลการสมัคร/สัมภาษณ์
      const submissions = companies.map((c) => c.submission).filter(Boolean);
      let interviewStatus = "ยังไม่ได้ยื่น";
      if (submissions.some((sub) => sub?.status === "INTERVIEW_PASSED")) {
        interviewStatus = "สัมภาษณ์ผ่านแล้ว";
      } else if (submissions.some((sub) => sub?.status === "INTERVIEWED_PENDING")) {
        interviewStatus = "สัมภาษณ์แล้ว รอผล";
      } else if (submissions.some((sub) => sub?.status === "SUBMITTED_WAITING")) {
        interviewStatus = "ยื่นแล้ว รอสัมภาษณ์";
      } else if (submissions.some((sub) => sub?.status === "INTERVIEW_FAILED_REAPPLIED")) {
        interviewStatus = "สัมภาษณ์ไม่ผ่าน ยื่นเพิ่มแล้ว";
      } else {
        interviewStatus = "ยังไม่ได้ยื่น";
      }

      // ข้อมูล Placement และบริษัท
      const p = s.placement;
      const passedCompany = companies.find((c) => c.submission && c.submission.status === "INTERVIEW_PASSED");
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

      const cStatus = getStudentChecklistStatus(s);
      const rStatus = getStudentReadinessStatus(s);

      return {
        id: s.id,
        studentCode: s.studentCode,
        nameTh: s.nameTh,
        phone: s.phone || "",
        advisorName: s.advisor ? s.advisor.name : (req.staff?.name || ""),
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
        checklistStatusKey: cStatus.key,
        checklistStatusCode: cStatus.status,
        readinessStatusKey: rStatus.key,
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
      if (req.query.search) {
        const q = String(req.query.search).toLowerCase();
        exportData = exportData.filter(
          (s) =>
            (s.studentCode && s.studentCode.toLowerCase().includes(q)) ||
            (s.nameTh && s.nameTh.toLowerCase().includes(q)) ||
            (s.email && s.email.toLowerCase().includes(q))
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
            exportData = exportData.filter((s) => s.checklistStatusCode === "APPROVED");
            break;
          case "checklist_failed":
            exportData = exportData.filter((s) => s.checklistStatusCode !== "APPROVED");
            break;
          case "placement_approved":
            exportData = exportData.filter((s) => s.placementStatus === "อนุมัติแล้ว");
            break;
          case "placement_pending":
            exportData = exportData.filter((s) => s.placementStatus !== "อนุมัติแล้ว");
            break;
        }
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
        if (ct === "checklist") exportData = exportData.filter((s) => s.checklistStatusKey === ck);
        else if (ct === "readiness") exportData = exportData.filter((s) => s.readinessStatusKey === ck);
      }
    }

    res.json({ success: true, data: exportData });
  } catch (err) {
    console.error("GET /api/advisor/export error:", err);
    res.status(500).json({ success: false, message: "ดึงข้อมูล Export ไม่สำเร็จ" });
  }
});

// ==========================================
// ตั้งสถานะอนุมัติที่ฝึกงานของนิสิต (อาจารย์ที่ปรึกษา)
// ==========================================
router.put("/students/:studentId/placement-status", async (req: Request, res: Response) => {
  try {
    const advisorStaffId = req.staff!.id;
    const studentId = parseInt(req.params.studentId as string, 10);
    const { status, note } = req.body;

    if (!["APPROVED", "REJECTED", "PENDING"].includes(status)) {
      return res.status(400).json({ success: false, message: "สถานะไม่ถูกต้อง" });
    }

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: { companies: true },
    });

    if (!student) {
      return res.status(404).json({ success: false, message: "ไม่พบข้อมูลนิสิต" });
    }

    if (student.advisorId !== advisorStaffId && req.session.user!.role !== "ADMIN") {
      return res.status(403).json({
        success: false,
        message: "ไม่มีสิทธิ์อนุมัติที่ฝึกงาน (สิทธิ์นี้เป็นของอาจารย์ที่ปรึกษาที่ดูแลนิสิตคนนี้เท่านั้น)",
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
    console.error("PUT /api/advisor/students/:id/placement-status error:", err);
    res.status(500).json({ success: false, message: "อัพเดตสถานะอนุมัติฝึกงานไม่สำเร็จ" });
  }
});

export default router;
