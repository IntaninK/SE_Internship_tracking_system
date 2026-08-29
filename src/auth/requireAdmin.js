// Middleware: ตรวจสิทธิ์ว่าเป็น COURSE_INSTRUCTOR หรือ ADMIN
function requireAdmin(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.redirect("/pages/login.html");
  }

  const role = req.session.user.role;
  if (role !== "COURSE_INSTRUCTOR" && role !== "ADMIN") {
    return res.status(403).json({
      success: false,
      message: "ไม่มีสิทธิ์เข้าถึง (ต้องเป็นอาจารย์รายวิชาหรือ Admin เท่านั้น)",
    });
  }

  next();
}

module.exports = requireAdmin;
