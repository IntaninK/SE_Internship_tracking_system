import "dotenv/config";
import express, { Request, Response } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { Pool } from "pg";
import path from "path";

// Import route handlers and middlewares
import authRoutes from "./src/auth/authRoutes";
import studentRoutes from "./src/api/studentRoutes";
import adminRoutes from "./src/api/adminRoutes";
import advisorRoutes from "./src/api/advisorRoutes";
import requireLogin from "./src/auth/requireLogin";

const app = express();

// บน Vercel แต่ละ request อาจไปตก serverless instance คนละตัว ต้อง trust proxy
// เพื่อให้ express-session รู้ว่า connection เดิมมาผ่าน HTTPS จริง (สำหรับ secure cookie)
app.set("trust proxy", 1);

const isProduction = process.env.NODE_ENV === "production";

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PgSession = connectPgSimple(session);

app.use(
  session({
    store: new PgSession({
      pool: new Pool({ connectionString: process.env.DATABASE_URL }),
      tableName: "session", // pgSession จะสร้างตารางนี้ให้เองอัตโนมัติ (createTableIfMissing)
      createTableIfMissing: true,
    }),
    secret: process.env.SESSION_SECRET || "se_internship_secret_key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: isProduction, // true บน Vercel (HTTPS) / false ตอน dev local (http)
      maxAge: 1000 * 60 * 60 * 8, // session อยู่ได้ 8 ชม.
    },
  })
);

// route login/redirect/logout/me ทั้งหมดอยู่ใต้ /auth/...
app.use("/auth", authRoutes);

// route APIs สำหรับนิสิต ทั้งหมดอยู่ใต้ /api/student/...
app.use("/api/student", studentRoutes);

// route APIs สำหรับอาจารย์รายวิชา/Admin ทั้งหมดอยู่ใต้ /api/admin/...
app.use("/api/admin", adminRoutes);

// route APIs สำหรับอาจารย์ที่ปรึกษา ทั้งหมดอยู่ใต้ /api/advisor/...
app.use("/api/advisor", advisorRoutes);

// เสิร์ฟ static assets ทั่วไป (css, img, components, uploads) ไม่ต้องล็อกอินก็โหลดได้
app.use("/css", express.static(path.join(__dirname, "src", "css")));
app.use("/img", express.static(path.join(__dirname, "src", "img")));
app.use("/components", express.static(path.join(__dirname, "src", "components")));
app.use("/uploads", express.static(path.join(__dirname, "public", "uploads")));

// หน้าแรก (root): ถ้าล็อกอินแล้วไป dashboard ตาม role ถ้ายังไม่ล็อกอินให้ไป login.html
app.get("/", (req: Request, res: Response) => {
  if (req.session && req.session.user) {
    const role = req.session.user.role;
    if (role === "STAFF" || role === "ADMIN") {
      return res.redirect("/pages/dashboard_รายวิชา.html");
    } else if (role === "ADVISOR") {
      return res.redirect("/pages/dashboard_ที่ปรึกษา.html");
    }
    return res.redirect("/pages/dashboard.html");
  }
  res.redirect("/pages/login.html");
});

// หน้า Login: ถ้าล็อกอินอยู่แล้วให้ข้ามไปหน้า dashboard ตาม role ทันที
app.get("/pages/login.html", (req: Request, res: Response) => {
  if (req.session && req.session.user) {
    const role = req.session.user.role;
    if (role === "STAFF" || role === "ADMIN") {
      return res.redirect("/pages/dashboard_รายวิชา.html");
    } else if (role === "ADVISOR") {
      return res.redirect("/pages/dashboard_ที่ปรึกษา.html");
    }
    return res.redirect("/pages/dashboard.html");
  }
  res.sendFile(path.join(__dirname, "src", "pages", "login.html"));
});

// ป้องกันหน้าอื่นๆ ทั้งหมดใน /pages/ ด้วย requireLogin (ถ้ายังไม่ล็อกอินจะเด้งไป login.html)
app.use("/pages", requireLogin, express.static(path.join(__dirname, "src", "pages")));

// Static fallback สำหรับไฟล์อื่นๆ ใน src
app.use(express.static(path.join(__dirname, "src")));

// Vercel เรียก app เป็น handler โดยตรง ไม่ต้อง listen เอง
// รันแบบ local (npm start) เท่านั้นที่ต้อง listen port จริง
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server running: http://localhost:${PORT}`);
    console.log(`หน้า Login: http://localhost:${PORT}/pages/login.html`);
  });
}

export default app;
module.exports = app;
module.exports.default = app;
