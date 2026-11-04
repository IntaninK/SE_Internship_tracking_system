"use client";

import React from "react";
import PageShell from "./PageShell";

const PAGE_TITLE = "Super Admin (พี่จอม) & อาจารย์ประจำวิชา - คณะ ICT ม.พะเยา";
const PAGE_STYLES: string[] = [];
const PAGE_SCRIPTS: string[] = [
  "../components/header.js",
  "../api/admin_dashboard.js"
];
const PAGE_BODY_HTML = `
  <!-- Header Bar -->
  <div id="header-placeholder"></div>

  <!-- Main Content -->
  <main class="main-content">

    <!-- Top Scope & Super Admin Banner -->
    <section class="card" style="margin-bottom: 16px;">
      <div class="card-header" style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px;">
        <div style="display:flex; align-items:center; gap:12px;">
          <span class="material-icons header-icon" style="font-size:28px;">admin_panel_settings</span>
          <div>
            <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
              <h2 class="card-title" id="admin-scope-banner-title" style="margin:0;">ระบบบริหารจัดการเตรียมความพร้อมฝึกงานและสหกิจศึกษา คณะ ICT ม.พะเยา</h2>
              <span style="background:rgba(251,191,36,0.22); color:#FDE68A; border:1px solid rgba(251,191,36,0.45); font-size:11px; font-weight:700; padding:2px 10px; border-radius:999px;">Super Admin (พี่จอม) &amp; Course Admin</span>
            </div>
            <p id="admin-scope-banner-sub" style="margin:3px 0 0 0; font-size:12px; color:#E0E7FF;">
              ศูนย์กลางบริหารจัดการระดับคณะ: นำเข้าข้อมูล REG/UP Academy • ปลดล็อกรอบฝึกงาน 8 สาขา • สร้างกิจกรรม Check-in • ฐานข้อมูลบริษัทกลาง • ออกหนังสือราชการ &amp; ส่งต่อระบบ Co-op พี่แดง
            </p>
          </div>
        </div>
        <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
          <button id="btn-manage-staff-roles" onclick="openStaffRolesModal()" style="background:rgba(255,255,255,0.16); color:white; border:1px solid rgba(255,255,255,0.3); font-size:12px; font-weight:600; padding:7px 14px; border-radius:10px; cursor:pointer; display:inline-flex; align-items:center; gap:6px;">
            <span class="material-icons" style="font-size:16px;">manage_accounts</span>
            <span>จัดการสิทธิ์บุคลากร (Multi-Role)</span>
          </button>
        </div>
      </div>

      <!-- Super Admin 6-Module Workspace Navigation Bar -->
      <div style="background:#FFFFFF; padding:12px 20px; border-top:1px solid #E2E8F0; display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
        <button type="button" id="ws-tab-overview" onclick="switchAdminWorkspace('overview')"
          style="display:inline-flex; align-items:center; gap:6px; padding:8px 14px; border-radius:11px; font-size:12.5px; font-weight:700; cursor:pointer; border:1px solid #4338CA; background:#EEF2FF; color:#312E81; transition:all 0.15s;">
          <span class="material-icons" style="font-size:17px;">dashboard</span>
          <span>1. ภาพรวม &amp; รายชื่อนิสิต (REG)</span>
        </button>

        <button type="button" id="ws-tab-unlock" onclick="switchAdminWorkspace('unlock')"
          style="display:inline-flex; align-items:center; gap:6px; padding:8px 14px; border-radius:11px; font-size:12.5px; font-weight:600; cursor:pointer; border:1px solid #E2E8F0; background:#F8FAFC; color:#475569; transition:all 0.15s;">
          <span class="material-icons" style="font-size:17px;">lock_open</span>
          <span>2. รอบฝึกงาน &amp; ปลดล็อก 8 สาขา</span>
          <span id="badge-unlocked-majors" style="background:#DBEAFE; color:#1E40AF; font-size:10.5px; font-weight:700; padding:1px 7px; border-radius:999px;">4/8 เปิด</span>
        </button>

        <button type="button" id="ws-tab-events" onclick="switchAdminWorkspace('events')"
          style="display:inline-flex; align-items:center; gap:6px; padding:8px 14px; border-radius:11px; font-size:12.5px; font-weight:600; cursor:pointer; border:1px solid #E2E8F0; background:#F8FAFC; color:#475569; transition:all 0.15s;">
          <span class="material-icons" style="font-size:17px;">qr_code_scanner</span>
          <span>3. กิจกรรมอบรม &amp; Check-in รหัสนิสิต</span>
          <span id="badge-events-count" style="background:#D1FAE5; color:#065F46; font-size:10.5px; font-weight:700; padding:1px 7px; border-radius:999px;">2 กิจกรรม</span>
        </button>

        <button type="button" id="ws-tab-companies" onclick="switchAdminWorkspace('companies')"
          style="display:inline-flex; align-items:center; gap:6px; padding:8px 14px; border-radius:11px; font-size:12.5px; font-weight:600; cursor:pointer; border:1px solid #E2E8F0; background:#F8FAFC; color:#475569; transition:all 0.15s;">
          <span class="material-icons" style="font-size:17px;">business</span>
          <span>4. ฐานข้อมูลบริษัทกลาง (Master Data)</span>
          <span id="badge-pending-companies" style="background:#FEF3C7; color:#B45309; font-size:10.5px; font-weight:700; padding:1px 7px; border-radius:999px;">0 รอยืนยัน</span>
        </button>

        <button type="button" id="ws-tab-documents" onclick="switchAdminWorkspace('documents')"
          style="display:inline-flex; align-items:center; gap:6px; padding:8px 14px; border-radius:11px; font-size:12.5px; font-weight:600; cursor:pointer; border:1px solid #E2E8F0; background:#F8FAFC; color:#475569; transition:all 0.15s;">
          <span class="material-icons" style="font-size:17px;">description</span>
          <span>5. ออกหนังสือราชการ &amp; ใบตอบรับ</span>
          <span id="badge-doc-queue" style="background:#FEE2E2; color:#B91C1C; font-size:10.5px; font-weight:700; padding:1px 7px; border-radius:999px;">0 รายการ</span>
        </button>

        <button type="button" id="ws-tab-coop" onclick="switchAdminWorkspace('coop')"
          style="display:inline-flex; align-items:center; gap:6px; padding:8px 14px; border-radius:11px; font-size:12.5px; font-weight:600; cursor:pointer; border:1px solid #E2E8F0; background:#F8FAFC; color:#475569; transition:all 0.15s;">
          <span class="material-icons" style="font-size:17px;">cloud_upload</span>
          <span>6. ส่งต่อระบบ Co-op พี่แดง (Co-op 01)</span>
        </button>
      </div>
    </section>

    <!-- =====================================================================
         WORKSPACE 1: ภาพรวม & รายชื่อนิสิต (Overview, REG Import & Student Management)
         ===================================================================== -->
    <div id="workspace-overview">
      <!-- 1. สถานะภาพรวมทั้งหมดของนิสิต (4 กราฟวงกลม) -->
      <section class="card">
        <div class="card-header">
          <span class="material-icons header-icon">donut_large</span>
          <h2 class="card-title">สถานะภาพรวมทั้งหมดของนิสิต (คลิกที่รายการเพื่อกรองข้อมูล)</h2>
        </div>
        <div class="card-body">
          <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 items-stretch">
            <div id="chart-readiness"></div>
            <div id="chart-training"></div>
            <div id="chart-cv"></div>
            <div id="chart-placement"></div>
          </div>
        </div>
      </section>

      <!-- 2. รายชื่อนิสิต -->
      <section class="card">
        <div class="card-header" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
          <div style="display:flex; align-items:center; gap:8px;">
            <span class="material-icons header-icon">people</span>
            <h2 class="card-title">รายชื่อนิสิตและการตรวจสอบความพร้อม</h2>
            <span id="active-filter-badge" style="display:none; background:#FEF3C7; color:#B45309; font-size:12px; padding:2px 10px; border-radius:999px; font-weight:600;"></span>
          </div>

          <!-- ปุ่มจัดการสำหรับแท็บนิสิตปกติ (Active) -->
          <div id="active-action-buttons" style="display:flex; gap:6px; flex-wrap:wrap;">
            <button id="btn-import-student" class="btn btn-sm" onclick="openImportModal()" style="background:#10B981; color:white; border:1px solid #059669; font-size:12px; padding:6px 13px; border-radius:10px; cursor:pointer; display:inline-flex; align-items:center; gap:4px; font-weight:600;">
              <span class="material-icons" style="font-size:15px;">upload_file</span> นำเข้ารายชื่อ REG &amp; UP Academy (Excel)
            </button>
            <button id="btn-set-status" class="btn btn-sm" onclick="openSetStatusModal()" style="background:rgba(255,255,255,0.18); color:white; border:1px solid rgba(255,255,255,0.3); font-size:12px; padding:6px 12px; border-radius:10px; cursor:pointer;">
              ตั้งสถานะนิสิต
            </button>
            <button id="btn-set-advisor" class="btn btn-sm" onclick="openSetAdvisorModal()" style="background:rgba(255,255,255,0.18); color:white; border:1px solid rgba(255,255,255,0.3); font-size:12px; padding:6px 12px; border-radius:10px; cursor:pointer;">
              ตั้งอาจารย์ที่ปรึกษา
            </button>
            <button id="btn-set-supervisor" class="btn btn-sm" onclick="openSetSupervisorModal()" style="background:rgba(255,255,255,0.18); color:white; border:1px solid rgba(255,255,255,0.3); font-size:12px; padding:6px 12px; border-radius:10px; cursor:pointer; display:inline-flex; align-items:center; gap:4px;">
              <span class="material-icons" style="font-size:14px;">explore</span> ตั้งอาจารย์นิเทศก์
            </button>
            <button id="btn-drop-student" class="btn btn-sm" onclick="openDropStudentModal()" style="background:#EF4444; color:white; border:1px solid #DC2626; font-size:12px; padding:6px 12px; border-radius:10px; cursor:pointer; display:inline-flex; align-items:center; gap:4px;">
              <span class="material-icons" style="font-size:14px;">person_remove</span> ดรอปนิสิต
            </button>
            <button class="btn btn-sm" onclick="exportStudents()" style="background:rgba(255,255,255,0.18); color:white; border:1px solid rgba(255,255,255,0.3); font-size:12px; padding:6px 12px; border-radius:10px; cursor:pointer;">
              Export Excel/CSV
            </button>
          </div>

          <!-- ปุ่มจัดการสำหรับแท็บนิสิตที่ดรอป (Dropped) -->
          <div id="dropped-action-buttons" style="display:none; gap:8px; flex-wrap:wrap;">
            <button id="btn-restore-student" class="btn btn-sm" onclick="openRestoreStudentModal()" style="background:#10B981; color:white; border:1px solid #059669; font-size:12px; padding:6px 14px; border-radius:10px; cursor:pointer; display:inline-flex; align-items:center; gap:4px;">
              <span class="material-icons" style="font-size:14px;">restore</span> กู้คืนสถานะนิสิต
            </button>
            <button class="btn btn-sm" onclick="exportStudents()" style="background:rgba(255,255,255,0.18); color:white; border:1px solid rgba(255,255,255,0.3); font-size:12px; padding:6px 14px; border-radius:10px; cursor:pointer;">
              Export รายชื่อที่ดรอป
            </button>
          </div>
        </div>
        <div class="card-body">

          <!-- Tab สลับมุมมอง: นิสิตปกติ vs นิสิตที่ดรอป -->
          <div style="display:flex; gap:8px; margin-bottom:16px; border-bottom:1px solid #E2E8F0; padding-bottom:12px;">
            <button id="tab-active" onclick="switchStudentTab('active')" class="tab-pill px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 bg-white text-blue-700 shadow-sm cursor-pointer border border-blue-200">
              <span class="material-icons" style="font-size:16px;">check_circle</span>
              นิสิตกำลังศึกษา / ฝึกงาน
              <span id="tab-badge-active" class="px-2 py-0.5 text-[11px] rounded-full bg-blue-100 text-blue-800 font-bold">0</span>
            </button>
            <button id="tab-dropped" onclick="switchStudentTab('dropped')" class="tab-pill px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 text-gray-500 hover:text-gray-800 cursor-pointer border border-transparent bg-transparent">
              <span class="material-icons" style="font-size:16px;">remove_circle_outline</span>
              นิสิตที่ดรอป / ถอนรายวิชา
              <span id="tab-badge-dropped" class="px-2 py-0.5 text-[11px] rounded-full bg-red-100 text-red-700 font-bold">0</span>
            </button>
          </div>

          <!-- Filter & Search Bar (รองรับ 8 สาขาวิชาของคณะ ICT) -->
          <div class="filter-bar" style="display:flex; flex-wrap:wrap; gap:10px; align-items:center; margin-bottom:16px;">
            <div style="position:relative; flex:1; min-width:190px; max-width:250px;">
              <span class="material-icons" style="position:absolute; left:10px; top:50%; transform:translateY(-50%); color:#94A3B8; font-size:18px;">search</span>
              <input type="text" class="input-field" id="student-search" placeholder="ค้นหารหัสนิสิต หรือ ชื่อ..." style="padding-left:34px !important; width:100%; font-size:13px;" />
            </div>

            <select id="major-filter" class="input-field" style="width:auto; min-width:170px; font-size:13px; padding:7px 12px; cursor:pointer;">
              <option value="ALL">ทุกสาขาวิชา (คณะ ICT)</option>
              <option value="วิศวกรรมซอฟต์แวร์">สาขาวิศวกรรมซอฟต์แวร์ (SE)</option>
              <option value="ธุรกิจดิจิทัล">สาขาธุรกิจดิจิทัล (DB)</option>
              <option value="วิทยาการคอมพิวเตอร์">สาขาวิทยาการคอมพิวเตอร์ (CS)</option>
              <option value="เทคโนโลยีสารสนเทศ">สาขาเทคโนโลยีสารสนเทศ (IT)</option>
              <option value="วิศวกรรมคอมพิวเตอร์">สาขาวิศวกรรมคอมพิวเตอร์ (CPE)</option>
              <option value="คอมพิวเตอร์กราฟิกและมัลติมีเดีย">สาขาคอมพิวเตอร์กราฟิกฯ (CGM)</option>
              <option value="ภูมิสารสนเทศศาสตร์">สาขาภูมิสารสนเทศศาสตร์ (GIS)</option>
              <option value="วิทยาการข้อมูลและการประยุกต์">สาขาวิทยาการข้อมูลฯ (DSA)</option>
            </select>

            <select id="year-filter" class="input-field" style="width:auto; min-width:115px; font-size:13px; padding:7px 12px; cursor:pointer;">
              <option value="">ทุกชั้นปี</option>
            </select>

            <select id="status-filter" class="input-field" style="width:auto; min-width:150px; font-size:13px; padding:7px 12px; cursor:pointer;">
              <option value="">ทุกสถานะ</option>
              <option value="training_passed">✓ ผ่านการตรวจชม.ครบ</option>
              <option value="training_not_checked">⏳ ชม.ครบ ยังไม่ตรวจ</option>
              <option value="training_failed">✗ ตรวจแล้ว ยังไม่ผ่าน</option>
              <option value="training_incomplete">⏳ ชั่วโมงยังไม่ครบ</option>
              <option value="cv_approved">✓ ตรวจCVผ่าน</option>
              <option value="cv_pending">⏳ ยังไม่ได้รีวิว CV</option>
              <option value="cv_rejected">✗ ไม่ผ่าน CV</option>
              <option value="cv_none">— ยังไม่ทำ CV</option>
              <option value="checklist_approved">✓ Checklist ผ่าน</option>
              <option value="checklist_pending">⏳ รอตรวจ Checklist</option>
              <option value="interview_passed">✓ สัมภาษณ์ผ่านแล้ว</option>
              <option value="placement_approved">✓ อนุมัติที่ฝึกงานแล้ว</option>
              <option value="placement_pending">⏳ รออนุมัติที่ฝึกงาน</option>
              <option value="placement_rejected">✗ ไม่อนุมัติที่ฝึกงาน</option>
            </select>

            <select id="advisor-filter" class="input-field" style="width:auto; min-width:145px; font-size:13px; padding:7px 12px; cursor:pointer;">
              <option value="">ทุกอาจารย์ที่ปรึกษา</option>
            </select>

            <select id="skill-filter" class="input-field" style="width:auto; min-width:155px; font-size:13px; padding:7px 12px; cursor:pointer;">
              <option value="">ทุกสถานะชั่วโมง</option>
              <option value="pass_all">✓ ผ่านเกณฑ์ครบ (Soft+Hard)</option>
              <option value="lack_soft">⚠️ ขาด Soft Skill (&lt; 12 ชม.)</option>
              <option value="lack_hard">⚠️ ขาด Hard Skill (&lt; 18 ชม.)</option>
              <option value="lack_both">⚠️ ขาดทั้ง Soft &amp; Hard</option>
            </select>

            <button id="btn-clear-filter" onclick="clearAllFilters()" style="display:none; background:#EF4444; color:white; border:none; font-size:12px; padding:7px 12px; border-radius:10px; cursor:pointer; align-items:center; gap:4px; font-weight:600;">
              <span class="material-icons" style="font-size:14px;">close</span> ล้างตัวกรอง
            </button>
          </div>

          <table class="data-table">
            <thead id="students-thead">
              <tr>
                <th style="width: 14%;">รหัสนิสิต</th>
                <th style="width: 22%;">ชื่อ-นามสกุล</th>
                <th style="width: 20%;">อาจารย์ที่ปรึกษา</th>
                <th style="width: 34%;">สถานะความพร้อม &amp; การตรวจสอบ</th>
                <th style="width: 10%; min-width: 90px;" class="text-center">
                  <label style="display:inline-flex;align-items:center;gap:4px;cursor:pointer;white-space:nowrap;" title="เลือกนักศึกษาทั้งหมดในหน้านี้">
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

      <!-- 3. รายชื่ออาจารย์ที่ปรึกษา + จำนวนนิสิต -->
      <div style="display:grid; grid-template-columns:1fr 320px; gap:24px;" class="max-md:!grid-cols-1">
        <section class="card" style="margin-bottom:0;">
          <div class="card-header">
            <span class="material-icons header-icon">supervisor_account</span>
            <h2 class="card-title">รายชื่ออาจารย์ที่ปรึกษาและภาระงานตรวจ Checklist</h2>
          </div>
          <div class="card-body">
            <table class="data-table">
              <thead>
                <tr>
                  <th>ชื่ออาจารย์ที่ปรึกษา</th>
                  <th>จำนวนที่ปรึกษา</th>
                  <th>ตรวจ Checklist แล้ว</th>
                  <th>ยังไม่ได้ตรวจ</th>
                </tr>
              </thead>
              <tbody id="advisor-tbody">
                <tr><td colspan="4" class="text-center py-4 text-gray-400">กำลังโหลด...</td></tr>
              </tbody>
            </table>
          </div>
        </section>

        <section class="card" style="margin-bottom:0;">
          <div class="card-header">
            <span class="material-icons header-icon">groups</span>
            <h2 class="card-title">สรุปจำนวนนิสิต</h2>
          </div>
          <div class="card-body">
            <table class="data-table">
              <thead>
                <tr><th>รายการ</th><th class="text-right">จำนวน</th></tr>
              </thead>
              <tbody>
                <tr><td>นิสิตทั้งหมด</td><td class="text-right font-bold" id="summary-total">0</td></tr>
                <tr><td>มีอาจารย์ที่ปรึกษาแล้ว</td><td class="text-right text-green-600 font-semibold" id="summary-with-advisor">0</td></tr>
                <tr><td>ยังไม่มีอาจารย์ที่ปรึกษา</td><td class="text-right text-red-500 font-semibold" id="summary-without-advisor">0</td></tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>

    <!-- =====================================================================
         WORKSPACE 2: จัดการรอบปีการศึกษา & ปลดล็อก (Unlock) ระบบยื่นฝึกงานตาม 8 สาขาวิชา
         ===================================================================== -->
    <div id="workspace-unlock" style="display:none;">
      <section class="card">
        <div class="card-header" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
          <div style="display:flex; align-items:center; gap:10px;">
            <span class="material-icons header-icon">calendar_month</span>
            <div>
              <h2 class="card-title" style="margin:0;">ตั้งค่าภาคการศึกษา/ปีการศึกษา และค่าเริ่มต้นเอกสารราชการ</h2>
              <p style="margin:2px 0 0 0; font-size:12px; color:#E0E7FF;">กำหนดปีการศึกษาปัจจุบันและเลขที่หนังสือ อว สำหรับใช้ในการออกหนังสือขอความอนุเคราะห์และหนังสือส่งตัว</p>
            </div>
          </div>
          <button type="button" onclick="saveAcademicConfig()" style="background:#10B981; color:white; border:none; padding:8px 16px; border-radius:10px; font-size:12.5px; font-weight:700; cursor:pointer; display:inline-flex; align-items:center; gap:6px;">
            <span class="material-icons" style="font-size:16px;">save</span> บันทึกการตั้งค่าระบบ
          </button>
        </div>
        <div class="card-body">
          <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:14px;">
            <div>
              <label style="font-size:12.5px; font-weight:700; color:#334155;">ปีการศึกษาปัจจุบัน (พ.ศ.)</label>
              <input type="text" id="cfg-academic-year" class="input-field" value="2568" style="margin-top:4px; font-weight:700;" />
            </div>
            <div>
              <label style="font-size:12.5px; font-weight:700; color:#334155;">ภาคการศึกษาปัจจุบัน</label>
              <select id="cfg-semester" class="input-field" style="margin-top:4px;">
                <option value="1">ภาคการศึกษาต้น (เทอม 1)</option>
                <option value="2">ภาคการศึกษาปลาย (เทอม 2)</option>
                <option value="3">ภาคฤดูร้อน (Summer)</option>
              </select>
            </div>
            <div>
              <label style="font-size:12.5px; font-weight:700; color:#334155;">เลขที่หนังสือราชการเริ่มต้น (อว)</label>
              <input type="text" id="cfg-doc-prefix" class="input-field" value="อว 7316/" style="margin-top:4px;" />
            </div>
            <div>
              <label style="font-size:12.5px; font-weight:700; color:#334155;">ชื่อผู้ลงนามหนังสือราชการ</label>
              <input type="text" id="cfg-dean-name" class="input-field" value="ผู้ช่วยศาสตราจารย์ ดร.พรเทพ โรจนวสุ" style="margin-top:4px;" />
            </div>
          </div>
        </div>
      </section>

      <section class="card">
        <div class="card-header" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
          <div style="display:flex; align-items:center; gap:10px;">
            <span class="material-icons header-icon">lock_open</span>
            <div>
              <h2 class="card-title" style="margin:0;">ปลดล็อก (Unlock) ระบบยื่นขอฝึกงานแยกตามหลักสูตร / 8 สาขาวิชา</h2>
              <p style="margin:2px 0 0 0; font-size:12px; color:#E0E7FF;">
                แก้ปัญหารอบการออกฝึกงานไม่พร้อมกัน (เช่น SE ออกฝึกงานเทอมถัดไปทันที ส่วน CS / CPE เรียนเตรียมความพร้อมปี 3 และออกฝึกงานจริงตอนปี 4)
              </p>
            </div>
          </div>
          <div style="display:flex; gap:8px;">
            <button type="button" onclick="bulkToggleMajors('UNLOCK_ALL')" style="background:#10B981; color:white; border:none; padding:7px 14px; border-radius:10px; font-size:12px; font-weight:700; cursor:pointer; display:inline-flex; align-items:center; gap:4px;">
              <span class="material-icons" style="font-size:15px;">lock_open</span> ปลดล็อกทั้ง 8 สาขา
            </button>
            <button type="button" onclick="bulkToggleMajors('LOCK_ALL')" style="background:rgba(255,255,255,0.18); color:white; border:1px solid rgba(255,255,255,0.3); padding:7px 14px; border-radius:10px; font-size:12px; font-weight:600; cursor:pointer; display:inline-flex; align-items:center; gap:4px;">
              <span class="material-icons" style="font-size:15px;">lock</span> ล็อกทั้งหมดชั่วคราว
            </button>
          </div>
        </div>
        <div class="card-body">
          <div style="margin-bottom:14px; padding:12px 16px; background:#EEF2FF; border:1px solid #C7D2FE; border-radius:12px; display:flex; align-items:center; gap:10px;">
            <span class="material-icons" style="color:#4338CA; font-size:20px;">info</span>
            <div style="font-size:12.5px; color:#1E1B4B;">
              <strong>หลักการทำงานของระบบ Unlock รายสาขา:</strong> สาขาที่สถานะเป็น <strong>🔒 ล็อก (Locked)</strong> นิสิตจะยังสามารถเข้าสะสมชั่วโมงอบรมและอัปโหลด CV ในวิชาเตรียมความพร้อมได้ตามปกติ แต่ระบบจะยังไม่เปิดให้กดยื่น Checklist ขอหนังสือไปสถานประกอบการจนกว่า Super Admin (พี่จอม) จะกด <strong>🔓 ปลดล็อก (Unlock)</strong> ตามรอบปีการศึกษาที่พร้อมออกฝึกงานจริง
            </div>
          </div>

          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th style="width:22%;">สาขาวิชา (คณะ ICT)</th>
                  <th style="width:20%;">โครงสร้างรอบเรียน / ออกฝึกงานจริง</th>
                  <th style="width:12%;">รอบเทอมที่ออกฝึก</th>
                  <th style="width:18%;">ช่วงเวลาเปิดยื่นบริษัท</th>
                  <th style="width:16%;">สถานะระบบยื่นฝึกงาน</th>
                  <th style="width:12%;" class="text-center">จัดการ</th>
                </tr>
              </thead>
              <tbody id="major-unlock-tbody">
                <tr><td colspan="6" class="text-center py-6 text-gray-400">กำลังโหลดข้อมูลสาขาวิชา...</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>

    <!-- =====================================================================
         WORKSPACE 3: จัดกิจกรรมอบรมภายในคณะ & ระบบ Check-in หน้างานด้วยรหัสนิสิต
         ===================================================================== -->
    <div id="workspace-events" style="display:none;">
      <div style="display:grid; grid-template-columns:390px 1fr; gap:20px;" class="max-lg:!grid-cols-1">
        <!-- ซ้าย: ฟอร์มสร้างกิจกรรมอบรมโดย พี่จอม (Super Admin) -->
        <section class="card" style="margin-bottom:0;">
          <div class="card-header">
            <span class="material-icons header-icon">add_task</span>
            <div>
              <h2 class="card-title" style="margin:0;">สร้างกิจกรรมอบรมภายในคณะ</h2>
              <p style="margin:2px 0 0 0; font-size:11.5px; color:#E0E7FF;">คำนวณชั่วโมงอัตโนมัติ (สูงสุดไม่เกิน 6 ชม./วัน)</p>
            </div>
          </div>
          <div class="card-body">
            <div style="display:flex; flex-direction:column; gap:12px;">
              <div>
                <label style="font-size:12.5px; font-weight:700; color:#334155;">ชื่อกิจกรรมอบรม / สัมมนา <span style="color:#EF4444;">*</span></label>
                <input type="text" id="evt-title" class="input-field" placeholder="เช่น อบรมเตรียมความพร้อม: การเขียน Resume &amp; บุคลิกภาพ" style="margin-top:4px;" />
              </div>

              <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                <div>
                  <label style="font-size:12.5px; font-weight:700; color:#334155;">ประเภทชั่วโมงทักษะ</label>
                  <select id="evt-skill-type" class="input-field" style="margin-top:4px;">
                    <option value="SOFT">Soft Skill (เกณฑ์ 12 ชม.)</option>
                    <option value="HARD">Hard Skill (เกณฑ์ 18 ชม.)</option>
                  </select>
                </div>
                <div>
                  <label style="font-size:12.5px; font-weight:700; color:#334155;">วันที่จัดกิจกรรม</label>
                  <input type="date" id="evt-date" class="input-field" style="margin-top:4px;" />
                </div>
              </div>

              <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                <div>
                  <label style="font-size:12.5px; font-weight:700; color:#334155;">เวลาเริ่ม</label>
                  <input type="time" id="evt-start-time" class="input-field" value="09:00" onchange="previewEventHours()" style="margin-top:4px;" />
                </div>
                <div>
                  <label style="font-size:12.5px; font-weight:700; color:#334155;">เวลาสิ้นสุด</label>
                  <input type="time" id="evt-end-time" class="input-field" value="16:00" onchange="previewEventHours()" style="margin-top:4px;" />
                </div>
              </div>

              <!-- กล่องแสดงผลการคำนวณชั่วโมงอัตโนมัติ (เพดานสูงสุด 6 ชม./วัน) -->
              <div style="padding:12px 14px; background:#ECFDF5; border:1px solid #A7F3D0; border-radius:12px; display:flex; align-items:center; justify-content:space-between;">
                <div>
                  <div style="font-size:12px; font-weight:700; color:#065F46;">ชั่วโมงที่ระบบคำนวณให้อัตโนมัติ:</div>
                  <div id="evt-hours-note" style="font-size:11px; color:#047857;">ระยะเวลาจริง 7 ชม. (จำกัดเพดานสูงสุดไม่เกิน 6 ชม./วัน)</div>
                </div>
                <div style="text-align:right;">
                  <span id="evt-credited-hours-badge" style="font-size:20px; font-weight:800; color:#059669;">6</span>
                  <span style="font-size:12px; font-weight:700; color:#065F46;"> ชม.</span>
                </div>
              </div>

              <div>
                <label style="font-size:12.5px; font-weight:700; color:#334155;">สาขาวิชาเป้าหมาย</label>
                <select id="evt-target-major" class="input-field" style="margin-top:4px;">
                  <option value="ALL">ทุกสาขาวิชา (ทั้งคณะ ICT)</option>
                  <option value="วิศวกรรมซอฟต์แวร์">สาขาวิศวกรรมซอฟต์แวร์ (SE)</option>
                  <option value="วิทยาการคอมพิวเตอร์">สาขาวิทยาการคอมพิวเตอร์ (CS)</option>
                  <option value="วิศวกรรมคอมพิวเตอร์">สาขาวิศวกรรมคอมพิวเตอร์ (CPE)</option>
                  <option value="เทคโนโลยีสารสนเทศ">สาขาเทคโนโลยีสารสนเทศ (IT)</option>
                  <option value="ธุรกิจดิจิทัล">สาขาธุรกิจดิจิทัล (DB)</option>
                  <option value="คอมพิวเตอร์กราฟิกและมัลติมีเดีย">สาขาคอมพิวเตอร์กราฟิกฯ (CGM)</option>
                  <option value="ภูมิสารสนเทศศาสตร์">สาขาภูมิสารสนเทศศาสตร์ (GIS)</option>
                  <option value="วิทยาการข้อมูลและการประยุกต์">สาขาวิทยาการข้อมูลฯ (DSA)</option>
                </select>
              </div>

              <div>
                <label style="font-size:12.5px; font-weight:700; color:#334155;">สถานที่จัดงาน</label>
                <input type="text" id="evt-location" class="input-field" value="ห้องประชุมคณะ ICT มหาวิทยาลัยพะเยา" style="margin-top:4px;" />
              </div>

              <button type="button" onclick="createTrainingEvent()" style="background:linear-gradient(135deg, #1E1B4B 0%, #4338CA 100%); color:white; border:none; padding:11px 16px; border-radius:12px; font-size:13px; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px; margin-top:4px;">
                <span class="material-icons" style="font-size:18px;">add_circle</span>
                <span>สร้างกิจกรรมอบรมใหม่</span>
              </button>
            </div>
          </div>
        </section>

        <!-- ขวา: ระบบบันทึก Check-in ด้วยรหัสนิสิต (จากใบลงทะเบียนหน้างาน -> เข้าระบบ) -->
        <section class="card" style="margin-bottom:0;">
          <div class="card-header" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
            <div style="display:flex; align-items:center; gap:10px;">
              <span class="material-icons header-icon">fact_check</span>
              <div>
                <h2 class="card-title" style="margin:0;">บันทึก Check-in หน้างานด้วยรหัสนิสิต (ไม่ต้องอัปโหลดใบเซอร์เอง)</h2>
                <p style="margin:2px 0 0 0; font-size:11.5px; color:#E0E7FF;">นำรหัสนิสิตจากใบลงชื่อหน้างานมากรอก/วาง ระบบจะ Map รหัสนิสิตและบวกชั่วโมงเข้าแดชบอร์ดทันที</p>
              </div>
            </div>
          </div>
          <div class="card-body">
            <!-- เลือกกิจกรรมที่จะ Check-in -->
            <div style="margin-bottom:16px; padding:14px 16px; background:#F8FAFC; border:1px solid #E2E8F0; border-radius:14px;">
              <label style="font-size:12.5px; font-weight:700; color:#1E293B; display:block; margin-bottom:6px;">
                1. เลือกกิจกรรมอบรมที่ต้องการบันทึก Check-in รหัสนิสิต:
              </label>
              <select id="checkin-event-select" class="input-field" onchange="renderSelectedEventCheckins()" style="font-weight:700; color:#1E1B4B;"></select>
              <div id="checkin-selected-event-meta" style="margin-top:8px; font-size:12px; color:#475569;"></div>
            </div>

            <!-- กล่องกรอก/วางรหัสนิสิตจากใบเซ็นชื่อหน้างาน -->
            <div style="margin-bottom:18px; padding:16px; background:#EEF2FF; border:1px solid #C7D2FE; border-radius:14px;">
              <label style="font-size:12.5px; font-weight:700; color:#1E1B4B; display:block; margin-bottom:4px;">
                2. กรอกหรือวางรหัสนิสิตจากใบลงชื่อหน้างาน (รองรับทั้งพิมพ์ทีละรหัส หรือก๊อปวางหลายรหัสพร้อมกัน):
              </label>
              <p style="font-size:11.5px; color:#4338CA; margin:0 0 8px 0;">
                * สามารถพิมพ์รหัสนิสิตคั่นด้วยเครื่องหมายจุลภาค (,), เว้นวรรค หรือขึ้นบรรทัดใหม่ได้ทันที ระบบจะตรวจสอบชื่อนิสิตและอนุมัติชั่วโมงให้อัตโนมัติ
              </p>
              <div style="display:flex; gap:10px; align-items:stretch;" class="max-md:flex-col">
                <textarea id="checkin-student-codes" class="input-field" rows="3" placeholder="ตัวอย่าง: 67023110, 67023111 หรือวางคอลัมน์รหัสนิสิตจาก Excel..." style="flex:1; font-family:monospace; font-size:13px;"></textarea>
                <div style="display:flex; flex-direction:column; gap:6px; justify-content:center;">
                  <button type="button" onclick="submitEventCheckIn()" style="background:#10B981; color:white; border:none; padding:12px 18px; border-radius:12px; font-size:13px; font-weight:700; cursor:pointer; display:inline-flex; align-items:center; gap:6px; white-space:nowrap; height:100%;">
                    <span class="material-icons" style="font-size:18px;">how_to_reg</span>
                    <span>บันทึก Check-in &amp; นับชั่วโมงทันที</span>
                  </button>
                </div>
              </div>
              <div id="checkin-result-banner" style="display:none; margin-top:10px; padding:10px 14px; border-radius:10px; font-size:12.5px; font-weight:600;"></div>
            </div>

            <!-- ตารางรายชื่อนิสิตที่ Check-in ในกิจกรรมนี้แล้ว -->
            <div>
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                <h4 style="font-size:13.5px; font-weight:700; color:#1E293B; margin:0;">
                  รายชื่อนิสิตที่บันทึก Check-in ในกิจกรรมนี้แล้ว (<span id="checkin-list-count">0</span> คน)
                </h4>
              </div>
              <div style="max-height:280px; overflow-y:auto; border:1px solid #E2E8F0; border-radius:12px;">
                <table class="data-table" style="margin:0;">
                  <thead>
                    <tr>
                      <th>รหัสนิสิต</th>
                      <th>ชื่อ - นามสกุล</th>
                      <th>สาขาวิชา</th>
                      <th class="text-center">ชั่วโมงที่ได้รับ</th>
                      <th>เวลาที่บันทึก</th>
                    </tr>
                  </thead>
                  <tbody id="checkin-history-tbody">
                    <tr><td colspan="5" class="text-center py-6 text-gray-400">ยังไม่มีรายการ Check-in ในกิจกรรมนี้</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>

    <!-- =====================================================================
         WORKSPACE 4: ระบบฐานข้อมูลสถานประกอบการกลาง (Company Master Data)
         ===================================================================== -->
    <div id="workspace-companies" style="display:none;">
      <!-- ส่วนที่ 1: แจ้งเตือนบริษัทใหม่ที่นิสิตกรอกเข้ามา (Pending Super Admin Confirm) -->
      <section class="card" id="pending-companies-section">
        <div class="card-header" style="background:linear-gradient(135deg, #92400E 0%, #D97706 100%); display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
          <div style="display:flex; align-items:center; gap:10px;">
            <span class="material-icons header-icon">notification_important</span>
            <div>
              <h2 class="card-title" style="margin:0;">แจ้งเตือน: รายชื่อบริษัทใหม่ที่นิสิตกรอกเพิ่มเข้ามา (รอพี่จอมตรวจสอบและกดยืนยันเข้า Master Data)</h2>
              <p style="margin:2px 0 0 0; font-size:12px; color:#FEF3C7;">
                ป้องกันปัญหาชื่อบริษัทซ้ำซ้อน พิมพ์ตัวเล็ก/ใหญ่ หรือชื่อไทย-อังกฤษไม่ตรงกัน สามารถแก้ชื่อให้เป็นมาตรฐานหรือกดยุบรวมกับบริษัทเดิมได้ทันที
              </p>
            </div>
          </div>
        </div>
        <div class="card-body">
          <table class="data-table">
            <thead>
              <tr>
                <th style="width:26%;">ชื่อบริษัทที่นิสิตกรอกเข้ามา</th>
                <th style="width:20%;">นิสิตที่ยื่นเพิ่ม</th>
                <th style="width:28%;">ปรับชื่อมาตรฐาน / ยุบรวมกับบริษัทเดิม</th>
                <th style="width:26%;" class="text-center">การอนุมัติเข้า Master Data</th>
              </tr>
            </thead>
            <tbody id="pending-companies-tbody">
              <tr><td colspan="4" class="text-center py-6 text-gray-400">ไม่มีรายการบริษัทใหม่รออนุมัติ</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- ส่วนที่ 2: ตารางฐานข้อมูลสถานประกอบการกลาง (Verified Master Data) -->
      <section class="card">
        <div class="card-header" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
          <div style="display:flex; align-items:center; gap:10px;">
            <span class="material-icons header-icon">domain_verification</span>
            <div>
              <h2 class="card-title" style="margin:0;">ฐานข้อมูลสถานประกอบการกลาง (Company Master Data)</h2>
              <p style="margin:2px 0 0 0; font-size:12px; color:#E0E7FF;">รายชื่อบริษัทในตารางนี้จะไปแสดงเป็น Auto-suggest / Dropdown ให้นิสิตเลือกอัตโนมัติตอนทำ Checklist</p>
            </div>
          </div>
          <button type="button" onclick="openAddMasterCompanyModal()" style="background:#10B981; color:white; border:none; padding:8px 16px; border-radius:10px; font-size:12.5px; font-weight:700; cursor:pointer; display:inline-flex; align-items:center; gap:6px;">
            <span class="material-icons" style="font-size:16px;">add_business</span> เพิ่มสถานประกอบการเข้า Master Data
          </button>
        </div>
        <div class="card-body">
          <div style="display:flex; gap:10px; margin-bottom:14px; flex-wrap:wrap;">
            <input type="text" id="master-company-search" class="input-field" placeholder="ค้นหาชื่อบริษัท (ไทย/อังกฤษ), จังหวัด หรือตำแหน่งงาน..." oninput="renderMasterCompanyTable()" style="max-width:360px;" />
          </div>
          <table class="data-table">
            <thead>
              <tr>
                <th style="width:26%;">ชื่อสถานประกอบการ (มาตรฐาน)</th>
                <th style="width:14%;">จังหวัด</th>
                <th style="width:24%;">ผู้ติดต่อ (HR) / เบอร์โทร</th>
                <th style="width:22%;">ตำแหน่งงานที่เปิดรับ</th>
                <th style="width:14%;" class="text-center">สถานะ</th>
              </tr>
            </thead>
            <tbody id="master-companies-tbody">
              <tr><td colspan="5" class="text-center py-6 text-gray-400">กำลังโหลดฐานข้อมูลบริษัท...</td></tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>

    <!-- =====================================================================
         WORKSPACE 5: ระบบออกเอกสารราชการอัตโนมัติ (หนังสือขอความอนุเคราะห์ + แบบฟอร์มใบตอบรับ & หนังสือส่งตัว)
         ===================================================================== -->
    <div id="workspace-documents" style="display:none;">
      <!-- แผงอธิบายขั้นตอนการออกเอกสารราชการตามข้อตกลงล่าสุด -->
      <div style="margin-bottom:16px; padding:14px 18px; background:linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%); border:1px solid #C7D2FE; border-radius:16px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px;">
        <div style="display:flex; align-items:center; gap:12px;">
          <span class="material-icons" style="color:#4338CA; font-size:28px;">verified</span>
          <div>
            <div style="font-size:13.5px; font-weight:800; color:#1E1B4B;">
              ลำดับการออกเอกสารราชการ (นโยบายยื่นขอฝึกงานทีละ 1 บริษัท)
            </div>
            <div style="font-size:12px; color:#3730A3; margin-top:2px;">
              <strong>ขั้นที่ 1:</strong> ที่ปรึกษาอนุมัติ Checklist ➔ <strong>ขั้นที่ 2:</strong> พี่จอมออก <strong>"หนังสือขอความอนุเคราะห์ (+ แนบแบบฟอร์มใบตอบรับ)"</strong> ไปยื่น/สัมภาษณ์ (รวมกลุ่มบริษัทเดียวกันได้) ➔ <strong>ขั้นที่ 3:</strong> บริษัทส่งใบตอบรับ ➔ <strong>ถ้ารับ:</strong> ออก <strong>"หนังสือส่งตัว"</strong> | <strong>ถ้าปฏิเสธ:</strong> เก็บเข้า <strong>Archive</strong> และปลดล็อกให้ยื่นบริษัทใหม่
            </div>
          </div>
        </div>
      </div>

      <!-- ส่วนที่ 1: การจัดกลุ่มนิสิตที่ไปบริษัทเดียวกัน (Group Request Letter) -->
      <section class="card">
        <div class="card-header" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
          <div style="display:flex; align-items:center; gap:10px;">
            <span class="material-icons header-icon">folder_shared</span>
            <div>
              <h2 class="card-title" style="margin:0;">ออกหนังสือขอความอนุเคราะห์แบบรวมกลุ่มสถานประกอบการเดียวกัน (Group Letter + ตารางแนบท้าย)</h2>
              <p style="margin:2px 0 0 0; font-size:12px; color:#E0E7FF;">หากมีนิสิตไปบริษัทเดียวกันรอบเดียวกัน สามารถกดออกหนังสือฉบับเดียวพร้อมตารางรายชื่อแนบท้ายและแบบฟอร์มใบตอบรับได้ทันที</p>
            </div>
          </div>
        </div>
        <div class="card-body">
          <div id="company-groups-container" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(320px, 1fr)); gap:12px;"></div>
        </div>
      </section>

      <!-- ส่วนที่ 2: ตารางจัดการเอกสารรายบุคคล (หนังสือขอความอนุเคราะห์ -> ตรวจใบตอบรับ -> หนังสือส่งตัว) -->
      <section class="card">
        <div class="card-header" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
          <div style="display:flex; align-items:center; gap:10px;">
            <span class="material-icons header-icon">assignment_turned_in</span>
            <div>
              <h2 class="card-title" style="margin:0;">คิวออกหนังสือขอความอนุเคราะห์ (+ใบตอบรับ), ตรวจผลตอบรับจากบริษัท และออกหนังสือส่งตัว</h2>
              <p style="margin:2px 0 0 0; font-size:12px; color:#E0E7FF;">ตรวจสอบสถานะรายคน พรีวิวเอกสารราชการ PDF และจัดการกรณีบริษัทตอบรับหรือปฏิเสธ</p>
            </div>
          </div>
          <div style="display:flex; gap:8px;">
            <select id="doc-queue-filter" class="input-field" onchange="renderDocumentQueueTable()" style="width:auto; font-size:12px; padding:6px 12px; background:white; color:#1E293B;">
              <option value="ALL">แสดงนิสิตทั้งหมด</option>
              <option value="READY_FOR_REQ">รอออกหนังสือขอความอนุเคราะห์</option>
              <option value="WAITING_RESPONSE">ออกหนังสือแล้ว / รอผลใบตอบรับบริษัท</option>
              <option value="ACCEPTED">บริษัทตอบรับแล้ว / พร้อมออกหนังสือส่งตัว</option>
              <option value="DISPATCHED">ออกหนังสือส่งตัวเสร็จสิ้นแล้ว</option>
            </select>
          </div>
        </div>
        <div class="card-body">
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th style="width:18%;">รหัสนิสิต / ชื่อ-สกุล</th>
                  <th style="width:20%;">สถานประกอบการ (ยื่นทีละ 1 แห่ง)</th>
                  <th style="width:12%;">สถานะ Checklist</th>
                  <th style="width:18%;">1. หนังสือขอความอนุเคราะห์ (+ใบตอบรับ)</th>
                  <th style="width:16%;">2. ผลใบตอบรับจากบริษัท</th>
                  <th style="width:16%;">3. หนังสือส่งตัวเข้าฝึกงาน</th>
                </tr>
              </thead>
              <tbody id="doc-workflow-tbody">
                <tr><td colspan="6" class="text-center py-6 text-gray-400">กำลังโหลดคิวงานเอกสารราชการ...</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <!-- ส่วนที่ 3: ประวัติบริษัทเดิมที่ถูกปฏิเสธ / ไม่ผ่าน (Archive แบบย่อ) -->
      <section class="card">
        <div class="card-header">
          <span class="material-icons header-icon">inventory_2</span>
          <div>
            <h2 class="card-title" style="margin:0;">ประวัติการยื่นบริษัทเดิมที่ไม่ผ่าน / บริษัทปฏิเสธ (Archive แบบย่อ)</h2>
            <p style="margin:2px 0 0 0; font-size:12px; color:#E0E7FF;">เก็บประวัติการยื่นเดิมไว้เป็นหลักฐานเมื่อระบบปลดล็อกให้นิสิตยื่นบริษัทแห่งใหม่</p>
          </div>
        </div>
        <div class="card-body">
          <table class="data-table">
            <thead>
              <tr>
                <th>รหัสนิสิต</th>
                <th>ชื่อ-นามสกุล</th>
                <th>สาขาวิชา</th>
                <th>บริษัทเดิมที่ยื่น</th>
                <th>สาเหตุที่เข้า Archive</th>
                <th>หมายเหตุ</th>
                <th>วันที่บันทึก</th>
              </tr>
            </thead>
            <tbody id="archive-history-tbody">
              <tr><td colspan="7" class="text-center py-6 text-gray-400">ยังไม่มีประวัติใน Archive</td></tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>

    <!-- =====================================================================
         WORKSPACE 6: การเชื่อมโยงกับระบบ Co-op ICT ของพี่แดง (Export สำหรับ Co-op 01)
         ===================================================================== -->
    <div id="workspace-coop" style="display:none;">
      <section class="card">
        <div class="card-header" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
          <div style="display:flex; align-items:center; gap:10px;">
            <span class="material-icons header-icon">sync_alt</span>
            <div>
              <h2 class="card-title" style="margin:0;">ส่งออกข้อมูลเชื่อมโยงระบบ Co-op ICT ของพี่แดง (ข้อมูลตั้งต้นแบบฟอร์ม Co-op 01)</h2>
              <p style="margin:2px 0 0 0; font-size:12px; color:#E0E7FF;">
                Export ข้อมูลนิสิตและสถานประกอบการที่ได้รับการตอบรับออกเป็นไฟล์ CSV / Excel มาตรฐาน เพื่อนำไป Import เข้าสู่ระบบ Co-op ICT โดยที่นิสิตไม่ต้องกรอกข้อมูลซ้ำ
              </p>
            </div>
          </div>
          <div style="display:flex; gap:8px; flex-wrap:wrap;">
            <button type="button" onclick="downloadCoop01Csv('APPROVED_ONLY')" style="background:#10B981; color:white; border:none; padding:9px 16px; border-radius:10px; font-size:12.5px; font-weight:700; cursor:pointer; display:inline-flex; align-items:center; gap:6px;">
              <span class="material-icons" style="font-size:17px;">download</span> Export เฉพาะนิสิตที่บริษัทตอบรับแล้ว (CSV สำหรับ Co-op 01)
            </button>
            <button type="button" onclick="downloadCoop01Csv('ALL')" style="background:rgba(255,255,255,0.18); color:white; border:1px solid rgba(255,255,255,0.3); padding:9px 16px; border-radius:10px; font-size:12.5px; font-weight:600; cursor:pointer; display:inline-flex; align-items:center; gap:6px;">
              <span class="material-icons" style="font-size:17px;">table_view</span> Export ข้อมูลทั้งรุ่น (CSV)
            </button>
          </div>
        </div>
        <div class="card-body">
          <div style="margin-bottom:14px; padding:12px 16px; background:#F0FDF4; border:1px solid #BBF7D0; border-radius:12px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px;">
            <div style="display:flex; align-items:center; gap:10px; font-size:12.5px; color:#166534;">
              <span class="material-icons" style="color:#16A34A;">check_circle</span>
              <span><strong>โครงสร้างคอลัมน์มาตรฐาน Co-op 01:</strong> รหัสนิสิต, ชื่อ-สกุล, สาขาวิชา, ชั้นปี, GPAX, เบอร์โทร, อีเมล, ชื่อสถานประกอบการ, ตำแหน่งงาน, ที่อยู่บริษัท, จังหวัด, ชื่อผู้ประสานงาน HR, เบอร์โทรบริษัท, อาจารย์ที่ปรึกษา, อาจารย์นิเทศก์, เลขที่หนังสือส่งตัว</span>
            </div>
          </div>

          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>รหัสนิสิต</th>
                  <th>ชื่อ - นามสกุล</th>
                  <th>สาขาวิชา</th>
                  <th>GPAX</th>
                  <th>สถานประกอบการ (Co-op 01)</th>
                  <th>ตำแหน่งงาน</th>
                  <th>อาจารย์ที่ปรึกษา / นิเทศก์</th>
                  <th>สถานะส่งตัว</th>
                </tr>
              </thead>
              <tbody id="coop-preview-tbody">
                <tr><td colspan="8" class="text-center py-6 text-gray-400">กำลังโหลดข้อมูลสำหรับส่งออก Co-op 01...</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>

    <!-- Modal: เพิ่มสถานประกอบการเข้า Master Data -->
    <div id="add-master-company-modal" style="display:none; position:fixed; inset:0; background:rgba(15,23,42,0.55); z-index:1000; justify-content:center; align-items:center; backdrop-filter:blur(4px);">
      <div style="background:white; border-radius:20px; padding:24px 28px; width:540px; max-width:94%; box-shadow:0 20px 50px rgba(15,23,42,0.25);">
        <h3 style="font-size:17px; font-weight:700; margin-bottom:14px; color:#1E293B;">เพิ่มสถานประกอบการเข้าฐานข้อมูลกลาง (Master Data)</h3>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:10px;">
          <div style="grid-column:span 2;">
            <label style="font-size:12.5px; font-weight:700; color:#475569;">ชื่อสถานประกอบการ (ภาษาไทย / ชื่อทางการ) *</label>
            <input type="text" id="mc-name-th" class="input-field" placeholder="เช่น บริษัท เมกัส ซอฟต์แวร์ จำกัด" style="margin-top:4px;" />
          </div>
          <div>
            <label style="font-size:12.5px; font-weight:700; color:#475569;">ชื่อภาษาอังกฤษ</label>
            <input type="text" id="mc-name-en" class="input-field" placeholder="Magus Software Co., Ltd." style="margin-top:4px;" />
          </div>
          <div>
            <label style="font-size:12.5px; font-weight:700; color:#475569;">จังหวัด</label>
            <input type="text" id="mc-province" class="input-field" placeholder="เช่น เชียงใหม่, กรุงเทพมหานคร" style="margin-top:4px;" />
          </div>
          <div style="grid-column:span 2;">
            <label style="font-size:12.5px; font-weight:700; color:#475569;">ที่อยู่บริษัท</label>
            <input type="text" id="mc-address" class="input-field" placeholder="เลขที่ ถนน ตำบล อำเภอ จังหวัด รหัสไปรษณีย์" style="margin-top:4px;" />
          </div>
          <div>
            <label style="font-size:12.5px; font-weight:700; color:#475569;">ชื่อผู้ติดต่อ / ฝ่าย HR</label>
            <input type="text" id="mc-hr-name" class="input-field" placeholder="ฝ่ายทรัพยากรบุคคล" style="margin-top:4px;" />
          </div>
          <div>
            <label style="font-size:12.5px; font-weight:700; color:#475569;">เบอร์โทรศัพท์ HR</label>
            <input type="text" id="mc-hr-phone" class="input-field" placeholder="02-xxx-xxxx" style="margin-top:4px;" />
          </div>
          <div style="grid-column:span 2;">
            <label style="font-size:12.5px; font-weight:700; color:#475569;">ตำแหน่งงานที่แนะนำ</label>
            <input type="text" id="mc-positions" class="input-field" placeholder="เช่น Software Developer, QA, Data Analyst" style="margin-top:4px;" />
          </div>
        </div>
        <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:16px;">
          <button class="btn btn-outline btn-sm" onclick="closeAddMasterCompanyModal()">ยกเลิก</button>
          <button class="btn btn-primary btn-sm" onclick="submitNewMasterCompany()">บันทึกเข้า Master Data</button>
        </div>
      </div>
    </div>

    <!-- Modal: พรีวิวและพิมพ์หนังสือราชการ PDF (หนังสือขอความอนุเคราะห์ + แบบฟอร์มใบตอบรับ / หนังสือส่งตัว) -->
    <div id="official-letter-modal" style="display:none; position:fixed; inset:0; background:rgba(15,23,42,0.65); z-index:1100; justify-content:center; align-items:center; backdrop-filter:blur(4px);">
      <div style="background:white; border-radius:20px; width:820px; max-width:95%; max-height:92vh; display:flex; flex-direction:column; box-shadow:0 25px 60px rgba(15,23,42,0.35); overflow:hidden;">
        <div style="background:linear-gradient(135deg, #1E1B4B 0%, #4338CA 100%); padding:16px 24px; color:white; display:flex; align-items:center; justify-content:space-between;">
          <div style="display:flex; align-items:center; gap:10px;">
            <span class="material-icons" style="font-size:22px;">picture_as_pdf</span>
            <div>
              <h3 id="official-letter-modal-title" style="font-size:16px; font-weight:700; margin:0;">พรีวิวหนังสือราชการ คณะ ICT มหาวิทยาลัยพะเยา</h3>
              <p style="font-size:11.5px; color:#E0E7FF; margin:2px 0 0 0;">พร้อมพิมพ์หรือบันทึกเป็นไฟล์ PDF เพื่อส่งให้สถานประกอบการ</p>
            </div>
          </div>
          <div style="display:flex; align-items:center; gap:8px;">
            <button type="button" onclick="printOfficialLetter()" style="background:#10B981; color:white; border:none; padding:7px 14px; border-radius:10px; font-size:12px; font-weight:700; cursor:pointer; display:inline-flex; align-items:center; gap:5px;">
              <span class="material-icons" style="font-size:16px;">print</span> พิมพ์ / ดาวน์โหลด PDF
            </button>
            <button onclick="closeOfficialLetterModal()" style="background:none; border:none; color:white; cursor:pointer;">
              <span class="material-icons">close</span>
            </button>
          </div>
        </div>
        <div id="official-letter-print-area" style="padding:32px 40px; overflow-y:auto; flex:1; background:#FFFFFF; color:#0F172A; font-family:'Sarabun', sans-serif; line-height:1.7;"></div>
      </div>
    </div>

    <!-- Modal: ตั้งสถานะนิสิต -->
    <div id="status-modal" style="display:none; position:fixed; inset:0; background:rgba(15,23,42,0.55); z-index:1000; justify-content:center; align-items:center; backdrop-filter:blur(4px);">
      <div style="background:white; border-radius:20px; padding:24px 28px; width:440px; max-width:92%; box-shadow:0 20px 50px rgba(15,23,42,0.25);">
        <h3 style="font-size:17px; font-weight:700; margin-bottom:16px; color:#1E293B;">ตั้งสถานะนิสิต (Batch Update)</h3>
        <div style="margin-bottom:12px;">
          <label style="font-size:13px; font-weight:600; color:#475569;">ประเภทสถานะ</label>
          <select id="batch-status-type" class="input-field" style="margin-top:4px;">
            <option value="cv">สถานะ CV</option>
            <option value="training">สถานะชั่วโมงอบรม</option>
            <option value="placement">สถานะอนุมัติที่ฝึกงาน</option>
          </select>
        </div>
        <div style="margin-bottom:12px;">
          <label style="font-size:13px; font-weight:600; color:#475569;">ค่าสถานะ</label>
          <select id="batch-status-value" class="input-field" style="margin-top:4px;">
            <option value="APPROVED">ผ่าน / อนุมัติ (APPROVED)</option>
            <option value="PENDING">รอผล (PENDING)</option>
            <option value="REJECTED">ไม่ผ่าน / แก้ไข (REJECTED)</option>
          </select>
        </div>
        <div style="margin-bottom:16px;">
          <label style="font-size:13px; font-weight:600; color:#475569;">หมายเหตุ (ถ้ามี)</label>
          <input type="text" id="batch-status-note" class="input-field" placeholder="หมายเหตุ..." style="margin-top:4px;" />
        </div>
        <div style="display:flex; justify-content:flex-end; gap:8px;">
          <button class="btn btn-outline btn-sm" onclick="closeSetStatusModal()">ยกเลิก</button>
          <button class="btn btn-primary btn-sm" onclick="submitBatchStatus()">ยืนยัน</button>
        </div>
      </div>
    </div>

    <!-- Modal: ตั้งอาจารย์ที่ปรึกษา -->
    <div id="advisor-modal" style="display:none; position:fixed; inset:0; background:rgba(15,23,42,0.55); z-index:1000; justify-content:center; align-items:center; backdrop-filter:blur(4px);">
      <div style="background:white; border-radius:20px; padding:24px 28px; width:440px; max-width:92%; box-shadow:0 20px 50px rgba(15,23,42,0.25);">
        <h3 style="font-size:17px; font-weight:700; margin-bottom:16px; color:#1E293B;">กำหนดอาจารย์ที่ปรึกษา (Advisor)</h3>
        <div style="margin-bottom:16px;">
          <label style="font-size:13px; font-weight:600; color:#475569;">เลือกอาจารย์ที่ปรึกษา</label>
          <select id="advisor-select" class="input-field" style="margin-top:4px;">
            <option value="">กำลังโหลด...</option>
          </select>
        </div>
        <div style="display:flex; justify-content:flex-end; gap:8px;">
          <button class="btn btn-outline btn-sm" onclick="closeSetAdvisorModal()">ยกเลิก</button>
          <button class="btn btn-primary btn-sm" onclick="submitBatchAdvisor()">ยืนยัน</button>
        </div>
      </div>
    </div>

    <!-- Modal: ตั้งอาจารย์นิเทศก์ (Supervisor) -->
    <div id="supervisor-modal" style="display:none; position:fixed; inset:0; background:rgba(15,23,42,0.55); z-index:1000; justify-content:center; align-items:center; backdrop-filter:blur(4px);">
      <div style="background:white; border-radius:20px; padding:24px 28px; width:440px; max-width:92%; box-shadow:0 20px 50px rgba(15,23,42,0.25);">
        <h3 style="font-size:17px; font-weight:700; margin-bottom:6px; color:#1E293B;">กำหนดอาจารย์นิเทศก์ (Supervisor)</h3>
        <p style="font-size:12px; color:#64748B; margin:0 0 14px 0;">มอบหมายอาจารย์นิเทศก์ให้นิสิตที่ติ๊กเลือกในตาราง</p>
        <div style="margin-bottom:16px;">
          <label style="font-size:13px; font-weight:600; color:#475569;">เลือกอาจารย์นิเทศก์</label>
          <select id="supervisor-select" class="input-field" style="margin-top:4px;">
            <option value="">กำลังโหลด...</option>
          </select>
        </div>
        <div style="display:flex; justify-content:flex-end; gap:8px;">
          <button class="btn btn-outline btn-sm" onclick="closeSetSupervisorModal()">ยกเลิก</button>
          <button class="btn btn-primary btn-sm" onclick="submitBatchSupervisor()">ยืนยัน</button>
        </div>
      </div>
    </div>

    <!-- Modal: จัดการสิทธิ์อาจารย์ / บุคลากร (Multi-Role Staff Management) -->
    <div id="staff-roles-modal" style="display:none; position:fixed; inset:0; background:rgba(15,23,42,0.6); z-index:1000; justify-content:center; align-items:center; backdrop-filter:blur(4px);">
      <div style="background:white; border-radius:20px; width:880px; max-width:95%; max-height:88vh; display:flex; flex-direction:column; box-shadow:0 25px 60px rgba(15,23,42,0.3); overflow:hidden;">
        <div style="background:linear-gradient(135deg, #1E1B4B 0%, #4338CA 100%); padding:18px 24px; color:white; display:flex; align-items:center; justify-content:space-between;">
          <div style="display:flex; align-items:center; gap:10px;">
            <span class="material-icons" style="font-size:22px;">admin_panel_settings</span>
            <div>
              <h3 style="font-size:16px; font-weight:700; margin:0;">จัดการสิทธิ์อาจารย์และเจ้าหน้าที่คณะ (Multi-Role Permission Matrix)</h3>
              <p style="font-size:11.5px; color:#E0E7FF; margin:2px 0 0 0;">อาจารย์ 1 ท่านสามารถถือครองได้หลายบทบาทพร้อมกัน (อาจารย์ประจำวิชา / ที่ปรึกษา / นิเทศก์ / เจ้าหน้าที่คณะ)</p>
            </div>
          </div>
          <button onclick="closeStaffRolesModal()" style="background:none; border:none; color:white; cursor:pointer;">
            <span class="material-icons">close</span>
          </button>
        </div>
        <div style="padding:20px 24px; overflow-y:auto; flex:1;">
          <table class="data-table">
            <thead>
              <tr>
                <th>ชื่อ - นามสกุล / อีเมล</th>
                <th>สาขาวิชา / สังกัด</th>
                <th class="text-center">อาจารย์ที่ปรึกษา</th>
                <th class="text-center">อาจารย์นิเทศก์</th>
                <th class="text-center">อาจารย์ประจำวิชา</th>
                <th class="text-center">เจ้าหน้าที่คณะ</th>
                <th class="text-center">บันทึก</th>
              </tr>
            </thead>
            <tbody id="staff-roles-tbody">
              <tr><td colspan="7" class="text-center py-6 text-gray-400">กำลังโหลดรายชื่อบุคลากร...</td></tr>
            </tbody>
          </table>
        </div>
        <div style="padding:14px 24px; background:#F8FAFC; border-top:1px solid #E2E8F0; display:flex; justify-content:flex-end;">
          <button class="btn btn-outline btn-sm" onclick="closeStaffRolesModal()">ปิดหน้าต่าง</button>
        </div>
      </div>
    </div>

    <!-- Modal: ดรอปนิสิต -->
    <div id="drop-modal" style="display:none; position:fixed; inset:0; background:rgba(15,23,42,0.55); z-index:1000; justify-content:center; align-items:center; backdrop-filter:blur(4px);">
      <div style="background:white; border-radius:20px; padding:24px 28px; width:440px; max-width:92%; box-shadow:0 20px 50px rgba(15,23,42,0.25);">
        <div style="display:flex; align-items:center; gap:8px; margin-bottom:12px;">
          <span class="material-icons" style="color:#DC2626; font-size:24px;">warning_amber</span>
          <h3 style="font-size:17px; font-weight:700; color:#991B1B; margin:0;">ยืนยันการดรอปนิสิต</h3>
        </div>
        <p style="font-size:13px; color:#475569; margin-bottom:14px; line-height:1.5;">
          คุณกำลังจะดรอปนิสิตที่เลือกจำนวน <strong id="drop-selected-count" style="color:#DC2626;">0</strong> คน ออกจากรอบการฝึกงานปัจจุบัน (ข้อมูลไม่ถูกลบและกู้คืนได้ภายหลัง)
        </p>
        <div style="margin-bottom:12px;">
          <label style="font-size:13px; font-weight:600; color:#475569;">สาเหตุการดรอป</label>
          <select id="drop-reason-preset" class="input-field" style="margin-top:4px;" onchange="toggleDropReasonNote()">
            <option value="ดรอปเรียน / พักการศึกษา">ดรอปเรียน / พักการศึกษา</option>
            <option value="ถอนรายวิชาเตรียมฝึกงาน (W)">ถอนรายวิชาเตรียมฝึกงาน (W)</option>
            <option value="ชั่วโมงอบรมไม่ครบตามเกณฑ์">ชั่วโมงอบรมไม่ครบตามเกณฑ์</option>
            <option value="เลื่อนการฝึกงานไปปีถัดไป">เลื่อนการฝึกงานไปปีถัดไป</option>
            <option value="custom">อื่นๆ (ระบุในหมายเหตุ)</option>
          </select>
        </div>
        <div style="margin-bottom:18px;">
          <label style="font-size:13px; font-weight:600; color:#475569;">หมายเหตุเพิ่มเติม (ถ้ามี)</label>
          <input type="text" id="drop-reason-note" class="input-field" placeholder="เปิดให้กรอกเมื่อเลือก 'อื่นๆ (ระบุในหมายเหตุ)'" style="margin-top:4px; background-color:#F1F5F9; cursor:not-allowed;" disabled />
        </div>
        <div style="display:flex; justify-content:flex-end; gap:8px;">
          <button class="btn btn-outline btn-sm" onclick="closeDropStudentModal()">ยกเลิก</button>
          <button class="btn btn-sm" onclick="submitDropStudents()" style="background:#DC2626; color:white; border:none; padding:8px 16px; border-radius:10px; cursor:pointer; font-weight:600;">ยืนยันดรอปนิสิต</button>
        </div>
      </div>
    </div>

    <!-- Modal: กู้คืนสถานะนิสิต -->
    <div id="restore-modal" style="display:none; position:fixed; inset:0; background:rgba(15,23,42,0.55); z-index:1000; justify-content:center; align-items:center; backdrop-filter:blur(4px);">
      <div style="background:white; border-radius:20px; padding:24px 28px; width:420px; max-width:92%; box-shadow:0 20px 50px rgba(15,23,42,0.25);">
        <div style="display:flex; align-items:center; gap:8px; margin-bottom:12px;">
          <span class="material-icons" style="color:#059669; font-size:24px;">restore</span>
          <h3 style="font-size:17px; font-weight:700; color:#065F46; margin:0;">กู้คืนสถานะนิสิต</h3>
        </div>
        <p style="font-size:13px; color:#475569; margin-bottom:18px; line-height:1.5;">
          ต้องการนำนิสิตที่เลือกจำนวน <strong id="restore-selected-count" style="color:#059669;">0</strong> คน กลับเข้าสู่รายชื่อนิสิตกำลังศึกษา/ฝึกงานปกติใช่หรือไม่?
        </p>
        <div style="display:flex; justify-content:flex-end; gap:8px;">
          <button class="btn btn-outline btn-sm" onclick="closeRestoreStudentModal()">ยกเลิก</button>
          <button class="btn btn-sm" onclick="submitRestoreStudents()" style="background:#059669; color:white; border:none; padding:8px 16px; border-radius:10px; cursor:pointer; font-weight:600;">ยืนยันกู้คืนสถานะ</button>
        </div>
      </div>
    </div>

    <!-- Modal: [REQ-02 & REQ-03] นำเข้ารายชื่อนิสิตจากระบบ REG & UP Academy พร้อม Update Detection Popup -->
    <div id="import-modal" style="display:none; position:fixed; inset:0; background:rgba(15,23,42,0.6); z-index:1000; justify-content:center; align-items:center; backdrop-filter:blur(4px);">
      <div style="background:white; border-radius:20px; width:760px; max-width:95%; max-height:90vh; display:flex; flex-direction:column; box-shadow:0 25px 60px rgba(15,23,42,0.3); overflow:hidden;">
        <div style="background:linear-gradient(135deg, #065F46 0%, #10B981 100%); padding:18px 24px; color:white; display:flex; align-items:center; justify-content:space-between;">
          <div style="display:flex; align-items:center; gap:10px;">
            <span class="material-icons" style="font-size:24px;">upload_file</span>
            <div>
              <h3 style="font-size:16px; font-weight:700; margin:0;">นำเข้าข้อมูลนิสิตจากระบบ REG &amp; UP Academy (Excel / CSV)</h3>
              <p style="font-size:11.5px; color:#D1FAE5; margin:2px 0 0 0;">แมปตามรหัสนิสิตอัตโนมัติ ตรวจจับแถวที่มีการอัปเดตโดยไม่ลบข้อมูลเดิม</p>
            </div>
          </div>
          <button onclick="closeImportModal()" style="background:none; border:none; color:white; cursor:pointer; display:flex; align-items:center; opacity:0.85;">
            <span class="material-icons" style="font-size:20px;">close</span>
          </button>
        </div>

        <div style="padding:20px 24px; overflow-y:auto; flex:1;">
          <!-- Step 1: Upload File Zone -->
          <div id="import-upload-zone" style="border:2px dashed #CBD5E1; border-radius:16px; padding:28px 20px; text-align:center; background:#F8FAFC; cursor:pointer; transition:all 0.2s;"
               onclick="document.getElementById('import-file-input').click()"
               ondragover="event.preventDefault(); this.style.borderColor='#10B981'; this.style.background='#ECFDF5';"
               ondragleave="this.style.borderColor='#CBD5E1'; this.style.background='#F8FAFC';"
               ondrop="handleImportDrop(event)">
            <input type="file" id="import-file-input" accept=".xlsx,.xls,.csv" style="display:none;" onchange="handleImportFileSelect(event)" />
            <span class="material-icons" style="font-size:44px; color:#10B981; margin-bottom:8px;">cloud_upload</span>
            <p style="font-size:14.5px; font-weight:700; color:#1E293B; margin:0 0 4px 0;">คลิกเพื่อเลือกไฟล์ หรือลากไฟล์จากระบบ REG / UP Academy มาวางที่นี่</p>
            <p style="font-size:12px; color:#64748B; margin:0;">รองรับไฟล์ <strong>.xlsx, .xls, .csv</strong> (รองรับทั้ง 8 สาขาวิชาของคณะ ICT และตรวจจับการอัปเดต GPAX / ชั่วโมงเตรียมความพร้อมอัตโนมัติ)</p>
          </div>

          <!-- Selected File Info -->
          <div id="import-selected-file-wrap" style="display:none; margin-top:12px; padding:10px 14px; background:#F0FDF4; border:1px solid #BBF7D0; border-radius:12px; align-items:center; justify-content:space-between;">
            <div style="display:flex; align-items:center; gap:8px;">
              <span class="material-icons" style="color:#16A34A; font-size:20px;">description</span>
              <span id="import-selected-file-name" style="font-size:13px; font-weight:600; color:#166534;">filename.xlsx</span>
            </div>
            <button onclick="resetImportFile()" style="background:none; border:none; color:#DC2626; font-size:12px; font-weight:600; cursor:pointer; display:flex; align-items:center; gap:2px;">
              <span class="material-icons" style="font-size:15px;">delete</span> เปลี่ยนไฟล์
            </button>
          </div>

          <!-- Step 2: Preview & Update Detection Summary -->
          <div id="import-preview-wrap" style="display:none; margin-top:16px;">
            <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:10px; margin-bottom:12px;">
              <div style="padding:10px 12px; background:#F8FAFC; border:1px solid #E2E8F0; border-radius:12px; text-align:center;">
                <div style="font-size:11px; color:#64748B;">อ่านพบในไฟล์</div>
                <div id="import-stat-total" style="font-size:18px; font-weight:800; color:#334155;">0</div>
              </div>
              <div style="padding:10px 12px; background:#F0FDF4; border:1px solid #BBF7D0; border-radius:12px; text-align:center;">
                <div style="font-size:11px; color:#166534;">✨ นิสิตใหม่</div>
                <div id="import-stat-new" style="font-size:18px; font-weight:800; color:#15803D;">0</div>
              </div>
              <div style="padding:10px 12px; background:#EFF6FF; border:1px solid #BFDBFE; border-radius:12px; text-align:center;">
                <div style="font-size:11px; color:#1E40AF;">🔄 อัปเดตข้อมูลเดิม</div>
                <div id="import-stat-updated" style="font-size:18px; font-weight:800; color:#1D4ED8;">0</div>
              </div>
              <div style="padding:10px 12px; background:#EEF2FF; border:1px solid #C7D2FE; border-radius:12px; text-align:center;">
                <div style="font-size:11px; color:#3730A3;">คงเดิม / ปีการศึกษา</div>
                <div style="font-size:14px; font-weight:700; color:#4338CA;">
                  <span id="import-stat-unchanged">0</span> คน (<span id="import-stat-acad-year">-</span>)
                </div>
              </div>
            </div>

            <span id="import-stat-matched" style="display:none;">0</span>
            <span id="import-stat-skipped" style="display:none;">0</span>

            <div id="import-update-detection-box" style="display:none; margin-bottom:14px; padding:12px 16px; background:#FFFBEB; border:1px solid #FDE68A; border-radius:12px;">
              <div style="display:flex; align-items:center; gap:6px; font-size:12.5px; font-weight:700; color:#92400E; margin-bottom:6px;">
                <span class="material-icons" style="font-size:17px; color:#D97706;">sync_problem</span>
                <span>ระบบตรวจพบการเปลี่ยนแปลงข้อมูลนิสิตเดิม (Update Detection):</span>
              </div>
              <div id="import-update-detection-list" style="max-height:110px; overflow-y:auto; font-size:12px; color:#78350F; display:flex; flex-direction:column; gap:4px;"></div>
            </div>

            <div style="font-size:12px; font-weight:700; color:#475569; margin-bottom:6px; display:flex; justify-content:space-between;">
              <span>ตัวอย่างรายชื่อนิสิตที่จะนำเข้า / อัปเดต (<span id="import-preview-count">0</span> คน):</span>
              <span style="color:#64748B; font-weight:400;">* ไม่ลบข้อมูลติดต่อและเอกสารเดิมของนิสิต</span>
            </div>

            <div style="max-height:220px; overflow-y:auto; border:1px solid #E2E8F0; border-radius:12px;">
              <table style="width:100%; border-collapse:collapse; font-size:12px;">
                <thead style="background:#F1F5F9; position:sticky; top:0;">
                  <tr>
                    <th style="padding:8px 10px; text-align:left; color:#475569;">รหัสนิสิต</th>
                    <th style="padding:8px 10px; text-align:left; color:#475569;">ชื่อ - นามสกุล</th>
                    <th style="padding:8px 10px; text-align:left; color:#475569;">สาขาวิชา</th>
                    <th style="padding:8px 10px; text-align:center; color:#475569;">ชั้นปี / GPAX</th>
                    <th style="padding:8px 10px; text-align:left; color:#475569;">สถานะการนำเข้า</th>
                  </tr>
                </thead>
                <tbody id="import-preview-tbody"></tbody>
              </table>
            </div>
          </div>

          <div id="import-loading" style="display:none; text-align:center; padding:24px;">
            <span class="inline-block animate-spin rounded-full h-6 w-6 border-2 border-emerald-600 border-t-transparent"></span>
            <p style="font-size:13px; color:#475569; margin-top:8px;">กำลังตรวจสอบไฟล์และเปรียบเทียบข้อมูลเดิม...</p>
          </div>
        </div>

        <div style="padding:14px 24px; background:#F8FAFC; border-top:1px solid #E2E8F0; display:flex; justify-content:flex-end; gap:8px;">
          <button class="btn btn-outline btn-sm" onclick="closeImportModal()" style="border-radius:10px;">ยกเลิก</button>
          <button id="btn-confirm-import" class="btn btn-sm" onclick="confirmImport()" style="display:none; background:#10B981; color:white; border:none; border-radius:10px; align-items:center; gap:6px; padding:8px 18px; font-weight:600; cursor:pointer;">
            <span class="material-icons" style="font-size:16px;">check_circle</span>
            <span id="btn-confirm-import-text">ยืนยันนำเข้าข้อมูล</span>
          </button>
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
                <p style="font-size:12px; color:#64748B; margin:3px 0 0 0;">ส่งออกเฉพาะรายชื่อที่ตรงกับตัวกรอง สาขา ชั้นปี สถานะ หรือคำค้นหาปัจจุบัน</p>
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
                  <span id="export-all-title" style="font-size:13.5px; font-weight:700; color:#1E293B;">นิสิตทั้งหมดในระบบ (All Students)</span>
                  <span id="export-count-all" style="font-size:11px; font-weight:700; background:#F1F5F9; color:#475569; padding:2px 8px; border-radius:999px;">0 รายการ</span>
                </div>
                <p style="font-size:12px; color:#64748B; margin:3px 0 0 0;">ส่งออกข้อมูลนิสิตทุกชั้นปีและทุกสถานะในแท็บปัจจุบัน</p>
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

export default function AdminDashboardPage() {
  return (
    <PageShell
      pageKey="dashboard_รายวิชา"
      title={PAGE_TITLE}
      styles={PAGE_STYLES}
      scripts={PAGE_SCRIPTS}
      bodyHtml={PAGE_BODY_HTML}
    />
  );
}
