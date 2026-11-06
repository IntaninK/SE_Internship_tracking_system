"use client";

import React from "react";
import PageShell from "./PageShell";

const PAGE_TITLE = "Profile ข้อมูลส่วนตัวนิสิต - คณะ ICT ม.พะเยา";
const PAGE_STYLES: string[] = [];
const PAGE_SCRIPTS: string[] = [
  "../components/header.js",
  "../api/profile_view.js"
];
const PAGE_BODY_HTML = `
  <!-- Header Bar -->
  <div id="header-placeholder"></div>

  <!-- Main Content -->
  <main class="main-content">
    <section class="card">
      <div class="card-header" style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px;">
        <div style="display:flex; align-items:center; gap:10px;">
          <span class="material-icons header-icon">person</span>
          <h2 class="card-title">ข้อมูลส่วนตัวนิสิต (Student Personal Data)</h2>
        </div>
        <div style="display:flex; align-items:center; gap:6px;">
          <span class="srs-reg-lock-tag">🔒 ข้อมูลวิชาการจากระบบ REG</span>
          <span class="srs-editable-tag">✏️ แก้ไขข้อมูลติดต่อได้ที่ปุ่มด้านล่าง</span>
        </div>
      </div>

      <div class="card-body">
        <div class="flex flex-wrap gap-[28px_40px] mb-6 max-[900px]:flex-col max-[900px]:items-center">
          <div class="w-[230px] min-w-[180px] max-w-[230px] h-[296px] rounded-[18px] border border-slate-200 shadow-sm overflow-hidden flex items-center justify-center bg-slate-100 shrink mx-auto" style="flex-basis: 230px;">
            <img id="p-photo" src="" alt="Profile Photo" class="w-full h-full object-cover" style="display: none;" />
            <span id="p-icon" class="material-icons text-[88px] text-gray-400">person</span>
          </div>

          <div class="flex-1 min-w-[280px] flex flex-col gap-4 max-[900px]:w-full max-[900px]:min-w-0" style="flex: 1 1 320px;">
            <!-- Row 1 -->
            <div class="flex flex-wrap gap-4">
              <div class="flex flex-col gap-1.5" style="flex: 1.4 1 220px;">
                <label class="text-xs font-bold text-slate-600 flex items-center gap-1.5">ชื่อ-สกุล (ไทย) <span class="srs-reg-lock-tag">🔒 REG</span></label>
                <input class="input-field font-semibold" id="p-nameTh" readonly />
              </div>
              <div class="flex flex-col gap-1.5" style="flex: 1 1 150px;">
                <label class="text-xs font-bold text-slate-600 flex items-center gap-1.5">รหัสนิสิต <span class="srs-reg-lock-tag">🔒 REG</span></label>
                <input class="input-field font-semibold" id="p-studentCode" readonly />
              </div>
            </div>

            <!-- Row 2 -->
            <div class="flex flex-wrap gap-4">
              <div class="flex flex-col gap-1.5" style="flex: 1.4 1 220px;">
                <label class="text-xs font-bold text-slate-600">Name &amp; Surname (English)</label>
                <input class="input-field font-medium" id="p-nameEn" readonly />
              </div>
              <div class="flex flex-col gap-1.5" style="flex: 1 1 150px;">
                <label class="text-xs font-bold text-slate-600 flex items-center gap-1.5">ชั้นปีที่ <span class="srs-reg-lock-tag">🔒 REG</span></label>
                <input class="input-field font-medium" id="p-year" readonly />
              </div>
            </div>

            <!-- Row 3 -->
            <div class="flex flex-wrap gap-4">
              <div class="flex flex-col gap-1.5" style="flex: 1.3 1 200px;">
                <label class="text-xs font-bold text-slate-600">อาจารย์ที่ปรึกษา</label>
                <input class="input-field font-medium" id="p-advisor" readonly />
              </div>
              <div class="flex flex-col gap-1.5" style="flex: 1.3 1 200px;">
                <label class="text-xs font-bold text-slate-600 flex items-center gap-1.5">สาขาวิชา <span class="srs-reg-lock-tag">🔒 REG</span></label>
                <input class="input-field font-medium" id="p-major" readonly />
              </div>
              <div class="flex flex-col gap-1.5" style="flex: 0.8 1 120px;">
                <label class="text-xs font-bold text-slate-600 flex items-center gap-1.5">เกรดเฉลี่ยสะสม (GPAX) <span class="srs-reg-lock-tag">🔒 REG</span></label>
                <input class="input-field font-bold text-indigo-700" id="p-gpa" readonly />
              </div>
            </div>

            <!-- Row 4 -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
              <div class="flex flex-col gap-1">
                <label class="text-xs font-bold text-slate-600">E-mail (@up.ac.th)</label>
                <input class="input-field text-xs" id="p-email" readonly />
              </div>
              <div class="flex flex-col gap-1">
                <label class="text-xs font-bold text-slate-600 flex items-center gap-1">เบอร์โทร <span class="srs-editable-tag">✏️</span></label>
                <input class="input-field text-xs" id="p-phone" readonly />
              </div>
              <div class="flex flex-col gap-1">
                <label class="text-xs font-bold text-slate-600 flex items-center gap-1">Line ID <span class="srs-editable-tag">✏️</span></label>
                <input class="input-field text-xs" id="p-lineId" readonly />
              </div>
              <div class="flex flex-col gap-1">
                <label class="text-xs font-bold text-slate-600 flex items-center gap-1">Facebook <span class="srs-editable-tag">✏️</span></label>
                <input class="input-field text-xs" id="p-facebook" readonly />
              </div>
            </div>
          </div>
        </div>

        <!-- Edit Button -->
        <div class="flex justify-end mt-4 pt-4 border-t border-slate-100">
          <a href="/status-all" class="btn btn-primary btn-md no-underline inline-flex items-center gap-2">
            <span class="material-icons" style="font-size:18px;">edit</span>
            <span>จัดการข้อมูลติดต่อ &amp; เอกสารฝึกงาน</span>
          </a>
        </div>
      </div>
    </section>
  </main>
`;

export default function ProfilePage() {
  return (
    <PageShell
      pageKey="Profile"
      title={PAGE_TITLE}
      styles={PAGE_STYLES}
      scripts={PAGE_SCRIPTS}
      bodyHtml={PAGE_BODY_HTML}
    />
  );
}
