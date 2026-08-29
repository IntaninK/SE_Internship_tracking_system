require("dotenv").config();
const express = require("express");
const session = require("express-session");
const path = require("path");

const authRoutes = require("./src/auth/authRoutes");
const studentRoutes = require("./src/api/studentRoutes");
const adminRoutes = require("./src/api/adminRoutes");
const requireLogin = require("./src/auth/requireLogin");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "se_internship_secret_key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // ตั้งเป็น true ตอน deploy จริงด้วย HTTPS
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

// เสิร์ฟ static assets ทั่วไป (css, img, components, uploads) ไม่ต้องล็อกอินก็โหลดได้
app.use("/css", express.static(path.join(__dirname, "src", "css")));
app.use("/img", express.static(path.join(__dirname, "src", "img")));
app.use("/components", express.static(path.join(__dirname, "src", "components")));
app.use("/uploads", express.static(path.join(__dirname, "public", "uploads")));

// หน้าแรก (root): ถ้าล็อกอินแล้วไป dashboard ตาม role ถ้ายังไม่ล็อกอินให้ไป login.html
app.get("/", (req, res) => {
  if (req.session && req.session.user) {
    const role = req.session.user.role;
    if (role === "COURSE_INSTRUCTOR" || role === "ADMIN") {
      return res.redirect("/pages/dashboard_รายวิชา.html");
    } else if (role === "ADVISOR") {
      return res.redirect("/pages/dashboard_ที่ปรึกษา.html");
    }
    return res.redirect("/pages/dashboard.html");
  }
  res.redirect("/pages/login.html");
});

// หน้า Login: ถ้าล็อกอินอยู่แล้วให้ข้ามไปหน้า dashboard ตาม role ทันที
app.get("/pages/login.html", (req, res) => {
  if (req.session && req.session.user) {
    const role = req.session.user.role;
    if (role === "COURSE_INSTRUCTOR" || role === "ADMIN") {
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running: http://localhost:${PORT}`);
  console.log(`หน้า Login: http://localhost:${PORT}/pages/login.html`);
});
