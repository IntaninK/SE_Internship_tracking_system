const express = require("express");
const prisma = require("../db");
const requireAdmin = require("../auth/requireAdmin");

const router = express.Router();

// ต้อง login + เป็น admin ทุก route ภายใต้ /api/admin
router.use(requireAdmin);

const STATUS_LABELS = {
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

function categorizeStudent(s) {
  const approvedTrainings = (s.trainingRecords || []).filter((t) => t.status === "APPROVED");
  const softHours = approvedTrainings
    .filter((t) => t.skillType === "SOFT")
    .reduce((sum, t) => sum + t.hours, 0);
  const hardHours = approvedTrainings
    .filter((t) => t.skillType === "HARD")
    .reduce((sum, t) => sum + t.hours, 0);
  const isTrainingComplete = softHours >= 12 && hardHours >= 18;
  const hasRejectedTraining = (s.trainingRecords || []).some((t) => t.status === "REJECTED");
  const hasPendingTraining = (s.trainingRecords || []).some((t) => t.status === "PENDING");

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
  let placementCategory = null;
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
  } else if (s.companies && s.companies.some((c) => c.submission && c.submission.status === "INTERVIEW_PASSED")) {
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

// ==========================================
// 1. Dashboard Summary — สรุปสถิตินิสิตทั้งหมด (กราฟวงกลม 4 อัน + สรุปจำนวน)
// ==========================================
router.get("/dashboard-summary", async (req, res) => {
  try {
    // ดึงนิสิตทั้งหมดพร้อมข้อมูลที่เกี่ยวข้อง
    const students = await prisma.student.findMany({
      include: {
        user: true,
        cv: true,
        trainingRecords: true,
        companies: { include: { submission: true } },
        placement: true,
        advisor: { include: { user: true } },
      },
    });

    // ตรวจสอบและสร้างข้อมูล Staff ให้อัตโนมัติสำหรับ User ที่มี role ADVISOR (ถ้ายังไม่มีในตาราง Staff)
    const advisorUsers = await prisma.user.findMany({
      where: { role: { in: ["ADVISOR", "STAFF"] } },
      include: { staff: true },
    });

    for (const u of advisorUsers) {
      if (!u.staff) {
        await prisma.staff.create({
          data: {
            userId: u.id,
            name: u.username || u.email,
          },
        });
      }
    }

    // ดึงอาจารย์ที่ปรึกษาทั้งหมด
    const advisors = await prisma.staff.findMany({
      where: { user: { role: { in: ["ADVISOR"] } } },
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
    let readinessStats = {
      approvedPlacement: 0,
      cvApproved: 0,
      noDataOrHoursLack: 0,
      trainingComplete: 0,
      cvNotReviewed: 0,
    };

    // --- กราฟ 2: สถานะการอบรม ---
    let trainingStats = {
      passedComplete: 0,
      completeNotChecked: 0,
      checkedNotPass: 0,
      hoursNotComplete: 0,
    };

    // --- กราฟ 3: สถานะการตรวจ CV ---
    let cvStats = {
      reviewed: 0,
      notReviewed: 0,
      failed: 0,
      noCv: 0,
    };

    // --- กราฟ 4: สถานะอนุมัติฝึกงาน ---
    let placementStats = {
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
router.get("/students", async (req, res) => {
  try {
    const { page = 1, limit = 12, search, status: filterStatus, chartType, chartKey } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // ดึงนิสิตทั้งหมดพร้อมข้อมูลที่เกี่ยวข้อง
    const allStudents = await prisma.student.findMany({
      include: {
        user: true,
        cv: true,
        trainingRecords: true,
        companies: { include: { submission: true } },
        placement: true,
        advisor: { include: { user: true } },
      },
      orderBy: { studentCode: "desc" },
    });

    // Map สถานะแต่ละคนด้วยฟังก์ชัน categorizeStudent เดียวกัน
    let mapped = allStudents.map((s) => {
      const cats = categorizeStudent(s);

      let activeStatus = cats.overallStatus;
      if (chartType === "readiness") activeStatus = cats.readinessLabel;
      else if (chartType === "training") activeStatus = cats.trainingLabel;
      else if (chartType === "cv") activeStatus = cats.cvLabel;
      else if (chartType === "placement") activeStatus = cats.placementLabel;

      return {
        id: s.id,
        userId: s.userId,
        studentCode: s.studentCode,
        nameTh: s.nameTh,
        nameEn: s.nameEn,
        advisorName: s.advisor ? s.advisor.name : null,
        advisorId: s.advisorId,
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
        hasChecklistApproved: (s.companies || []).some(c => c.checklistStatus === 'APPROVED'),
      };
    });

    mapped.sort((a, b) => {
      const codeA = BigInt(a.studentCode);
      const codeB = BigInt(b.studentCode);
      return codeA === codeB ? 0 : codeA > codeB ? -1 : 1;
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
    const yearPrefix = req.query.yearPrefix;
    if (yearPrefix) {
      mapped = mapped.filter((s) => s.studentCode && s.studentCode.startsWith(yearPrefix));
    }

    // Filter ตาม dropdown "สถานะ" (ผ่าน/ไม่ผ่าน แต่ละหมวด)
    const statusFilter = req.query.statusFilter;
    if (statusFilter) {
      switch (statusFilter) {
        case 'training_passed':
          mapped = mapped.filter(s => s.isTrainingComplete);
          break;
        case 'training_failed':
          mapped = mapped.filter(s => !s.isTrainingComplete);
          break;
        case 'cv_passed':
          mapped = mapped.filter(s => s.cvStatus === 'APPROVED');
          break;
        case 'cv_failed':
          mapped = mapped.filter(s => s.cvStatus !== 'APPROVED');
          break;
        case 'checklist_passed':
          mapped = mapped.filter(s => s.hasChecklistApproved);
          break;
        case 'checklist_failed':
          mapped = mapped.filter(s => !s.hasChecklistApproved);
          break;
        case 'placement_approved':
          mapped = mapped.filter(s => s.placementStatus === 'APPROVED');
          break;
        case 'placement_pending':
          mapped = mapped.filter(s => s.placementStatus !== 'APPROVED');
          break;
      }
    }

    // Filter ตาม dropdown "อาจารย์ที่ปรึกษา"
    const advisorFilterName = req.query.advisorFilter;
    if (advisorFilterName) {
      mapped = mapped.filter(s => s.advisorName === advisorFilterName);
    }

    // Filter ตาม dropdown "Soft/Hard Skill"
    const skillFilter = req.query.skillFilter;
    if (skillFilter) {
      switch (skillFilter) {
        case 'lack_soft':
          mapped = mapped.filter(s => (s.trainingApprovedSoft || 0) < 12);
          break;
        case 'lack_hard':
          mapped = mapped.filter(s => (s.trainingApprovedHard || 0) < 18);
          break;
        case 'lack_both':
          mapped = mapped.filter(s => (s.trainingApprovedSoft || 0) < 12 && (s.trainingApprovedHard || 0) < 18);
          break;
      }
    }

    // สถิติสำหรับกราฟวงกลมทั้ง 4 อัน: คำนวณจากข้อมูลที่ผ่าน filter (viewDropped/status/search/ปี/สถานะ/อาจารย์/skill) แล้ว
    // (ไม่รวม chartType/chartKey เพราะนั่นคือ filter ที่คลิกจากกราฟเอง กราฟจึงควรยังแสดงสัดส่วนทุกกลุ่มให้คลิกเลือกต่อได้)
    const chartStats = {
      totalStudents: mapped.length,
      readinessStats: { approvedPlacement: 0, cvApproved: 0, noDataOrHoursLack: 0, trainingComplete: 0, cvNotReviewed: 0 },
      trainingStats: { passedComplete: 0, completeNotChecked: 0, checkedNotPass: 0, hoursNotComplete: 0 },
      cvStats: { reviewed: 0, notReviewed: 0, failed: 0, noCv: 0 },
      placementStats: { pending: 0, approved: 0, rejected: 0 },
    };
    mapped.forEach((s) => {
      chartStats.readinessStats[s.readinessCategory]++;
      chartStats.trainingStats[s.trainingCategory]++;
      chartStats.cvStats[s.cvCategory]++;
      if (s.placementCategory) chartStats.placementStats[s.placementCategory]++;
    });

    // กรองตาม chartType และ chartKey (ใช้กรองตารางรายชื่อ ไม่กระทบสัดส่วนในกราฟ)
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
    const paginated = mapped.slice(skip, skip + parseInt(limit));

    res.json({
      success: true,
      students: paginated,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit)),
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
router.get("/students/:studentId", async (req, res) => {
  // STAFF ไม่มีสิทธิ์ดูรายละเอียดนิสิต
  if (req.session.user.role === "STAFF") {
    return res.status(403).json({ success: false, message: "เจ้าหน้าที่ไม่มีสิทธิ์ดูรายละเอียดนิสิต" });
  }
  try {
    const studentId = parseInt(req.params.studentId);
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
        phone: student.phone,
        lineId: student.lineId,
        facebook: student.facebook,
        profileImageUrl: student.profileImageUrl,
        stage: student.stage,
        email: student.user.email,
        advisorName: student.advisor ? student.advisor.name : null,
        isDropped: student.isDropped,
        dropReason: student.dropReason,
        droppedAt: student.droppedAt,
      },
      cv: student.cv,
      trainings: student.trainingRecords,
      trainingSummary: { totalSoft, totalHard, approvedSoft, approvedHard },
      companies: student.companies,
      placement: student.placement,
    });
  } catch (err) {
    console.error("GET /api/admin/students/:id error:", err);
    res.status(500).json({ success: false, message: "ดึงข้อมูลนิสิตไม่สำเร็จ" });
  }
});

// ==========================================
// 4. ตั้งสถานะ CV ของนิสิต
// ==========================================
router.put("/students/:studentId/cv-status", async (req, res) => {
  try {
    const studentId = parseInt(req.params.studentId);
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
        reviewedById: req.session.user.id,
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
// 5. ตั้งสถานะ Training Record ของนิสิต
// ==========================================
router.put("/students/:studentId/training/:trainingId/status", async (req, res) => {
  try {
    const trainingId = parseInt(req.params.trainingId);
    const { status, note } = req.body;

    const updated = await prisma.trainingRecord.update({
      where: { id: trainingId },
      data: {
        status,
        note: note || null,
        reviewedById: req.session.user.id,
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
// 6. ตั้งสถานะอนุมัติที่ฝึกงาน
// ==========================================
router.put("/students/:studentId/placement-status", async (req, res) => {
  try {
    const studentId = parseInt(req.params.studentId);
    const { status, note } = req.body;

    const updated = await prisma.internshipPlacement.update({
      where: { studentId },
      data: {
        status,
        note: note || null,
        reviewedById: req.session.user.id,
        reviewedAt: new Date(),
      },
    });

    res.json({ success: true, placement: updated });
  } catch (err) {
    console.error("PUT /api/admin/students/:id/placement-status error:", err);
    res.status(500).json({ success: false, message: "อัพเดตสถานะอนุมัติฝึกงานไม่สำเร็จ" });
  }
});

// ==========================================
// 7. Batch ตั้งสถานะนิสิตหลายคนพร้อมกัน
// ==========================================
router.put("/students/batch-status", async (req, res) => {
  // STAFF ไม่มีสิทธิ์ตั้งสถานะนิสิต
  if (req.session.user.role === "STAFF") {
    return res.status(403).json({ success: false, message: "เจ้าหน้าที่ไม่มีสิทธิ์ตั้งสถานะนิสิต" });
  }
  try {
    const { studentIds, statusType, statusValue, note } = req.body;
    // statusType: "cv" | "training" | "placement"
    // statusValue: "APPROVED" | "REJECTED"

    if (!studentIds || !studentIds.length) {
      return res.status(400).json({ success: false, message: "กรุณาเลือกนิสิตอย่างน้อย 1 คน" });
    }

    const reviewData = {
      status: statusValue,
      note: note || null,
      reviewedById: req.session.user.id,
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
      // อัพเดตทุก training record ของนิสิตที่เลือก ที่ยัง PENDING
      const result = await prisma.trainingRecord.updateMany({
        where: {
          studentId: { in: studentIds.map(Number) },
          status: "PENDING",
        },
        data: reviewData,
      });
      updatedCount = result.count;
    } else if (statusType === "placement") {
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
router.put("/students/batch-advisor", async (req, res) => {
  // STAFF ไม่มีสิทธิ์ตั้งอาจารย์ที่ปรึกษา
  if (req.session.user.role === "STAFF") {
    return res.status(403).json({ success: false, message: "เจ้าหน้าที่ไม่มีสิทธิ์ตั้งอาจารย์ที่ปรึกษา" });
  }
  try {
    const { studentIds, advisorId } = req.body;

    if (!studentIds || !studentIds.length || !advisorId) {
      return res.status(400).json({ success: false, message: "กรุณาเลือกนิสิตและอาจารย์ที่ปรึกษา" });
    }

    // ตรวจว่า advisor มีอยู่จริง
    const advisor = await prisma.staff.findUnique({ where: { id: parseInt(advisorId) } });
    if (!advisor) {
      return res.status(404).json({ success: false, message: "ไม่พบอาจารย์ที่ปรึกษา" });
    }

    const result = await prisma.student.updateMany({
      where: { id: { in: studentIds.map(Number) } },
      data: { advisorId: parseInt(advisorId) },
    });

    res.json({ success: true, updatedCount: result.count });
  } catch (err) {
    console.error("PUT /api/admin/students/batch-advisor error:", err);
    res.status(500).json({ success: false, message: "ตั้งอาจารย์ที่ปรึกษาไม่สำเร็จ" });
  }
});

// ==========================================
// 8.1 ดรอปนิสิต (Drop Student)
// ==========================================
router.put("/students/drop", async (req, res) => {
  // STAFF ไม่มีสิทธิ์ดรอปนิสิต (เฉพาะ Admin)
  if (req.session.user.role === "STAFF") {
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

    const io = req.app.get("io");
    if (io) io.emit("app:data-updated", { type: "student_dropped", count: result.count });

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
router.put("/students/restore", async (req, res) => {
  // STAFF ไม่มีสิทธิ์กู้คืนสถานะนิสิต (เฉพาะ Admin)
  if (req.session.user.role === "STAFF") {
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

    const io = req.app.get("io");
    if (io) io.emit("app:data-updated", { type: "student_restored", count: result.count });

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
// 9. ดึงรายชื่ออาจารย์ที่ปรึกษาทั้งหมด (สำหรับ Modal)
// ==========================================
router.get("/advisors", async (req, res) => {
  try {
    const advisorUsers = await prisma.user.findMany({
      where: { role: { in: ["ADVISOR", "STAFF"] } },
      include: { staff: true },
    });

    for (const u of advisorUsers) {
      if (!u.staff) {
        await prisma.staff.create({
          data: {
            userId: u.id,
            name: u.username || u.email,
          },
        });
      }
    }

    const advisors = await prisma.staff.findMany({
      where: { user: { role: { in: ["ADVISOR"] } } },
      include: { user: true, studentsAdvised: true },
    });

    res.json({
      success: true,
      advisors: advisors.map((a) => ({
        id: a.id,
        name: a.name,
        email: a.user.email,
        studentCount: a.studentsAdvised.length,
      })),
    });
  } catch (err) {
    console.error("GET /api/admin/advisors error:", err);
    res.status(500).json({ success: false, message: "ดึงรายชื่ออาจารย์ไม่สำเร็จ" });
  }
});

// ==========================================
// Export ข้อมูลนิสิตแบบละเอียด (สำหรับ CSV)
// ==========================================
router.get("/export", async (req, res) => {
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

    const exportData = students.map((s) => {
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
      if (submissions.some((sub) => sub.status === "INTERVIEW_PASSED")) {
        interviewStatus = "สัมภาษณ์ผ่านแล้ว";
      } else if (submissions.some((sub) => sub.status === "INTERVIEWED_PENDING")) {
        interviewStatus = "สัมภาษณ์แล้ว รอผล";
      } else if (submissions.some((sub) => sub.status === "SUBMITTED_WAITING")) {
        interviewStatus = "ยื่นแล้ว รอสัมภาษณ์";
      } else if (submissions.some((sub) => sub.status === "INTERVIEW_FAILED_REAPPLIED")) {
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
      const idList = req.query.ids.split(",").map((id) => parseInt(id.trim())).filter(Boolean);
      if (idList.length > 0) {
        const idSet = new Set(idList);
        exportData = exportData.filter((s) => idSet.has(s.id));
      }
    } else if (req.query.all !== "true") {
      // 2. กรองตามเงื่อนไข (Filtered)
      // กรองตาม viewDropped (นิสิตปกติ vs นิสิตที่ดรอป)
      if (req.query.viewDropped === "true") {
        exportData = exportData.filter((s) => s.isDropped);
      } else if (req.query.viewDropped === "false") {
        exportData = exportData.filter((s) => !s.isDropped);
      }

      // กรองตาม search
      if (req.query.search) {
        const q = req.query.search.toLowerCase();
        exportData = exportData.filter(
          (s) =>
            (s.studentCode && s.studentCode.toLowerCase().includes(q)) ||
            (s.nameTh && s.nameTh.toLowerCase().includes(q))
        );
      }

      // กรองตาม yearPrefix
      if (req.query.yearPrefix) {
        exportData = exportData.filter((s) => s.studentCode && s.studentCode.startsWith(req.query.yearPrefix));
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

module.exports = router;