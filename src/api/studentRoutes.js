const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const prisma = require("../db");
const requireLogin = require("../auth/requireLogin");

const router = express.Router();

// ต้อง login ทุก route ภายใต้ /api/student
router.use(requireLogin);

// ==========================================
// 1. ตั้งค่าการอัปโหลดไฟล์ด้วย Multer
// ==========================================
const uploadDir = path.join(__dirname, "..", "..", "public", "uploads");
const certDir = path.join(uploadDir, "certificates");
const cvDir = path.join(uploadDir, "cv");
const profileDir = path.join(uploadDir, "profiles");

[uploadDir, certDir, cvDir, profileDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (file.fieldname === "cv") {
      cb(null, cvDir);
    } else if (file.fieldname === "certificate") {
      cb(null, certDir);
    } else if (file.fieldname === "profileImage") {
      cb(null, profileDir);
    } else {
      cb(null, uploadDir);
    }
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + "-" + uniqueSuffix + ext);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedExts = [".pdf", ".jpg", ".jpeg", ".png", ".webp"];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error("รองรับเฉพาะไฟล์ PDF หรือรูปภาพ (JPG, PNG, WebP) เท่านั้น"), false);
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter,
});

// Helper: ดึงหรือสร้าง student id ของ user ปัจจุบัน
async function getStudentByUserId(userId) {
  return await prisma.student.findUnique({
    where: { userId },
    include: {
      advisor: true,
      cv: true,
      trainingRecords: true,
      companies: {
        include: {
          answers: true,
          submission: true,
        },
      },
      placement: true,
    },
  });
}

// ==========================================
// 2. ข้อมูลส่วนตัวนิสิต (Student Profile)
// ==========================================
router.get("/profile", async (req, res) => {
  try {
    const student = await getStudentByUserId(req.session.user.id);
    res.json({
      success: true,
      user: req.session.user,
      student: student || null,
    });
  } catch (err) {
    console.error("GET /api/student/profile error:", err);
    res.status(500).json({ success: false, message: "เกิดข้อผิดพลาดในการดึงข้อมูล" });
  }
});

router.post("/profile", upload.single("profileImage"), async (req, res) => {
  try {
    const userId = req.session.user.id;
    const {
      studentCode,
      nameTh,
      nameEn,
      year,
      major,
      gpa,
      phone,
      lineId,
      facebook,
    } = req.body;

    if (!studentCode || !nameTh || !nameEn) {
      return res.status(400).json({
        success: false,
        message: "กรุณากรอกรหัสนิสิต, ชื่อภาษาไทย และชื่อภาษาอังกฤษให้ครบถ้วน",
      });
    }

    const profileImageUrl = req.file
      ? `/uploads/profiles/${req.file.filename}`
      : undefined;

    const dataToSave = {
      studentCode: String(studentCode).trim(),
      nameTh: String(nameTh).trim(),
      nameEn: String(nameEn).trim(),
      year: year ? parseInt(year, 10) : 3,
      major: major ? String(major).trim() : "วิศวกรรมซอฟต์แวร์",
      gpa: gpa ? parseFloat(gpa) : null,
      phone: phone ? String(phone).trim() : null,
      lineId: lineId ? String(lineId).trim() : null,
      facebook: facebook ? String(facebook).trim() : null,
    };

    if (profileImageUrl) {
      dataToSave.profileImageUrl = profileImageUrl;
    }

    // Upsert Student profile
    const student = await prisma.student.upsert({
      where: { userId },
      update: dataToSave,
      create: {
        userId,
        ...dataToSave,
        stage: "PENDING_DOCUMENTS",
      },
    });

    res.json({
      success: true,
      message: "บันทึกข้อมูลส่วนตัวสำเร็จ",
      student,
    });
  } catch (err) {
    console.error("POST /api/student/profile error:", err);
    res.status(500).json({ success: false, message: "บันทึกข้อมูลไม่สำเร็จ: " + err.message });
  }
});

// ==========================================
// 3. ชั่วโมงการอบรม Soft/Hard Skill
// ==========================================
router.get("/trainings", async (req, res) => {
  try {
    const student = await getStudentByUserId(req.session.user.id);
    if (!student) {
      return res.json({ success: true, trainings: [], totalSoft: 0, totalHard: 0 });
    }

    const trainings = await prisma.trainingRecord.findMany({
      where: { studentId: student.id },
      orderBy: { createdAt: "asc" },
    });

    const totalSoft = trainings
      .filter((t) => t.skillType === "SOFT")
      .reduce((sum, t) => sum + t.hours, 0);

    const totalHard = trainings
      .filter((t) => t.skillType === "HARD")
      .reduce((sum, t) => sum + t.hours, 0);

    res.json({
      success: true,
      trainings,
      totalSoft,
      totalHard,
    });
  } catch (err) {
    console.error("GET /api/student/trainings error:", err);
    res.status(500).json({ success: false, message: "ดึงข้อมูลชั่วโมงอบรมไม่สำเร็จ" });
  }
});

router.post("/trainings", upload.single("certificate"), async (req, res) => {
  try {
    const student = await getStudentByUserId(req.session.user.id);
    if (!student) {
      return res.status(400).json({
        success: false,
        message: "กรุณากรอกข้อมูลส่วนตัวนิสิตในขั้นตอนแรกก่อน",
      });
    }

    const { title, skillType, hours } = req.body;
    if (!hours || isNaN(hours)) {
      return res.status(400).json({ success: false, message: "กรุณาระบุจำนวนชั่วโมงให้ถูกต้อง" });
    }

    const certificateFileUrl = req.file
      ? `/uploads/certificates/${req.file.filename}`
      : null;

    const normalizedSkillType =
      String(skillType).toLowerCase().includes("hard") ? "HARD" : "SOFT";

    const training = await prisma.trainingRecord.create({
      data: {
        studentId: student.id,
        title: title ? String(title).trim() : `อบรม ${normalizedSkillType === "HARD" ? "Hard" : "Soft"} skill`,
        skillType: normalizedSkillType,
        hours: parseInt(hours, 10),
        certificateFileUrl,
        status: "PENDING",
      },
    });

    res.json({
      success: true,
      message: "เพิ่มข้อมูลการอบรมสำเร็จ",
      training,
    });
  } catch (err) {
    console.error("POST /api/student/trainings error:", err);
    res.status(500).json({ success: false, message: "เพิ่มข้อมูลไม่สำเร็จ: " + err.message });
  }
});

router.put("/trainings/:id", async (req, res) => {
  try {
    const student = await getStudentByUserId(req.session.user.id);
    const trainingId = parseInt(req.params.id, 10);
    const { title, skillType, hours } = req.body;

    const training = await prisma.trainingRecord.findFirst({
      where: { id: trainingId, studentId: student.id },
    });

    if (!training) {
      return res.status(404).json({ success: false, message: "ไม่พบรายการอบรมนี้" });
    }

    const updated = await prisma.trainingRecord.update({
      where: { id: trainingId },
      data: {
        title: title ? String(title).trim() : training.title,
        skillType: skillType ? (String(skillType).toLowerCase().includes("hard") ? "HARD" : "SOFT") : training.skillType,
        hours: hours ? parseInt(hours, 10) : training.hours,
      },
    });

    res.json({ success: true, message: "แก้ไขข้อมูลสำเร็จ", training: updated });
  } catch (err) {
    console.error("PUT /api/student/trainings/:id error:", err);
    res.status(500).json({ success: false, message: "แก้ไขข้อมูลไม่สำเร็จ" });
  }
});

router.delete("/trainings/:id", async (req, res) => {
  try {
    const student = await getStudentByUserId(req.session.user.id);
    const trainingId = parseInt(req.params.id, 10);

    const training = await prisma.trainingRecord.findFirst({
      where: { id: trainingId, studentId: student.id },
    });

    if (!training) {
      return res.status(404).json({ success: false, message: "ไม่พบรายการอบรมนี้" });
    }

    await prisma.trainingRecord.delete({ where: { id: trainingId } });
    res.json({ success: true, message: "ลบรายการอบรมสำเร็จ" });
  } catch (err) {
    console.error("DELETE /api/student/trainings/:id error:", err);
    res.status(500).json({ success: false, message: "ลบรายการไม่สำเร็จ" });
  }
});

// ==========================================
// 4. กรอกใบ CV
// ==========================================
router.get("/cv", async (req, res) => {
  try {
    const student = await getStudentByUserId(req.session.user.id);
    if (!student || !student.cv) {
      return res.json({ success: true, cv: null });
    }
    res.json({ success: true, cv: student.cv });
  } catch (err) {
    console.error("GET /api/student/cv error:", err);
    res.status(500).json({ success: false, message: "ดึงข้อมูล CV ไม่สำเร็จ" });
  }
});

router.post("/cv", upload.single("cv"), async (req, res) => {
  try {
    const student = await getStudentByUserId(req.session.user.id);
    if (!student) {
      return res.status(400).json({
        success: false,
        message: "กรุณากรอกข้อมูลส่วนตัวนิสิตก่อนอัปโหลด CV",
      });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: "กรุณาเลือกไฟล์ CV" });
    }

    const fileUrl = `/uploads/cv/${req.file.filename}`;
    const fileName = req.file.originalname;

    const cv = await prisma.studentCV.upsert({
      where: { studentId: student.id },
      update: {
        fileUrl,
        fileName,
        status: "PENDING",
        note: null,
        uploadedAt: new Date(),
      },
      create: {
        studentId: student.id,
        fileUrl,
        fileName,
        status: "PENDING",
      },
    });

    res.json({ success: true, message: "อัปโหลด CV สำเร็จ", cv });
  } catch (err) {
    console.error("POST /api/student/cv error:", err);
    res.status(500).json({ success: false, message: "อัปโหลด CV ไม่สำเร็จ: " + err.message });
  }
});

// ==========================================
// 5. Checklist แม่แบบและประเมินบริษัท
// ==========================================
router.get("/checklist-template", async (req, res) => {
  try {
    const sections = await prisma.checklistSection.findMany({
      orderBy: { order: "asc" },
      include: {
        items: {
          orderBy: { order: "asc" },
        },
      },
    });
    res.json({ success: true, sections });
  } catch (err) {
    console.error("GET /api/student/checklist-template error:", err);
    res.status(500).json({ success: false, message: "ดึงแบบฟอร์ม Checklist ไม่สำเร็จ" });
  }
});

router.get("/companies", async (req, res) => {
  try {
    const student = await getStudentByUserId(req.session.user.id);
    if (!student) {
      return res.json({ success: true, companies: [] });
    }

    const companies = await prisma.company.findMany({
      where: { studentId: student.id },
      orderBy: { createdAt: "asc" },
      include: {
        answers: true,
        submission: true,
      },
    });

    res.json({ success: true, companies });
  } catch (err) {
    console.error("GET /api/student/companies error:", err);
    res.status(500).json({ success: false, message: "ดึงข้อมูลบริษัทไม่สำเร็จ" });
  }
});

// บันทึกบริษัทและคำตอบ Checklist (สร้างใหม่ หรือ บันทึกชุดข้อมูล)
router.post("/companies", async (req, res) => {
  try {
    const student = await getStudentByUserId(req.session.user.id);
    if (!student) {
      return res.status(400).json({
        success: false,
        message: "กรุณากรอกข้อมูลส่วนตัวนิสิตก่อน",
      });
    }

    const { name, answers } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: "กรุณาระบุชื่อบริษัท" });
    }

    // สร้างบริษัทใหม่
    const company = await prisma.company.create({
      data: {
        studentId: student.id,
        name: name.trim(),
        checklistStatus: "PENDING",
        submission: {
          create: {
            status: "NOT_SUBMITTED",
          },
        },
      },
    });

    // ถ้ามีคำตอบ checklist ส่งมาด้วย ให้บันทึกคำตอบ
    if (Array.isArray(answers) && answers.length > 0) {
      for (const ans of answers) {
        if (ans.checklistItemId) {
          await prisma.companyChecklistAnswer.create({
            data: {
              companyId: company.id,
              checklistItemId: parseInt(ans.checklistItemId, 10),
              checked: Boolean(ans.checked),
              detail: ans.detail ? String(ans.detail).trim() : null,
            },
          });
        }
      }
    }

    const createdCompany = await prisma.company.findUnique({
      where: { id: company.id },
      include: { answers: true, submission: true },
    });

    res.json({
      success: true,
      message: "บันทึกข้อมูลบริษัทและ Checklist เรียบร้อยแล้ว",
      company: createdCompany,
    });
  } catch (err) {
    console.error("POST /api/student/companies error:", err);
    res.status(500).json({ success: false, message: "บันทึกไม่สำเร็จ: " + err.message });
  }
});

// แก้ไขชื่อบริษัทและคำตอบ Checklist
router.put("/companies/:id", async (req, res) => {
  try {
    const student = await getStudentByUserId(req.session.user.id);
    const companyId = parseInt(req.params.id, 10);
    const { name, answers } = req.body;

    const company = await prisma.company.findFirst({
      where: { id: companyId, studentId: student.id },
    });

    if (!company) {
      return res.status(404).json({ success: false, message: "ไม่พบบริษัทนี้" });
    }

    // อัปเดตชื่อบริษัท
    if (name && name.trim()) {
      await prisma.company.update({
        where: { id: companyId },
        data: { name: name.trim() },
      });
    }

    // อัปเดตคำตอบ checklist
    if (Array.isArray(answers)) {
      for (const ans of answers) {
        if (ans.checklistItemId) {
          await prisma.companyChecklistAnswer.upsert({
            where: {
              companyId_checklistItemId: {
                companyId,
                checklistItemId: parseInt(ans.checklistItemId, 10),
              },
            },
            update: {
              checked: Boolean(ans.checked),
              detail: ans.detail ? String(ans.detail).trim() : null,
            },
            create: {
              companyId,
              checklistItemId: parseInt(ans.checklistItemId, 10),
              checked: Boolean(ans.checked),
              detail: ans.detail ? String(ans.detail).trim() : null,
            },
          });
        }
      }
    }

    const updatedCompany = await prisma.company.findUnique({
      where: { id: companyId },
      include: { answers: true, submission: true },
    });

    res.json({
      success: true,
      message: "อัปเดตข้อมูล Checklist สำเร็จ",
      company: updatedCompany,
    });
  } catch (err) {
    console.error("PUT /api/student/companies/:id error:", err);
    res.status(500).json({ success: false, message: "อัปเดตไม่สำเร็จ" });
  }
});

// ==========================================
// 6. สถานะการยื่น (Submission Status)
//    (แสดงเฉพาะบริษัทที่ checklistStatus === 'APPROVED')
// ==========================================
router.get("/submissions", async (req, res) => {
  try {
    const student = await getStudentByUserId(req.session.user.id);
    if (!student) {
      return res.json({ success: true, approvedCompanies: [] });
    }

    // ดึงเฉพาะบริษัทที่อาจารย์อนุมัติ Checklist ผ่านแล้ว
    const approvedCompanies = await prisma.company.findMany({
      where: {
        studentId: student.id,
        checklistStatus: "APPROVED",
      },
      include: {
        submission: true,
      },
      orderBy: { createdAt: "asc" },
    });

    res.json({ success: true, approvedCompanies });
  } catch (err) {
    console.error("GET /api/student/submissions error:", err);
    res.status(500).json({ success: false, message: "ดึงสถานะการยื่นไม่สำเร็จ" });
  }
});

router.put("/submissions/:companyId", async (req, res) => {
  try {
    const student = await getStudentByUserId(req.session.user.id);
    const companyId = parseInt(req.params.companyId, 10);
    const { status } = req.body;

    const company = await prisma.company.findFirst({
      where: { id: companyId, studentId: student.id },
    });

    if (!company) {
      return res.status(404).json({ success: false, message: "ไม่พบบริษัทนี้" });
    }

    const validStatuses = [
      "NOT_SUBMITTED",
      "SUBMITTED_WAITING",
      "INTERVIEWED_PENDING",
      "INTERVIEW_PASSED",
      "INTERVIEW_FAILED_REAPPLIED",
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: "สถานะการยื่นไม่ถูกต้อง" });
    }

    const submission = await prisma.companySubmission.upsert({
      where: { companyId },
      update: { status },
      create: { companyId, status },
    });

    res.json({ success: true, message: "อัปเดตสถานะการยื่นสำเร็จ", submission });
  } catch (err) {
    console.error("PUT /api/student/submissions/:companyId error:", err);
    res.status(500).json({ success: false, message: "อัปเดตสถานะการยื่นไม่สำเร็จ" });
  }
});

// ==========================================
// 7. ข้อมูลบริษัทที่เข้าฝึกงานจริง (Internship Placement)
// ==========================================
router.get("/placement", async (req, res) => {
  try {
    const student = await getStudentByUserId(req.session.user.id);
    if (!student || !student.placement) {
      return res.json({ success: true, placement: null });
    }
    res.json({ success: true, placement: student.placement });
  } catch (err) {
    console.error("GET /api/student/placement error:", err);
    res.status(500).json({ success: false, message: "ดึงข้อมูลสถานที่ฝึกงานไม่สำเร็จ" });
  }
});

router.post("/placement", async (req, res) => {
  try {
    const student = await getStudentByUserId(req.session.user.id);
    if (!student) {
      return res.status(400).json({
        success: false,
        message: "กรุณากรอกข้อมูลส่วนตัวนิสิตก่อน",
      });
    }

    const {
      position,
      companyNameTh,
      contactPersonName,
      contactPersonPosition,
      companyAddress,
      companyPhone1,
      companyPhone2,
      companyEmail,
      province,
      companyId,
    } = req.body;

    const placementData = {
      position: position ? String(position).trim() : null,
      companyNameTh: companyNameTh ? String(companyNameTh).trim() : null,
      contactPersonName: contactPersonName ? String(contactPersonName).trim() : null,
      contactPersonPosition: contactPersonPosition ? String(contactPersonPosition).trim() : null,
      companyAddress: companyAddress ? String(companyAddress).trim() : null,
      companyPhone1: companyPhone1 ? String(companyPhone1).trim() : null,
      companyPhone2: companyPhone2 ? String(companyPhone2).trim() : null,
      companyEmail: companyEmail ? String(companyEmail).trim() : null,
      province: province ? String(province).trim() : null,
      companyId: companyId ? parseInt(companyId, 10) : null,
    };

    const placement = await prisma.internshipPlacement.upsert({
      where: { studentId: student.id },
      update: placementData,
      create: {
        studentId: student.id,
        ...placementData,
      },
    });

    res.json({ success: true, message: "บันทึกข้อมูลแหล่งฝึกงานสำเร็จ", placement });
  } catch (err) {
    console.error("POST /api/student/placement error:", err);
    res.status(500).json({ success: false, message: "บันทึกไม่สำเร็จ: " + err.message });
  }
});

// ==========================================
// 8. สรุปข้อมูลทั้งหมดสำหรับหน้า Dashboard (ภาพ 1 / ภาพ 5)
// ==========================================
router.get("/dashboard-summary", async (req, res) => {
  try {
    const student = await getStudentByUserId(req.session.user.id);
    if (!student) {
      return res.json({
        success: true,
        hasProfile: false,
        user: req.session.user,
      });
    }

    // รวมชั่วโมง
    const totalSoft = student.trainingRecords
      .filter((t) => t.skillType === "SOFT")
      .reduce((sum, t) => sum + t.hours, 0);

    const totalHard = student.trainingRecords
      .filter((t) => t.skillType === "HARD")
      .reduce((sum, t) => sum + t.hours, 0);

    // บริษัทที่ผ่าน
    const approvedCompanies = student.companies.filter((c) => c.checklistStatus === "APPROVED");

    // บริษัทที่สัมภาษณ์ผ่านแล้ว
    const passedInterview = student.companies.find(
      (c) => c.submission && c.submission.status === "INTERVIEW_PASSED"
    );

    res.json({
      success: true,
      hasProfile: true,
      user: req.session.user,
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
        advisor: student.advisor ? student.advisor.name : null,
      },
      cv: student.cv,
      trainings: {
        records: student.trainingRecords,
        totalSoft,
        totalHard,
      },
      companies: student.companies,
      approvedCompaniesCount: approvedCompanies.length,
      passedInterviewCompany: passedInterview || null,
      placement: student.placement,
    });
  } catch (err) {
    console.error("GET /api/student/dashboard-summary error:", err);
    res.status(500).json({ success: false, message: "ดึงข้อมูลสรุป Dashboard ไม่สำเร็จ" });
  }
});

module.exports = router;
