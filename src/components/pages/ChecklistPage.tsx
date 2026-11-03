"use client";

import React from "react";
import PageShell from "./PageShell";

const PAGE_TITLE = "Check List บริษัท - ระบบติดตามการเตรียมฝึกงานของนิสิต SE";
const PAGE_STYLES: string[] = [
  "\r\n    .company-card {\r\n      margin-bottom: 6px;\r\n      border-radius: 12px;\r\n      overflow: hidden;\r\n      box-shadow: 0 4px 12px rgba(0,0,0,0.08);\r\n      border: 1px solid #d1d5db;\r\n      background: white;\r\n    }\r\n    .company-header {\r\n      background: linear-gradient(90deg, #1e3a8a, #2563eb);\r\n      color: white;\r\n      padding: 12px 20px;\r\n      display: flex;\r\n      align-items: center;\r\n      justify-content: space-between;\r\n      gap: 12px;\r\n    }\r\n    .company-name-input {\r\n      background: white;\r\n      color: #1e3a8a;\r\n      font-weight: 600;\r\n      font-size: 1.1rem;\r\n      border: none;\r\n      border-radius: 8px;\r\n      padding: 6px 14px;\r\n      width: 100%;\r\n      max-width: 380px;\r\n      outline: none;\r\n    }\r\n    .section-title {\r\n      font-size: 1.25rem;\r\n      font-weight: 600;\r\n      color: #1d4ed8;\r\n      margin: 24px 0 12px 0;\r\n      display: flex;\r\n      align-items: center;\r\n      gap: 8px;\r\n    }\r\n    .checklist-table {\r\n      width: 100%;\r\n      border-collapse: collapse;\r\n      margin-bottom: 20px;\r\n      font-size: 0.95rem;\r\n    }\r\n    .checklist-table th, .checklist-table td {\r\n      border: 1px solid #e5e7eb;\r\n      padding: 10px 14px;\r\n    }\r\n    .checklist-table th {\r\n      background-color: #f9fafb;\r\n      font-weight: 600;\r\n      text-align: center;\r\n      color: #374151;\r\n    }\r\n    .checklist-table td.desc-col {\r\n      text-align: left;\r\n      color: #1f2937;\r\n      width: 60%;\r\n    }\r\n    .checklist-table td.check-col {\r\n      text-align: center;\r\n      width: 10%;\r\n    }\r\n    .checklist-table td.detail-col {\r\n      width: 30%;\r\n    }\r\n    .custom-checkbox {\r\n      width: 20px;\r\n      height: 20px;\r\n      cursor: pointer;\r\n      accent-color: #2563eb;\r\n    }\r\n    .detail-input {\r\n      width: 100%;\r\n      padding: 6px 10px;\r\n      border: 1px solid #d1d5db;\r\n      border-radius: 6px;\r\n      outline: none;\r\n    }\r\n    .detail-input:focus {\r\n      border-color: #2563eb;\r\n    }\r\n  "
];
const PAGE_SCRIPTS: string[] = [
  "../components/header.js",
  "../api/checklist.js"
];
const PAGE_BODY_HTML = "<!-- Header -->\r\n  <div id=\"header-placeholder\"></div>\r\n\r\n  <!-- Main Content -->\r\n  <main class=\"main-content max-w-[1200px] mx-auto py-8 px-4\">\r\n    \r\n    <!-- Top Box Header -->\r\n    <div class=\"bg-white rounded-2xl shadow-md border border-gray-200 p-6 mb-6\">\r\n      <div class=\"flex items-center justify-between flex-wrap gap-4\">\r\n        <div class=\"flex items-center gap-3\">\r\n          <span class=\"material-icons text-3xl text-blue-700\">playlist_add_check</span>\r\n          <h1 class=\"text-3xl font-bold text-gray-800\">Check List บริษัทที่สนใจยื่นฝึกงาน</h1>\r\n        </div>\r\n        \r\n        <!-- ปุ่มเขียว: เพิ่มบริษัท (ภาพที่ 9, 10) -->\r\n        <button type=\"button\" id=\"add-company-btn\" class=\"inline-flex items-center gap-2 px-6 py-3 bg-[#00C853] hover:bg-[#00B248] text-white font-semibold rounded-full shadow transition text-lg cursor-pointer border-none\">\r\n          <span class=\"material-icons\">add_circle</span>\r\n          <span>เพิ่มบริษัท</span>\r\n        </button>\r\n      </div>\r\n    </div>\r\n\r\n    <!-- Container สำหรับใส่กล่องบริษัทแต่ละแห่ง -->\r\n    <div id=\"companies-container\">\r\n      <div class=\"text-center py-10 text-gray-500 font-medium\" id=\"loading-spinner\">กำลังโหลดแบบฟอร์ม Checklist...</div>\r\n    </div>\r\n\r\n    <!-- ปุ่มเขียว: ยืนยันและบันทึกข้อมูล (ภาพที่ 9, 11) -->\r\n    <div class=\"flex justify-center mt-10 mb-12\">\r\n      <button type=\"button\" id=\"save-all-btn\" \r\n        class=\"inline-flex items-center justify-center gap-3 px-12 py-4 rounded-full bg-[#00C853] hover:bg-[#00B248] text-white font-bold text-2xl shadow-lg border-3 border-gray-400 cursor-pointer transition\">\r\n        <span class=\"material-icons text-3xl\">check_circle</span>\r\n        <span>ยืนยันและบันทึกข้อมูล</span>\r\n      </button>\r\n    </div>\r\n\r\n  </main>";

export default function ChecklistPage() {
  return (
    <PageShell
      pageKey="checklist"
      title={PAGE_TITLE}
      styles={PAGE_STYLES}
      scripts={PAGE_SCRIPTS}
      bodyHtml={PAGE_BODY_HTML}
    />
  );
}
