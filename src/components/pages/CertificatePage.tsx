"use client";

import React from "react";
import PageShell from "./PageShell";

const PAGE_TITLE = "อัปโหลดหลักฐานชั่วโมงเตรียมความพร้อม (Hard / Soft Skill) - คณะ ICT ม.พะเยา";
const PAGE_STYLES: string[] = [];
const PAGE_SCRIPTS: string[] = [
  "../components/header.js",
  "../api/certificate.js"
];
const PAGE_BODY_HTML = `
  <!-- ==================== HEADER BAR ==================== -->
  <div id="header-placeholder"></div>

  <!-- ==================== MAIN CONTENT ==================== -->
  <main class="main-content">

    <div class="card">
      <!-- Card Header -->
      <div class="card-header" style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px;">
        <div style="display:flex; align-items:center; gap:10px;">
          <span class="material-icons header-icon">workspace_premium</span>
          <div>
            <h1 class="card-title" style="margin:0;">อัปโหลดหลักฐานการอบรมเตรียมความพร้อม (Soft Skill / Hard Skill)</h1>
            <p style="margin:2px 0 0 0; font-size:11.5px; color:#E0E7FF;">เกณฑ์ขั้นต่ำก่อนออกฝึกงาน: Soft Skill ≥ 12 ชม. และ Hard Skill ≥ 18 ชม. (รวม ≥ 30 ชม.)</p>
          </div>
        </div>
      </div>

      <!-- Card Body -->
      <div class="card-body flex flex-col items-center gap-5">

        <!-- Upload Zone -->
        <div class="upload-zone upload-zone--file w-full max-w-[820px]" id="dropZone" style="position: relative; min-height: 170px; display: flex; flex-direction: column; align-items: center; justify-content: center; border: 2px dashed #94A3B8; border-radius: 16px; padding: 20px; background:#F8FAFC;">

          <!-- Default upload content -->
          <div id="upload-prompt" class="flex flex-col items-center gap-1">
            <span class="material-icons text-4xl text-indigo-600">cloud_upload</span>
            <p class="text-center text-slate-600 text-sm font-medium">
              ลากไฟล์ใบเกียรติบัตร (Certificate) มาวางที่นี่ หรือคลิกปุ่มด้านล่าง<br />
              <span class="text-xs text-slate-400">รองรับ PDF, JPG, PNG ขนาดไม่เกิน 10MB</span>
            </p>
          </div>

          <!-- Preview Container -->
          <div id="cert-preview-box" style="display: none; width: 100%; max-height: 200px; justify-content: center; align-items: center; overflow: hidden; margin-bottom: 10px;">
            <img id="cert-preview-img" src="" alt="Certificate Preview" style="max-width: 100%; max-height: 180px; object-fit: contain; border-radius: 8px; border: 1px solid #CBD5E1;" />
            <div id="cert-preview-pdf" style="display: none; align-items: center; gap: 8px; font-weight: 600; color: #DC2626;">
              <span class="material-icons text-4xl">picture_as_pdf</span>
              <span id="cert-pdf-name">file.pdf</span>
            </div>
          </div>

          <label class="btn btn-primary inline-flex items-center justify-center gap-2 px-5 py-2 rounded-full text-white font-semibold text-xs cursor-pointer transition mt-2">
            <span class="material-icons" style="font-size:16px;">folder_open</span>
            <span>เลือกไฟล์หลักฐาน (Browse Files)</span>
            <input type="file" id="cert-file" accept="image/*,.pdf" class="hidden" />
          </label>
        </div>

        <!-- Form Row: ประเภท + จำนวน -->
        <div class="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 w-full mt-1">

          <!-- หัวข้ออบรม -->
          <div class="flex items-center gap-2">
            <label class="text-slate-700 text-sm font-bold whitespace-nowrap">หัวข้อการอบรม / กิจกรรม</label>
            <input type="text" id="cert-title" placeholder="เช่น อบรม Software Testing / Hackathon" class="input-field w-[280px]" />
          </div>

          <!-- ประเภทของใบอบรม -->
          <div class="flex items-center gap-2">
            <label class="text-slate-700 text-sm font-bold whitespace-nowrap">ประเภททักษะ</label>
            <select id="cert-skill-type" class="input-field w-[160px]">
              <option value="soft">Soft Skill</option>
              <option value="hard">Hard Skill</option>
            </select>
          </div>

          <!-- จำนวนชั่วโมง -->
          <div class="flex items-center gap-2">
            <label class="text-slate-700 text-sm font-bold whitespace-nowrap">จำนวน</label>
            <input type="number" id="cert-hours" min="1" value="6" class="input-field w-[85px] text-center font-bold" />
            <span class="text-slate-600 text-sm font-semibold">ชั่วโมง</span>
          </div>
        </div>

        <!-- ปุ่มเพิ่มข้อมูล -->
        <button type="button" id="add-cert-btn"
          class="btn btn-success inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full text-white font-semibold text-sm border-none cursor-pointer transition mt-1">
          <span class="material-icons text-lg">add_circle</span>
          <span>บันทึกและเพิ่มรายการอบรม</span>
        </button>

      </div>
    </div>

    <!-- ปุ่มยืนยันและกลับหน้าหลัก -->
    <div class="flex justify-center mt-5 mb-6">
      <button type="button" id="submit-and-return-btn"
        class="btn btn-primary inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full text-white font-bold text-base shadow-lg border-none cursor-pointer transition">
        <span class="material-icons">arrow_back</span>
        <span>เสร็จสิ้นและกลับหน้าจัดการข้อมูลฝึกงาน</span>
      </button>
    </div>

  </main>
`;

export default function CertificatePage() {
  return (
    <PageShell
      pageKey="Certificate"
      title={PAGE_TITLE}
      styles={PAGE_STYLES}
      scripts={PAGE_SCRIPTS}
      bodyHtml={PAGE_BODY_HTML}
    />
  );
}
