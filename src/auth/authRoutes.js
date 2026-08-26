const express = require("express");
const { msalClient, REDIRECT_URI, SCOPES } = require("./msalConfig");
const prisma = require("../db");

const router = express.Router();

// TODO: เปลี่ยนเป็นโดเมนอีเมลจริงของมหาวิทยาลัย ถ้าอยากบังคับว่าต้อง login
// ด้วยอีเมลนิสิต/อาจารย์เท่านั้น (ปิดไว้ก่อนถ้ายังไม่พร้อม ค่อยเปิดทีหลังได้)
const ALLOWED_EMAIL_DOMAIN = null; // เช่น '@up.ac.th'

// 1) กดปุ่ม Login with Microsoft -> เด้งไปหน้า login ของ Microsoft
router.get("/login", async (req, res) => {
  try {
    const authUrl = await msalClient.getAuthCodeUrl({
      scopes: SCOPES,
      redirectUri: REDIRECT_URI,
    });
    res.redirect(authUrl);
  } catch (err) {
    console.error("MSAL getAuthCodeUrl error:", err);
    res.status(500).send("เริ่มขั้นตอน login ไม่สำเร็จ");
  }
});

// 2) Microsoft ส่ง user กลับมาที่นี่พร้อม ?code=... เอา code ไปแลก token
router.get("/redirect", async (req, res) => {
  if (!req.query.code) {
    return res.status(400).send("ไม่พบ authorization code จาก Microsoft");
  }

  try {
    const tokenResponse = await msalClient.acquireTokenByCode({
      code: req.query.code,
      scopes: SCOPES,
      redirectUri: REDIRECT_URI,
    });

    const account = tokenResponse.account;
    const email = account.username; // MSAL ใส่ email/UPN ไว้ตรงนี้
    const displayName = account.name || email;

    if (ALLOWED_EMAIL_DOMAIN && !email.toLowerCase().endsWith(ALLOWED_EMAIL_DOMAIN)) {
      return res
        .status(403)
        .send(`อนุญาตเฉพาะอีเมลโดเมน ${ALLOWED_EMAIL_DOMAIN} เท่านั้น`);
    }

    // upsert User: ถ้ามีอีเมลนี้อยู่แล้วก็ login เข้าบัญชีเดิม ไม่มีก็สร้างใหม่
    // role ตั้งเป็น STUDENT เป็นค่าเริ่มต้นไปก่อน — ยังไม่มี logic แยก
    // ADVISOR/COURSE_INSTRUCTOR อัตโนมัติ ต้องคุยกับทีมว่าจะกำหนดยังไง
    // (เช่น whitelist อีเมลอาจารย์ไว้ล่วงหน้า แล้วเช็คตรงนี้)
    const user = await prisma.user.upsert({
      where: { email },
      update: { username: displayName },
      create: {
        email,
        username: displayName,
        password: null, // login ผ่าน Microsoft ไม่ใช้ password ของระบบเราเอง
        role: "STUDENT",
      },
    });

    req.session.user = {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
    };

    res.redirect("/pages/dashboard.html");
  } catch (err) {
    console.error("MSAL acquireTokenByCode error:", err);
    res.status(500).send("login ไม่สำเร็จ ลองใหม่อีกครั้ง");
  }
});

// 3) Logout: เคลียร์ session ฝั่งเรา แล้วเด้งไป logout ฝั่ง Microsoft ด้วย
router.get("/logout", (req, res) => {
  req.session.destroy(() => {
    const postLogoutRedirect =
      process.env.MS_POST_LOGOUT_REDIRECT_URI || "http://localhost:3000/pages/login.html";
    const tenant = process.env.MS_TENANT_ID || "common";
    const logoutUrl =
      `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/logout` +
      `?post_logout_redirect_uri=${encodeURIComponent(postLogoutRedirect)}`;
    res.redirect(logoutUrl);
  });
});

// 4) ดึงข้อมูล User ที่กำลัง Login อยู่ (ส่งให้ frontend ใช้งาน)
router.get("/me", async (req, res) => {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ authenticated: false, message: "ยังไม่ได้เข้าสู่ระบบ" });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: req.session.user.id },
      include: {
        student: {
          include: {
            advisor: true,
            cv: true,
            trainingRecords: true,
            companies: true,
            placement: true,
          },
        },
        staff: true,
      },
    });

    if (!user) {
      return res.status(404).json({ authenticated: false, message: "ไม่พบข้อมูลผู้ใช้" });
    }

    res.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
      },
      student: user.student,
      staff: user.staff,
    });
  } catch (err) {
    console.error("Fetch /auth/me error:", err);
    res.status(500).json({ error: "ดึงข้อมูลผู้ใช้ไม่สำเร็จ" });
  }
});

module.exports = router;
