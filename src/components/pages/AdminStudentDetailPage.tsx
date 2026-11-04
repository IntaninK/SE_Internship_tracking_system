"use client";

import React from "react";
import PageShell from "./PageShell";

const PAGE_TITLE = "ตรวจสอบข้อมูลและสถานะนิสิตรายบุคคล - คณะ ICT ม.พะเยา";
const PAGE_STYLES: string[] = [];
const PAGE_SCRIPTS: string[] = [
  "../components/header.js",
  "../api/admin_student_detail.js",
  "../api/cv_previews.js"
];
const PAGE_BODY_HTML = `
  <div id="header-placeholder"></div>

  <main class="main-content">

    <!-- ปุ่มกลับ + ป้ายสถานะ -->
    <div style="margin-bottom: 18px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px;">
      <a href="/pages/dashboard_รายวิชา.html" style="display:inline-flex; align-items:center; gap:6px; background:#FFFFFF; border:1px solid #CBD5E1; color:#1E293B; padding:8px 16px; border-radius:12px; text-decoration:none; font-weight:600; font-size:13.5px; box-shadow:0 2px 6px rgba(15,23,42,0.04);">
        <span class="material-icons" style="font-size:18px; color:#4338CA;">arrow_back</span> กลับหน้า Dashboard
      </a>
      <div style="display:flex; align-items:center; gap:8px;">
        <span class="srs-reg-lock-tag">🔒 ข้อมูลวิชาการจากระบบ REG</span>
        <span class="srs-editable-tag">📋 ตรวจสอบ 7 ขั้นตอนครบวงจร</span>
      </div>
    </div>

    <!-- 1. ข้อมูลนิสิต (อ่านอย่างเดียว) -->
    <section class="card">
      <div class="card-header" style="display: flex; align-items: center; justify-content: space-between;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <span class="material-icons header-icon">person</span>
          <h2 class="card-title" id="student-header-name">กำลังโหลด...</h2>
        </div>
        <div id="student-dropped-badge" style="display: none;">
          <span style="background: #FEE2E2; color: #B91C1C; font-size: 12.5px; font-weight: 700; padding: 4px 12px; border-radius: 999px; display: inline-flex; align-items: center; gap: 4px; border: 1px solid #FCA5A5;">
            <span class="material-icons" style="font-size: 16px;">person_off</span> นิสิตที่ดรอป
          </span>
        </div>
      </div>
      <div class="card-body">
        <div class="flex flex-wrap gap-[28px_40px] mb-6 max-[900px]:flex-col max-[900px]:items-center">
          <div class="w-[220px] min-w-[180px] max-w-[220px] h-[285px] rounded-[18px] border border-slate-200 shadow-sm overflow-hidden flex items-center justify-center bg-slate-100 shrink mx-auto" style="flex-basis: 220px;">
            <img id="student-photo" src="" alt="Profile Photo" class="w-full h-full object-cover" style="display: none;" />
          </div>

          <div class="flex-1 min-w-[280px] flex flex-col gap-4 max-[900px]:w-full max-[900px]:min-w-0" style="flex: 1 1 320px;">
            <!-- Row 1 -->
            <div class="flex flex-wrap gap-4">
              <div class="flex flex-col gap-1.5" style="flex: 1.4 1 220px;">
                <label class="text-xs font-bold text-slate-600 flex items-center gap-1.5">ชื่อ-สกุล (ไทย) <span class="srs-reg-lock-tag">🔒 REG</span></label>
                <input class="input-field font-semibold" id="d-nameTh" readonly />
              </div>
              <div class="flex flex-col gap-1.5" style="flex: 1 1 150px;">
                <label class="text-xs font-bold text-slate-600 flex items-center gap-1.5">รหัสนิสิต <span class="srs-reg-lock-tag">🔒 REG</span></label>
                <input class="input-field font-semibold" id="d-studentCode" readonly />
              </div>
            </div>

            <!-- Row 2 -->
            <div class="flex flex-wrap gap-4">
              <div class="flex flex-col gap-1.5" style="flex: 1.4 1 220px;">
                <label class="text-xs font-bold text-slate-600">Name &amp; Surname (English)</label>
                <input class="input-field font-medium" id="d-nameEn" readonly />
              </div>
              <div class="flex flex-col gap-1.5" style="flex: 1 1 150px;">
                <label class="text-xs font-bold text-slate-600 flex items-center gap-1.5">ชั้นปีที่ <span class="srs-reg-lock-tag">🔒 REG</span></label>
                <input class="input-field font-medium" id="d-year" readonly />
              </div>
            </div>

            <!-- Row 3 -->
            <div class="flex flex-wrap gap-4">
              <div class="flex flex-col gap-1.5" style="flex: 1.3 1 200px;">
                <label class="text-xs font-bold text-slate-600">อาจารย์ที่ปรึกษา</label>
                <input class="input-field font-medium" id="student-detail-advisor" readonly />
              </div>
              <div class="flex flex-col gap-1.5" style="flex: 1.3 1 200px;">
                <label class="text-xs font-bold text-slate-600 flex items-center gap-1.5">สาขาวิชา <span class="srs-reg-lock-tag">🔒 REG</span></label>
                <input class="input-field font-medium" id="d-major" readonly />
              </div>
              <div class="flex flex-col gap-1.5" style="flex: 0.8 1 120px;">
                <label class="text-xs font-bold text-slate-600 flex items-center gap-1.5">GPAX <span class="srs-reg-lock-tag">🔒 REG</span></label>
                <input class="input-field font-bold text-indigo-700" id="d-gpa" readonly />
              </div>
            </div>

            <!-- Row 4: Contact Info -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
              <div class="flex flex-col gap-1">
                <label class="text-xs font-bold text-slate-600">E-mail (@up.ac.th)</label>
                <input class="input-field text-xs" id="student-detail-email" readonly />
              </div>
              <div class="flex flex-col gap-1">
                <label class="text-xs font-bold text-slate-600">เบอร์โทรศัพท์ติดต่อ</label>
                <input class="input-field text-xs" id="d-phone" readonly />
              </div>
              <div class="flex flex-col gap-1">
                <label class="text-xs font-bold text-slate-600">Line ID</label>
                <input class="input-field text-xs" id="d-lineId" readonly />
              </div>
              <div class="flex flex-col gap-1">
                <label class="text-xs font-bold text-slate-600">Facebook</label>
                <input class="input-field text-xs" id="d-facebook" readonly />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 2. ชั่วโมงการอบรม & กิจกรรมเตรียมความพร้อม (อาจารย์ประจำวิชาตรวจและเพิ่มชั่วโมงได้) -->
    <section class="card">
      <div class="card-header" style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px;">
        <div style="display:flex; align-items:center; gap:10px;">
          <span class="material-icons header-icon">assignment</span>
          <div>
            <h2 class="card-title" style="margin:0;">ชั่วโมงการอบรม &amp; กิจกรรมเตรียมความพร้อม (Hard / Soft Skill)</h2>
            <p style="margin:2px 0 0 0; font-size:11.5px; color:#E0E7FF;">เกณฑ์ผ่านก่อนออกฝึกงาน: Soft Skill ≥ 12 ชม. และ Hard Skill ≥ 18 ชม. (รวม ≥ 30 ชม.)</p>
          </div>
        </div>
        <span id="training-summary-text" style="background:rgba(255,255,255,0.16); color:white; padding:4px 12px; border-radius:999px; font-size:12px; font-weight:700;"></span>
      </div>
      <div class="card-body">

        <!-- กล่องเพิ่มชั่วโมงกิจกรรมคณะสำหรับอาจารย์ประจำวิชา / เจ้าหน้าที่คณะ (Hackathon, Project Day, Co-op) -->
        <div id="admin-add-training-box" style="display:none; margin-bottom:20px; padding:16px 20px; background:#F8FAFC; border:1px solid #CBD5E1; border-radius:16px;">
          <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px; margin-bottom:10px;">
            <div style="display:flex; align-items:center; gap:6px; font-size:13.5px; font-weight:700; color:#1E1B4B;">
              <span class="material-icons" style="font-size:18px; color:#4338CA;">add_task</span>
              <span>เพิ่ม/บันทึกชั่วโมงกิจกรรมเตรียมความพร้อมโดยอาจารย์ประจำวิชา (อนุมัติอัตโนมัติ)</span>
            </div>
            <div style="display:flex; gap:6px; flex-wrap:wrap;">
              <button type="button" onclick="fillPresetTraining('กิจกรรม ICT Hackathon', 'HARD', 12)" style="font-size:11px; font-weight:600; padding:3px 10px; border-radius:999px; background:#EDE9FE; color:#5B21B6; border:1px solid #DDD6FE; cursor:pointer;">+ Hackathon (Hard 12 ชม.)</button>
              <button type="button" onclick="fillPresetTraining('กิจกรรม ICT Project Day', 'HARD', 6)" style="font-size:11px; font-weight:600; padding:3px 10px; border-radius:999px; background:#DBEAFE; color:#1E40AF; border:1px solid #BFDBFE; cursor:pointer;">+ Project Day (Hard 6 ชม.)</button>
              <button type="button" onclick="fillPresetTraining('อบรมเตรียมความพร้อมสหกิจศึกษา (Co-op)', 'SOFT', 6)" style="font-size:11px; font-weight:600; padding:3px 10px; border-radius:999px; background:#D1FAE5; color:#065F46; border:1px solid #A7F3D0; cursor:pointer;">+ Co-op (Soft 6 ชม.)</button>
            </div>
          </div>
          <div style="display:flex; flex-wrap:wrap; gap:10px; align-items:flex-end;">
            <div style="flex:2; min-width:200px;">
              <label style="font-size:12px; font-weight:600; color:#475569;">ชื่อกิจกรรมอบรม / โครงการคณะ</label>
              <input type="text" id="admin-new-training-title" class="input-field" placeholder="เช่น กิจกรรม ICT Hackathon หรือ อบรมเตรียมความพร้อม..." style="margin-top:4px;" />
            </div>
            <div style="flex:1; min-width:130px;">
              <label style="font-size:12px; font-weight:600; color:#475569;">ประเภททักษะ</label>
              <select id="admin-new-training-type" class="input-field" style="margin-top:4px;">
                <option value="HARD">Hard Skill</option>
                <option value="SOFT">Soft Skill</option>
              </select>
            </div>
            <div style="width:110px;">
              <label style="font-size:12px; font-weight:600; color:#475569;">จำนวนชั่วโมง</label>
              <input type="number" id="admin-new-training-hours" class="input-field" min="1" value="6" style="margin-top:4px; text-align:center;" />
            </div>
            <button type="button" class="btn btn-primary btn-sm" onclick="submitAdminAddTraining()" style="height:40px; padding:0 18px; display:inline-flex; align-items:center; gap:5px;">
              <span class="material-icons" style="font-size:16px;">add_circle</span> เพิ่มชั่วโมง
            </button>
          </div>
        </div>

        <table class="data-table">
          <thead>
            <tr>
              <th>ลำดับ</th>
              <th>ชื่อกิจกรรมอบรม / Certificate</th>
              <th>ประเภทชั่วโมง</th>
              <th>จำนวนชั่วโมง</th>
              <th style="text-align:center;">
                <label style="cursor:pointer; display:inline-flex; align-items:center; gap:6px;">
                  <input type="checkbox" id="training-select-all" style="width:16px; height:16px; cursor:pointer; accent-color:#4338CA;" title="เลือกทั้งหมด" />
                  <span>เลือก / สถานะ</span>
                </label>
              </th>
              <th class="text-center">หลักฐาน</th>
            </tr>
          </thead>
          <tbody id="admin-trainings-tbody">
            <tr><td colspan="6" class="text-center py-4 text-gray-400">กำลังโหลด...</td></tr>
          </tbody>
        </table>

        <!-- การอนุมัติชั่วโมงอบรม + คอมเมนต์ -->
        <div id="training-approval-area" style="display:none; margin-top:20px; gap:20px; flex-wrap:wrap; background:#F8FAFC; padding:16px 20px; border-radius:16px; border:1px solid #E2E8F0;">
          <div style="flex:1; min-width:240px;">
            <label style="font-size:13.5px; font-weight:700; color:#1E293B; margin-bottom:6px; display:block;">การอนุมัติชั่วโมงอบรม Soft/Hard Skills ที่ติ๊กเลือก</label>
            <select class="input-field" id="training-batch-status" style="width:100%;">
              <option value="APPROVED">✓ ผ่าน / อนุมัติชั่วโมงอบรม</option>
              <option value="REJECTED">✗ ไม่ผ่าน / ใบ Cert ไม่ถูกต้อง</option>
            </select>
          </div>
          <div style="flex:1; min-width:240px;">
            <label style="font-size:13.5px; font-weight:700; color:#1E293B; margin-bottom:6px; display:block;">คอมเมนต์ / หมายเหตุถึงนิสิต</label>
            <textarea class="input-field" id="training-batch-note" rows="2" placeholder="ระบุหมายเหตุ (ถ้ามี)..." style="width:100%; resize:vertical;"></textarea>
          </div>
        </div>
        <div id="training-save-area" style="display:none; margin-top:14px;">
          <button class="btn btn-primary btn-md" onclick="saveBatchTrainingStatus()">
            <span class="material-icons">save</span> บันทึกสถานะชั่วโมงอบรมที่เลือก
          </button>
        </div>

      </div>
    </section>

    <!-- 3. กรอกใบ CV (admin ตรวจได้) -->
    <section class="card">
      <div class="card-header">
        <span class="material-icons header-icon">description</span>
        <h2 class="card-title">เรซูเม่ / ใบ CV (ตรวจสอบความพร้อมก่อนยื่นบริษัท)</h2>
      </div>
      <div class="card-body" id="admin-cv-section">
        <p class="text-gray-400 text-center py-4">กำลังโหลด...</p>
      </div>
    </section>

    <!-- 4. Checklist บริษัท (อ่านอย่างเดียว — อาจารย์ที่ปรึกษาตรวจ) -->
    <section class="card">
      <div class="card-header">
        <span class="material-icons header-icon">checklist</span>
        <h2 class="card-title">แบบสำรวจสถานประกอบการ (Checklist สูงสุด 3 บริษัท) [REQ-05]</h2>
      </div>
      <div class="card-body">
        <table class="data-table">
          <thead>
            <tr>
              <th>ลำดับ</th>
              <th>ชื่อสถานประกอบการใน Checklist</th>
              <th>สถานะการประเมินจากที่ปรึกษา</th>
              <th class="text-center">รายละเอียด</th>
            </tr>
          </thead>
          <tbody id="admin-companies-tbody">
            <tr><td colspan="4" class="text-center py-4 text-gray-400">กำลังโหลด...</td></tr>
          </tbody>
        </table>

        <!-- สถานะผลรีวิว -->
        <div id="checklist-review-status" style="margin-top:20px; text-align:center; display:none;">
          <p style="font-size:13px; font-weight:700; color:#475569; margin-bottom:8px;">สรุปสถานะผลรีวิว Checklist จากอาจารย์ที่ปรึกษา</p>
          <div id="checklist-review-badge"></div>
        </div>
      </div>
    </section>

    <!-- Modal: ดูตัวอย่าง Checklist -->
    <div id="checklist-modal" style="display:none; position:fixed; inset:0; background:rgba(15,23,42,0.55); z-index:1000; justify-content:center; align-items:center; backdrop-filter:blur(4px);">
      <div style="background:white; border-radius:20px; padding:24px 28px; width:740px; max-width:92%; max-height:85vh; overflow-y:auto; box-shadow:0 25px 60px rgba(15,23,42,0.3);">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
          <h3 style="font-size:18px; font-weight:700; color:#1E293B;" id="checklist-modal-title">Checklist</h3>
          <button onclick="closeChecklistModal()" style="background:none; border:none; cursor:pointer;">
            <span class="material-icons" style="color:#94A3B8;">close</span>
          </button>
        </div>
        <div id="checklist-modal-body">
          <p class="text-gray-400 text-center py-4">กำลังโหลด...</p>
        </div>
      </div>
    </div>

    <!-- 5. สถานะการยื่น (อ่านอย่างเดียว — นิสิตตั้งเอง) -->
    <section class="card">
      <div class="card-header">
        <span class="material-icons header-icon">send</span>
        <h2 class="card-title">สถานะการสมัครและผลสัมภาษณ์ <span style="font-size:12px; color:#E0E7FF; font-weight:normal;">(นิสิตเป็นผู้รายงานผล)</span></h2>
      </div>
      <div class="card-body">
        <table class="data-table">
          <thead>
            <tr><th>ลำดับ</th><th>ชื่อสถานประกอบการ</th><th>ผลการยื่นสมัคร / สัมภาษณ์</th></tr>
          </thead>
          <tbody id="admin-submissions-tbody">
            <tr><td colspan="3" class="text-center py-4 text-gray-400">กำลังโหลด...</td></tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- 6. ข้อมูลบริษัท ที่เข้าฝึกงาน (พร้อม [REQ-06] Match Verification) -->
    <section class="card" id="admin-placement-section" style="display:none;">
      <div class="card-header">
        <span class="material-icons header-icon">business</span>
        <h2 class="card-title">ข้อมูลสถานประกอบการจริงที่เข้าฝึกงาน &amp; การตรวจสอบความตรงกัน [REQ-06]</h2>
      </div>
      <div class="card-body" id="admin-placement-body">
        <p class="text-gray-400 text-center py-4">กำลังโหลด...</p>
      </div>
    </section>

    <!-- 7. สรุปข้อมูลเอกสาร -->
    <section class="card">
      <div class="card-header">
        <span class="material-icons header-icon">summarize</span>
        <h2 class="card-title">สรุปความพร้อมและสถานะเอกสารครบวงจร</h2>
      </div>
      <div class="card-body" id="admin-summary-body">
        <p class="text-gray-400 text-center py-4">กำลังโหลด...</p>
      </div>
    </section>

  </main>
`;

export default function AdminStudentDetailPage() {
  return (
    <PageShell
      pageKey="admin_student_detail"
      title={PAGE_TITLE}
      styles={PAGE_STYLES}
      scripts={PAGE_SCRIPTS}
      bodyHtml={PAGE_BODY_HTML}
    />
  );
}
