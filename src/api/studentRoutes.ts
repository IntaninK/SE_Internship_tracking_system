import express, { Request, Response } from "express";
import multer from "multer";
import path from "path";
import prisma from "../db";
import requireLogin from "../auth/requireLogin";
import { uploadToCloudinary } from "../utils/cloudinary";
import { loadSuperAdminState, saveSuperAdminState } from "../utils/superAdminStore";

const router = express.Router();

// ต้อง login ทุก route ภายใต้ /api/student
router.use(requireLogin);

// ==========================================
// 1. ตั้งค่าการอัปโหลดไฟล์ด้วย Multer (Memory Storage)
// ==========================================
const storage = multer.memoryStorage();

const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowedExts = [".pdf", ".jpg", ".jpeg", ".png", ".webp"];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error("รองรับเฉพาะไฟล์ PDF หรือรูปภาพ (JPG, PNG, WebP) เท่านั้น"));
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter,
});

// Helper: ดึงหรือสร้าง student id ของ user ปัจจุบัน
async function getStudentByUserId(userId: number) {
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
router.get("/profile", async (req: Request, res: Response) => {
  try {
    const student = await getStudentByUserId(req.session.user!.id);
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

router.get("/advisors", async (_req: Request, res: Response) => {
  try {
    const advisors = await prisma.staff.findMany({
      where: {
        OR: [
          { isAdvisor: true },
          { user: { role: "ADVISOR" } },
        ],
      },
      select: {
        id: true,
        name: true,
        department: true,
      },
      orderBy: { name: "asc" },
    });
    res.json({ success: true, advisors });
  } catch (err) {
    console.error("GET /api/student/advisors error:", err);
    res.status(500).json({ success: false, message: "ดึงรายชื่ออาจารย์ที่ปรึกษาไม่สำเร็จ" });
  }
});

router.post("/profile", upload.single("profileImage"), async (req: Request, res: Response) => {
  try {
    const userId = req.session.user!.id;
    const {
      studentCode,
      nameTh,
      nameEn,
      nickname,
      year,
      major,
      gpa,
      phone,
      lineId,
      facebook,
      advisorId,
    } = req.body;

    const existingStudent = await prisma.student.findUnique({
      where: { userId },
    });

    if (!existingStudent && (!studentCode || !nameTh || !nameEn)) {
      return res.status(400).json({
        success: false,
        message: "กรุณากรอกรหัสนิสิต, ชื่อภาษาไทย และชื่อภาษาอังกฤษให้ครบถ้วน",
      });
    }

    let profileImageUrl: string | undefined = undefined;
    if (req.file) {
      profileImageUrl = await uploadToCloudinary(
        req.file.buffer,
        req.file.originalname,
        "profiles"
      );
    }

    // [REQ-04] Locked REG Fields:
    // หากมีข้อมูลนิสิตในระบบแล้ว (เช่น นำเข้าจาก REG) ห้ามนิสิตแก้ไขรหัสนิสิต, ชื่อ-สกุลไทย, ชั้นปี, สาขาวิชา, GPAX
    // อนุญาตให้แก้ไขเฉพาะข้อมูลติดต่อ (ชื่อเล่น, ชื่ออังกฤษ, เบอร์โทร, Line ID, Facebook, รูปโปรไฟล์, อาจารย์ที่ปรึกษาถ้ายังไม่ถูกล็อค)
    let student;
    if (existingStudent) {
      const updateData: any = {
        phone: phone !== undefined ? (phone ? String(phone).trim() : null) : existingStudent.phone,
        lineId: lineId !== undefined ? (lineId ? String(lineId).trim() : null) : existingStudent.lineId,
        facebook: facebook !== undefined ? (facebook ? String(facebook).trim() : null) : existingStudent.facebook,
      };
      if (nickname !== undefined) {
        updateData.nickname = nickname ? String(nickname).trim() : null;
      }
      if (nameEn && String(nameEn).trim() && String(nameEn).trim() !== "-") {
        updateData.nameEn = String(nameEn).trim();
      }
      if (advisorId !== undefined && !existingStudent.advisorId) {
        updateData.advisorId = advisorId ? parseInt(advisorId, 10) : null;
      }
      if (profileImageUrl) {
        updateData.profileImageUrl = profileImageUrl;
      }

      student = await prisma.student.update({
        where: { userId },
        data: updateData,
      });
    } else {
      const createData: any = {
        userId,
        studentCode: String(studentCode).trim(),
        nameTh: String(nameTh).trim(),
        nameEn: String(nameEn).trim(),
        nickname: nickname ? String(nickname).trim() : null,
        year: year ? parseInt(year, 10) : 3,
        major: major ? String(major).trim() : "วิศวกรรมซอฟต์แวร์",
        gpa: gpa ? parseFloat(gpa) : null,
        phone: phone ? String(phone).trim() : null,
        lineId: lineId ? String(lineId).trim() : null,
        facebook: facebook ? String(facebook).trim() : null,
        advisorId: advisorId ? parseInt(advisorId, 10) : null,
        stage: "PENDING_DOCUMENTS",
      };
      if (profileImageUrl) {
        createData.profileImageUrl = profileImageUrl;
      }
      student = await prisma.student.create({
        data: createData,
      });
    }

    res.json({
      success: true,
      message: "บันทึกข้อมูลส่วนตัวสำเร็จ",
      student,
    });
  } catch (err: any) {
    console.error("POST /api/student/profile error:", err);
    res.status(500).json({ success: false, message: "บันทึกข้อมูลไม่สำเร็จ: " + err.message });
  }
});

// ==========================================
// 3. ชั่วโมงการอบรม Soft/Hard Skill
// ==========================================
router.get("/trainings", async (req: Request, res: Response) => {
  try {
    const student = await getStudentByUserId(req.session.user!.id);
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

router.post("/trainings", upload.single("certificate"), async (req: Request, res: Response) => {
  try {
    const student = await getStudentByUserId(req.session.user!.id);
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

    let certificateFileUrl: string | null = null;
    if (req.file) {
      certificateFileUrl = await uploadToCloudinary(
        req.file.buffer,
        req.file.originalname,
        "certificates"
      );
    }

    const normalizedSkillType =
      String(skillType).toLowerCase().includes("hard") ? "HARD" : "SOFT";

    const training = await prisma.trainingRecord.create({
      data: {
        studentId: student.id,
        title: title ? String(title).trim() : `อบรม ${normalizedSkillType === "HARD" ? "Hard" : "Soft"} skill`,
        skillType: normalizedSkillType,
        hours: parseInt(hours, 10),
        certificateFileUrl,
        source: "STUDENT_UPLOAD",
        status: "PENDING",
      },
    });

    res.json({
      success: true,
      message: "เพิ่มข้อมูลการอบรมสำเร็จ",
      training,
    });
  } catch (err: any) {
    console.error("POST /api/student/trainings error:", err);
    res.status(500).json({ success: false, message: "เพิ่มข้อมูลไม่สำเร็จ: " + err.message });
  }
});

router.put("/trainings/:id", async (req: Request, res: Response) => {
  try {
    const student = await getStudentByUserId(req.session.user!.id);
    if (!student) {
      return res.status(404).json({ success: false, message: "ไม่พบข้อมูลนิสิต" });
    }
    const trainingId = parseInt(req.params.id as string, 10);
    const { title, skillType, hours } = req.body;

    const training = await prisma.trainingRecord.findFirst({
      where: { id: trainingId, studentId: student.id },
    });

    if (!training) {
      return res.status(404).json({ success: false, message: "ไม่พบรายการอบรมนี้" });
    }

    if (training.source === "STAFF_IMPORT" || training.source === "ADMIN_IMPORT") {
      return res.status(403).json({
        success: false,
        message: "ไม่สามารถแก้ไขรายการอบรมที่นำเข้าจากระบบคณะหรืออาจารย์ประจำวิชาได้",
      });
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

router.delete("/trainings/:id", async (req: Request, res: Response) => {
  try {
    const student = await getStudentByUserId(req.session.user!.id);
    if (!student) {
      return res.status(404).json({ success: false, message: "ไม่พบข้อมูลนิสิต" });
    }
    const trainingId = parseInt(req.params.id as string, 10);

    const training = await prisma.trainingRecord.findFirst({
      where: { id: trainingId, studentId: student.id },
    });

    if (!training) {
      return res.status(404).json({ success: false, message: "ไม่พบรายการอบรมนี้" });
    }

    if (training.source === "STAFF_IMPORT" || training.source === "ADMIN_IMPORT") {
      return res.status(403).json({
        success: false,
        message: "ไม่สามารถลบรายการอบรมที่นำเข้าจากระบบคณะหรืออาจารย์ประจำวิชาได้",
      });
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
router.get("/cv", async (req: Request, res: Response) => {
  try {
    const student = await getStudentByUserId(req.session.user!.id);
    if (!student || !student.cv) {
      return res.json({ success: true, cv: null });
    }
    res.json({ success: true, cv: student.cv });
  } catch (err) {
    console.error("GET /api/student/cv error:", err);
    res.status(500).json({ success: false, message: "ดึงข้อมูล CV ไม่สำเร็จ" });
  }
});

router.post("/cv", upload.single("cv"), async (req: Request, res: Response) => {
  try {
    const student = await getStudentByUserId(req.session.user!.id);
    if (!student) {
      return res.status(400).json({
        success: false,
        message: "กรุณากรอกข้อมูลส่วนตัวนิสิตก่อนอัปโหลด CV",
      });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: "กรุณาเลือกไฟล์ CV" });
    }

    const fileUrl = await uploadToCloudinary(
      req.file.buffer,
      req.file.originalname,
      "cv"
    );
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
  } catch (err: any) {
    console.error("POST /api/student/cv error:", err);
    res.status(500).json({ success: false, message: "อัปโหลด CV ไม่สำเร็จ: " + err.message });
  }
});

// ==========================================
// 5. Checklist แม่แบบและประเมินบริษัท
// ==========================================
router.get("/checklist-template", async (_req: Request, res: Response) => {
  try {
    let activeVersion = await prisma.checklistVersion.findFirst({
      where: { status: "ACTIVE" },
      include: {
        sections: {
          orderBy: { order: "asc" },
          include: {
            items: {
              where: { isActive: true },
              orderBy: { order: "asc" },
            },
          },
        },
      },
    });

    if (!activeVersion) {
      activeVersion = await prisma.checklistVersion.findFirst({
        orderBy: { id: "asc" },
        include: {
          sections: {
            orderBy: { order: "asc" },
            include: {
              items: {
                where: { isActive: true },
                orderBy: { order: "asc" },
              },
            },
          },
        },
      });
    }

    const sections = activeVersion ? activeVersion.sections : [];
    res.json({ success: true, version: activeVersion, sections });
  } catch (err) {
    console.error("GET /api/student/checklist-template error:", err);
    res.status(500).json({ success: false, message: "ดึงแบบฟอร์ม Checklist ไม่สำเร็จ" });
  }
});

router.get("/companies", async (req: Request, res: Response) => {
  try {
    const state = loadSuperAdminState();
    const masterCompanies = state.companyMasterData.filter((c) => c.status !== "BLACKLIST");

    const student = await getStudentByUserId(req.session.user!.id);
    if (!student) {
      return res.json({
        success: true,
        companies: [],
        masterCompanies,
        archivedCompanies: [],
        majorRule: null,
      });
    }

    const companies = await prisma.company.findMany({
      where: { studentId: student.id },
      orderBy: { createdAt: "asc" },
      include: {
        answers: true,
        submission: true,
      },
    });

    const archivedCompanies = state.archivedApplications.filter(
      (a) => a.studentId === student.id || a.studentCode === student.studentCode
    );
    const majorRule =
      state.majorUnlockRules.find((r) => (student.major || "").includes(r.majorName)) || null;

    res.json({
      success: true,
      companies,
      masterCompanies,
      archivedCompanies,
      majorRule,
    });
  } catch (err) {
    console.error("GET /api/student/companies error:", err);
    res.status(500).json({ success: false, message: "ดึงข้อมูลบริษัทไม่สำเร็จ" });
  }
});

// บันทึกบริษัทและคำตอบ Checklist (สร้างใหม่ หรือ บันทึกชุดข้อมูล — นโยบายยื่นได้ทีละ 1 บริษัท + Archive + Master Data Auto-suggest)
router.post("/companies", async (req: Request, res: Response) => {
  try {
    const student = await getStudentByUserId(req.session.user!.id);
    if (!student) {
      return res.status(400).json({
        success: false,
        message: "กรุณากรอกข้อมูลส่วนตัวนิสิตก่อน",
      });
    }

    const state = loadSuperAdminState();
    const majorRule = state.majorUnlockRules.find((r) =>
      (student.major || "").includes(r.majorName)
    );
    if (majorRule && !majorRule.isUnlocked) {
      return res.status(400).json({
        success: false,
        message: `สาขาวิชา${majorRule.majorName} ยังไม่เปิดรอบยื่นขอฝึกงาน (${majorRule.note || "รอปลดล็อกจากเจ้าหน้าที่คณะ"})`,
      });
    }

    // 🔒 ตรวจสอบว่าชั่วโมงการอบรมครบ และ CV ผ่านการอนุมัติแล้วหรือยัง
    const approvedTrainings = (student.trainingRecords || []).filter((t) => t.status === "APPROVED");
    const approvedSoft = approvedTrainings
      .filter((t) => t.skillType === "SOFT")
      .reduce((sum, t) => sum + t.hours, 0);
    const approvedHard = approvedTrainings
      .filter((t) => t.skillType === "HARD")
      .reduce((sum, t) => sum + t.hours, 0);
    const isTrainingComplete = approvedSoft >= 12 && approvedHard >= 18;
    const isCvApproved = student.cv && student.cv.status === "APPROVED";

    if (!isTrainingComplete || !isCvApproved) {
      return res.status(400).json({
        success: false,
        message: "ยังไม่สามารถทำ Checklist ได้ เนื่องจากชั่วโมงการอบรมยังไม่ครบ หรือ CV ยังไม่ผ่านการอนุมัติ",
      });
    }

    // [นโยบายใหม่ ข้อ 4] บังคับให้นิสิตยื่นขอฝึกงานได้ทีละ 1 แห่ง
    // หากบริษัทเดิมไม่ผ่าน (REJECTED) จะถูกย้ายเข้า Archive อัตโนมัติแล้วปลดล็อกให้ยื่นแห่งใหม่ได้
    const existingCompanies = await prisma.company.findMany({
      where: { studentId: student.id },
    });

    const activePendingOrApproved = existingCompanies.filter(
      (c) => c.checklistStatus === "PENDING" || c.checklistStatus === "APPROVED"
    );

    if (activePendingOrApproved.length >= 1) {
      return res.status(400).json({
        success: false,
        message:
          "นโยบายคณะ ICT: บังคับให้นิสิตยื่นขอฝึกงานได้ทีละ 1 แห่งเท่านั้น (หากอาจารย์ที่ปรึกษาไม่อนุมัติ หรือบริษัทปฏิเสธ ระบบจึงจะปลดล็อกให้ยื่นบริษัทแห่งใหม่ได้)",
      });
    }

    // หากมีบริษัทที่ถูก REJECTED ค้างอยู่ ให้ย้ายเข้า Archive แบบย่อและเคลียร์เพื่อให้ยื่นบริษัทใหม่ได้
    const rejectedCompanies = existingCompanies.filter((c) => c.checklistStatus === "REJECTED");
    for (const rej of rejectedCompanies) {
      state.archivedApplications.unshift({
        id: `ARCH-${Date.now().toString().slice(-6)}`,
        studentId: student.id,
        studentCode: student.studentCode,
        studentName: student.nameTh,
        major: student.major || "วิศวกรรมซอฟต์แวร์",
        companyName: rej.name,
        position: "นิสิตฝึกงาน / สหกิจศึกษา",
        reason: "ADVISOR_REJECTED",
        note: rej.checklistNote || "อาจารย์ที่ปรึกษาไม่อนุมัติ Checklist (ปลดล็อกให้ยื่นบริษัทใหม่)",
        archivedAt: new Date().toISOString(),
      });
      await prisma.companyChecklistAnswer.deleteMany({ where: { companyId: rej.id } });
      await prisma.companySubmission.deleteMany({ where: { companyId: rej.id } });
      await prisma.company.delete({ where: { id: rej.id } });
    }

    const { name, answers } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: "กรุณาระบุชื่อบริษัท" });
    }

    const cleanName = name.trim();
    const norm = cleanName.replace(/\s+/g, "").toLowerCase();
    const matchedMaster = state.companyMasterData.find(
      (c) => c.nameTh.replace(/\s+/g, "").toLowerCase() === norm
    );

    if (!matchedMaster) {
      state.companyMasterData.unshift({
        id: `COMP-NEW-${Date.now().toString().slice(-5)}`,
        nameTh: cleanName,
        nameEn: "-",
        province: "รอระบุจังหวัด",
        address: "รอตรวจสอบที่อยู่",
        hrContactName: "-",
        hrPhone: "-",
        hrEmail: "-",
        recommendedPositions: "นิสิตฝึกงาน / สหกิจศึกษา",
        status: "PENDING_REVIEW",
        submittedByStudentCode: student.studentCode,
        submittedByStudentName: student.nameTh,
        createdAt: new Date().toISOString(),
      });
    }
    saveSuperAdminState(state);

    // สร้างบริษัทใหม่
    const activeVer = await prisma.checklistVersion.findFirst({ where: { status: "ACTIVE" } });
    const company = await prisma.company.create({
      data: {
        studentId: student.id,
        name: matchedMaster ? matchedMaster.nameTh : cleanName,
        checklistVersionId: activeVer ? activeVer.id : 1,
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
  } catch (err: any) {
    console.error("POST /api/student/companies error:", err);
    res.status(500).json({ success: false, message: "บันทึกไม่สำเร็จ: " + err.message });
  }
});

// แก้ไขชื่อบริษัทและคำตอบ Checklist
router.put("/companies/:id", async (req: Request, res: Response) => {
  try {
    const student = await getStudentByUserId(req.session.user!.id);
    if (!student) {
      return res.status(404).json({ success: false, message: "ไม่พบข้อมูลนิสิต" });
    }
    const companyId = parseInt(req.params.id as string, 10);
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
router.get("/submissions", async (req: Request, res: Response) => {
  try {
    const student = await getStudentByUserId(req.session.user!.id);
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

router.put("/submissions/:companyId", async (req: Request, res: Response) => {
  try {
    const student = await getStudentByUserId(req.session.user!.id);
    if (!student) {
      return res.status(404).json({ success: false, message: "ไม่พบข้อมูลนิสิต" });
    }
    const companyId = parseInt(req.params.companyId as string, 10);
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

// [REQ-06] ตรวจสอบว่าสถานประกอบการที่ยื่นฝึกงานจริง ตรงกับ 1 ในบริษัทที่ผ่านการอนุมัติใน Checklist หรือไม่
function checkPlacementMatchesChecklist(placement: any, companies: any[]): boolean {
  if (!placement) return false;
  const approvedList = (companies || []).filter((c) => c.checklistStatus === "APPROVED");
  if (approvedList.length === 0) return false;

  if (placement.companyId && approvedList.some((c) => c.id === placement.companyId)) {
    return true;
  }

  const targetName = (placement.companyNameTh || "").trim().toLowerCase();
  if (!targetName) return false;

  return approvedList.some((c) => {
    const cName = (c.name || "").trim().toLowerCase();
    return cName && (cName === targetName || cName.includes(targetName) || targetName.includes(cName));
  });
}

// ==========================================
// 7. ข้อมูลบริษัทที่เข้าฝึกงานจริง (Internship Placement)
// ==========================================
router.get("/placement", async (req: Request, res: Response) => {
  try {
    const student = await getStudentByUserId(req.session.user!.id);
    if (!student || !student.placement) {
      return res.json({ success: true, placement: null });
    }
    const isMatchedWithChecklist = checkPlacementMatchesChecklist(
      student.placement,
      student.companies || []
    );
    res.json({
      success: true,
      placement: {
        ...student.placement,
        isMatchedWithChecklist,
      },
    });
  } catch (err) {
    console.error("GET /api/student/placement error:", err);
    res.status(500).json({ success: false, message: "ดึงข้อมูลสถานที่ฝึกงานไม่สำเร็จ" });
  }
});

router.post("/placement", async (req: Request, res: Response) => {
  try {
    const student = await getStudentByUserId(req.session.user!.id);
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

    // บังคับกรอกครบทุกช่อง (กันการข้าม validation ฝั่งหน้าเว็บ)
    const requiredMap: Record<string, any> = {
      position,
      companyNameTh,
      contactPersonName,
      contactPersonPosition,
      companyAddress,
      companyPhone1,
      companyPhone2,
      companyEmail,
      province,
    };
    const missing = Object.keys(requiredMap).filter(
      (k) => !requiredMap[k] || !String(requiredMap[k]).trim()
    );
    if (missing.length > 0) {
      return res.status(400).json({
        success: false,
        message: "กรุณากรอกข้อมูลให้ครบทุกช่อง",
        missing,
      });
    }

    const placementData: any = {
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

    const isMatchedWithChecklist = checkPlacementMatchesChecklist(
      placement,
      student.companies || []
    );

    res.json({
      success: true,
      message: "บันทึกข้อมูลแหล่งฝึกงานสำเร็จ",
      placement: {
        ...placement,
        isMatchedWithChecklist,
      },
    });
  } catch (err: any) {
    console.error("POST /api/student/placement error:", err);
    res.status(500).json({ success: false, message: "บันทึกไม่สำเร็จ: " + err.message });
  }
});

// ==========================================
// 8. สรุปข้อมูลทั้งหมดสำหรับหน้า Dashboard (ภาพ 1 / ภาพ 5)
// ==========================================
router.get("/dashboard-summary", async (req: Request, res: Response) => {
  try {
    const student = await getStudentByUserId(req.session.user!.id);
    if (!student) {
      return res.json({
        success: true,
        hasProfile: false,
        user: req.session.user,
      });
    }

    // รวมชั่วโมงทั้งหมด
    const totalSoft = student.trainingRecords
      .filter((t) => t.skillType === "SOFT")
      .reduce((sum, t) => sum + t.hours, 0);

    const totalHard = student.trainingRecords
      .filter((t) => t.skillType === "HARD")
      .reduce((sum, t) => sum + t.hours, 0);

    // รวมชั่วโมงเฉพาะที่อาจารย์อนุมัติแล้ว (APPROVED)
    const approvedTrainings = student.trainingRecords.filter((t) => t.status === "APPROVED");
    const approvedSoft = approvedTrainings
      .filter((t) => t.skillType === "SOFT")
      .reduce((sum, t) => sum + t.hours, 0);
    const approvedHard = approvedTrainings
      .filter((t) => t.skillType === "HARD")
      .reduce((sum, t) => sum + t.hours, 0);

    // คำนวณสถานะการอบรมโดยรวม และดึงหมายเหตุปัญหาจากอาจารย์
    let trainingStatus = "PENDING";
    let trainingNote = "";

    const hasRejected = student.trainingRecords.some((t) => t.status === "REJECTED");
    const rejectedRecord = student.trainingRecords.find((t) => t.status === "REJECTED" && t.note);
    if (rejectedRecord && rejectedRecord.note) {
      trainingNote = rejectedRecord.note;
    }

    if (approvedSoft >= 12 && approvedHard >= 18 && !hasRejected) {
      trainingStatus = "APPROVED";
    } else if (hasRejected || (student.trainingRecords.length > 0 && student.trainingRecords.every(t => t.status === "REJECTED"))) {
      trainingStatus = "REJECTED";
    } else if (student.trainingRecords.length > 0) {
      trainingStatus = "PENDING";
    }

    // บริษัทที่ผ่าน
    const approvedCompanies = student.companies.filter((c) => c.checklistStatus === "APPROVED");

    // บริษัทที่สัมภาษณ์ผ่านแล้ว
    const passedInterview = student.companies.find(
      (c) => c.submission && c.submission.status === "INTERVIEW_PASSED"
    );

    const isMatchedWithChecklist = student.placement
      ? checkPlacementMatchesChecklist(student.placement, student.companies || [])
      : false;

    res.json({
      success: true,
      hasProfile: true,
      user: req.session.user,
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
        advisor: student.advisor ? student.advisor.name : null,
      },
      cv: student.cv,
      trainings: {
        records: student.trainingRecords,
        totalSoft,
        totalHard,
        approvedSoft,
        approvedHard,
        status: trainingStatus,
        note: trainingNote,
      },
      companies: student.companies,
      approvedCompaniesCount: approvedCompanies.length,
      passedInterviewCompany: passedInterview || null,
      placement: student.placement
        ? {
            ...student.placement,
            isMatchedWithChecklist,
          }
        : null,
    });
  } catch (err) {
    console.error("GET /api/student/dashboard-summary error:", err);
    res.status(500).json({ success: false, message: "ดึงข้อมูลสรุป Dashboard ไม่สำเร็จ" });
  }
});

export default router;
