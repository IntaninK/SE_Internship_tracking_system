import { Request, Response, NextFunction } from "express";
import prisma from "../db";

// Middleware: ตรวจสิทธิ์ว่าเป็นอาจารย์ประจำวิชา (Course Admin), เจ้าหน้าที่ (Staff) หรือ Super Admin
export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session || !req.session.user) {
    return res.redirect("/pages/login.html");
  }

  try {
    const dbUser = await prisma.user.findUnique({
      where: { id: req.session.user.id },
      include: { staff: true },
    });

    if (!dbUser) {
      return res.status(401).json({ success: false, message: "ไม่พบข้อมูลผู้ใช้" });
    }

    let staff = dbUser.staff;
    const role = dbUser.role;

    if (!staff && role !== "STUDENT") {
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

    const isAdvisor = Boolean(staff?.isAdvisor || role === "ADVISOR");
    const isCourseAdmin = Boolean(staff?.isCourseAdmin || role === "ADMIN");
    const isSupervisor = Boolean(staff?.isSupervisor);
    const isStaff = Boolean(staff?.isStaff || role === "STAFF");

    req.session.user.role = role;
    req.session.user.isAdvisor = isAdvisor;
    req.session.user.isCourseAdmin = isCourseAdmin;
    req.session.user.isSupervisor = isSupervisor;
    req.session.user.isStaff = isStaff;
    req.session.user.department = staff?.department || null;
    if (dbUser.username) req.session.user.username = dbUser.username;

    if (staff) {
      req.staff = staff;
    }

    // อนุญาตให้อาจารย์ที่ปรึกษา (isAdvisor / ADVISOR) หรืออาจารย์นิเทศก์ (isSupervisor):
    // 1. เข้าดู Profile นิสิตได้ (GET /students/:studentId)
    // 2. ตรวจและตั้งสถานะอนุมัติข้อมูลบริษัทที่เข้าฝึกงานของนิสิตได้ (PUT /students/:studentId/placement-status)
    if (isAdvisor || isSupervisor) {
      const targetUrl = (req.originalUrl || "") + " " + (req.path || "");
      if (req.method === "GET" && (req.path.startsWith("/students/") || targetUrl.includes("/students/"))) {
        return next();
      }
      if (req.method === "PUT" && targetUrl.includes("/placement-status")) {
        return next();
      }
    }

    if (!isCourseAdmin && !isStaff && role !== "STAFF" && role !== "ADMIN" && (role as string) !== "COURSE_INSTRUCTOR") {
      return res.status(403).json({
        success: false,
        message: "ไม่มีสิทธิ์เข้าถึง (ต้องเป็นอาจารย์รายวิชา, เจ้าหน้าที่ หรือ Admin เท่านั้น)",
      });
    }

    next();
  } catch (err) {
    console.error("requireAdmin error:", err);
    res.status(500).json({ success: false, message: "เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์" });
  }
}

export default requireAdmin;
