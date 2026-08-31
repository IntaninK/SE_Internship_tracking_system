const express = require("express");
const prisma = require("../db");
const requireAdmin = require("../auth/requireAdmin");

const router = express.Router();

// ต้อง login + เป็น admin ทุก route ภายใต้ /api/admin
router.use(requireAdmin);

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
      where: { role: { in: ["ADVISOR", "COURSE_INSTRUCTOR"] } },
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

    const totalStudents = students.length;

    // --- กราฟ 1: สถานะความพร้อม ---
    let readinessStats = {
      approvedPlacement: 0,  // อนุมัติที่ฝึกงานแล้ว
      cvApproved: 0,         // ตรวจCVผ่าน
      noDataOrHoursLack: 0,  // ไม่มีข้อมูล/ชม.ไม่ครบ
      trainingComplete: 0,   // ผ่านการตรวจชม.ครบ
      cvNotReviewed: 0,      // ยังไม่ได้รีวิว CV
    };

    // --- กราฟ 2: สถานะการอบรม ---
    let trainingStats = {
      passedComplete: 0,   // ผ่านการตรวจชม.ครบ
      completeNotChecked: 0, // ชม.ครบ ยังไม่ตรวจ
      checkedNotPass: 0,   // ตรวจแล้ว ยังไม่ผ่าน
      hoursNotComplete: 0, // ชั่วโมงยังไม่ครบ
    };

    // --- กราฟ 3: สถานะการตรวจ CV ---
    let cvStats = {
      reviewed: 0,     // รีวิวCVแล้ว (ผ่าน)
      notReviewed: 0,  // ยังไม่ได้รีวิว CV
      failed: 0,       // ไม่ผ่าน CV
      noCv: 0,         // ยังไม่ทำ CV
    };

    // --- กราฟ 4: สถานะอนุมัติฝึกงาน ---
    let placementStats = {
      pending: 0,    // รอผล
      approved: 0,   // อนุมัติที่ฝึกงานแล้ว
      rejected: 0,   // ไม่อนุมัติที่ฝึกงาน
    };

    students.forEach((s) => {
      // --- คำนวณชั่วโมง ---
      const approvedTrainings = s.trainingRecords.filter(t => t.status === "APPROVED");
      const softHours = approvedTrainings.filter(t => t.skillType === "SOFT").reduce((sum, t) => sum + t.hours, 0);
      const hardHours = approvedTrainings.filter(t => t.skillType === "HARD").reduce((sum, t) => sum + t.hours, 0);
      const totalHours = s.trainingRecords.reduce((sum, t) => sum + t.hours, 0);
      const isTrainingComplete = softHours >= 12 && hardHours >= 18;
      const hasRejectedTraining = s.trainingRecords.some(t => t.status === "REJECTED");
      const hasPendingTraining = s.trainingRecords.some(t => t.status === "PENDING");

      // กราฟ 2: สถานะการอบรม
      if (isTrainingComplete) {
        if (hasPendingTraining) {
          trainingStats.completeNotChecked++;
        } else {
          trainingStats.passedComplete++;
        }
      } else if (hasRejectedTraining) {
        trainingStats.checkedNotPass++;
      } else {
        trainingStats.hoursNotComplete++;
      }

      // กราฟ 3: สถานะ CV
      if (!s.cv) {
        cvStats.noCv++;
      } else if (s.cv.status === "APPROVED") {
        cvStats.reviewed++;
      } else if (s.cv.status === "REJECTED") {
        cvStats.failed++;
      } else {
        cvStats.notReviewed++;
      }

      // กราฟ 4: สถานะอนุมัติฝึกงาน (เฉพาะนิสิตที่มี placement)
      if (s.placement) {
        if (s.placement.status === "APPROVED") {
          placementStats.approved++;
        } else if (s.placement.status === "REJECTED") {
          placementStats.rejected++;
        } else {
          placementStats.pending++;
        }
      }

      // กราฟ 1: สถานะความพร้อม (ใช้ข้อมูลรวม)
      if (s.placement && s.placement.status === "APPROVED") {
        readinessStats.approvedPlacement++;
      } else if (s.cv && s.cv.status === "APPROVED") {
        readinessStats.cvApproved++;
      } else if (isTrainingComplete) {
        readinessStats.trainingComplete++;
      } else if (!s.cv) {
        readinessStats.cvNotReviewed++;
      } else {
        readinessStats.noDataOrHoursLack++;
      }
    });

    // --- สรุปอาจารย์ที่ปรึกษา ---
    const advisorSummary = advisors.map((adv) => {
      const totalAdvised = adv.studentsAdvised.length;
      let checklistReviewed = 0;
      let checklistNotReviewed = 0;

      adv.studentsAdvised.forEach((stu) => {
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

    // จำนวนนิสิตที่มี/ไม่มีอาจารย์ที่ปรึกษา
    const studentsWithAdvisor = students.filter((s) => s.advisorId !== null).length;
    const studentsWithoutAdvisor = totalStudents - studentsWithAdvisor;

    res.json({
      success: true,
      totalStudents,
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
    const { page = 1, limit = 12, search, status: filterStatus } = req.query;
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
      orderBy: { studentCode: "asc" },
    });

    // Map สถานะแต่ละคน
    let mapped = allStudents.map((s) => {
      const approvedTrainings = s.trainingRecords.filter(t => t.status === "APPROVED");
      const softHours = approvedTrainings.filter(t => t.skillType === "SOFT").reduce((sum, t) => sum + t.hours, 0);
      const hardHours = approvedTrainings.filter(t => t.skillType === "HARD").reduce((sum, t) => sum + t.hours, 0);
      const isTrainingComplete = softHours >= 12 && hardHours >= 18;
      const hasRejectedTraining = s.trainingRecords.some(t => t.status === "REJECTED");

      // คำนวณ overallStatus (สถานะรวม)
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
      } else if (s.companies.some(c => c.submission && c.submission.status === "INTERVIEW_PASSED")) {
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
      } else if (s.trainingRecords.length > 0) {
        overallStatus = "ชั่วโมงอบรมยังไม่ครบ";
        statusCategory = "training_incomplete";
      } else {
        overallStatus = "ยังไม่มีข้อมูล";
        statusCategory = "none";
      }

      return {
        id: s.id,
        userId: s.userId,
        studentCode: s.studentCode,
        nameTh: s.nameTh,
        nameEn: s.nameEn,
        advisorName: s.advisor ? s.advisor.name : null,
        advisorId: s.advisorId,
        overallStatus,
        statusCategory,
        cvStatus: s.cv ? s.cv.status : null,
        trainingApprovedSoft: softHours,
        trainingApprovedHard: hardHours,
        isTrainingComplete,
        placementStatus: s.placement ? s.placement.status : null,
      };
    });

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

    // Filter ตาม status
    if (filterStatus) {
      mapped = mapped.filter((s) => s.statusCategory === filterStatus);
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
// 9. ดึงรายชื่ออาจารย์ที่ปรึกษาทั้งหมด (สำหรับ Modal)
// ==========================================
router.get("/advisors", async (req, res) => {
  try {
    const advisorUsers = await prisma.user.findMany({
      where: { role: { in: ["ADVISOR", "COURSE_INSTRUCTOR"] } },
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

module.exports = router;
