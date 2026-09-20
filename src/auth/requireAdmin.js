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
  
  // อนุญาตให้อาจารย์ที่ปรึกษา (ADVISOR) เข้าดู Profile นิสิตได้ (GET /students/:studentId)
  if (role === "ADVISOR" && req.method === "GET" && req.path.startsWith("/students/")) {
    return next();
  }

  if (role !== "STAFF" && role !== "ADMIN") {
    return res.status(403).json({
      success: false,
      message: "ไม่มีสิทธิ์เข้าถึง (ต้องเป็นเจ้าหน้าที่หรือ Admin เท่านั้น)",
    });
  }

  next();
}

module.exports = requireAdmin;
