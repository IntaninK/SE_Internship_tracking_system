"use client";

import React from "react";
import PageShell from "./PageShell";

const PAGE_TITLE = "Dashboard อาจารย์ที่ปรึกษา / อาจารย์นิเทศก์ - คณะ ICT ม.พะเยา";
const PAGE_STYLES: string[] = [];
const PAGE_SCRIPTS: string[] = [
  "../components/header.js",
  "../api/advisor_dashboard.js"
];
const PAGE_BODY_HTML = `
  <!-- Header Bar -->
  <div id="header-placeholder"></div>

  <!-- Main Content -->
  <main class="main-content dashboard-content">

    <!-- [REQ-10 & REQ-06] Top Role Header + Notification Alert Banner -->
    <section class="card" style="margin-bottom: 20px;">
      <div class="card-header" style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px;">
        <div style="display:flex; align-items:center; gap:10px;">
          <span class="material-icons header-icon">notifications_active</span>
          <div>
            <h2 class="card-title" id="advisor-dashboard-main-title" style="margin:0;">ระบบติดตามดูแลนิสิตฝึกงาน (เฉพาะนิสิตในความรับผิดชอบ)</h2>
            <p id="advisor-dashboard-subtitle" style="margin:2px 0 0 0; font-size:12px; color:#E0E7FF;">
              แจ้งเตือนสถานะ Checklist 3 บริษัท และการตรวจสอบความตรงกันของสถานที่ฝึกงานจริง
            </p>
          </div>
        </div>

        <!-- Mode Switcher: อาจารย์ที่ปรึกษา vs อาจารย์นิเทศก์ -->
        <div id="advisor-mode-switcher" style="display:none; background:rgba(255,255,255,0.14); padding:4px; border-radius:12px; border:1px solid rgba(255,255,255,0.22); gap:4px;">
          <button type="button" id="btn-mode-advisor" onclick="switchAdvisorViewMode('ADVISOR')"
            style="padding:6px 14px; border-radius:9px; font-size:12px; font-weight:700; border:none; cursor:pointer; background:#FFFFFF; color:#1E1B4B; display:inline-flex; align-items:center; gap:5px;">
            <span class="material-icons" style="font-size:15px;">supervisor_account</span>
            <span>นิสิตในที่ปรึกษา (Advisees)</span>
          </button>
          <button type="button" id="btn-mode-supervisor" onclick="switchAdvisorViewMode('SUPERVISOR')"
            style="padding:6px 14px; border-radius:9px; font-size:12px; font-weight:600; border:none; cursor:pointer; background:transparent; color:#FFFFFF; display:inline-flex; align-items:center; gap:5px;">
            <span class="material-icons" style="font-size:15px;">explore</span>
            <span>นิสิตในการนิเทศ (Supervised)</span>
          </button>
        </div>
      </div>

      <div class="card-body" style="padding:18px 24px !important;">
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(240px, 1fr)); gap:14px;" id="advisor-notification-cards">
          <!-- Card 1: Total Advisees -->
          <div style="background:#F8FAFC; border:1px solid #E2E8F0; border-radius:16px; padding:14px 18px; display:flex; align-items:center; justify-content:space-between;">
            <div>
              <div style="font-size:12px; font-weight:600; color:#64748B;">นิสิตในความดูแลทั้งหมด</div>
              <div style="font-size:26px; font-weight:800; color:#0F172A; margin-top:2px;" id="notif-total-advisees">0</div>
              <div style="font-size:11px; color:#64748B;">คน (เฉพาะที่รับผิดชอบ)</div>
            </div>
            <div style="width:44px; height:44px; border-radius:12px; background:#EEF2FF; color:#4338CA; display:flex; align-items:center; justify-content:center;">
              <span class="material-icons">groups</span>
            </div>
          </div>

          <!-- Card 2: Pending Checklist Review -->
          <div onclick="filterByAdvisorNotification('checklist_pending')" style="cursor:pointer; background:#FFFBEB; border:1px solid #FDE68A; border-radius:16px; padding:14px 18px; display:flex; align-items:center; justify-content:space-between; transition:transform 0.15s ease;" title="คลิกเพื่อกรองนิสิตที่รอตรวจ Checklist">
            <div>
              <div style="font-size:12px; font-weight:700; color:#92400E;">รอตรวจ Checklist (3 บริษัท)</div>
              <div style="font-size:26px; font-weight:800; color:#D97706; margin-top:2px;" id="notif-pending-checklist">0</div>
              <div style="font-size:11px; color:#B45309;">คลิกเพื่อกรองรายการที่รอตรวจ</div>
            </div>
            <div style="width:44px; height:44px; border-radius:12px; background:#FEF3C7; color:#D97706; display:flex; align-items:center; justify-content:center;">
              <span class="material-icons">fact_check</span>
            </div>
          </div>

          <!-- Card 3: Pending Placement Approval -->
          <div onclick="filterByAdvisorNotification('placement_pending')" style="cursor:pointer; background:#EFF6FF; border:1px solid #BFDBFE; border-radius:16px; padding:14px 18px; display:flex; align-items:center; justify-content:space-between; transition:transform 0.15s ease;" title="คลิกเพื่อกรองนิสิตที่รออนุมัติที่ฝึกงาน">
            <div>
              <div style="font-size:12px; font-weight:700; color:#1E40AF;">รออนุมัติสถานที่ฝึกงานจริง</div>
              <div style="font-size:26px; font-weight:800; color:#2563EB; margin-top:2px;" id="notif-pending-placement">0</div>
              <div style="font-size:11px; color:#1D4ED8;">นิสิตผ่านสัมภาษณ์และยื่นบริษัทแล้ว</div>
            </div>
            <div style="width:44px; height:44px; border-radius:12px; background:#DBEAFE; color:#2563EB; display:flex; align-items:center; justify-content:center;">
              <span class="material-icons">business</span>
            </div>
          </div>

          <!-- Card 4: [REQ-06] Mismatched Company Warning -->
          <div style="background:#FEF2F2; border:1px solid #FECACA; border-radius:16px; padding:14px 18px; display:flex; align-items:center; justify-content:space-between;" title="นิสิตยื่นบริษัทฝึกงานไม่ตรงกับใน Checklist 3 บริษัทที่อนุมัติ">
            <div>
              <div style="font-size:12px; font-weight:700; color:#991B1B;">⚠️ บริษัทไม่ตรง Checklist [REQ-06]</div>
              <div style="font-size:26px; font-weight:800; color:#DC2626; margin-top:2px;" id="notif-mismatch-placement">0</div>
              <div style="font-size:11px; color:#B91C1C;">ต้องตรวจสอบก่อนอนุมัติ</div>
            </div>
            <div style="width:44px; height:44px; border-radius:12px; background:#FEE2E2; color:#DC2626; display:flex; align-items:center; justify-content:center;">
              <span class="material-icons">warning_amber</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 1. สถานะภาพรวมทั้งหมดของนิสิตในที่ปรึกษา (2 กราฟวงกลม) -->
    <section class="card">
      <div class="card-header">
        <span class="material-icons header-icon">donut_large</span>
        <h2 class="card-title">สถานะภาพรวมทั้งหมดของนิสิตในความดูแล</h2>
      </div>
      <div class="card-body">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
          <div id="chart-checklist" class="flex flex-col items-center justify-center bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4"></div>
          <div id="chart-readiness" class="flex flex-col items-center justify-center bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4"></div>
        </div>
      </div>
    </section>

    <!-- 2. รายชื่อนิสิต -->
    <section class="card">
      <div class="card-header" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
        <div style="display:flex; align-items:center; gap:8px;">
          <span class="material-icons header-icon">people</span>
          <h2 class="card-title" id="advisor-table-title">รายชื่อนิสิตในที่ปรึกษา</h2>
          <span id="active-filter-badge" style="display:none; background:#FEF3C7; color:#B45309; font-size:12px; padding:2px 10px; border-radius:999px; font-weight:600;"></span>
        </div>
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          <button class="btn btn-sm" onclick="openBatchStatusModal()" style="background:rgba(255,255,255,0.18); color:white; border:1px solid rgba(255,255,255,0.3); font-size:12px; padding:6px 14px; border-radius:10px; cursor:pointer; display:inline-flex; align-items:center; gap:4px;">
            <span class="material-icons" style="font-size:15px;">edit_note</span> ตั้งสถานะนิสิต
          </button>
          <button class="btn btn-sm" onclick="exportStudents()" style="background:rgba(255,255,255,0.18); color:white; border:1px solid rgba(255,255,255,0.3); font-size:12px; padding:6px 14px; border-radius:10px; cursor:pointer; display:inline-flex; align-items:center; gap:4px;">
            <span class="material-icons" style="font-size:15px;">download</span> Export Excel/CSV
          </button>
        </div>
      </div>
      <div class="card-body">

        <!-- Filter & Search Bar -->
        <div class="filter-bar" style="display:flex; flex-wrap:wrap; gap:10px; align-items:center; margin-bottom:16px;">
          <div style="position:relative; flex:1; min-width:200px; max-width:280px;">
            <span class="material-icons" style="position:absolute; left:10px; top:50%; transform:translateY(-50%); color:#94A3B8; font-size:18px;">search</span>
            <input type="text" class="input-field" id="student-search" placeholder="ค้นหารหัสนิสิต หรือ ชื่อ..." style="padding-left:34px !important; width:100%; font-size:13px;" />
          </div>

          <select id="year-filter" class="input-field" style="width:auto; min-width:120px; font-size:13px; padding:7px 12px; cursor:pointer;">
            <option value="">ทุกชั้นปี</option>
          </select>

          <select id="semester-filter" class="input-field" style="width:auto; min-width:125px; font-size:13px; padding:7px 12px; cursor:pointer;">
            <option value="">ทุกภาคเรียน</option>
            <option value="1">ภาคเรียนที่ 1</option>
            <option value="2" selected>ภาคเรียนที่ 2</option>
            <option value="SUMMER">ภาคฤดูร้อน</option>
          </select>

          <select id="status-filter" class="input-field" style="width:auto; min-width:175px; font-size:13px; padding:7px 12px; cursor:pointer;">
            <option value="">ทุกสถานะ</option>
            <optgroup label="📄 1. ตรวจเรซูเม่ (CV)">
              <option value="cv_pending">⏳ ยังไม่ได้รีวิว CV</option>
              <option value="cv_approved">🟢 ตรวจ CV ผ่าน</option>
              <option value="cv_rejected">🔴 ไม่ผ่าน CV</option>
            </optgroup>
            <optgroup label="🏢 2. Checklist สถานประกอบการ">
              <option value="checklist_pending">⏳ รอตรวจ Checklist</option>
              <option value="checklist_approved">🟢 Checklist ผ่าน (รีวิวแล้ว)</option>
              <option value="checklist_rejected">🔴 ไม่ผ่าน / ทำเพิ่ม</option>
            </optgroup>
            <optgroup label="🎓 3. ชั่วโมงอบรมเตรียมความพร้อม">
              <option value="training_incomplete">⏳ อบรมยังไม่ครบ</option>
              <option value="training_passed">🟢 อบรมครบ 30 ชม.</option>
            </optgroup>
            <optgroup label="💼 4. ที่ฝึกงาน">
              <option value="placement_approved">🟢 อนุมัติที่ฝึกงานแล้ว</option>
            </optgroup>
          </select>

          <select id="skill-filter" class="input-field" style="width:auto; min-width:160px; font-size:13px; padding:7px 12px; cursor:pointer;">
            <option value="">ทุกสถานะชั่วโมงอบรม</option>
            <option value="pass_all">🟢 ผ่านเกณฑ์ครบ (Soft+Hard)</option>
            <option value="lack_soft">⚠️ ขาด Soft Skill (&lt; 12 ชม.)</option>
            <option value="lack_hard">⚠️ ขาด Hard Skill (&lt; 18 ชม.)</option>
            <option value="lack_both">⚠️ ขาดทั้ง Soft &amp; Hard</option>
          </select>

          <select id="sort-by" class="input-field" style="width:auto; min-width:165px; font-size:13px; padding:7px 12px; cursor:pointer; font-weight:500;">
            <option value="critical" selected>🚨 เรียง: วิกฤตสุด ➔ เบาสุด</option>
            <option value="studentCode_desc">🔢 เรียง: รหัสนิสิต (มาก ➔ น้อย)</option>
            <option value="studentCode_asc">🔤 เรียง: รหัสนิสิต (น้อย ➔ มาก)</option>
            <option value="name_asc">👤 เรียง: ชื่อ-นามสกุล (ก-ฮ)</option>
          </select>

          <button id="btn-clear-filter" onclick="clearAllFilters()" style="display:none; background:#EF4444; color:white; border:none; font-size:12px; padding:7px 12px; border-radius:10px; cursor:pointer; align-items:center; gap:4px; font-weight:600;">
            <span class="material-icons" style="font-size:14px;">close</span> ล้างตัวกรอง
          </button>
        </div>

        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 14%;">รหัสนิสิต</th>
              <th style="width: 20%;">ชื่อ-นามสกุล</th>
              <th style="width: 17%;">สาขาวิชา</th>
              <th style="width: 17%;">อาจารย์ที่ปรึกษา</th>
              <th style="width: 22%;">สถานะ Checklist &amp; การตรวจสอบ [REQ-06]</th>
              <th style="width: 10%; min-width: 100px;" class="text-center">
                <label style="display:inline-flex;align-items:center;gap:4px;cursor:pointer;white-space:nowrap;" title="เลือกนิสิตทั้งหมดในหน้านี้">
                  <span style="font-size:12px;">เลือกทั้งหมด</span>
                  <input type="checkbox" id="select-all-students" style="width:16px;height:16px;cursor:pointer;" />
                </label>
              </th>
            </tr>
          </thead>
          <tbody id="students-tbody">
            <tr><td colspan="5" class="text-center py-8 text-gray-400">กำลังโหลดข้อมูล...</td></tr>
          </tbody>
        </table>

        <!-- Pagination -->
        <div class="flex justify-between items-center mt-4 text-xs text-gray-500">
          <span id="pagination-info">Showing 1-12 from 0 data</span>
          <div class="flex gap-1" id="pagination-controls"></div>
        </div>

      </div>
    </section>

    <!-- Modal: ตั้งสถานะนิสิต (อาจารย์ที่ปรึกษา) -->
    <div id="batch-status-modal" style="display:none; position:fixed; inset:0; background:rgba(15,23,42,0.55); z-index:1000; justify-content:center; align-items:center; backdrop-filter:blur(4px);">
      <div style="background:white; border-radius:20px; padding:24px 28px; width:440px; max-width:92%; box-shadow:0 20px 50px rgba(15,23,42,0.25);">
        <h3 style="font-size:17px; font-weight:700; margin-bottom:16px; color:#1E293B;">ตั้งสถานะนิสิต (อาจารย์ที่ปรึกษา)</h3>
        <div style="margin-bottom:12px;">
          <label style="font-size:13px; font-weight:600; color:#475569;">ประเภทสถานะ</label>
          <select id="batch-status-type" class="input-field" style="margin-top:4px;" onchange="onBatchTypeChange()">
            <option value="checklist">สถานะ Checklist</option>
            <option value="placement">สถานะอนุมัติที่ฝึกงาน</option>
          </select>
        </div>
        <div style="margin-bottom:12px;">
          <label style="font-size:13px; font-weight:600; color:#475569;">ค่าสถานะ</label>
          <select id="batch-status-select" class="input-field" style="margin-top:4px;">
            <option value="APPROVED">✓ อาจารย์รีวิวแล้ว (ผ่าน)</option>
            <option value="PENDING">☐ รอผล</option>
            <option value="REJECTED">✗ ไม่ผ่าน / ทำ checklist เพิ่ม</option>
          </select>
        </div>
        <div style="margin-bottom:16px;">
          <label style="font-size:13px; font-weight:600; color:#475569;">หมายเหตุ (ถ้ามี)</label>
          <input type="text" id="batch-status-note" class="input-field" placeholder="หมายเหตุ..." style="margin-top:4px;" />
        </div>
        <div style="display:flex; justify-content:flex-end; gap:8px;">
          <button class="btn btn-outline btn-sm" onclick="closeBatchStatusModal()">ยกเลิก</button>
          <button class="btn btn-primary btn-sm" onclick="submitAdvisorBatchStatus()">ยืนยัน</button>
        </div>
      </div>
    </div>

    <!-- Modal: เลือกรูปแบบการ Export Excel/CSV -->
    <div id="export-modal" style="display:none; position:fixed; inset:0; background:rgba(15,23,42,0.55); z-index:1000; justify-content:center; align-items:center; backdrop-filter:blur(4px);">
      <div style="background:white; border-radius:20px; width:480px; max-width:92%; box-shadow:0 20px 50px rgba(15,23,42,0.25); overflow:hidden;">
        <div style="background:linear-gradient(135deg, #1E1B4B 0%, #4338CA 100%); padding:18px 24px; color:white; display:flex; align-items:center; justify-content:space-between;">
          <div style="display:flex; align-items:center; gap:10px;">
            <span class="material-icons" style="font-size:22px;">file_download</span>
            <h3 style="font-size:16px; font-weight:700; margin:0;">ส่งออกข้อมูลนิสิต (Export CSV / Excel)</h3>
          </div>
          <button onclick="closeExportModal()" style="background:none; border:none; color:white; cursor:pointer; display:flex; align-items:center; opacity:0.85;">
            <span class="material-icons" style="font-size:20px;">close</span>
          </button>
        </div>

        <div style="padding:20px 24px;">
          <p style="font-size:13px; color:#475569; margin-bottom:14px; font-weight:500;">กรุณาเลือกขอบเขตข้อมูลนิสิตที่ต้องการส่งออก:</p>

          <div style="display:flex; flex-direction:column; gap:10px;">
            <label id="export-opt-filtered-label" style="display:flex; align-items:flex-start; gap:12px; padding:12px 14px; border:2px solid #4338CA; background:#EEF2FF; border-radius:12px; cursor:pointer; transition:all 0.15s;">
              <input type="radio" name="export-scope" value="filtered" id="export-scope-filtered" checked onchange="updateExportSummary()" style="margin-top:3px; width:16px; height:16px; accent-color:#4338CA; cursor:pointer;" />
              <div style="flex:1;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <span style="font-size:13.5px; font-weight:700; color:#1E293B;">ตามตัวกรองปัจจุบัน (Filtered)</span>
                  <span id="export-count-filtered" style="font-size:11px; font-weight:700; background:#DBEAFE; color:#1D4ED8; padding:2px 8px; border-radius:999px;">0 รายการ</span>
                </div>
                <p style="font-size:12px; color:#64748B; margin:3px 0 0 0;">ส่งออกเฉพาะรายชื่อที่ตรงกับตัวกรอง ชั้นปี สถานะ หรือคำค้นหาปัจจุบัน</p>
              </div>
            </label>

            <label id="export-opt-selected-label" style="display:flex; align-items:flex-start; gap:12px; padding:12px 14px; border:2px solid #E2E8F0; background:#FFFFFF; border-radius:12px; cursor:pointer; transition:all 0.15s;">
              <input type="radio" name="export-scope" value="selected" id="export-scope-selected" onchange="updateExportSummary()" style="margin-top:3px; width:16px; height:16px; accent-color:#4338CA; cursor:pointer;" />
              <div style="flex:1;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <span style="font-size:13.5px; font-weight:700; color:#1E293B;">เฉพาะนิสิตที่ติ๊กเลือก (Selected)</span>
                  <span id="export-count-selected" style="font-size:11px; font-weight:700; background:#F1F5F9; color:#475569; padding:2px 8px; border-radius:999px;">0 รายการ</span>
                </div>
                <p id="export-selected-desc" style="font-size:12px; color:#64748B; margin:3px 0 0 0;">ส่งออกเฉพาะรายชื่อที่คุณติ๊กถูกในช่อง Checkbox ของตาราง</p>
              </div>
            </label>

            <label id="export-opt-all-label" style="display:flex; align-items:flex-start; gap:12px; padding:12px 14px; border:2px solid #E2E8F0; background:#FFFFFF; border-radius:12px; cursor:pointer; transition:all 0.15s;">
              <input type="radio" name="export-scope" value="all" id="export-scope-all" onchange="updateExportSummary()" style="margin-top:3px; width:16px; height:16px; accent-color:#4338CA; cursor:pointer;" />
              <div style="flex:1;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <span style="font-size:13.5px; font-weight:700; color:#1E293B;">นิสิตในความดูแลทั้งหมด (All Advisees)</span>
                  <span id="export-count-all" style="font-size:11px; font-weight:700; background:#F1F5F9; color:#475569; padding:2px 8px; border-radius:999px;">0 รายการ</span>
                </div>
                <p style="font-size:12px; color:#64748B; margin:3px 0 0 0;">ส่งออกข้อมูลนิสิตในที่ปรึกษาทั้งหมดโดยไม่สนใจตัวกรอง</p>
              </div>
            </label>
          </div>

          <div style="margin-top:14px; padding:10px 14px; background:#F8FAFC; border:1px solid #E2E8F0; border-radius:10px; display:flex; align-items:center; gap:8px;">
            <span class="material-icons" style="font-size:18px; color:#4338CA;">info</span>
            <span id="export-summary-text" style="font-size:12px; color:#334155; font-weight:500;">เตรียมส่งออกข้อมูลนิสิต 0 รายการ</span>
          </div>
        </div>

        <div style="padding:14px 24px; background:#F8FAFC; border-top:1px solid #E2E8F0; display:flex; justify-content:flex-end; gap:8px;">
          <button class="btn btn-outline btn-sm" onclick="closeExportModal()" style="border-radius:10px;">ยกเลิก</button>
          <button id="btn-confirm-export" class="btn btn-primary btn-sm" onclick="confirmExport()" style="border-radius:10px; display:inline-flex; align-items:center; gap:6px; padding:8px 16px;">
            <span class="material-icons" style="font-size:16px;">download</span> ดาวน์โหลดไฟล์ CSV
          </button>
        </div>
      </div>
    </div>

  </main>
`;

export default function AdvisorDashboardPage() {
  return (
    <PageShell
      pageKey="dashboard_ที่ปรึกษา"
      title={PAGE_TITLE}
      styles={PAGE_STYLES}
      scripts={PAGE_SCRIPTS}
      bodyHtml={PAGE_BODY_HTML}
    />
  );
}
