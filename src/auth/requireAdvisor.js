const prisma = require("../db");

// Middleware: ตรวจสอบว่าเป็น ADVISOR, COURSE_INSTRUCTOR หรือ ADMIN
async function requireAdvisor(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.redirect("/pages/login.html");
  }

  const role = req.session.user.role;
  if (role !== "ADVISOR" && role !== "COURSE_INSTRUCTOR" && role !== "ADMIN") {
    return res.status(403).json({
      success: false,
      message: "ไม่มีสิทธิ์เข้าถึง (สำหรับอาจารย์ที่ปรึกษาเท่านั้น)",
    });
  }

  try {
    // หา Staff record ของ user นี้
    let staff = await prisma.staff.findUnique({
      where: { userId: req.session.user.id },
    });

    if (!staff) {
      staff = await prisma.staff.create({
        data: {
          userId: req.session.user.id,
          name: req.session.user.username || req.session.user.email,
        },
      });
    }

    req.staff = staff;
    next();
  } catch (err) {
    console.error("requireAdvisor error:", err);
    res.status(500).json({ success: false, message: "เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์" });
  }
}

module.exports = requireAdvisor;
