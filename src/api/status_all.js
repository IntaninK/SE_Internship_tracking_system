// status_all.js - หน้าตั้งค่าปรับเปลี่ยน 6 ส่วน (ภาพที่ 6, 7, 8)

// ตัวแปรเก็บข้อมูลจาก API เพื่อใช้คำนวณเงื่อนไขปลดล็อกส่วนที่ 6
let currentCvData = null;
let currentTrainingsData = [];
let currentCompaniesData = [];
let currentSubmissionsData = [];
let currentPlacementData = null;

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
        document.getElementById('prof-nameTh').value = s.nameTh || '';
        document.getElementById('prof-nameEn').value = s.nameEn || '';
        document.getElementById('prof-studentCode').value = s.studentCode || '';
        document.getElementById('prof-year').value = s.year || '3';
        document.getElementById('prof-gpa').value = s.gpa || '';
        document.getElementById('prof-major').value = s.major || 'วิศวกรรมซอฟต์แวร์';
        document.getElementById('prof-phone').value = s.phone || '';
        document.getElementById('prof-lineId').value = s.lineId || '';
        document.getElementById('prof-facebook').value = s.facebook || '';

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

// บันทึกข้อมูลส่วนตัว
const saveProfileBtn = document.getElementById('save-profile-btn');
if (saveProfileBtn) {
  saveProfileBtn.addEventListener('click', async () => {
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
          tr.innerHTML = `
            <td>${idx + 1}</td>
            <td>${t.title}</td>
            <td>${t.skillType === 'HARD' ? 'Hard skill' : 'Soft skill'}</td>
            <td>${t.hours}</td>
            <td class="${statusClass}">${statusText}</td>
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
    cvStatusBadge.textContent = `สถานะ: ✗ CVไม่ผ่าน / ทำใหม่ (${note || 'กรุณาอัปโหลดใหม่'})`;
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
              <a href="/pages/checklist.html" class="btn btn-tonal btn-xs" style="text-decoration: none;">แก้ไข</a>
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

// 5. โหลดสถานะการยื่น (เฉพาะบริษัทที่ผ่านการอนุมัติ Checklist)
async function loadSubmissions() {
  try {
    const res = await fetch('/api/student/submissions');
    const data = await res.json();
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
            <td>-</td>
          `;
          tbody.appendChild(tr);
        });
      } else {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #666; padding: 20px;">ยังไม่มีบริษัทที่ผ่านการอนุมัติ Checklist (จะแสดงรายชื่อเมื่ออาจารย์ตรวจให้ผ่าน)</td></tr>';
      }
    }
  } catch (err) {
    console.error('Load submissions error:', err);
  } finally {
    checkPlacementUnlock();
  }
}

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
        // สถานะ: รอผล & อนุมัติที่ฝึกงาน & ไม่อนุมัติที่ฝึกงาน / เปลี่ยนที่ฝึกงาน
        if (p.status === 'APPROVED') {
          badgeEl.textContent = 'สถานะ: ✓ อนุมัติที่ฝึกงาน';
          badgeEl.className = 'status-pass';
        } else if (p.status === 'REJECTED') {
          badgeEl.textContent = 'สถานะ: ✗ ไม่อนุมัติที่ฝึกงาน / เปลี่ยนที่ฝึกงาน';
          badgeEl.className = 'status-fail';
          if (noteEl) noteEl.textContent = p.note ? `หมายเหตุ: ${p.note}` : '';
        } else {
          badgeEl.textContent = 'สถานะ: ☐ รอผล (รออาจารย์อนุมัติ)';
          badgeEl.className = 'status-wait';
          if (noteEl) noteEl.textContent = '';
        }
      }
    } else {
      currentPlacementData = null;
    }
  } catch (err) {
    console.error('Load placement error:', err);
  } finally {
    checkPlacementUnlock();
  }
}

const placementForm = document.getElementById('placement-form');
if (placementForm) {
  placementForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      position: document.getElementById('plc-position').value,
      companyNameTh: document.getElementById('plc-companyNameTh').value,
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
// 🎯 ฟังก์ชันตรวจสอบ 4 เงื่อนไขเพื่อซ่อน/ปลดล็อกส่วนที่ 6 (ข้อมูลบริษัท ที่เข้าฝึกงาน)
// =========================================================================
function checkPlacementUnlock() {
  const placementSection = document.getElementById('placement-section');
  const lockedCard = document.getElementById('placement-locked-card');
  if (!placementSection) return;

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

  // 3. เงื่อนไข Checklist: มีบริษัทที่อาจารย์รีวิวผ่านแล้ว (APPROVED) อย่างน้อย 1 บริษัท
  const isChecklistApproved = currentCompaniesData.some(c => c.checklistStatus === 'APPROVED');

  // 4. เงื่อนไข สถานะการยื่น: มีบริษัทที่นิสิตปรับสถานะเป็น "สัมภาษณ์ผ่านแล้ว" (INTERVIEW_PASSED)
  const isInterviewPassed = currentSubmissionsData.some(
    comp => comp.submission && comp.submission.status === 'INTERVIEW_PASSED'
  );

  // อัปเดต UI ใน Card แสดงเงื่อนไข (Requirements Tracker)
  updateRequirementCard('req-cv', isCvApproved, '1. กรอกใบ CV', isCvApproved ? '✓ CVตรวจแล้ว / ผ่าน' : 'รออาจารย์ตรวจผ่าน');
  updateRequirementCard('req-training', isTrainingComplete, '2. ชั่วโมงการอบรม', `Soft ${approvedSoftHours}/12 ชม. | Hard ${approvedHardHours}/18 ชม.` + (isTrainingComplete ? ' (ผ่านครบ)' : ''));
  updateRequirementCard('req-checklist', isChecklistApproved, '3. Checklist บริษัท', isChecklistApproved ? '✓ มีบริษัทที่อาจารย์รีวิวผ่านแล้ว' : 'ยังไม่มีบริษัทที่ผ่านการอนุมัติ');
  updateRequirementCard('req-interview', isInterviewPassed, '4. สถานะการยื่น', isInterviewPassed ? '✓ สัมภาษณ์ผ่านแล้ว' : 'ต้องมีบริษัทที่ "สัมภาษณ์ผ่านแล้ว"');

  // ตรวจสอบครบทั้ง 4 เงื่อนไข
  const isAllComplete = isCvApproved && isTrainingComplete && isChecklistApproved && isInterviewPassed;

  if (isAllComplete) {
    placementSection.style.display = 'block';
    if (lockedCard) lockedCard.style.display = 'none';
  } else {
    placementSection.style.display = 'none';
    if (lockedCard) lockedCard.style.display = 'block';
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

// เริ่มโหลดข้อมูลเมื่อเข้าหน้าเว็บ
initPage();
