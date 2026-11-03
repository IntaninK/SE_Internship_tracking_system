"use client";

import React from "react";
import PageShell from "./PageShell";

const PAGE_TITLE = "เข้าสู่ระบบ";
const PAGE_STYLES: string[] = [];
const PAGE_SCRIPTS: string[] = [];
const PAGE_BODY_HTML = "<!-- ===== จัดกึ่งกลางจอ ===== -->\r\n  <main class=\"flex items-center justify-center min-h-screen px-4\">\r\n\r\n    <!-- ===== Login Card ===== -->\r\n    <div class=\"bg-white rounded-[36px] w-full max-w-[623px] pt-[20px] pb-[20px] flex flex-col items-center gap-[35px]\"\r\n         style=\"box-shadow: 0 8px 30px rgba(0, 0, 0, 0.08);\">\r\n\r\n      <!-- โลโก้มหาวิทยาลัย -->\r\n      <img\r\n        src=\"../img/logo_login.png\"\r\n        alt=\"โลโก้มหาวิทยาลัยพะเยา / SE\"\r\n        class=\"w-[367px] max-w-[75%] h-auto object-contain\"\r\n      />\r\n\r\n      <!-- ชื่อระบบ -->\r\n      <p class=\"text-[24px] text-[#2C51D4] text-center px-6 leading-normal font-medium\">\r\n        ระบบติดตามการเตรียมฝึกงานของนิสิตSE\r\n      </p>\r\n\r\n      <!-- ปุ่มเข้าสู่ระบบ -->\r\n      <a\r\n        href=\"/auth/login\"\r\n        class=\"flex items-center justify-center gap-[12px] bg-[#138DFF] rounded-[12px] text-white text-[22px] font-bold mx-[35px] w-[calc(100%-70px)] max-w-[553px] h-[64px] hover:opacity-90 hover:shadow-lg transition-all\"\r\n      >\r\n        <!-- Microsoft Icon -->\r\n        <svg xmlns=\"http://www.w3.org/2000/svg\" width=\"32\" height=\"32\" viewBox=\"0 0 23 23\" class=\"flex-shrink-0\">\r\n          <rect x=\"0\"  y=\"0\"  width=\"11\" height=\"11\" fill=\"#F25022\"/>\r\n          <rect x=\"12\" y=\"0\"  width=\"11\" height=\"11\" fill=\"#7FBA00\"/>\r\n          <rect x=\"0\"  y=\"12\" width=\"11\" height=\"11\" fill=\"#00A4EF\"/>\r\n          <rect x=\"12\" y=\"12\" width=\"11\" height=\"11\" fill=\"#FFB900\"/>\r\n        </svg>\r\n        เข้าสู่ระบบ\r\n      </a>\r\n\r\n      <!-- คำอธิบายท้ายการ์ด -->\r\n      <div class=\"flex flex-col items-center gap-[15px] px-6\">\r\n        <p class=\"text-[16px] text-[#00BF1A] text-center leading-relaxed\">\r\n          พัฒนาขึ้นเพื่อช่วยให้นิสิต/นักศึกษา สามารถเตรียมความพร้อมก่อนฝึกงาน ได้จากที่นี่\r\n        </p>\r\n        <p class=\"text-[16px] text-[#BF4900] text-center leading-relaxed mb-2\">\r\n          เว็บไซต์นี้ปฏิบัติตามกฎหมาย PDPA และไม่มีการบันทึกรหัสผ่านในการเข้าใช้งาน\r\n        </p>\r\n      </div>\r\n\r\n    </div>\r\n  </main>";

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
