require("dotenv").config();
const express = require("express");
const session = require("express-session");
const path = require("path");

const authRoutes = require("./src/auth/authRoutes");
const requireLogin = require("./src/auth/requireLogin");

const app = express();

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // ตั้งเป็น true ตอน deploy จริงด้วย HTTPS
      maxAge: 1000 * 60 * 60 * 8, // session อยู่ได้ 8 ชม.
    },
  })
);

// route login/redirect/logout ทั้งหมดอยู่ใต้ /auth/...
app.use("/auth", authRoutes);

// ตัวอย่างการล็อกหน้า dashboard ไว้หลัง login (จะเพิ่มหน้าอื่นทีหลังก็ได้)
app.get("/src/pages/dashboard.html", requireLogin, (req, res) => {
  res.sendFile(path.join(__dirname, "src", "pages", "dashboard.html"));
});

// เสิร์ฟไฟล์ static (pages, components, css) จากโฟลเดอร์ src เหมือนเดิม
// ให้ path ../components/header.html ที่ใช้อยู่ในหน้าเว็บทำงานได้เหมือนเดิม
app.use(express.static(path.join(__dirname, "src")));

app.get("/", (req, res) => {
  res.redirect("/pages/dashboard.html");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running: http://localhost:${PORT}`);
  console.log(`ทดสอบ login: http://localhost:${PORT}/auth/login`);
});
