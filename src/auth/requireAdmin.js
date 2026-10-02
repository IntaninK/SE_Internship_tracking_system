const prisma = require("../db");

// Middleware: ตรวจสิทธิ์ว่าเป็น STAFF หรือ ADMIN
async function requireAdmin(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.redirect("/pages/login.html");
  }

  // ซิงค์ role ล่าสุดจาก Database เผื่อกรณีเปลี่ยน role ใน DB ขณะที่ session เดิมยังเปิดอยู่
  if (req.session.user.role !== "STAFF" && req.session.user.role !== "ADMIN") {
    try {
      const dbUser = await prisma.user.findUnique({
        where: { id: req.session.user.id },
        select: { role: true, username: true },
      });
      if (dbUser) {
        req.session.user.role = dbUser.role;
        if (dbUser.username) req.session.user.username = dbUser.username;
      }
    } catch (err) {
      console.error("requireAdmin sync role error:", err);
    }
  }

  const role = req.session.user.role;
  
  // อนุญาตให้อาจารย์ที่ปรึกษา (ADVISOR):
  // 1. เข้าดู Profile นิสิตได้ (GET /students/:studentId)
  // 2. ตรวจและตั้งสถานะอนุมัติข้อมูลบริษัทที่เข้าฝึกงานของนิสิตได้ (PUT /students/:studentId/placement-status)
  if (role === "ADVISOR") {
    const targetUrl = (req.originalUrl || "") + " " + (req.path || "");
    if (req.method === "GET" && (req.path.startsWith("/students/") || targetUrl.includes("/students/"))) {
      return next();
    }
    if (req.method === "PUT" && targetUrl.includes("/placement-status")) {
      return next();
    }
  }

  if (role !== "STAFF" && role !== "ADMIN" && role !== "COURSE_INSTRUCTOR") {
    return res.status(403).json({
      success: false,
      message: "ไม่มีสิทธิ์เข้าถึง (ต้องเป็นอาจารย์รายวิชา, เจ้าหน้าที่ หรือ Admin เท่านั้น)",
    });
  }

  next();
}

module.exports = requireAdmin;
