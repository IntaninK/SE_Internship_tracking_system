const express = require("express");
const prisma = require("../db");
const requireAdvisor = require("../auth/requireAdvisor");

const router = express.Router();

// ต้องผ่าน requireAdvisor ทุก route
router.use(requireAdvisor);

// Helper function: จัดกลุ่ม Checklist Status ของนิสิต
function getStudentChecklistStatus(s) {
  const companies = s.companies || [];
  if (companies.length === 0) {
    return { key: "pending", label: "รอผล", status: "PENDING" };
  }

  const hasApproved = companies.some((c) => c.checklistStatus === "APPROVED");
  const allRejected = companies.every((c) => c.checklistStatus === "REJECTED");

  if (hasApproved) {
    return { key: "reviewed", label: "อาจารย์รีวิวแล้ว", status: "APPROVED" };
  } else if (allRejected) {
    return { key: "failed", label: "ไม่ผ่าน / ทำ checklist เพิ่ม", status: "REJECTED" };
  } else {
    return { key: "pending", label: "รอผล", status: "PENDING" };
  }
}

// Helper function: จัดกลุ่ม Readiness Status ของนิสิต
function getStudentReadinessStatus(s) {
  const approvedTrainings = (s.trainingRecords || []).filter((t) => t.status === "APPROVED");
  const softHours = approvedTrainings
    .filter((t) => t.skillType === "SOFT")
    .reduce((sum, t) => sum + t.hours, 0);
  const hardHours = approvedTrainings
    .filter((t) => t.skillType === "HARD")
    .reduce((sum, t) => sum + t.hours, 0);
  const isTrainingComplete = softHours >= 12 && hardHours >= 18;

  const hasPlacement = s.placement && (s.placement.status === "APPROVED" || s.placement.status === "PENDING");
  const hasPassedInterview = s.companies && s.companies.some((c) => c.submission && c.submission.status === "INTERVIEW_PASSED");

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

// ==========================================
// 1. Dashboard Summary ของอาจารย์ที่ปรึกษา
// ==========================================
router.get("/dashboard-summary", async (req, res) => {
  try {
    const advisorStaffId = req.staff.id;

    // นิสิตที่อาจารย์คนนี้ดูแล
    const students = await prisma.student.findMany({
      where: { advisorId: advisorStaffId },
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
    let checklistStats = {
      reviewed: 0, // อาจารย์รีวิวแล้ว
      pending: 0,  // รอผล
      failed: 0,   // ไม่ผ่าน / ทำ checklist เพิ่ม
    };

    // กราฟ 2: สถานะความพร้อม (ยื่นสมัครสำเร็จ, ตรวจCVผ่าน, ยังไม่มีข้อมูล, ชั่วโมงอบรมยังไม่ครบ, ตรวจชม.อบรมครบ)
    let readinessStats = {
      registered: 0,
      cvApproved: 0,
      noData: 0,
      hoursIncomplete: 0,
      trainingComplete: 0,
    };

    students.forEach((s) => {
      const cStatus = getStudentChecklistStatus(s);
      checklistStats[cStatus.key]++;

      const rStatus = getStudentReadinessStatus(s);
      readinessStats[rStatus.key]++;
    });

    res.json({
      success: true,
      advisorName: req.staff.name,
      totalStudents,
      checklistStats,
      readinessStats,
    });
  } catch (err) {
    console.error("GET /api/advisor/dashboard-summary error:", err);
    res.status(500).json({ success: false, message: "ดึงข้อมูลสรุปไม่สำเร็จ" });
  }
});

// ==========================================
// 2. รายชื่อนิสิตที่อาจารย์คนนี้เป็นที่ปรึกษา
// ==========================================
router.get("/students", async (req, res) => {
  try {
    const advisorStaffId = req.staff.id;
    const { page = 1, limit = 12, search, chartType, chartKey } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const allStudents = await prisma.student.findMany({
      where: { advisorId: advisorStaffId },
      include: {
        user: true,
        cv: true,
        trainingRecords: true,
        companies: { include: { submission: true } },
        placement: true,
      },
      orderBy: { studentCode: "asc" },
    });

    let mapped = allStudents.map((s) => {
      const cStatus = getStudentChecklistStatus(s);
      const rStatus = getStudentReadinessStatus(s);

      return {
        id: s.id,
        studentCode: s.studentCode,
        nameTh: s.nameTh,
        nameEn: s.nameEn,
        nickname: s.major ? `ปี ${s.year}` : "-",
        email: s.user.email,
        phone: s.phone,
        advisorName: req.staff.name,
        checklistStatusKey: cStatus.key,
        checklistStatusLabel: cStatus.label,
        checklistStatusCode: cStatus.status,
        readinessStatusKey: rStatus.key,
        readinessStatusLabel: rStatus.label,
        companiesCount: s.companies.length,
      };
    });

    // กรองตาม Chart ที่คลิกถ้ามี
    if (chartType && chartKey) {
      if (chartType === "checklist") {
        mapped = mapped.filter((s) => s.checklistStatusKey === chartKey);
      } else if (chartType === "readiness") {
        mapped = mapped.filter((s) => s.readinessStatusKey === chartKey);
      }
    }

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

    const total = mapped.length;
    const paginated = mapped.slice(skip, skip + parseInt(limit));

    res.json({
      success: true,
      students: paginated,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit)) || 1,
    });
  } catch (err) {
    console.error("GET /api/advisor/students error:", err);
    res.status(500).json({ success: false, message: "ดึงรายชื่อนิสิตไม่สำเร็จ" });
  }
});

// ==========================================
// 3. Batch ตั้งสถานะ Checklist นิสิตหลายคนพร้อมกัน
// ==========================================
router.put("/batch-checklist-status", async (req, res) => {
  try {
    const advisorStaffId = req.staff.id;
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
        id: { in: studentIds.map((id) => parseInt(id)) },
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
        reviewedById: req.session.user.id,
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
// 4. ดู Checklist ของนิสิตรายบุคคล (สำหรับอาจารย์ที่ปรึกษา)
// ==========================================
router.get("/students/:studentId/checklist", async (req, res) => {
  try {
    const advisorStaffId = req.staff.id;
    const studentId = parseInt(req.params.studentId);

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        user: true,
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

    // ตรวจสอบสิทธิ์ (ถ้าไม่ใช่ ADMIN / COURSE_INSTRUCTOR ต้องเป็นอาจารย์ที่ปรึกษาของนิสิต)
    if (
      req.session.user.role === "ADVISOR" &&
      student.advisorId !== advisorStaffId
    ) {
      return res.status(403).json({
        success: false,
        message: "คุณไม่มีสิทธิ์เข้าดู Checklist ของนิสิตที่ไม่ได้อยู่ในความดูแล",
      });
    }

    // ดึง Checklist Template ทั้งหมด
    const sections = await prisma.checklistSection.findMany({
      include: {
        items: {
          orderBy: { order: "asc" },
        },
      },
      orderBy: { order: "asc" },
    });

    res.json({
      success: true,
      student: {
        id: student.id,
        studentCode: student.studentCode,
        nameTh: student.nameTh,
        nameEn: student.nameEn,
        year: student.year,
        major: student.major,
        gpa: student.gpa,
        email: student.user.email,
        phone: student.phone,
        lineId: student.lineId,
      },
      sections,
      companies: student.companies,
    });
  } catch (err) {
    console.error("GET /api/advisor/students/:id/checklist error:", err);
    res.status(500).json({ success: false, message: "ดึงข้อมูล Checklist นิสิตไม่สำเร็จ" });
  }
});

// ==========================================
// 5. บันทึกผลการตรวจ Checklist ของบริษัทใดบริษัทหนึ่ง
// ==========================================
router.put("/companies/:companyId/checklist-review", async (req, res) => {
  try {
    const advisorStaffId = req.staff.id;
    const companyId = parseInt(req.params.companyId);
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

    if (
      req.session.user.role === "ADVISOR" &&
      company.student.advisorId !== advisorStaffId
    ) {
      return res.status(403).json({
        success: false,
        message: "ไม่มีสิทธิ์ประเมินบริษัทของนิสิตนอกความดูแล",
      });
    }

    const updated = await prisma.company.update({
      where: { id: companyId },
      data: {
        checklistStatus: status,
        checklistNote: note || null,
        reviewedById: req.session.user.id,
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

module.exports = router;
