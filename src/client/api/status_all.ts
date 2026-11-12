// @ts-nocheck
// status_all.js - หน้าตั้งค่าปรับเปลี่ยน 6 ส่วน (ภาพที่ 6, 7, 8)

// ตัวแปรเก็บข้อมูลจาก API เพื่อใช้คำนวณเงื่อนไขปลดล็อกส่วนที่ 6
let currentCvData = null;
let currentTrainingsData = [];
let currentCompaniesData = [];
let currentSubmissionsData = [];
let currentPlacementData = null;
let currentAcceptanceData = null;

// โหลดข้อมูลทั้งหมดเข้าสู่ทั้ง 6 Section
async function initPage() {
  await loadProfile();
  await loadTrainings();
  await loadCv();
  await loadCompanies();
  await loadSubmissions();
  await loadPlacement();
}

// 1. โหลดข้อมูลส่วนตัว
async function loadProfile() {
  try {
    const res = await fetch('/api/student/profile');
    const data = await res.json();
    if (data.success) {
      if (data.user) document.getElementById('prof-email').value = data.user.email || '';
      if (data.student) {
        const s = data.student;
        await loadAdvisorOptions(s.advisorId ?? s.advisor?.id ?? null);

        document.getElementById('prof-nameTh').value = s.nameTh || '';
        document.getElementById('prof-nameEn').value = s.nameEn || '';
        document.getElementById('prof-studentCode').value = s.studentCode || '';
        document.getElementById('prof-year').value = s.year || '3';
        document.getElementById('prof-gpa').value = s.gpa || '';
        document.getElementById('prof-major').value = s.major || 'วิศวกรรมซอฟต์แวร์';
        document.getElementById('prof-curriculum').value = s.curriculum || '';
        document.getElementById('prof-faculty').value = s.faculty || 'คณะเทคโนโลยีสารสนเทศและการสื่อสาร';
        document.getElementById('prof-phone').value = s.phone || '';
        document.getElementById('prof-lineId').value = s.lineId || '';
        document.getElementById('prof-facebook').value = s.facebook || '';

        // [REQ-04] ล็อคข้อมูลทางวิชาการที่ดึงจากระบบทะเบียน REG ห้ามนิสิตแก้ไข
        ['prof-studentCode', 'prof-nameTh', 'prof-year', 'prof-gpa', 'prof-major', 'prof-curriculum', 'prof-faculty', 'prof-email'].forEach(id => {
          const el = document.getElementById(id);
          if (el && el.value) {
            el.readOnly = true;
            el.style.backgroundColor = '#F8FAFC';
            el.style.cursor = 'not-allowed';
            el.title = '[REQ-04] ข้อมูลจากระบบทะเบียน REG ถูกล็อค ไม่สามารถแก้ไขได้';
          }
        });

        if (s.profileImageUrl) {
          const preview = document.getElementById('profile-photo-preview');
          preview.src = s.profileImageUrl;
          preview.style.display = 'block';
          document.getElementById('photo-prompt').style.display = 'none';
        }
      }
    }
  } catch (err) {
    console.error('Load profile error:', err);
  }
}

// จัดการอัปโหลดรูปโปรไฟล์
const photoDropzone = document.getElementById('photo-dropzone');
const photoInput = document.getElementById('profile-photo-input');
if (photoDropzone && photoInput) {
  photoDropzone.addEventListener('click', () => photoInput.click());
  photoInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
      const formData = new FormData();
      formData.append('profileImage', file);
      formData.append('nameTh', document.getElementById('prof-nameTh').value || 'นิสิต');
      formData.append('nameEn', document.getElementById('prof-nameEn').value || 'Student');
      formData.append('studentCode', document.getElementById('prof-studentCode').value || '670xxxxx');

      try {
        const res = await fetch('/api/student/profile', {
          method: 'POST',
          body: formData
        });
        const data = await res.json();
        if (data.success && data.student.profileImageUrl) {
          const preview = document.getElementById('profile-photo-preview');
          preview.src = data.student.profileImageUrl;
          preview.style.display = 'block';
          document.getElementById('photo-prompt').style.display = 'none';
        }
      } catch (err) {
        console.error(err);
      }
    }
  });
}

// โหลดรายชื่ออาจารย์ทั้งหมดมาใส่ dropdown
async function loadAdvisorOptions(selectedAdvisorId) {
  try {
    const res = await fetch('/api/student/advisors');
    const data = await res.json();
    const select = document.getElementById('prof-advisor');
    if (select && data.success) {
      select.innerHTML = '<option value="">-- เลือกอาจารย์ที่ปรึกษา --</option>';
      data.advisors.forEach(a => {
        const opt = document.createElement('option');
        opt.value = a.id;
        opt.textContent = a.name;
        if (selectedAdvisorId && Number(a.id) === Number(selectedAdvisorId)) {
          opt.selected = true;
        }
        select.appendChild(opt);
      });
    }
  } catch (err) {
    console.error('Load advisors error:', err);
  }
}

// บันทึกข้อมูลส่วนตัว
const saveProfileBtn = document.getElementById('save-profile-btn');
if (saveProfileBtn) {
  saveProfileBtn.addEventListener('click', async () => {
    const advisorSelect = document.getElementById('prof-advisor');
    const payload = {
      nameTh: document.getElementById('prof-nameTh').value,
      nameEn: document.getElementById('prof-nameEn').value,
      studentCode: document.getElementById('prof-studentCode').value,
      year: document.getElementById('prof-year').value,
      gpa: document.getElementById('prof-gpa').value,
      major: document.getElementById('prof-major').value,
      phone: document.getElementById('prof-phone').value,
      lineId: document.getElementById('prof-lineId').value,
      facebook: document.getElementById('prof-facebook').value,
      advisorId: advisorSelect.value ? parseInt(advisorSelect.value) : null,
    };

    try {
      const res = await fetch('/api/student/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        alert('✅ บันทึกข้อมูลส่วนตัวสำเร็จ');
      } else {
        alert('เกิดข้อผิดพลาด: ' + (data.message || 'บันทึกไม่สำเร็จ'));
      }
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    }
  });
}

// 2. โหลดชั่วโมงการอบรม
async function loadTrainings() {
  try {
    const res = await fetch('/api/student/trainings');
    const data = await res.json();
    const tbody = document.getElementById('trainings-table-body');
    tbody.innerHTML = '';

    if (data.success && data.trainings) {
      currentTrainingsData = data.trainings;

      if (data.trainings.length > 0) {
        data.trainings.forEach((t, idx) => {
          let statusText = '☐ รอผล';
          let statusClass = 'status-wait';
          if (t.status === 'APPROVED') {
            statusText = '✓ ผ่าน';
            statusClass = 'status-pass';
          } else if (t.status === 'REJECTED') {
            statusText = '✗ ไม่ผ่าน';
            statusClass = 'status-fail';
          }

          const tr = document.createElement('tr');
          const certUrl = t.certificateFileUrl || '';
          tr.innerHTML = `
            <td>${idx + 1}</td>
            <td>${t.title}</td>
            <td>${t.skillType === 'HARD' ? 'Hard skill' : 'Soft skill'}</td>
            <td>${t.hours}</td>
            <td class="${statusClass}">${statusText}</td>
            <td>${t.note || '-'}</td>
            <td style="text-align:center;">
              ${certUrl
                ? `<a href="${certUrl}" target="_blank" style="color:#2563eb; font-size:16px; text-decoration:none; white-space:nowrap;">ดูตัวอย่าง</a>`
                : '<span style="color:#94a3b8; font-size:16px;">-</span>'
              }
            </td>
            <td><button type="button" class="btn btn-tonal btn-xs" onclick="deleteTraining(${t.id})">ลบ</button></td>
          `;
          tbody.appendChild(tr);
        });
      } else {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #888; padding: 20px;">ยังไม่มีข้อมูลการอบรม</td></tr>';
      }
    }
  } catch (err) {
    console.error('Load trainings error:', err);
  } finally {
    checkPlacementUnlock();
  }
}

window.deleteTraining = async function(id) {
  if (confirm('คุณต้องการลบรายการอบรมนี้หรือไม่?')) {
    try {
      const res = await fetch(`/api/student/trainings/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        loadTrainings();
      }
    } catch (err) {
      console.error(err);
    }
  }
};

// 3. จัดการ CV
async function loadCv() {
  try {
    const res = await fetch('/api/student/cv');
    const data = await res.json();
    if (data.success && data.cv) {
      currentCvData = data.cv;
      if (data.cv.fileUrl) {
        renderCvPreview(data.cv.fileUrl, data.cv.fileName, data.cv.status, data.cv.note);
      }
    } else {
      currentCvData = null;
    }
  } catch (err) {
    console.error('Load CV error:', err);
  } finally {
    checkPlacementUnlock();
  }
}

const cvInput = document.getElementById('cv-upload-input');
const cvUploadContent = document.getElementById('cv-upload-content');
const cvPreviewContainer = document.getElementById('cv-preview-container');
const cvPreviewImg = document.getElementById('cv-preview-img');
const cvPreviewPdf = document.getElementById('cv-preview-pdf');
const cvPdfName = document.getElementById('cv-pdf-name');
const cvStatusBadge = document.getElementById('cv-status-badge');
let currentCvUrl = null;

function renderCvPreview(fileUrl, fileName, status, note) {
  currentCvUrl = fileUrl;
  cvUploadContent.style.display = 'none';
  cvPreviewContainer.style.display = 'flex';

  // สถานะ CV: CVตรวจแล้ว / ผ่าน & รอผล & CVไม่ผ่าน / ทำใหม่
  if (status === 'APPROVED') {
    cvStatusBadge.textContent = 'สถานะ: ✓ CVตรวจแล้ว / ผ่าน';
    cvStatusBadge.className = 'status-pass';
  } else if (status === 'REJECTED') {
    cvStatusBadge.innerHTML = `<div>สถานะ: ✗ CVไม่ผ่าน / ทำใหม่</div><div style="margin-top: 8px;">หมายเหตุ : <span style="color: #ff2828ff;">${note || 'กรุณาอัปโหลดใหม่'}</span></div>`;
    cvStatusBadge.className = 'status-fail';
  } else {
    cvStatusBadge.textContent = 'สถานะ: ☐ รอผล (รออาจารย์ตรวจ)';
    cvStatusBadge.className = 'status-wait';
  }

  const isPdf = fileUrl.toLowerCase().endsWith('.pdf') || (fileName && fileName.toLowerCase().endsWith('.pdf'));

  if (isPdf) {
    cvPdfName.textContent = fileName || 'CV.pdf';
    cvPreviewImg.style.display = 'none';
    cvPreviewPdf.style.display = 'flex';
  } else {
    cvPreviewImg.src = fileUrl;
    cvPreviewImg.style.display = 'block';
    cvPreviewPdf.style.display = 'none';
  }
}

if (cvInput) {
  cvInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
      const formData = new FormData();
      formData.append('cv', file);

      try {
        const res = await fetch('/api/student/cv', {
          method: 'POST',
          body: formData
        });
        const data = await res.json();
        if (data.success && data.cv) {
          currentCvData = data.cv;
          renderCvPreview(data.cv.fileUrl, data.cv.fileName, data.cv.status, data.cv.note);
          alert('✅ อัปโหลดไฟล์ CV สำเร็จ');
          checkPlacementUnlock();
        } else {
          alert('เกิดข้อผิดพลาด: ' + (data.message || 'อัปโหลดไม่สำเร็จ'));
        }
      } catch (err) {
        console.error(err);
        alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
      }
    }
  });
}

window.openCvModal = function() {
  if (!currentCvUrl) return;
  const modal = document.getElementById('cv-modal');
  const modalImg = document.getElementById('cv-modal-img');
  const modalPdf = document.getElementById('cv-modal-pdf');

  modal.style.display = 'flex';
  const isPdf = currentCvUrl.toLowerCase().endsWith('.pdf') || currentCvUrl.includes('.pdf');

  if (isPdf) {
    // ถ้าเป็น Cloudinary URL แปลงเป็น .jpg เพื่อแสดงผลได้ทันทีไม่ติด 401
    if (currentCvUrl.includes('cloudinary.com')) {
      modalImg.src = currentCvUrl.replace(/\.pdf$/i, '.jpg');
      modalImg.style.display = 'block';
      modalPdf.style.display = 'none';
    } else {
      modalPdf.src = currentCvUrl;
      modalPdf.style.display = 'block';
      modalImg.style.display = 'none';
    }
  } else {
    modalImg.src = currentCvUrl;
    modalImg.style.display = 'block';
    modalPdf.style.display = 'none';
  }
};

window.closeCvModal = function() {
  document.getElementById('cv-modal').style.display = 'none';
};

// 4. โหลด Checklist บริษัท
async function loadCompanies() {
  try {
    const res = await fetch('/api/student/companies');
    const data = await res.json();
    const tbody = document.getElementById('companies-table-body');
    tbody.innerHTML = '';

    if (data.success && data.companies) {
      currentCompaniesData = data.companies;

      if (data.companies.length > 0) {
        data.companies.forEach((c, idx) => {
          // สถานะ Checklist: รอผล & อาจารย์รีวิวแล้ว / ผ่าน & ไม่ผ่าน / ทำ check list เพิ่ม
          let statusBadge = '☐ รอผล';
          let statusClass = 'status-wait';
          if (c.checklistStatus === 'APPROVED') {
            statusBadge = '✓ อาจารย์รีวิวแล้ว / ผ่าน';
            statusClass = 'status-pass';
          } else if (c.checklistStatus === 'REJECTED') {
            statusBadge = '✗ ไม่ผ่าน / ทำ check list เพิ่ม';
            statusClass = 'status-fail';
          }

          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td>${idx + 1}</td>
            <td>${c.name}</td>
            <td class="${statusClass}">${statusBadge}</td>
            <td>${c.checklistNote || '-'}</td>
            <td>
              <a href="/checklist" class="btn btn-tonal btn-xs" style="text-decoration: none;">แก้ไข</a>
            </td>
          `;
          tbody.appendChild(tr);
        });
      } else {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #888; padding: 20px;">ยังไม่มีข้อมูลบริษัท (กดปุ่ม "เพิ่มข้อมูล" ด้านล่าง)</td></tr>';
      }
    }
  } catch (err) {
    console.error('Load companies error:', err);
  } finally {
    checkPlacementUnlock();
  }
}

// 5. โหลดสถานะการยื่น (เฉพาะบริษัทที่ผ่านการอนุมัติ Checklist) + อัปโหลดแบบตอบรับจากบริษัท
async function loadSubmissions() {
  try {
    const [res, accRes] = await Promise.all([
      fetch('/api/student/submissions'),
      fetch('/api/student/acceptance-form').catch(() => null),
    ]);
    const data = await res.json();
    const accData = accRes ? await accRes.json().catch(() => null) : null;
    currentAcceptanceData = accData?.success ? accData.acceptance : null;

    const tbody = document.getElementById('submissions-table-body');
    tbody.innerHTML = '';

    if (data.success && data.approvedCompanies) {
      currentSubmissionsData = data.approvedCompanies;

      if (data.approvedCompanies.length > 0) {
        data.approvedCompanies.forEach((comp, idx) => {
          const currentStatus = (comp.submission && comp.submission.status) ? comp.submission.status : 'NOT_SUBMITTED';

          // ตัวเลือกสถานะการยื่น:
          // 1. ยังไม่ได้ยื่น (NOT_SUBMITTED)
          // 2. ยื่นแล้ว รอสัมภาษณ์ (SUBMITTED_WAITING)
          // 3. สัมภาษณ์แล้ว รอผล (INTERVIEWED_PENDING)
          // 4. สัมภาษณ์ผ่านแล้ว (INTERVIEW_PASSED)
          // 5. สัมภาษณ์ไม่ผ่าน ยื่นเพิ่มแล้ว (INTERVIEW_FAILED_REAPPLIED)
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td>${idx + 1}</td>
            <td>${comp.name}</td>
            <td>
              <select class="input-field" onchange="updateSubmissionStatus(${comp.id}, this.value)">
                <option value="NOT_SUBMITTED" ${currentStatus === 'NOT_SUBMITTED' ? 'selected' : ''}>ยังไม่ได้ยื่น</option>
                <option value="SUBMITTED_WAITING" ${currentStatus === 'SUBMITTED_WAITING' ? 'selected' : ''}>ยื่นแล้ว รอสัมภาษณ์</option>
                <option value="INTERVIEWED_PENDING" ${currentStatus === 'INTERVIEWED_PENDING' ? 'selected' : ''}>สัมภาษณ์แล้ว รอผล</option>
                <option value="INTERVIEW_PASSED" ${currentStatus === 'INTERVIEW_PASSED' ? 'selected' : ''}>สัมภาษณ์ผ่านแล้ว</option>
                <option value="INTERVIEW_FAILED_REAPPLIED" ${currentStatus === 'INTERVIEW_FAILED_REAPPLIED' ? 'selected' : ''}>สัมภาษณ์ไม่ผ่าน ยื่นเพิ่มแล้ว</option>
              </select>
            </td>
            <td>${renderStudentAcceptanceCell()}</td>
          `;
          tbody.appendChild(tr);
        });
      } else {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #666; padding: 20px;">ยังไม่มีบริษัทที่ผ่านการอนุมัติ Checklist (จะแสดงรายชื่อเมื่ออาจารย์ตรวจให้ผ่าน)</td></tr>';
      }
    }
    renderStudentAcceptanceCard();
  } catch (err) {
    console.error('Load submissions error:', err);
  } finally {
    checkPlacementUnlock();
    updatePlacementCompanyOptions();
  }
}

function escapeStudentHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderStudentAcceptanceCell() {
  const acc = currentAcceptanceData;
  if (!acc || !acc.requestLetterIssued) {
    return '<span style="font-size:12.5px; color:#64748B;">รอเจ้าหน้าที่ออกหนังสือขอความอนุเคราะห์</span>';
  }
  const reqBtn = `<button type="button" onclick="downloadStudentOfficialLetter('REQUEST')" style="background:#EEF2FF; color:#312E81; border:1px solid #C7D2FE; padding:4px 9px; border-radius:6px; font-size:11.5px; font-weight:700; cursor:pointer; display:inline-flex; align-items:center; gap:4px;">📥 โหลดหนังสือขอความอนุเคราะห์</button>`;
  const blankFormBtn = `<a href="/documents/acceptance_form_se.pdf" download="แบบตอบรับนิสิตฝึกงาน_SE.pdf" target="_blank" rel="noopener" style="background:#F0FDF4; color:#166534; border:1px solid #BBF7D0; padding:4px 9px; border-radius:6px; font-size:11.5px; font-weight:700; text-decoration:none; display:inline-flex; align-items:center; gap:4px;">📄 โหลดแบบตอบรับเปล่า</a>`;
  const dispBtn = acc.dispatchLetterIssued
    ? `<button type="button" onclick="downloadStudentOfficialLetter('DISPATCH')" style="background:#DBEAFE; color:#1E40AF; border:1px solid #93C5FD; padding:4px 9px; border-radius:6px; font-size:11.5px; font-weight:700; cursor:pointer; display:inline-flex; align-items:center; gap:4px;">📥 โหลดหนังสือส่งตัว (PDF)</button>`
    : '';

  if (acc.status === 'ACCEPTED') {
    return `
      <div style="font-size:12.5px; font-weight:700; color:#15803D; margin-bottom:4px;">✅ เจ้าหน้าที่ยืนยัน: บริษัทตอบรับแล้ว</div>
      <div style="display:flex; gap:5px; flex-wrap:wrap;">${reqBtn}${blankFormBtn}${dispBtn}</div>
    `;
  }
  if (acc.status === 'REJECTED') {
    return '<span style="font-size:12.5px; font-weight:700; color:#B91C1C;">✗ บริษัทปฏิเสธ (ปลดล็อกให้ยื่นใหม่แล้ว)</span>';
  }
  if (acc.fileUrl || acc.submittedByStudent) {
    return `
      <div style="font-size:12px; font-weight:600; color:#B45309; margin-bottom:4px;">⏳ อัปโหลดใบตอบรับแล้ว (รอเจ้าหน้าที่ยืนยัน)</div>
      <div style="display:flex; gap:6px; align-items:center; flex-wrap:wrap;">
        ${reqBtn}
        ${blankFormBtn}
        ${acc.fileUrl ? `<a href="${acc.fileUrl}" target="_blank" rel="noopener" style="font-size:11.5px; color:#2563EB; font-weight:600;">📎 ดูไฟล์ที่อัปโหลด</a>` : ''}
      </div>
    `;
  }
  return `
    <div style="font-size:12px; color:#2563EB; font-weight:600; margin-bottom:4px;">📄 ออกหนังสือแล้ว (${escapeStudentHtml(acc.requestLetterDocNo || '-')})</div>
    <div style="display:flex; gap:5px; flex-wrap:wrap;">${reqBtn}${blankFormBtn}</div>
  `;
}

function renderStudentAcceptanceCard() {
  const section = document.getElementById('submission-section');
  if (!section) return;
  const body = section.querySelector('.card-body');
  if (!body) return;

  let container = document.getElementById('student-acceptance-upload-box');
  if (!container) {
    container = document.createElement('div');
    container.id = 'student-acceptance-upload-box';
    container.style.marginTop = '16px';
    body.appendChild(container);
  }

  const acc = currentAcceptanceData;
  if (!acc || !acc.requestLetterIssued) {
    container.innerHTML = '';
    return;
  }

  const isFinalized = acc.status === 'ACCEPTED';
  const statusBanner = acc.status === 'ACCEPTED'
    ? `<div style="background:#DCFCE7; color:#166534; padding:8px 12px; border-radius:8px; font-size:13px; font-weight:700;">✅ เจ้าหน้าที่คณะตรวจสอบและยืนยันผล "บริษัทตอบรับเข้าฝึกงาน" เรียบร้อยแล้ว ${acc.dispatchLetterIssued ? `(ออกหนังสือส่งตัวเลขที่ ${escapeStudentHtml(acc.dispatchLetterDocNo || '-')} แล้ว)` : '(รอออกหนังสือส่งตัว)'}</div>`
    : acc.status === 'WAITING_ADVISOR_APPROVAL'
    ? `<div style="background:#FEF3C7; color:#92400E; padding:8px 12px; border-radius:8px; font-size:13px; font-weight:700;">⏳ อัปโหลดไฟล์ "${escapeStudentHtml(acc.fileName || 'ใบตอบรับ')}" แล้ว — อยู่ระหว่างรออาจารย์ที่ปรึกษา (${escapeStudentHtml(acc.advisorName || 'ที่ปรึกษา')}) ตรวจสอบและอนุมัติแบบตอบรับ</div>`
    : acc.status === 'ADVISOR_APPROVED'
    ? `<div style="background:#EFF6FF; color:#1E40AF; padding:8px 12px; border-radius:8px; font-size:13px; font-weight:700;">✓ อาจารย์ที่ปรึกษาอนุมัติแบบตอบรับแล้ว — อยู่ระหว่างรอเจ้าหน้าที่คณะ (Super Admin) ยืนยันผลรับเข้าฝึกงานขั้นสุดท้าย</div>`
    : acc.status === 'REJECTED'
    ? `<div style="background:#FEE2E2; color:#991B1B; padding:8px 12px; border-radius:8px; font-size:13px; font-weight:700;">✗ บันทึกผล "บริษัทปฏิเสธ" (${escapeStudentHtml(acc.note || '-')}) — หากได้รับหนังสือขอความอนุเคราะห์ฉบับใหม่แล้ว สามารถอัปโหลดใบตอบรับใหม่ได้ทันที</div>`
    : acc.fileUrl
    ? `<div style="background:#FEF3C7; color:#92400E; padding:8px 12px; border-radius:8px; font-size:13px; font-weight:600;">⏳ อัปโหลดไฟล์ "${escapeStudentHtml(acc.fileName || 'ใบตอบรับ')}" แล้ว — ระบบกำลังส่งให้อาจารย์ที่ปรึกษาตรวจสอบ</div>`
    : `<div style="background:#EFF6FF; color:#1E40AF; padding:8px 12px; border-radius:8px; font-size:13px; font-weight:600;">📄 คณะออกหนังสือขอความอนุเคราะห์ (${escapeStudentHtml(acc.requestLetterDocNo || '-')}) แล้ว กดดาวน์โหลดหนังสือขอความอนุเคราะห์และแบบตอบรับเปล่าด้านขวาเพื่อนำไปยื่นให้บริษัท และเมื่อบริษัทกรอกแบบตอบรับกลับมา กรุณาอัปโหลดไฟล์ที่นี่</div>`;

  container.innerHTML = `
    <div style="border:1px solid #CBD5E1; border-radius:12px; padding:16px 18px; background:#F8FAFC;">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:10px;">
        <div>
          <div style="font-size:15px; font-weight:700; color:#1E293B;">เอกสารราชการ &amp; อัปโหลดแบบตอบรับ/ปฏิเสธ การรับนิสิตฝึกงาน</div>
          <div style="font-size:12.5px; color:#64748B;">ดาวน์โหลดหนังสือขอความอนุเคราะห์และแบบตอบรับเปล่าไปยื่นสถานประกอบการ และอัปโหลดใบตอบรับที่บริษัทกรอกกลับมา (PDF, JPG, PNG ไม่เกิน 10MB)</div>
        </div>
        <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
          <button type="button" onclick="downloadStudentOfficialLetter('REQUEST')"
            style="background:#EEF2FF; color:#312E81; border:1px solid #C7D2FE; padding:8px 13px; border-radius:8px; font-size:12.5px; font-weight:700; cursor:pointer; display:inline-flex; align-items:center; gap:5px;">
            📥 ดาวน์โหลดหนังสือขอความอนุเคราะห์ (PDF)
          </button>
          <a href="/documents/acceptance_form_se.pdf" download="แบบตอบรับนิสิตฝึกงาน_SE.pdf" target="_blank" rel="noopener"
            style="background:#F0FDF4; color:#166534; border:1px solid #BBF7D0; padding:8px 13px; border-radius:8px; font-size:12.5px; font-weight:700; text-decoration:none; display:inline-flex; align-items:center; gap:5px;">
            📄 ดาวน์โหลดแบบตอบรับเปล่า (PDF)
          </a>
          ${acc.dispatchLetterIssued ? `
            <button type="button" onclick="downloadStudentOfficialLetter('DISPATCH')"
              style="background:#DBEAFE; color:#1E40AF; border:1px solid #93C5FD; padding:8px 13px; border-radius:8px; font-size:12.5px; font-weight:700; cursor:pointer; display:inline-flex; align-items:center; gap:5px;">
              📥 ดาวน์โหลดหนังสือส่งตัวเข้าฝึกงาน (PDF)
            </button>
          ` : ''}
          ${acc.fileUrl ? `<a href="${acc.fileUrl}" target="_blank" rel="noopener" class="btn btn-tonal btn-sm" style="text-decoration:none;">ดูไฟล์ที่อัปโหลด</a>` : ''}
          ${!isFinalized ? `
            <input type="file" id="student-acceptance-file-input" accept=".pdf,image/jpeg,image/png,image/webp" style="display:none;" onchange="uploadStudentAcceptanceForm(this)" />
            <button type="button" id="student-acceptance-upload-btn" class="btn btn-primary btn-sm" onclick="document.getElementById('student-acceptance-file-input').click()">
              ${acc.fileUrl ? 'อัปโหลดไฟล์ใหม่' : 'เลือกไฟล์ใบตอบรับ (PDF / รูปภาพ)'}
            </button>
          ` : ''}
        </div>
      </div>
      ${statusBanner}
    </div>
  `;
}

window.downloadStudentOfficialLetter = function(type) {
  const acc = currentAcceptanceData;
  if (!acc || !acc.requestLetterIssued) {
    alert('ยังไม่มีการออกหนังสือขอความอนุเคราะห์จากเจ้าหน้าที่คณะ');
    return;
  }

  const students = Array.isArray(acc.letterStudents) && acc.letterStudents.length > 0
    ? acc.letterStudents
    : [{
        studentCode: document.getElementById('prof-studentCode')?.value || '-',
        nameTh: document.getElementById('prof-nameTh')?.value || '-',
        major: document.getElementById('prof-major')?.value || 'วิศวกรรมซอฟต์แวร์',
        position: document.getElementById('plc-position')?.value || 'นิสิตฝึกงาน',
        phone: document.getElementById('prof-phone')?.value || '-',
      }];

  const first = students[0];
  const cfg = acc.academicConfig || {};
  const docNo = type === 'DISPATCH'
    ? (acc.dispatchLetterDocNo || 'อว 7316/ว 0512')
    : (acc.requestLetterDocNo || 'อว 7316/ว 0142');
  const rawDate = type === 'DISPATCH' ? acc.dispatchLetterDate : acc.requestLetterDate;
  const dateObj = rawDate ? new Date(rawDate) : new Date();
  const thaiDate = !isNaN(dateObj.getTime())
    ? dateObj.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })
    : new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
  const signatureDataUrl = type === 'DISPATCH'
    ? (acc.dispatchLetterSignatureSnapshot || '')
    : (acc.requestLetterSignatureSnapshot || '');
  const targetCompName = acc.companyName || (currentSubmissionsData[0]?.name) || 'สถานประกอบการ';
  const targetCompAddress = acc.companyAddress && acc.companyAddress !== '-' ? acc.companyAddress : '';
  const targetMajor = first.major || 'วิศวกรรมซอฟต์แวร์';
  const subjectText = type === 'DISPATCH'
    ? 'ขอส่งตัวนิสิตเข้าฝึกงานวิชาชีพ / สหกิจศึกษา'
    : 'ขอความอนุเคราะห์รับนิสิตเข้าฝึกงานวิชาชีพ / สหกิจศึกษา และนัดหมายสัมภาษณ์';

  const studentRowsHtml = students.map((s, idx) => `
    <tr>
      <td style="border:1px solid #334155; padding:6px 10px; text-align:center;">${idx + 1}</td>
      <td style="border:1px solid #334155; padding:6px 10px; text-align:center;">${escapeStudentHtml(s.studentCode)}</td>
      <td style="border:1px solid #334155; padding:6px 10px;">${escapeStudentHtml(s.nameTh)}</td>
      <td style="border:1px solid #334155; padding:6px 10px;">วท.บ. (${escapeStudentHtml(s.major || targetMajor)})</td>
      <td style="border:1px solid #334155; padding:6px 10px;">${escapeStudentHtml(s.position || 'นิสิตฝึกงาน')}</td>
      <td style="border:1px solid #334155; padding:6px 10px; text-align:center;">${escapeStudentHtml(s.phone || '-')}</td>
    </tr>
  `).join('');

  const win = window.open('', '_blank', 'width=920,height=800');
  if (!win) {
    alert('กรุณาอนุญาตให้เปิดหน้าต่างป๊อปอัป (Pop-up) เพื่อดาวน์โหลด/พิมพ์เอกสาร PDF');
    return;
  }

  win.document.write(`
    <!DOCTYPE html>
    <html lang="th">
      <head>
        <meta charset="utf-8" />
        <title>${type === 'DISPATCH' ? 'หนังสือส่งตัวนิสิตเข้าฝึกงาน' : 'หนังสือขอความอนุเคราะห์ฝึกงาน'} (${escapeStudentHtml(docNo)})</title>
        <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700;800&display=swap" rel="stylesheet" />
        <style>
          body { font-family: 'Sarabun', sans-serif; padding: 24px 36px; color: #0F172A; line-height: 1.65; background: #F1F5F9; margin: 0; }
          .print-toolbar {
            max-width: 760px; margin: 0 auto 16px auto; background: #1E293B; color: white;
            padding: 10px 18px; border-radius: 10px; display: flex; justify-content: space-between; align-items: center;
          }
          .print-sheet {
            max-width: 720px; margin: 0 auto; background: white; padding: 32px 40px;
            border-radius: 10px; box-shadow: 0 4px 20px rgba(15,23,42,0.08);
          }
          @media print {
            body { padding: 0; background: white; }
            .print-toolbar { display: none !important; }
            .print-sheet { box-shadow: none; padding: 0; max-width: 100%; }
          }
        </style>
      </head>
      <body>
        <div class="print-toolbar">
          <div style="font-size:13.5px; font-weight:700;">
            📄 ${type === 'DISPATCH' ? 'หนังสือส่งตัวนิสิตเข้าฝึกงาน' : 'หนังสือขอความอนุเคราะห์ฝึกงาน'} — เลขที่ ${escapeStudentHtml(docNo)}
          </div>
          <button onclick="window.print()" style="background:#2563EB; color:white; border:none; padding:7px 16px; border-radius:8px; font-family:inherit; font-size:13px; font-weight:700; cursor:pointer;">
            🖨️ พิมพ์ / บันทึกเป็น PDF (Save as PDF)
          </button>
        </div>
        <div class="print-sheet" style="font-size:14px; color:#0F172A;">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:16px;">
            <div><div style="font-weight:700;">ที่ ${escapeStudentHtml(docNo)}</div></div>
            <div style="text-align:center;">
              <div style="font-size:17px; font-weight:800; color:#1E1B4B;">คณะเทคโนโลยีสารสนเทศและการสื่อสาร</div>
              <div style="font-size:14px; font-weight:700;">มหาวิทยาลัยพะเยา จ.พะเยา 56000</div>
            </div>
            <div style="text-align:right;"><div>วันที่ ${escapeStudentHtml(thaiDate)}</div></div>
          </div>

          <div style="margin-bottom:10px;"><strong>เรื่อง</strong> &nbsp;&nbsp;${subjectText}</div>
          <div style="margin-bottom:10px;"><strong>เรียน</strong> &nbsp;&nbsp;ผู้จัดการฝ่ายทรัพยากรบุคคล / ผู้บริหาร <strong>${escapeStudentHtml(targetCompName)}</strong></div>
          ${type === 'REQUEST' ? `<div style="margin-bottom:14px;"><strong>สิ่งที่ส่งมาด้วย</strong> &nbsp;&nbsp;1. แบบตอบรับ/ปฏิเสธ การรับนิสิตฝึกงาน และประวัติย่อ (CV) จำนวน ${students.length} ชุด</div>` : ''}

          <p style="text-indent:40px; margin-bottom:12px; text-align:justify;">
            ด้วย คณะเทคโนโลยีสารสนเทศและการสื่อสาร มหาวิทยาลัยพะเยา ได้กำหนดให้นิสิตระดับปริญญาตรี ชั้นปีที่ 3-4 เข้ารับการฝึกงานวิชาชีพและสหกิจศึกษาในสถานประกอบการ เพื่อให้นิสิตได้เพิ่มพูนทักษะและประสบการณ์การทำงานจริงในสายวิชาชีพเทคโนโลยีสารสนเทศ พิจารณาแล้วเห็นว่าหน่วยงานของท่านมีความเหมาะสมและมีมาตรฐานทางวิชาชีพเป็นอย่างดียิ่ง
          </p>

          <p style="text-indent:40px; margin-bottom:14px;">
            ในการนี้ คณะเทคโนโลยีสารสนเทศและการสื่อสาร จึงใคร่<strong>${type === 'DISPATCH' ? 'ขอส่งตัวนิสิตเข้าปฏิบัติงานสหกิจศึกษา/ฝึกงาน' : 'ขอความอนุเคราะห์รับนิสิตเข้าฝึกงานวิชาชีพ/สหกิจศึกษา'}</strong> ประจำปีการศึกษา ${escapeStudentHtml(cfg.currentAcademicYear || '2568')} จำนวน ${students.length} คน ดังรายชื่อต่อไปนี้:
          </p>

          <table style="width:100%; border-collapse:collapse; margin-bottom:18px; font-size:13px;">
            <thead>
              <tr style="background:#F1F5F9;">
                <th style="border:1px solid #334155; padding:6px 10px;">ลำดับ</th>
                <th style="border:1px solid #334155; padding:6px 10px;">รหัสนิสิต</th>
                <th style="border:1px solid #334155; padding:6px 10px;">ชื่อ - นามสกุล</th>
                <th style="border:1px solid #334155; padding:6px 10px;">หลักสูตร/สาขาวิชา</th>
                <th style="border:1px solid #334155; padding:6px 10px;">ตำแหน่งที่ยื่นฝึกงาน</th>
                <th style="border:1px solid #334155; padding:6px 10px;">เบอร์โทรศัพท์</th>
              </tr>
            </thead>
            <tbody>
              ${studentRowsHtml}
            </tbody>
          </table>

          <p style="text-indent:40px; margin-bottom:24px;">
            จึงเรียนมาเพื่อโปรดพิจารณาให้ความอนุเคราะห์ และขอขอบพระคุณในความร่วมมือด้วยดีเสมอมา ณ โอกาสนี้
          </p>

          <div style="text-align:center; margin-left:240px; margin-bottom:20px;">
            <div>ขอแสดงความนับถือ</div>
            <div style="height:68px; display:flex; align-items:flex-end; justify-content:center;">
              ${signatureDataUrl ? `<img src="${signatureDataUrl}" alt="ลายเซ็นผู้ลงนาม" style="max-width:150px; max-height:64px; object-fit:contain;" />` : ''}
            </div>
            <div style="font-weight:700;">(${escapeStudentHtml(cfg.deanSignatory || 'ผู้ช่วยศาสตราจารย์ ดร.พรเทพ โรจนวสุ')})</div>
            <div>${escapeStudentHtml(cfg.deanPosition || 'คณบดีคณะเทคโนโลยีสารสนเทศและการสื่อสาร')}</div>
            <div>มหาวิทยาลัยพะเยา</div>
          </div>
        </div>
      </body>
    </html>
  `);
  win.document.close();
};

window.uploadStudentAcceptanceForm = async function(inputEl) {
  const file = inputEl?.files?.[0];
  if (!file) return;
  const btn = document.getElementById('student-acceptance-upload-btn');
  const prevText = btn ? btn.textContent : '';
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'กำลังอัปโหลดและตรวจสอบ...';
  }
  try {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('/api/student/acceptance-form', {
      method: 'POST',
      body: formData,
    });
    const data = await res.json();
    if (data.success) {
      alert('✅ ' + (data.message || 'อัปโหลดแบบตอบรับสำเร็จ'));
      await loadSubmissions();
    } else {
      alert('เกิดข้อผิดพลาด: ' + (data.message || 'อัปโหลดไม่สำเร็จ'));
    }
  } catch (err) {
    console.error(err);
    alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = prevText;
    }
    if (inputEl) inputEl.value = '';
  }
};

window.updateSubmissionStatus = async function(companyId, status) {
  try {
    const res = await fetch(`/api/student/submissions/${companyId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    const data = await res.json();
    if (data.success) {
      // อัปเดตข้อมูลในแคชแล้วเช็คเงื่อนไขปลดล็อกทันที
      const target = currentSubmissionsData.find(c => c.id === companyId);
      if (target) {
        if (!target.submission) target.submission = {};
        target.submission.status = status;
      }
      checkPlacementUnlock();
      updatePlacementCompanyOptions();
    }
  } catch (err) {
    console.error(err);
  }
};

// 6. โหลดและบันทึกข้อมูลบริษัทที่เข้าฝึกงานจริง
async function loadPlacement() {
  try {
    const res = await fetch('/api/student/placement');
    const data = await res.json();
    if (data.success && data.placement) {
      currentPlacementData = data.placement;
      const p = data.placement;
      document.getElementById('plc-position').value = p.position || '';
      document.getElementById('plc-companyNameTh').value = p.companyNameTh || '';
      document.getElementById('plc-contactPersonName').value = p.contactPersonName || '';
      document.getElementById('plc-contactPersonPosition').value = p.contactPersonPosition || '';
      document.getElementById('plc-companyAddress').value = p.companyAddress || '';
      document.getElementById('plc-companyPhone1').value = p.companyPhone1 || '';
      document.getElementById('plc-companyPhone2').value = p.companyPhone2 || '';
      document.getElementById('plc-companyEmail').value = p.companyEmail || '';
      document.getElementById('plc-province').value = p.province || '';

      // แสดง Badge สถานะการอนุมัติที่ฝึกงานจากอาจารย์ (ถ้ามี)
      const badgeContainer = document.getElementById('plc-status-container');
      const badgeEl = document.getElementById('plc-status-badge');
      const noteEl = document.getElementById('plc-status-note');

      if (badgeContainer && badgeEl) {
        badgeContainer.style.display = 'flex';
        badgeContainer.style.flexWrap = 'wrap';
        const matchTag = p.isMatchedWithChecklist === false
          ? ' • ⚠️ [REQ-06] บริษัทที่ยื่นไม่ตรงกับ Checklist เดิม (อาจารย์ที่ปรึกษาจะตรวจสอบเพิ่มเติม)'
          : p.isMatchedWithChecklist === true
            ? ' • ✅ [REQ-06] ตรงกับบริษัทที่ผ่านการอนุมัติใน Checklist'
            : '';
        // สถานะ: รอผล & อนุมัติที่ฝึกงาน & ไม่อนุมัติที่ฝึกงาน / เปลี่ยนที่ฝึกงาน
        if (p.status === 'APPROVED') {
          badgeEl.textContent = 'สถานะ: ✓ อนุมัติที่ฝึกงาน';
          badgeEl.className = 'status-pass';
        } else if (p.status === 'REJECTED') {
          badgeEl.textContent = 'สถานะ: ✗ ไม่อนุมัติที่ฝึกงาน / เปลี่ยนที่ฝึกงาน';
          badgeEl.className = 'status-fail';
          if (noteEl) noteEl.textContent = (p.note ? `หมายเหตุ: ${p.note}` : '') + matchTag;
        } else {
          badgeEl.textContent = 'สถานะ: ☐ รอผล (รออาจารย์อนุมัติ)';
          badgeEl.className = 'status-wait';
          if (noteEl) noteEl.textContent = matchTag.replace(/^ • /, '');
        }
      }
    } else {
      currentPlacementData = null;
    }
  } catch (err) {
    console.error('Load placement error:', err);
  } finally {
    checkPlacementUnlock();
    updatePlacementCompanyOptions();
  }
}

// อัปเดตตัวเลือกชื่อแหล่งฝึกงานจากบริษัทที่สถานะ "สัมภาษณ์ผ่านแล้ว"
function updatePlacementCompanyOptions() {
  const select = document.getElementById('plc-company-select');
  const input = document.getElementById('plc-companyNameTh');
  const customWrap = document.getElementById('plc-custom-company-wrap');
  if (!select || !input) return;

  const passedCompanies = (currentSubmissionsData || []).filter(
    comp => comp.submission && comp.submission.status === 'INTERVIEW_PASSED'
  );

  const prevVal = select.value;
  select.innerHTML = '<option value="">-- เลือกบริษัทที่สัมภาษณ์ผ่านแล้ว --</option>';

  passedCompanies.forEach(comp => {
    const opt = document.createElement('option');
    opt.value = comp.id;
    opt.dataset.name = comp.name;
    // แสดงเฉพาะชื่อบริษัท (เอาเครื่องหมายถูกและคำว่าสัมภาษณ์ผ่านแล้วออก)
    opt.textContent = comp.name;
    select.appendChild(opt);
  });

  const otherOpt = document.createElement('option');
  otherOpt.value = '__other__';
  otherOpt.textContent = 'อื่นๆ (กรอกระบุเอง)';
  select.appendChild(otherOpt);

  const currentSavedName = (currentPlacementData && currentPlacementData.companyNameTh)
    ? currentPlacementData.companyNameTh.trim()
    : input.value.trim();

  if (currentSavedName) {
    const matched = passedCompanies.find(
      c => c.name.trim() === currentSavedName || (currentPlacementData && currentPlacementData.companyId && c.id === currentPlacementData.companyId)
    );
    if (matched) {
      select.value = matched.id;
      select.style.display = '';
      if (customWrap) customWrap.style.display = 'none';
      input.value = matched.name;
    } else {
      select.value = '__other__';
      select.style.display = 'none';
      if (customWrap) customWrap.style.display = 'block';
      input.value = currentSavedName;
    }
  } else if (prevVal && prevVal !== '__other__') {
    const matchedPrev = passedCompanies.find(c => String(c.id) === String(prevVal));
    if (matchedPrev) {
      select.value = matchedPrev.id;
      select.style.display = '';
      if (customWrap) customWrap.style.display = 'none';
      input.value = matchedPrev.name;
    }
  } else if (!select.value && passedCompanies.length === 1 && !currentPlacementData) {
    select.value = passedCompanies[0].id;
    select.style.display = '';
    if (customWrap) customWrap.style.display = 'none';
    input.value = passedCompanies[0].name;
  } else {
    select.style.display = '';
    if (customWrap) customWrap.style.display = 'none';
  }
}

const companySelectEl = document.getElementById('plc-company-select');
const customCompanyWrap = document.getElementById('plc-custom-company-wrap');
const btnBackToSelect = document.getElementById('btn-back-to-select');

if (companySelectEl) {
  companySelectEl.addEventListener('change', (e) => {
    const input = document.getElementById('plc-companyNameTh');
    if (!input) return;

    if (e.target.value === '__other__') {
      companySelectEl.style.display = 'none';
      if (customCompanyWrap) customCompanyWrap.style.display = 'block';
      input.value = '';
      input.placeholder = 'กรอกชื่อแหล่งฝึกงาน...';
      input.focus();
    } else if (e.target.value) {
      const selectedOption = e.target.options[e.target.selectedIndex];
      companySelectEl.style.display = '';
      if (customCompanyWrap) customCompanyWrap.style.display = 'none';
      input.value = selectedOption ? (selectedOption.dataset.name || selectedOption.text) : '';
    } else {
      input.value = '';
    }
  });
}

if (btnBackToSelect) {
  btnBackToSelect.addEventListener('click', () => {
    if (customCompanyWrap) customCompanyWrap.style.display = 'none';
    if (companySelectEl) {
      companySelectEl.style.display = '';
      companySelectEl.value = '';
      companySelectEl.focus();
    }
    const input = document.getElementById('plc-companyNameTh');
    if (input) input.value = '';
  });
}

const placementForm = document.getElementById('placement-form');
if (placementForm) {
  placementForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // ประมวลผลชื่อแหล่งฝึกงานจาก dropdown หรือกล่องกรอกในช่องเดียวกัน
    const companySelect = document.getElementById('plc-company-select');
    const companyInput = document.getElementById('plc-companyNameTh');
    const customWrap = document.getElementById('plc-custom-company-wrap');
    const isCustomMode = customWrap && customWrap.style.display !== 'none';

    let finalCompanyName = '';
    let finalCompanyId = null;

    if (!isCustomMode && companySelect && companySelect.value && companySelect.value !== '__other__') {
      const selectedOption = companySelect.options[companySelect.selectedIndex];
      finalCompanyName = selectedOption ? (selectedOption.dataset.name || selectedOption.text) : '';
      finalCompanyId = companySelect.value;
    } else if (companyInput) {
      finalCompanyName = companyInput.value.trim();
    }

    if (!finalCompanyName) {
      alert('กรุณาเลือกหรือกรอก: ชื่อแหล่งฝึกงาน');
      if (!isCustomMode && companySelect) companySelect.focus();
      else if (companyInput) companyInput.focus();
      return;
    }
    if (companyInput) companyInput.value = finalCompanyName;

    // ตรวจว่ากรอกครบทุกช่อง (trim กันการพิมพ์แต่ช่องว่าง)
    const requiredFields = [
      ['plc-position', 'ตำแหน่งที่ฝึก'],
      ['plc-companyNameTh', 'ชื่อแหล่งฝึกงาน'],
      ['plc-contactPersonName', 'ชื่อบุคคลที่ให้ทำหนังสือขอความอนุเคราะห์'],
      ['plc-contactPersonPosition', 'ตำแหน่งบุคคลที่ให้ทำหนังสือ'],
      ['plc-companyAddress', 'ที่อยู่บริษัท'],
      ['plc-companyPhone1', 'เบอร์โทรติดต่อ'],
      ['plc-companyPhone2', 'เบอร์โทรติดต่อ (สำรอง)'],
      ['plc-companyEmail', 'Email สถานประกอบการ'],
      ['plc-province', 'จังหวัด'],
    ];
    for (const [id, label] of requiredFields) {
      const el = document.getElementById(id);
      if (!el || !el.value.trim()) {
        alert('กรุณากรอกข้อมูลให้ครบทุกช่อง: ' + label);
        if (el) el.focus();
        return;
      }
    }

    const payload = {
      position: document.getElementById('plc-position').value,
      companyNameTh: finalCompanyName,
      companyId: finalCompanyId,
      contactPersonName: document.getElementById('plc-contactPersonName').value,
      contactPersonPosition: document.getElementById('plc-contactPersonPosition').value,
      companyAddress: document.getElementById('plc-companyAddress').value,
      companyPhone1: document.getElementById('plc-companyPhone1').value,
      companyPhone2: document.getElementById('plc-companyPhone2').value,
      companyEmail: document.getElementById('plc-companyEmail').value,
      province: document.getElementById('plc-province').value,
    };

    try {
      const res = await fetch('/api/student/placement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        alert('✅ บันทึกข้อมูลแหล่งฝึกงานสำเร็จ');
        loadPlacement();
      } else {
        alert('เกิดข้อผิดพลาด: ' + (data.message || 'บันทึกไม่สำเร็จ'));
      }
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    }
  });
}

// =========================================================================
// 🎯 ฟังก์ชันตรวจสอบเงื่อนไขเพื่อซ่อน/ปลดล็อก
// 1. ปลดล็อกส่วนที่ 4 & 5 (Checklist และ สถานะการยื่น) เมื่อ ชั่วโมงอบรมครบ & CV ผ่าน
// 2. ปลดล็อกส่วนที่ 6 (ข้อมูลบริษัท ที่เข้าฝึกงาน) เมื่อครบทั้ง 4 เงื่อนไข
// =========================================================================
function checkPlacementUnlock() {
  const checklistSection = document.getElementById('checklist-section');
  const submissionSection = document.getElementById('submission-section');
  const checklistLockedCard = document.getElementById('checklist-locked-card');

  const placementSection = document.getElementById('placement-section');
  const placementLockedCard = document.getElementById('placement-locked-card');

  // 1. เงื่อนไข CV: ได้รับการตรวจผ่านแล้ว (APPROVED)
  const isCvApproved = currentCvData && currentCvData.status === 'APPROVED';

  // 2. เงื่อนไข ชั่วโมงอบรม: ที่ผ่านแล้ว Soft Skill >= 12 และ Hard Skill >= 18 (รวม >= 30 ชม.)
  const approvedSoftHours = currentTrainingsData
    .filter(t => t.status === 'APPROVED' && t.skillType === 'SOFT')
    .reduce((sum, t) => sum + (Number(t.hours) || 0), 0);

  const approvedHardHours = currentTrainingsData
    .filter(t => t.status === 'APPROVED' && t.skillType === 'HARD')
    .reduce((sum, t) => sum + (Number(t.hours) || 0), 0);

  const isTrainingComplete = approvedSoftHours >= 12 && approvedHardHours >= 18;

  // -----------------------------------------------------------------------
  // 🔒 1. ตรวจสอบการปลดล็อก ส่วนที่ 4 (Checklist) และ ส่วนที่ 5 (สถานะการยื่น)
  // -----------------------------------------------------------------------
  const isChecklistUnlocked = isCvApproved && isTrainingComplete;

  // อัปเดต UI ใน Card ปลดล็อกส่วนที่ 4 & 5 (checklist-locked-card)
  updateRequirementCard(
    'step-req-training',
    isTrainingComplete,
    '1. ชั่วโมงการอบรม',
    `Soft ${approvedSoftHours}/12 ชม. | Hard ${approvedHardHours}/18 ชม.` + (isTrainingComplete ? ' (ผ่านครบ)' : '')
  );

  let cvStatusDesc = 'รออาจารย์ตรวจผ่าน';
  if (!currentCvData || !currentCvData.fileUrl) {
    cvStatusDesc = 'ยังไม่ได้อัปโหลด CV';
  } else if (currentCvData.status === 'APPROVED') {
    cvStatusDesc = '✓ CVตรวจแล้ว / ผ่าน';
  } else if (currentCvData.status === 'REJECTED') {
    cvStatusDesc = '✗ CVไม่ผ่าน / ทำใหม่';
  } else {
    cvStatusDesc = '☐ รอผล (รออาจารย์ตรวจ)';
  }
  updateRequirementCard('step-req-cv', isCvApproved, '2. กรอกใบ CV', cvStatusDesc);

  if (isChecklistUnlocked) {
    // ปลดล็อกให้แสดงส่วนที่ 4 & 5
    if (checklistLockedCard) checklistLockedCard.style.display = 'none';
    if (checklistSection) checklistSection.style.display = 'block';
    if (submissionSection) submissionSection.style.display = 'block';

    // -----------------------------------------------------------------------
    // 🔒 2. ตรวจสอบการปลดล็อก ส่วนที่ 6 (ข้อมูลบริษัท ที่เข้าฝึกงาน)
    // -----------------------------------------------------------------------
    const isChecklistApproved = currentCompaniesData.some(c => c.checklistStatus === 'APPROVED');
    const isInterviewPassed = currentSubmissionsData.some(
      comp => comp.submission && comp.submission.status === 'INTERVIEW_PASSED'
    );

    // อัปเดต UI ใน Card แสดงเงื่อนไขส่วนที่ 6 (placement-locked-card)
    updateRequirementCard('req-cv', isCvApproved, '1. กรอกใบ CV', isCvApproved ? '✓ CVตรวจแล้ว / ผ่าน' : 'รออาจารย์ตรวจผ่าน');
    updateRequirementCard('req-training', isTrainingComplete, '2. ชั่วโมงการอบรม', `Soft ${approvedSoftHours}/12 ชม. | Hard ${approvedHardHours}/18 ชม.` + (isTrainingComplete ? ' (ผ่านครบ)' : ''));
    updateRequirementCard('req-checklist', isChecklistApproved, '3. Checklist บริษัท', isChecklistApproved ? '✓ มีบริษัทที่อาจารย์รีวิวผ่านแล้ว' : 'ยังไม่มีบริษัทที่ผ่านการอนุมัติ');
    updateRequirementCard('req-interview', isInterviewPassed, '4. สถานะการยื่น', isInterviewPassed ? '✓ สัมภาษณ์ผ่านแล้ว' : 'ต้องมีบริษัทที่ "สัมภาษณ์ผ่านแล้ว"');

    const isPlacementComplete = isChecklistApproved && isInterviewPassed;
    if (isPlacementComplete) {
      if (placementSection) placementSection.style.display = 'block';
      if (placementLockedCard) placementLockedCard.style.display = 'none';
    } else {
      if (placementSection) placementSection.style.display = 'none';
      if (placementLockedCard) placementLockedCard.style.display = 'block';
    }
  } else {
    // ถ้ายังไม่ผ่านชั่วโมงการอบรม หรือ CV ยังไม่ผ่าน -> ซ่อนส่วนที่ 4, 5, 6
    if (checklistLockedCard) checklistLockedCard.style.display = 'block';
    if (checklistSection) checklistSection.style.display = 'none';
    if (submissionSection) submissionSection.style.display = 'none';

    if (placementSection) placementSection.style.display = 'none';
    if (placementLockedCard) placementLockedCard.style.display = 'none';
  }
}

// Helper อัปเดตสถานะและไอคอนในกล่อง Requirements Card
function updateRequirementCard(containerId, isDone, title, desc) {
  const container = document.getElementById(containerId);
  const icon = document.getElementById(`${containerId}-icon`);
  const descEl = document.getElementById(`${containerId}-desc`);

  if (!container) return;

  if (isDone) {
    container.style.borderColor = '#86efac';
    container.style.backgroundColor = '#f0fdf4';
    if (icon) {
      icon.textContent = 'check_circle';
      icon.style.color = '#16a34a';
    }
    if (descEl) {
      descEl.textContent = desc;
      descEl.style.color = '#15803d';
      descEl.style.fontWeight = '500';
    }
  } else {
    container.style.borderColor = '#e2e8f0';
    container.style.backgroundColor = '#ffffff';
    if (icon) {
      icon.textContent = 'hourglass_empty';
      icon.style.color = '#94a3b8';
    }
    if (descEl) {
      descEl.textContent = desc;
      descEl.style.color = '#64748b';
      descEl.style.fontWeight = 'normal';
    }
  }
}

// ฟังก์ชันดึงข้อมูลอาจารย์ที่ปรึกษาล่าสุดมาอัปเดตใน Dropdown
async function reloadAdvisorOnly() {
  try {
    const res = await fetch('/api/student/profile');
    const data = await res.json();
    if (data.success && data.student) {
      const s = data.student;
      await loadAdvisorOptions(s.advisorId ?? s.advisor?.id ?? null);
    }
  } catch (err) {
    console.error('Reload advisor error:', err);
  }
}

// เริ่มโหลดข้อมูลเมื่อเข้าหน้าเว็บ
initPage();

// ⚡ เมื่อมีสัญญาณ Real-time จาก Socket.io ให้อัปเดตตาราง, สถานะ และอาจารย์ที่ปรึกษาทันที
window.addEventListener('app:data-updated', () => {
  reloadAdvisorOnly();
  loadTrainings();
  loadCv();
  loadCompanies();
  loadSubmissions();
  loadPlacement();
});
