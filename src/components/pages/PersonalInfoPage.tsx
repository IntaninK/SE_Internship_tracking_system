"use client";

import React from "react";
import PageShell from "./PageShell";

const PAGE_TITLE = "ตรวจสอบและกรอกข้อมูลส่วนตัวนิสิต - คณะ ICT ม.พะเยา";
const PAGE_STYLES: string[] = [];
const PAGE_SCRIPTS: string[] = [
  "../components/header.js",
  "../api/personal_info.js"
];
const PAGE_BODY_HTML = `
  <!-- ===== Header Bar ===== -->
  <div id="header-placeholder"></div>

  <!-- ===== Main Content ===== -->
  <main class="main-content">

    <!-- [REQ-04] Policy Banner -->
    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:14px; margin-bottom:20px;">
      <div style="background:#FEF2F2; border:1px solid #FECACA; border-radius:16px; padding:14px 18px; display:flex; align-items:flex-start; gap:10px;">
        <span class="material-icons" style="color:#DC2626; font-size:20px; margin-top:2px;">lock</span>
        <div>
          <div style="font-size:13px; font-weight:700; color:#991B1B;">[REQ-04] ข้อมูลที่ดึงจากระบบทะเบียน REG (🔒 ล็อคห้ามแก้ไข)</div>
          <div style="font-size:12px; color:#B91C1C; margin-top:2px;">รหัสนิสิต, ชื่อ-นามสกุล, ชั้นปี, สาขาวิชา และเกรดเฉลี่ยสะสม (GPAX) ถูกล็อคตามข้อมูลทะเบียน</div>
        </div>
      </div>
      <div style="background:#ECFDF5; border:1px solid #A7F3D0; border-radius:16px; padding:14px 18px; display:flex; align-items:flex-start; gap:10px;">
        <span class="material-icons" style="color:#059669; font-size:20px; margin-top:2px;">edit_note</span>
        <div>
          <div style="font-size:13px; font-weight:700; color:#065F46;">ข้อมูลติดต่อที่อนุญาตให้นิสิตกรอก/แก้ไขได้ (✏️ Editable)</div>
          <div style="font-size:12px; color:#047857; margin-top:2px;">เบอร์โทรศัพท์ที่ติดต่อได้จริง, Line ID, Facebook และชื่อ-สกุลภาษาอังกฤษ</div>
        </div>
      </div>
    </div>

    <div class="card">
      <!-- Card Header -->
      <div class="card-header">
        <span class="material-icons header-icon">how_to_reg</span>
        <h2 class="card-title">ข้อมูลส่วนตัวนิสิต (Student Profile &amp; Contact Information)</h2>
      </div>

      <!-- Card Body — Form -->
      <div class="card-body">
        <form id="student-form" class="form-grid">

          <!-- ชื่อ-สกุล (ไทย) -->
          <div class="form-group">
            <label class="form-label" style="display:flex; align-items:center; gap:6px;">
              <span>ชื่อ-สกุล (ไทย) *</span>
              <span class="srs-reg-lock-tag">🔒 ข้อมูล REG</span>
            </label>
            <input type="text" id="nameTh" name="nameTh" class="input-field" required placeholder="นาย ทอง หลังอิ่ม" />
          </div>

          <!-- Name & Surname (English) -->
          <div class="form-group">
            <label class="form-label" style="display:flex; align-items:center; gap:6px;">
              <span>Name &amp; Surname (English) *</span>
              <span class="srs-editable-tag">✏️ แก้ไขได้</span>
            </label>
            <input type="text" id="nameEn" name="nameEn" class="input-field" required placeholder="Thong Lang-im" />
          </div>

          <!-- รหัสนิสิต -->
          <div class="form-group">
            <label class="form-label" style="display:flex; align-items:center; gap:6px;">
              <span>รหัสนิสิต *</span>
              <span class="srs-reg-lock-tag">🔒 ข้อมูล REG</span>
            </label>
            <input type="text" id="studentCode" name="studentCode" class="input-field" required placeholder="670xxxxx" />
          </div>

          <!-- E-mail -->
          <div class="form-group">
            <label class="form-label" style="display:flex; align-items:center; gap:6px;">
              <span>E-mail (@up.ac.th)</span>
              <span class="srs-reg-lock-tag">🔒 บัญชีมหาวิทยาลัย</span>
            </label>
            <input type="email" id="email" class="input-field" readonly style="background-color: #F8FAFC;" />
          </div>

          <!-- ชั้นปีที่ (dropdown) -->
          <div class="form-group">
            <label class="form-label" style="display:flex; align-items:center; gap:6px;">
              <span>ชั้นปีที่</span>
              <span class="srs-reg-lock-tag">🔒 ข้อมูล REG</span>
            </label>
            <select id="year" name="year" class="input-field">
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3" selected>3</option>
              <option value="4">4</option>
            </select>
          </div>

          <!-- เกรดเฉลี่ย -->
          <div class="form-group">
            <label class="form-label" style="display:flex; align-items:center; gap:6px;">
              <span>เกรดเฉลี่ยสะสม (GPAX)</span>
              <span class="srs-reg-lock-tag">🔒 ข้อมูล REG</span>
            </label>
            <input type="number" step="0.01" min="0" max="4.00" id="gpa" name="gpa" class="input-field" placeholder="3.67" />
          </div>

          <!-- เบอร์โทร -->
          <div class="form-group">
            <label class="form-label" style="display:flex; align-items:center; gap:6px;">
              <span>เบอร์โทรศัพท์ที่ติดต่อได้จริง</span>
              <span class="srs-editable-tag">✏️ แก้ไขได้</span>
            </label>
            <input type="tel" id="phone" name="phone" class="input-field" placeholder="08xxxxxxxx" />
          </div>

          <!-- Facebook -->
          <div class="form-group">
            <label class="form-label" style="display:flex; align-items:center; gap:6px;">
              <span>Facebook</span>
              <span class="srs-editable-tag">✏️ แก้ไขได้</span>
            </label>
            <input type="text" id="facebook" name="facebook" class="input-field" placeholder="Facebook Profile URL หรือ ชื่อ" />
          </div>

          <!-- Line ID -->
          <div class="form-group full-width" style="max-width:calc(50% - 14px)">
            <label class="form-label" style="display:flex; align-items:center; gap:6px;">
              <span>Line ID</span>
              <span class="srs-editable-tag">✏️ แก้ไขได้</span>
            </label>
            <input type="text" id="lineId" name="lineId" class="input-field" placeholder="Line ID สำหรับติดต่อกับอาจารย์ที่ปรึกษา" />
          </div>

          <!-- Submit Button -->
          <div class="btn-submit-wrap mt-8 w-full full-width flex justify-center" style="grid-column: 1 / -1;">
            <button type="submit" id="submit-btn"
              class="btn btn-success btn-lg inline-flex items-center justify-center gap-2 px-10 py-3.5 rounded-full text-white font-bold text-lg shadow-lg cursor-pointer transition">
              <span class="material-icons">check_circle</span>
              <span>ยืนยันข้อมูลและไปขั้นตอนถัดไป</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </main>
`;

export default function PersonalInfoPage() {
  return (
    <PageShell
      pageKey="Personal_Information"
      title={PAGE_TITLE}
      styles={PAGE_STYLES}
      scripts={PAGE_SCRIPTS}
      bodyHtml={PAGE_BODY_HTML}
    />
  );
}
