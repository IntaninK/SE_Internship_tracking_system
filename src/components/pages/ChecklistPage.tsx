"use client";

import React from "react";
import PageShell from "./PageShell";

const PAGE_TITLE = "แบบสำรวจสถานประกอบการ (Checklist ยื่นทีละ 1 บริษัท) - คณะ ICT ม.พะเยา";
const PAGE_STYLES: string[] = [
  `
    .company-card {
      margin-bottom: 18px;
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 10px 30px -10px rgba(30, 27, 75, 0.08);
      border: 1px solid #E2E8F0;
      background: white;
    }
    .company-header {
      background: linear-gradient(135deg, #1E1B4B 0%, #312E81 50%, #4338CA 100%);
      color: white;
      padding: 14px 22px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }
    .company-name-input {
      background: white;
      color: #1E1B4B;
      font-weight: 700;
      font-size: 1rem;
      border: 1.5px solid #C7D2FE;
      border-radius: 10px;
      padding: 7px 14px;
      width: 100%;
      max-width: 440px;
      outline: none;
    }
    .section-title {
      font-size: 1.05rem;
      font-weight: 700;
      color: #312E81;
      margin: 20px 0 10px 0;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .checklist-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 18px;
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
      cursor: pointer;
      accent-color: #4338CA;
    }
    .detail-input {
      width: 100%;
      padding: 6px 10px;
      border: 1px solid #CBD5E1;
      border-radius: 8px;
      outline: none;
    }
    .detail-input:focus {
      border-color: #4338CA;
    }
  `
];
const PAGE_SCRIPTS: string[] = [
  "../components/header.js",
  "../api/checklist.js"
];
const PAGE_BODY_HTML = `
  <!-- Header -->
  <div id="header-placeholder"></div>

  <!-- Main Content -->
  <main class="main-content max-w-[1200px] mx-auto py-8 px-4">

    <!-- Top Box Header (นโยบายใหม่: ยื่นได้ทีละ 1 บริษัท + Auto-suggest Master Data + Archive) -->
    <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
      <div class="flex items-center justify-between flex-wrap gap-4">
        <div class="flex items-start gap-3.5">
          <div style="width:48px; height:48px; border-radius:14px; background:linear-gradient(135deg,#1E1B4B,#4338CA); color:white; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
            <span class="material-icons text-2xl">playlist_add_check</span>
          </div>
          <div>
            <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
              <h1 class="text-xl font-bold text-slate-900" style="margin:0;">แบบสำรวจสถานประกอบการที่ต้องการยื่นฝึกงาน (Company Checklist)</h1>
              <span style="background:#EEF2FF; color:#4338CA; border:1px solid #C7D2FE; font-size:11.5px; font-weight:700; padding:2px 10px; border-radius:999px;">ยื่นขอฝึกงานได้ทีละ 1 แห่ง</span>
              <span style="background:#ECFDF5; color:#065F46; border:1px solid #A7F3D0; font-size:11.5px; font-weight:700; padding:2px 10px; border-radius:999px;">มี Auto-suggest จากฐานข้อมูลบริษัทกลาง</span>
            </div>
            <p class="text-xs text-slate-500 mt-1" style="margin-bottom:0;">
              นโยบายคณะ ICT: นิสิตยื่นขอฝึกงานได้ทีละ 1 แห่งให้อาจารย์ที่ปรึกษาพิจารณาอนุมัติก่อนออกหนังสือขอความอนุเคราะห์ (หากอาจารย์ไม่อนุมัติ หรือบริษัทปฏิเสธ ระบบจะปลดล็อกให้ยื่นบริษัทแห่งใหม่และเก็บข้อมูลเดิมใน Archive)
            </p>
          </div>
        </div>

        <!-- ปุ่มยื่นบริษัทใหม่ (แสดงเมื่อปลดล็อกหรือยังไม่มีบริษัทที่รออนุมัติ) -->
        <button type="button" id="add-company-btn" class="btn btn-success inline-flex items-center gap-2 px-5 py-2.5 text-white font-semibold rounded-xl shadow transition text-sm cursor-pointer border-none" style="display:none;">
          <span class="material-icons" style="font-size:18px;">add_circle</span>
          <span>ยื่นบริษัทแห่งใหม่ (ปลดล็อกแล้ว)</span>
        </button>
      </div>
    </div>

    <!-- Datalist สำหรับ Auto-suggest รายชื่อบริษัทจาก Master Data -->
    <datalist id="master-companies-datalist"></datalist>

    <!-- Datalist สำหรับเลือกจังหวัด -->
    <datalist id="provinces-datalist">
      <option value="กรุงเทพมหานคร"></option>
      <option value="เชียงใหม่"></option>
      <option value="พะเยา"></option>
      <option value="เชียงราย"></option>
      <option value="ลำปาง"></option>
      <option value="นนทบุรี"></option>
      <option value="ปทุมธานี"></option>
      <option value="สมุทรปราการ"></option>
      <option value="ชลบุรี"></option>
      <option value="ขอนแก่น"></option>
      <option value="นครราชสีมา"></option>
      <option value="สงขลา"></option>
      <option value="ภูเก็ต"></option>
      <option value="พิษณุโลก"></option>
    </datalist>

    <!-- Container สำหรับใส่กล่องบริษัทปัจจุบัน (ทีละ 1 แห่ง) -->
    <div id="companies-container">
      <div class="text-center py-10 text-gray-500 font-medium" id="loading-spinner">กำลังโหลดแบบฟอร์ม Checklist...</div>
    </div>

    <!-- ปุ่มยืนยันและบันทึกข้อมูล -->
    <div class="flex justify-center mt-8 mb-8">
      <button type="button" id="save-all-btn"
        class="btn btn-success inline-flex items-center justify-center gap-3 px-10 py-3.5 rounded-full text-white font-bold text-lg shadow-lg border-none cursor-pointer transition">
        <span class="material-icons text-2xl">check_circle</span>
        <span>ยืนยันและส่งให้อาจารย์ที่ปรึกษาตรวจสอบ</span>
      </button>
    </div>

    <!-- ส่วนแสดงประวัติบริษัทเดิมที่ไม่ผ่าน / บริษัทปฏิเสธ (Archive แบบย่อ) -->
    <div id="archived-companies-box" style="display:none; margin-bottom:32px; background:#F8FAFC; border:1px solid #E2E8F0; border-radius:16px; padding:16px 20px;">
      <div style="display:flex; align-items:center; gap:8px; margin-bottom:10px;">
        <span class="material-icons" style="color:#64748B; font-size:20px;">inventory_2</span>
        <h3 style="font-size:14px; font-weight:700; color:#334155; margin:0;">ประวัติการยื่นบริษัทเดิมที่ไม่ผ่าน / บริษัทปฏิเสธ (Archive แบบย่อ)</h3>
      </div>
      <div id="archived-companies-list" style="display:flex; flex-direction:column; gap:6px; font-size:12.5px; color:#475569;"></div>
    </div>

  </main>
`;

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
