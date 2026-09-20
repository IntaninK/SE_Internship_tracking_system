// Middleware: ตรวจสิทธิ์ว่าเป็น STAFF หรือ ADMIN
function requireAdmin(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.redirect("/pages/login.html");
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
