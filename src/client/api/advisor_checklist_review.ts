// @ts-nocheck
// advisor_checklist_review.js — หน้าตรวจ Checklist นิสิตสำหรับอาจารย์ที่ปรึกษา (Figma ภาพที่ 4 & 5)

const params = new URLSearchParams(window.location.search);
const studentId = params.get('studentId');

document.addEventListener('DOMContentLoaded', () => {
  if (!studentId) {
    alert('ไม่พบรหัสนิสิตที่ต้องการตรวจสอบ');
    window.location.href = '/advisor-dashboard';
    return;
  }
  loadStudentChecklistData();
});

async function loadStudentChecklistData() {
  const container = document.getElementById('companies-checklist-container');
  const subtitle = document.getElementById('student-info-subtitle');

  try {
    const res = await fetch(`/api/advisor/students/${studentId}/checklist`);
    const data = await res.json();

    if (!data.success) {
      container.innerHTML = `
        <div class="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-200">
          <span class="material-icons text-5xl text-red-500 mb-3">error_outline</span>
          <p class="text-gray-700 text-lg font-medium">${data.message || 'ไม่สามารถโหลดข้อมูลได้'}</p>
          <a href="/advisor-dashboard" class="inline-block mt-4 px-6 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium no-underline">
            กลับหน้า Dashboard
          </a>
        </div>
      `;
      return;
    }

    const { student, sections, companies, canReview, acceptanceWorkflow, archivedApplications } = data;

    // อัปเดตข้อมูลหัวเว็บ
    if (subtitle) {
      subtitle.textContent = `รหัสนิสิต: ${student.studentCode} | ชื่อ: ${student.nameTh} (${student.nameEn}) | ชั้นปี: ${student.year || '-'} | อีเมล: ${student.email}`;
    }

    container.innerHTML = '';

    // ถ้าไม่มีสิทธิ์ประเมิน (เช่น Admin หรืออาจารย์ท่านอื่นที่ไม่ใช่ที่ปรึกษาของนิสิตคนนี้) ให้แสดง Banner โหมดดูข้อมูลเท่านั้น
    if (!canReview) {
      const banner = document.createElement('div');
      banner.className = 'mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3 text-amber-800 shadow-sm';
      banner.innerHTML = `
        <span class="material-icons text-amber-600 text-2xl">visibility</span>
        <div>
          <p class="font-bold text-sm">โหมดดูข้อมูลเท่านั้น (Read-Only)</p>
          <p class="text-xs text-amber-700">คุณไม่ได้เป็นอาจารย์ที่ปรึกษาของนิสิตคนนี้ จึงไม่สามารถประเมินหรือเปลี่ยนสถานะ Checklist ได้</p>
        </div>
      `;
      container.appendChild(banner);
    }

    // 1. ถ้ามีใบตอบรับที่นิสิตอัปโหลดส่งมา ให้อาจารย์ที่ปรึกษาตรวจอนุมัติก่อนส่งให้ Super Admin
    if (acceptanceWorkflow && acceptanceWorkflow.companyResponseFileUrl) {
      const acceptanceCard = renderAcceptanceReviewCard(acceptanceWorkflow, canReview);
      if (acceptanceCard) container.appendChild(acceptanceCard);
    }

    // 2. ถ้าไม่มีบริษัทรอบปัจจุบัน (เช่น เพิ่งถูกปฏิเสธและยังไม่ยื่นบริษัทใหม่)
    if (!companies || companies.length === 0) {
      const emptyCard = document.createElement('div');
      emptyCard.className = 'bg-white rounded-2xl p-8 text-center shadow-sm border border-gray-200 mb-6';
      if (archivedApplications && archivedApplications.length > 0) {
        emptyCard.innerHTML = `
          <span class="material-icons text-5xl text-amber-500 mb-2">pending_actions</span>
          <h4 class="text-gray-800 text-lg font-bold">นิสิตอยู่ระหว่างรอกรอก Checklist สถานประกอบการแห่งใหม่ (รอบที่ ${archivedApplications.length + 1})</h4>
          <p class="text-gray-500 text-sm mt-1">รอบก่อนหน้าได้รับการบันทึกผลและปลดล็อกเรียบร้อยแล้ว อาจารย์สามารถดูประวัติรอบก่อนหน้าได้ที่ด้านล่าง</p>
        `;
      } else {
        emptyCard.innerHTML = `
          <span class="material-icons text-5xl text-gray-400 mb-3">info</span>
          <p class="text-gray-600 text-lg font-medium">นิสิตยังไม่ได้เพิ่มข้อมูลบริษัทหรือกรอก Checklist</p>
        `;
      }
      container.appendChild(emptyCard);
    } else {
      // Render บริษัทรอบปัจจุบัน
      companies.forEach((comp, idx) => {
        const card = renderCompanyReviewCard(comp, sections, idx, canReview);
        container.appendChild(card);
      });
    }

    // 3. แสดงประวัติรอบก่อนหน้า (Archive) แบบ Accordion (ตามข้อกำหนด SCRUM-73)
    if (archivedApplications && archivedApplications.length > 0) {
      const archiveSection = renderArchivedApplicationsSection(archivedApplications);
      if (archiveSection) container.appendChild(archiveSection);
    }

    // ถ้ามี companyId ส่งมาเจาะจง ให้เลื่อนจอไปยังการ์ดของบริษัทนั้นทันที
    const targetCompId = params.get('companyId');
    if (targetCompId) {
      setTimeout(() => {
        const targetEl = document.getElementById(`company-card-${targetCompId}`);
        if (targetEl) {
          targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 150);
    }

  } catch (err) {
    console.error('Error loading student checklist data:', err);
    container.innerHTML = `
      <div class="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-200">
        <p class="text-red-500 font-medium">เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์</p>
      </div>
    `;
  }
}

function renderCompanyReviewCard(comp, sections, index, canReview = true) {
  const card = document.createElement('div');
  card.className = 'company-card';
  card.id = `company-card-${comp.id}`;

  // Map คำตอบของบริษัทนี้
  const answersMap = {};
  if (comp.answers && Array.isArray(comp.answers)) {
    comp.answers.forEach(a => {
      answersMap[a.checklistItemId] = a;
    });
  }

  // สร้างตาราง 5 Sections
  let sectionsHtml = '';
  sections.forEach(sec => {
    let rowsHtml = '';
    sec.items.forEach(item => {
      const ans = answersMap[item.id] || { checked: false, detail: '' };
      const isChecked = ans.checked === true || ans.checked === 'true';

      rowsHtml += `
        <tr>
          <td class="desc-col">${item.description}</td>
          <td class="check-col">
            <input type="checkbox" class="custom-checkbox" ${isChecked ? 'checked' : ''} disabled />
          </td>
          <td class="detail-col">
            <input type="text" class="detail-input" value="${ans.detail || '-'}" readonly />
          </td>
        </tr>
      `;
    });

    sectionsHtml += `
      <div class="px-6 py-2">
        <h3 class="section-title">
          <span class="material-icons text-blue-600">bookmark</span>
          ${sec.title}
        </h3>
        <table class="checklist-table">
          <thead>
            <tr>
              <th>รายละเอียดที่ต้องพิจารณา</th>
              <th>Checklist</th>
              <th>รายละเอียดเพิ่ม</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </div>
    `;
  });

  // สถานะปัจจุบัน Badge
  let badgeBg = 'bg-yellow-400 text-gray-900';
  let badgeText = '☐ รอผล';
  if (comp.checklistStatus === 'APPROVED') {
    badgeBg = 'bg-green-500 text-white';
    badgeText = '✓ อาจารย์รีวิวแล้ว';
  } else if (comp.checklistStatus === 'REJECTED') {
    badgeBg = 'bg-red-500 text-white';
    badgeText = '✗ ไม่ผ่าน';
  }

  card.innerHTML = `
    <!-- Accordion Header -->
    <div class="company-header" onclick="toggleCompanyAccordion(${comp.id})">
      <div class="flex items-center gap-3 flex-1">
        <span class="material-icons text-2xl">business</span>
        <span class="text-lg font-bold tracking-wide">${comp.name || 'บริษัท...'}</span>
        <span id="badge-company-${comp.id}" class="text-xs px-3 py-1 rounded-full font-semibold ml-2 ${badgeBg}">
          ${badgeText}
        </span>
      </div>
      <div class="flex items-center gap-2">
        <span id="chevron-${comp.id}" class="material-icons text-3xl transition-transform duration-200">expand_less</span>
      </div>
    </div>

    <!-- Accordion Body -->
    <div id="body-${comp.id}" class="company-body p-4 bg-white" style="display: block;">
      ${sectionsHtml}

      <!-- ส่วนผลการประเมินด้านล่าง -->
      <div class="border-t border-gray-200 mt-8 pt-8 px-6 pb-6 bg-gray-50/50 rounded-2xl">
        <div class="max-w-xl mx-auto space-y-6">

          ${canReview ? `
          <!-- Dropdown สถานะผลรีวิว -->
          <div>
            <label class="block text-base font-bold text-gray-800 mb-2">
              สถานะผลรีวิว
            </label>
            <div class="relative">
              <select id="review-status-${comp.id}" class="w-full text-base font-semibold py-3 px-4 rounded-xl border border-gray-300 shadow-sm focus:outline-none focus:border-blue-500 cursor-pointer ${
                comp.checklistStatus === 'APPROVED' ? 'bg-green-100 text-green-800' :
                comp.checklistStatus === 'REJECTED' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
              }" onchange="updateSelectColor(this)">
                <option value="PENDING" ${comp.checklistStatus === 'PENDING' ? 'selected' : ''} class="bg-white text-gray-800">
                  รอผล
                </option>
                <option value="APPROVED" ${comp.checklistStatus === 'APPROVED' ? 'selected' : ''} class="bg-white text-gray-800">
                  อาจารย์รีวิวแล้ว
                </option>
                <option value="REJECTED" ${comp.checklistStatus === 'REJECTED' ? 'selected' : ''} class="bg-white text-gray-800">
                  ไม่ผ่าน/ทำ check list เพิ่ม
                </option>
              </select>
            </div>
          </div>

          <!-- ช่องคอมเมนต์ /หมายเหตุปัญหา -->
          <div>
            <label class="block text-base font-bold text-gray-800 mb-2">
              คอมเมนต์ /หมายเหตุปัญหา
            </label>
            <textarea id="review-note-${comp.id}" rows="3" class="w-full p-3.5 bg-gray-100 border border-gray-300 rounded-xl text-gray-800 text-sm focus:bg-white focus:outline-none focus:border-blue-500 transition" placeholder="หมายเหตุ">${comp.checklistNote || ''}</textarea>
          </div>

          <!-- ปุ่มยืนยันและบันทึก (ภาพที่ 5: ปุ่มสีเขียวขนาดใหญ่) -->
          <div class="flex justify-center pt-4">
            <button type="button" onclick="saveCompanyChecklistReview(${comp.id})" class="w-full sm:w-auto px-12 py-3.5 bg-[#00C853] hover:bg-[#00B248] text-white text-lg font-bold rounded-2xl shadow-md hover:shadow-lg transition cursor-pointer border-none flex items-center justify-center gap-2">
              <span class="material-icons text-2xl">check_circle</span>
              <span>ยืนยันและบันทึก</span>
            </button>
          </div>
          ` : `
          <!-- แสดงผลสถานะแบบ Read-Only สำหรับผู้ที่ไม่มีสิทธิ์ประเมิน เช่น Admin หรืออาจารย์ท่านอื่น -->
          <div class="space-y-4">
            <div>
              <span class="block text-sm font-semibold text-gray-600 mb-2">สถานะผลการตรวจ Checklist ปัจจุบัน:</span>
              <span class="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold ${
                comp.checklistStatus === 'APPROVED' ? 'bg-green-100 text-green-800 border border-green-200' :
                comp.checklistStatus === 'REJECTED' ? 'bg-red-100 text-red-800 border border-red-200' : 'bg-yellow-100 text-yellow-800 border border-yellow-200'
              }">
                <span class="material-icons text-base">${comp.checklistStatus === 'APPROVED' ? 'check_circle' : comp.checklistStatus === 'REJECTED' ? 'cancel' : 'hourglass_empty'}</span>
                <span>${comp.checklistStatus === 'APPROVED' ? 'อาจารย์รีวิวแล้ว (ผ่าน)' : comp.checklistStatus === 'REJECTED' ? 'ไม่ผ่าน/ทำ check list เพิ่ม' : 'รอผลการตรวจ'}</span>
              </span>
            </div>
            <div>
              <span class="block text-sm font-semibold text-gray-600 mb-1.5">คอมเมนต์ / หมายเหตุปัญหา:</span>
              <div class="p-3.5 bg-gray-100 border border-gray-200 rounded-xl text-gray-700 text-sm min-h-[44px]">
                ${comp.checklistNote ? comp.checklistNote : '<span class="text-gray-400 italic">ไม่มีหมายเหตุ</span>'}
              </div>
            </div>
          </div>
          `}

        </div>
      </div>
    </div>
  `;

  return card;
}

// Toggle Accordion
window.toggleCompanyAccordion = function(companyId) {
  const body = document.getElementById(`body-${companyId}`);
  const chevron = document.getElementById(`chevron-${companyId}`);
  if (!body) return;

  if (body.style.display === 'none') {
    body.style.display = 'block';
    if (chevron) chevron.style.transform = 'rotate(0deg)';
  } else {
    body.style.display = 'none';
    if (chevron) chevron.style.transform = 'rotate(-180deg)';
  }
};

// เปลี่ยนสี Dropdown ตามสถานะที่เลือก
window.updateSelectColor = function(selectEl) {
  selectEl.classList.remove('bg-green-100', 'text-green-800', 'bg-red-100', 'text-red-800', 'bg-yellow-100', 'text-yellow-800');
  if (selectEl.value === 'APPROVED') {
    selectEl.classList.add('bg-green-100', 'text-green-800');
  } else if (selectEl.value === 'REJECTED') {
    selectEl.classList.add('bg-red-100', 'text-red-800');
  } else {
    selectEl.classList.add('bg-yellow-100', 'text-yellow-800');
  }
};

// บันทึกผลการตรวจ Checklist ของบริษัท
window.saveCompanyChecklistReview = async function(companyId) {
  const selectEl = document.getElementById(`review-status-${companyId}`);
  const noteEl = document.getElementById(`review-note-${companyId}`);
  if (!selectEl) {
    alert('คุณไม่มีสิทธิ์ประเมิน Checklist สำหรับบริษัทนี้ (สิทธิ์นี้เป็นของอาจารย์ที่ปรึกษาเท่านั้น)');
    return;
  }
  const status = selectEl.value;
  const note = noteEl ? noteEl.value.trim() : '';

  try {
    const res = await fetch(`/api/advisor/companies/${companyId}/checklist-review`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, note }),
    });
    const data = await res.json();

    if (data.success) {
      alert('✅ บันทึกผลการตรวจ Checklist เรียบร้อยแล้ว');
      
      // อัปเดต badge บนหัว Accordion
      const badge = document.getElementById(`badge-company-${companyId}`);
      if (badge) {
        badge.className = 'text-xs px-3 py-1 rounded-full font-semibold ml-2';
        if (status === 'APPROVED') {
          badge.className += ' bg-green-500 text-white';
          badge.textContent = '✓ อาจารย์รีวิวแล้ว';
        } else if (status === 'REJECTED') {
          badge.className += ' bg-red-500 text-white';
          badge.textContent = '✗ ไม่ผ่าน';
        } else {
          badge.className += ' bg-yellow-400 text-gray-900';
          badge.textContent = '☐ รอผล';
        }
      }
    } else {
      alert('เกิดข้อผิดพลาด: ' + data.message);
    }
  } catch (err) {
    console.error('Error saving checklist review:', err);
    alert('เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์');
  }
};

function escapeHtmlText(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderAcceptanceReviewCard(wf, canReview) {
  if (!wf || !wf.companyResponseFileUrl) return null;
  const card = document.createElement('div');
  card.className = 'mb-6 p-6 bg-white rounded-2xl shadow-sm border border-indigo-200';
  
  const ocr = wf.companyResponseOcr;
  let ocrBoxHtml = '';
  if (ocr && ocr.status === 'DONE') {
    const isAccepted = ocr.result === 'ACCEPTED';
    const confPct = Math.round((Number(ocr.confidence) || 0.85) * 100);
    ocrBoxHtml = `
      <div style="background:${isAccepted ? '#ECFDF5' : '#FEF2F2'}; border:1px solid ${isAccepted ? '#6EE7B7' : '#FCA5A5'}; border-radius:10px; padding:10px 14px; margin:12px 0;">
        <div style="font-size:13px; font-weight:800; color:${isAccepted ? '#065F46' : '#991B1B'};">
          🤖 OCR ตรวจพบ: คาดว่า "${isAccepted ? 'บริษัทตอบรับเข้าฝึกงาน' : 'บริษัทปฏิเสธ'}" (${confPct}%)
        </div>
        <div style="font-size:12px; color:${isAccepted ? '#047857' : '#B91C1C'}; margin-top:2px;">
          ${(ocr.reasons && ocr.reasons[0]) || ''}
        </div>
      </div>
    `;
  }

  const isApprovedByAdvisor = wf.companyResponseStatus === 'ADVISOR_APPROVED' || wf.companyResponseStatus === 'ACCEPTED';

  card.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:12px;">
      <div style="display:flex; align-items:center; gap:8px;">
        <span class="material-icons text-indigo-600" style="font-size:26px;">assignment_turned_in</span>
        <div>
          <h3 style="font-size:16px; font-weight:800; color:#1E1B4B; margin:0;">
            ตรวจสอบแบบตอบรับจากสถานประกอบการ (${escapeHtmlText(wf.companyName || 'บริษัท')})
          </h3>
          <p style="font-size:12.5px; color:#64748B; margin:2px 0 0 0;">
            นิสิตได้อัปโหลดเอกสารแบบตอบรับกลับมาแล้ว กรุณาเปิดตรวจสอบความถูกต้องและกดยืนยันผล
          </p>
        </div>
      </div>
      <div>
        <a href="${wf.companyResponseFileUrl}" target="_blank" rel="noopener" style="background:#EEF2FF; color:#312E81; border:1px solid #C7D2FE; padding:7px 14px; border-radius:8px; font-size:12.5px; font-weight:700; text-decoration:none; display:inline-flex; align-items:center; gap:5px;">
          👁️ เปิดดูใบตอบรับที่นิสิตแนบ (PDF / รูปภาพ)
        </a>
      </div>
    </div>
    ${ocrBoxHtml}
    <div style="margin-top:14px; padding-top:12px; border-top:1px solid #E2E8F0; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
      <div>
        ${isApprovedByAdvisor ? `
          <span style="background:#DCFCE7; color:#166534; font-weight:700; padding:5px 12px; border-radius:999px; font-size:12.5px;">
            ✓ อาจารย์ที่ปรึกษาอนุมัติแบบตอบรับแล้ว (ส่งต่อไปยังคิวของ Super Admin แล้ว)
          </span>
        ` : `
          <span style="background:#FEF3C7; color:#92400E; font-weight:700; padding:5px 12px; border-radius:999px; font-size:12.5px;">
            ⏳ รออาจารย์ที่ปรึกษาตรวจและอนุมัติแบบตอบรับ
          </span>
        `}
      </div>
      ${canReview && !isApprovedByAdvisor ? `
        <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
          <input type="text" id="advisor-acceptance-note" placeholder="หมายเหตุ (ถ้ามี)..." class="input-field" style="padding:6px 10px; font-size:12px; border:1px solid #CBD5E1; border-radius:8px; width:200px;" />
          <button type="button" onclick="window.advisorReviewAcceptance('APPROVED')" style="background:#10B981; color:white; border:none; padding:7px 14px; border-radius:8px; font-size:12.5px; font-weight:700; cursor:pointer;">
            ✓ อนุมัติแบบตอบรับ
          </button>
          <button type="button" onclick="window.advisorReviewAcceptance('REJECTED')" style="background:#EF4444; color:white; border:none; padding:7px 14px; border-radius:8px; font-size:12.5px; font-weight:700; cursor:pointer;">
            ✗ ไม่อนุมัติ / บริษัทปฏิเสธ
          </button>
        </div>
      ` : ''}
    </div>
  `;
  return card;
}

window.advisorReviewAcceptance = async function(status) {
  const note = document.getElementById('advisor-acceptance-note')?.value?.trim() || '';
  if (status === 'REJECTED' && !confirm('ยืนยันไม่อนุมัติแบบตอบรับนี้ใช่หรือไม่? ระบบจะบันทึกประวัติเข้า Archive และปลดล็อกให้นิสิตยื่นบริษัทใหม่')) {
    return;
  }
  try {
    const res = await fetch('/api/advisor/documents/review-acceptance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId, status, note }),
    });
    const data = await res.json();
    if (data.success) {
      alert('✅ ' + data.message);
      window.location.reload();
    } else {
      alert('เกิดข้อผิดพลาด: ' + (data.message || 'บันทึกไม่สำเร็จ'));
    }
  } catch (err) {
    console.error(err);
    alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
  }
};

function renderArchivedApplicationsSection(archives) {
  if (!archives || archives.length === 0) return null;
  const section = document.createElement('div');
  section.className = 'mt-8 bg-slate-50 border border-slate-200 rounded-2xl p-6';
  section.innerHTML = `
    <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:14px; flex-wrap:wrap; gap:8px;">
      <div style="display:flex; align-items:center; gap:8px;">
        <span class="material-icons text-slate-500">inventory_2</span>
        <h3 style="font-size:15px; font-weight:800; color:#1E293B; margin:0;">
          📜 ประวัติการยื่น Checklist รอบก่อนหน้า (Archive - ${archives.length} รายการ)
        </h3>
      </div>
      <span style="font-size:12px; color:#64748B;">ตามข้อกำหนด SCRUM-73 (พับเก็บและกางดูข้อมูลเดิมได้)</span>
    </div>
    <div style="display:flex; flex-direction:column; gap:10px;">
      ${archives.map((a, idx) => `
        <div style="background:white; border:1px solid #E2E8F0; border-radius:12px; padding:12px 16px;">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
            <div>
              <span style="font-weight:800; color:#1E1B4B; font-size:14px;">รอบที่ ${idx + 1}: ${escapeHtmlText(a.companyName)}</span>
              <span style="font-size:12.5px; color:#475569; margin-left:8px;">ตำแหน่ง: ${escapeHtmlText(a.position || 'นิสิตฝึกงาน')}</span>
              <span style="background:#FEE2E2; color:#991B1B; font-size:11px; font-weight:700; padding:2px 8px; border-radius:999px; margin-left:8px;">
                ${a.reason === 'COMPANY_REJECTED' ? '✗ สถานประกอบการปฏิเสธ' : '✗ อาจารย์ที่ปรึกษาไม่อนุมัติ'}
              </span>
              <div style="font-size:12px; color:#64748B; margin-top:3px;">
                หมายเหตุ: ${escapeHtmlText(a.note || '-')}
              </div>
            </div>
            <div style="display:flex; align-items:center; gap:8px;">
              <span style="font-size:11.5px; color:#94A3B8;">${new Date(a.archivedAt).toLocaleDateString('th-TH')}</span>
              ${a.fileUrl ? `
                <a href="${a.fileUrl}" target="_blank" rel="noopener" style="background:#F1F5F9; color:#334155; border:1px solid #CBD5E1; padding:3px 8px; border-radius:6px; font-size:11px; font-weight:600; text-decoration:none;">
                  📎 ไฟล์เดิม
                </a>
              ` : ''}
              ${Array.isArray(a.answers) && a.answers.length > 0 ? `
                <button type="button" onclick="window.toggleArchivedChecklistAnswers(${idx})" style="background:#EFF6FF; color:#1D4ED8; border:1px solid #BFDBFE; padding:3px 9px; border-radius:6px; font-size:11px; font-weight:700; cursor:pointer;">
                  👁️ ดูคำตอบ Checklist เดิม (${a.answers.length} ข้อ)
                </button>
              ` : ''}
            </div>
          </div>
          ${Array.isArray(a.answers) && a.answers.length > 0 ? `
            <div id="advisor-archived-answers-${idx}" style="display:none; margin-top:10px; border-top:1px dashed #CBD5E1; padding-top:10px; font-size:12px;">
              <div style="font-weight:700; color:#334155; margin-bottom:6px;">รายการ Checklist ที่นิสิตเคยตอบไว้:</div>
              <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:6px;">
                ${a.answers.map(ans => `
                  <div style="display:flex; align-items:flex-start; gap:6px; color:#334155; background:#F8FAFC; padding:5px 8px; border-radius:6px;">
                    <span>${ans.checked ? '☑️' : '⬜'}</span>
                    <span style="flex:1;">${escapeHtmlText(ans.description)} ${ans.detail ? `<span style="color:#2563EB;">(${escapeHtmlText(ans.detail)})</span>` : ''}</span>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}
        </div>
      `).join('')}
    </div>
  `;
  return section;
}

window.toggleArchivedChecklistAnswers = function(idx) {
  const el = document.getElementById(`advisor-archived-answers-${idx}`);
  if (el) {
    el.style.display = el.style.display === 'none' ? 'block' : 'none';
  }
};
