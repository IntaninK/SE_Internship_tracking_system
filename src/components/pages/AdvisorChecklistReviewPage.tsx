"use client";

import React from "react";
import PageShell from "./PageShell";

const PAGE_TITLE = "ตรวจ Checklist นิสิต - อาจารย์ที่ปรึกษา";
const PAGE_STYLES: string[] = [
  "\n    body {\n      font-family: 'Prompt', 'Inter', sans-serif;\n      background-color: #f0f7ff;\n    }\n    .company-card {\n      margin-bottom: 20px;\n      border-radius: 16px;\n      overflow: hidden;\n      box-shadow: 0 4px 12px rgba(0,0,0,0.06);\n      border: 1px solid #d1d5db;\n      background: white;\n    }\n    .company-header {\n      background: linear-gradient(90deg, #1e3a8a, #2563eb);\n      color: white;\n      padding: 14px 24px;\n      display: flex;\n      align-items: center;\n      justify-content: space-between;\n      gap: 12px;\n      cursor: pointer;\n      user-select: none;\n    }\n    .company-header:hover {\n      background: linear-gradient(90deg, #1e40af, #1d4ed8);\n    }\n    .section-title {\n      font-size: 1.15rem;\n      font-weight: 600;\n      color: #1d4ed8;\n      margin: 24px 0 12px 0;\n      display: flex;\n      align-items: center;\n      gap: 8px;\n    }\n    .checklist-table {\n      width: 100%;\n      border-collapse: collapse;\n      margin-bottom: 20px;\n      font-size: 0.95rem;\n    }\n    .checklist-table th, .checklist-table td {\n      border: 1px solid #e5e7eb;\n      padding: 10px 14px;\n    }\n    .checklist-table th {\n      background-color: #f9fafb;\n      font-weight: 600;\n      text-align: center;\n      color: #374151;\n    }\n    .checklist-table td.desc-col {\n      text-align: left;\n      color: #1f2937;\n      width: 60%;\n    }\n    .checklist-table td.check-col {\n      text-align: center;\n      width: 10%;\n    }\n    .checklist-table td.detail-col {\n      width: 30%;\n    }\n    .custom-checkbox {\n      width: 20px;\n      height: 20px;\n      cursor: not-allowed;\n      accent-color: #2563eb;\n    }\n    .detail-input {\n      width: 100%;\n      padding: 6px 10px;\n      border: 1px solid #e2e8f0;\n      border-radius: 6px;\n      background-color: #f8fafc;\n      color: #475569;\n      font-size: 0.9rem;\n    }\n  "
];
const PAGE_SCRIPTS: string[] = [
  "../components/header.js",
  "../api/advisor_checklist_review.js"
];
const PAGE_BODY_HTML = "<!-- Header Bar -->\n  <div id=\"header-placeholder\"></div>\n\n  <!-- Main Content -->\n  <main class=\"main-content max-w-[1200px] mx-auto py-8 px-4\">\n\n    <!-- Top Card Header: CH ของนิสิต -->\n    <div class=\"bg-gradient-to-r from-blue-900 to-blue-700 text-white rounded-2xl shadow-md p-6 mb-6\">\n      <div class=\"flex items-center justify-between flex-wrap gap-4\">\n        <div class=\"flex items-center gap-3\">\n          <span class=\"material-icons text-3xl\">fact_check</span>\n          <div>\n            <h1 class=\"text-2xl font-bold flex items-center gap-2\">\n              CH ของนิสิต\n            </h1>\n            <p id=\"student-info-subtitle\" class=\"text-blue-100 text-sm mt-1\">กำลังโหลดข้อมูลนิสิต...</p>\n          </div>\n        </div>\n        \n        <a href=\"/pages/dashboard_ที่ปรึกษา.html\" class=\"inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm transition no-underline\">\n          <span class=\"material-icons text-base\">arrow_back</span>\n          <span>กลับไปหน้า Dashboard</span>\n        </a>\n      </div>\n    </div>\n\n    <!-- Companies Checklist Container -->\n    <div id=\"companies-checklist-container\">\n      <div class=\"text-center py-16 text-gray-500 font-medium\" id=\"loading-spinner\">\n        กำลังโหลดข้อมูล Checklist ของนิสิต...\n      </div>\n    </div>\n\n  </main>";

export default function AdvisorChecklistReviewPage() {
  return (
    <PageShell
      pageKey="advisor_checklist_review"
      title={PAGE_TITLE}
      styles={PAGE_STYLES}
      scripts={PAGE_SCRIPTS}
      bodyHtml={PAGE_BODY_HTML}
    />
  );
}
