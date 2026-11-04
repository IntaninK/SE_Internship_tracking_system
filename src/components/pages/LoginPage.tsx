"use client";

import React from "react";
import PageShell from "./PageShell";

const PAGE_TITLE = "เข้าสู่ระบบ - ระบบติดตามการเตรียมฝึกงานของนิสิตSE";
const PAGE_STYLES: string[] = [
  `
    .login-bg-page {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px 16px;
      background: linear-gradient(180deg, #CFE8FF 0%, #E6F2FF 48%, #D8ECFF 100%);
    }
    .login-card-classic {
      background: #FFFFFF;
      border-radius: 36px;
      width: 100%;
      max-width: 580px;
      padding: 36px 36px 32px 36px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 28px;
      box-shadow: 0 14px 40px rgba(30, 64, 175, 0.10), 0 4px 12px rgba(0, 0, 0, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.9);
    }
    .login-ms-button {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      background: #138DFF;
      border-radius: 14px;
      color: #FFFFFF !important;
      font-size: 22px;
      font-weight: 700;
      width: 95%;
      max-width: 540px;
      height: 62px;
      text-decoration: underline;
      text-underline-offset: 4px;
      box-shadow: 0 6px 18px rgba(19, 141, 255, 0.28);
      transition: all 0.2s ease;
    }
    .login-ms-button:hover {
      background: #0B7AE5;
      transform: translateY(-1px);
      box-shadow: 0 10px 24px rgba(19, 141, 255, 0.36);
    }
    .login-footer-desc {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      padding: 0 12px;
      text-align: center;
    }
    .login-footer-green {
      color: #00BF1A !important;
      font-size: 13.5px !important;
      font-weight: 500;
      line-height: 1.55;
      margin: 0;
      text-align: center;
    }
    .login-footer-orange {
      color: #BF4900 !important;
      font-size: 13px !important;
      font-weight: 500;
      line-height: 1.55;
      margin: 0;
      text-align: center;
    }
    @media (max-width: 580px) {
      .login-footer-green, .login-footer-orange {
        font-size: 12px !important;
      }
    }
  `
];
const PAGE_SCRIPTS: string[] = [];
const PAGE_BODY_HTML = `
  <!-- ===== จัดกึ่งกลางจอ (ดีไซน์ดั้งเดิมตามภาพที่ 2) ===== -->
  <main class="login-bg-page">

    <!-- ===== Login Card ===== -->
    <div class="login-card-classic">

      <!-- โลโก้มหาวิทยาลัยพะเยา & SE / ICT -->
      <img
        src="/img/logo_login.png"
        alt="โลโก้มหาวิทยาลัยพะเยา / ICT"
        class="w-[300px] max-w-[80%] h-auto object-contain"
      />

      <!-- ชื่อระบบ (สีน้ำเงิน #2C51D4 ตามภาพที่ 2) -->
      <div class="text-center px-4">
        <p class="text-[24px] text-[#2C51D4] text-center leading-normal font-medium" style="margin:0; font-size:24px; color:#2C51D4; font-weight:500;">
          ระบบติดตามการเตรียมฝึกงานของนิสิต ICT
        </p>
      </div>

      <!-- ปุ่มเข้าสู่ระบบ (ลิงก์ไปยัง /auth/login) -->
      <a
        href="/auth/login"
        class="login-ms-button"
      >
        <!-- Microsoft Icon -->
        <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 23 23" class="flex-shrink-0">
          <rect x="0"  y="0"  width="11" height="11" fill="#F25022"/>
          <rect x="12" y="0"  width="11" height="11" fill="#7FBA00"/>
          <rect x="0"  y="12" width="11" height="11" fill="#00A4EF"/>
          <rect x="12" y="12" width="11" height="11" fill="#FFB900"/>
        </svg>
        <span>เข้าสู่ระบบ</span>
      </a>

      <!-- คำอธิบายท้ายการ์ด (ขนาดตัวเล็กลง และสีเดิมตามภาพที่ 2) -->
      <div class="login-footer-desc">
        <p class="login-footer-green">
          พัฒนาขึ้นเพื่อช่วยให้นิสิต/นักศึกษา สามารถเตรียมความพร้อมก่อนฝึกงาน ได้จากที่นี่
        </p>
        <p class="login-footer-orange">
          เว็บไซต์นี้ปฏิบัติตามกฎหมาย PDPA และไม่มีการบันทึกรหัสผ่านในการเข้าใช้งาน
        </p>
      </div>

    </div>
  </main>
`;

export default function LoginPage() {
  return (
    <PageShell
      pageKey="login"
      title={PAGE_TITLE}
      styles={PAGE_STYLES}
      scripts={PAGE_SCRIPTS}
      bodyHtml={PAGE_BODY_HTML}
    />
  );
}
