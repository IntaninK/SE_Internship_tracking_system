"use client";

import React from "react";
import PageShell from "./PageShell";

const PAGE_TITLE = "ตรวจประเมิน Checklist นิสิต - อาจารย์ที่ปรึกษา คณะ ICT ม.พะเยา";
const PAGE_STYLES: string[] = [
  `
    .company-card {
      margin-bottom: 20px;
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 10px 30px -10px rgba(30, 27, 75, 0.08);
      border: 1px solid #E2E8F0;
      background: white;
    }
    .company-header {
      background: linear-gradient(135deg, #1E1B4B 0%, #312E81 50%, #4338CA 100%);
      color: white;
      padding: 16px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      cursor: pointer;
      user-select: none;
    }
    .company-header:hover {
      background: linear-gradient(135deg, #312E81 0%, #4338CA 100%);
    }
    .section-title {
      font-size: 1.08rem;
      font-weight: 700;
      color: #312E81;
      margin: 22px 0 12px 0;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .checklist-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
      font-size: 0.92rem;
    }
    .checklist-table th, .checklist-table td {
      border: 1px solid #E2E8F0;
      padding: 10px 14px;
    }
    .checklist-table th {
      background-color: #F8FAFC;
      font-weight: 700;
      text-align: center;
      color: #334155;
    }
    .checklist-table td.desc-col {
      text-align: left;
      color: #1E293B;
      width: 60%;
    }
    .checklist-table td.check-col {
      text-align: center;
      width: 10%;
    }
    .checklist-table td.detail-col {
      width: 30%;
    }
    .custom-checkbox {
      width: 19px;
      height: 19px;
      cursor: not-allowed;
      accent-color: #4338CA;
    }
    .detail-input {
      width: 100%;
      padding: 6px 10px;
      border: 1px solid #E2E8F0;
      border-radius: 8px;
      background-color: #F8FAFC;
      color: #475569;
      font-size: 0.88rem;
    }
  `
];
const PAGE_SCRIPTS: string[] = [
  "../components/header.js",
  "../api/advisor_checklist_review.js"
];
const PAGE_BODY_HTML = `
  <!-- Header Bar -->
  <div id="header-placeholder"></div>

  <!-- Main Content -->
  <main class="main-content max-w-[1200px] mx-auto py-8 px-4">

    <!-- Top Card Header: ตรวจประเมิน Checklist ของนิสิต -->
    <div style="background:linear-gradient(135deg, #1E1B4B 0%, #312E81 50%, #4338CA 100%);" class="text-white rounded-2xl shadow-md p-6 mb-6">
      <div class="flex items-center justify-between flex-wrap gap-4">
        <div class="flex items-center gap-3.5">
          <div style="width:48px; height:48px; border-radius:14px; background:rgba(255,255,255,0.16); display:flex; align-items:center; justify-content:center;">
            <span class="material-icons text-2xl">fact_check</span>
          </div>
          <div>
            <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
              <h1 class="text-xl font-bold" style="margin:0;">ตรวจประเมินแบบสำรวจสถานประกอบการ (Checklist 3 บริษัท)</h1>
              <span style="background:rgba(255,255,255,0.18); border:1px solid rgba(255,255,255,0.28); font-size:11px; font-weight:700; padding:2px 10px; border-radius:999px;">[REQ-05 &amp; REQ-06]</span>
            </div>
            <p id="student-info-subtitle" class="text-indigo-100 text-xs mt-1" style="margin-bottom:0;">กำลังโหลดข้อมูลนิสิต...</p>
          </div>
        </div>

        <a href="/advisor-dashboard" class="inline-flex items-center gap-2 px-4 py-2 bg-white/15 hover:bg-white/25 text-white rounded-xl text-xs font-semibold transition no-underline">
          <span class="material-icons text-base">arrow_back</span>
          <span>กลับไปหน้า Dashboard</span>
        </a>
      </div>
    </div>

    <!-- Companies Checklist Container -->
    <div id="companies-checklist-container">
      <div class="text-center py-16 text-gray-500 font-medium" id="loading-spinner">
        กำลังโหลดข้อมูล Checklist ของนิสิต...
      </div>
    </div>

  </main>
`;

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
