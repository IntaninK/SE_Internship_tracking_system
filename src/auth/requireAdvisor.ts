import { Request, Response, NextFunction } from "express";
import prisma from "../db";

// Middleware: ตรวจสอบว่าเป็นอาจารย์ที่ปรึกษา, อาจารย์นิเทศก์, อาจารย์รายวิชา หรือเจ้าหน้าที่
export async function requireAdvisor(req: Request, res: Response, next: NextFunction) {
  if (!req.session || !req.session.user) {
    return res.redirect("/login");
  }

  try {
    const dbUser = await prisma.user.findUnique({
      where: { id: req.session.user.id },
      include: { staff: true },
    });

    if (!dbUser) {
      return res.status(401).json({ success: false, message: "ไม่พบข้อมูลผู้ใช้" });
    }

    req.session.user.role = dbUser.role;
    if (dbUser.username) req.session.user.username = dbUser.username;

    let staff = dbUser.staff;
    const role = dbUser.role;

    const hasStaffAccess = Boolean(
      staff?.isAdvisor ||
        staff?.isSupervisor ||
        staff?.isCourseAdmin ||
        staff?.isStaff ||
        role === "ADVISOR" ||
        role === "STAFF" ||
        role === "ADMIN"
    );

    if (!hasStaffAccess) {
      return res.status(403).json({
        success: false,
        message: "ไม่มีสิทธิ์เข้าถึง (สำหรับอาจารย์ที่ปรึกษาเท่านั้น)",
      });
    }

    if (!staff) {
      staff = await prisma.staff.create({
        data: {
          userId: dbUser.id,
          name: dbUser.username || dbUser.email,
          isCourseAdmin: role === "ADMIN",
          isAdvisor: role === "ADVISOR",
          isStaff: role === "STAFF",
          isSupervisor: false,
        },
      });
    }

    req.session.user.isAdvisor = Boolean(staff.isAdvisor || role === "ADVISOR");
    req.session.user.isCourseAdmin = Boolean(staff.isCourseAdmin || role === "ADMIN");
    req.session.user.isSupervisor = Boolean(staff.isSupervisor);
    req.session.user.isStaff = Boolean(staff.isStaff || role === "STAFF");
    req.session.user.department = staff.department || null;

    req.staff = staff;
    next();
  } catch (err) {
    console.error("requireAdvisor error:", err);
    res.status(500).json({ success: false, message: "เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์" });
  }
}

export default requireAdvisor;
