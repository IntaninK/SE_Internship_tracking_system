import "dotenv/config";
import express from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { Pool } from "pg";
import path from "path";

// Import route handlers
import authRoutes from "./src/auth/authRoutes";
import studentRoutes from "./src/api/studentRoutes";
import adminRoutes from "./src/api/adminRoutes";
import advisorRoutes from "./src/api/advisorRoutes";

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

// route login/redirect/logout/me ทั้งหมดอยู่ใต้ /auth/... (และรองรับ /api/auth/... สำหรับ Next.js rewrite)
app.use(["/auth", "/api/auth"], authRoutes);

// route APIs สำหรับนิสิต ทั้งหมดอยู่ใต้ /api/student/...
app.use("/api/student", studentRoutes);

// route APIs สำหรับอาจารย์รายวิชา/Admin ทั้งหมดอยู่ใต้ /api/admin/...
app.use("/api/admin", adminRoutes);

// route APIs สำหรับอาจารย์ที่ปรึกษา ทั้งหมดอยู่ใต้ /api/advisor/...
app.use("/api/advisor", advisorRoutes);

// เสิร์ฟ static uploads
app.use("/uploads", express.static(path.join(process.cwd(), "public", "uploads")));

export default app;
