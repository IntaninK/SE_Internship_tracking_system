// admin_student_detail.js — หน้าดูข้อมูลนิสิตรายบุคคลสำหรับ Admin
// ดึงข้อมูลจาก /api/admin/students/:studentId แล้ว render ทั้ง 7 section

const urlParams = new URLSearchParams(window.location.search);
const studentId = urlParams.get('id');

if (!studentId) {
  document.getElementById('student-header-name').textContent = 'ไม่พบ ID นิสิต';
}

let currentUserRole = null;

async function initStudentDetail() {
  if (!studentId) return;

  try {
    const meRes = await fetch('/auth/me');
    const meData = await meRes.json();
    if (meData.authenticated) {
      currentUserRole = meData.user.role;
      if (currentUserRole === 'ADVISOR') {
        const backBtn = document.querySelector('a[href*="dashboard"]');
        if (backBtn) {
          backBtn.href = '/pages/dashboard_ที่ปรึกษา.html';
          backBtn.innerHTML = '<span class="material-icons" style="font-size:18px;">arrow_back</span> กลับหน้า Dashboard ที่ปรึกษา';
        }
      }
    }

    const res = await fetch(`/api/admin/students/${studentId}`);
    const data = await res.json();
    if (!data.success) {
      document.getElementById('student-header-name').textContent = 'ไม่พบข้อมูลนิสิต';
      return;
    }

    renderProfile(data.student);
    renderTrainings(data.trainings, data.trainingSummary);
    renderCv(data.cv);
    renderCompanies(data.companies);
    renderSubmissions(data.companies);
    renderPlacement(data.placement);
    renderDocumentSummary(data);

    // ถ้าผู้ใช้เป็นอาจารย์ที่ปรึกษา ให้ซ่อนปุ่มตรวจสถานะของ Admin
    if (currentUserRole === 'ADVISOR') {
      const trainingApproval = document.getElementById('training-approval-area');
      const trainingSave = document.getElementById('training-save-area');
      if (trainingApproval) trainingApproval.style.display = 'none';
      if (trainingSave) trainingSave.style.display = 'none';

      const cvStatusSelect = document.getElementById('cv-admin-status');
      if (cvStatusSelect && cvStatusSelect.parentElement) {
        cvStatusSelect.parentElement.style.display = 'none';
      }

      const placementStatusSelect = document.getElementById('placement-admin-status');
      if (placementStatusSelect && placementStatusSelect.parentElement) {
        placementStatusSelect.parentElement.style.display = 'none';
      }
    }
  } catch (err) {
    console.error('Load student detail error:', err);
  }
}

// ==========================================
// 1. ข้อมูลส่วนตัว (อ่านอย่างเดียว)
// ==========================================
function renderProfile(s) {
  document.getElementById('student-header-name').textContent = `${s.studentCode} ${s.nameTh}`;
  document.getElementById('student-detail-code').textContent = `รหัสนิสิต: ${s.studentCode}`;
  document.getElementById('student-detail-email').textContent = `Email: ${s.email}`;
  document.getElementById('student-detail-advisor').textContent = `อาจารย์ที่ปรึกษา: ${s.advisorName || '-'}`;
  document.getElementById('student-detail-gpa').textContent = `GPA: ${s.gpa ? Number(s.gpa).toFixed(2) : '-'}`;

  if (s.profileImageUrl) {
    const img = document.getElementById('student-photo');
    img.src = s.profileImageUrl;
    img.style.display = 'block';
  }

  document.getElementById('d-nameTh').value = s.nameTh || '';
  document.getElementById('d-nameEn').value = s.nameEn || '';
  document.getElementById('d-studentCode').value = s.studentCode || '';
  document.getElementById('d-year').value = s.year || '';
  document.getElementById('d-gpa').value = s.gpa ? Number(s.gpa).toFixed(2) : '';
  document.getElementById('d-major').value = s.major || '';
  document.getElementById('d-phone').value = s.phone || '';
  document.getElementById('d-lineId').value = s.lineId || '';
  document.getElementById('d-facebook').value = s.facebook || '';
}

// ==========================================
// 2. ชั่วโมงการอบรม (admin ตรวจได้ — แบบ Figma)
// ==========================================
function renderTrainings(trainings, summary) {
  const tbody = document.getElementById('admin-trainings-tbody');
  const summaryEl = document.getElementById('training-summary-text');
  const approvalArea = document.getElementById('training-approval-area');
  const saveArea = document.getElementById('training-save-area');
  tbody.innerHTML = '';

  if (summaryEl) {
    summaryEl.textContent = `Soft: ${summary.approvedSoft}/${summary.totalSoft} ชม. | Hard: ${summary.approvedHard}/${summary.totalHard} ชม.`;
  }

  if (!trainings || trainings.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-gray-400">ยังไม่มีข้อมูลการอบรม</td></tr>';
    if (approvalArea) approvalArea.style.display = 'none';
    if (saveArea) saveArea.style.display = 'none';
    return;
  }

  // แสดง approval area
  if (approvalArea) approvalArea.style.display = 'flex';
  if (saveArea) saveArea.style.display = 'block';

  trainings.forEach((t, idx) => {
    const isChecked = t.status === 'APPROVED';
    const certUrl = t.certificateFileUrl || '';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${idx + 1}</td>
      <td>${t.title}</td>
      <td>${t.skillType === 'HARD' ? 'Hard skill' : 'Soft skill'}</td>
      <td>${t.hours}</td>
      <td style="text-align:center;">
        <input type="checkbox" class="training-cert-checkbox" data-id="${t.id}" ${isChecked ? 'checked' : ''} style="width:18px; height:18px; cursor:pointer; accent-color:#2563eb;" />
      </td>
      <td style="text-align:center;">
        ${certUrl
          ? `<a href="${certUrl}" target="_blank" style="color:#2563eb; font-size:13px; text-decoration:none; white-space:nowrap;">ดูตัวอย่าง</a>`
          : '<span style="color:#94a3b8; font-size:12px;">-</span>'
        }
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// บันทึกสถานะชั่วโมงอบรมทั้งหมด (batch)
window.saveBatchTrainingStatus = async function() {
  const statusSelect = document.getElementById('training-batch-status');
  const noteEl = document.getElementById('training-batch-note');
  const status = statusSelect ? statusSelect.value : 'APPROVED';
  const note = noteEl ? noteEl.value : '';

  // ดึง training IDs ทั้งหมดจาก checkbox
  const checkboxes = document.querySelectorAll('.training-cert-checkbox');
  if (checkboxes.length === 0) {
    alert('ไม่มีข้อมูลการอบรม');
    return;
  }

  // อัพเดตทุก training record ของนิสิตคนนี้
  let successCount = 0;
  let failCount = 0;

  for (const cb of checkboxes) {
    const trainingId = cb.dataset.id;
    try {
      const res = await fetch(`/api/admin/students/${studentId}/training/${trainingId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, note }),
      });
      const data = await res.json();
      if (data.success) successCount++;
      else failCount++;
    } catch (err) {
      failCount++;
    }
  }

  if (successCount > 0) {
    alert(`✅ อัปเดตสถานะสำเร็จ ${successCount} รายการ`);
    initStudentDetail();
  } else {
    alert('เกิดข้อผิดพลาดในการอัปเดต');
  }
};

// ==========================================
// 3. CV (admin ตรวจได้)
// ==========================================
function renderCv(cv) {
  const section = document.getElementById('admin-cv-section');

  if (!cv) {
    section.innerHTML = '<p class="text-gray-400 text-center py-4">นิสิตยังไม่ได้อัปโหลด CV</p>';
    return;
  }

  let statusBadge = '<span class="status-wait">☐ รอผล</span>';
  if (cv.status === 'APPROVED') statusBadge = '<span class="status-pass">✓ CVตรวจแล้ว / ผ่าน</span>';
  else if (cv.status === 'REJECTED') statusBadge = `<span class="status-fail">✗ CVไม่ผ่าน / ทำใหม่</span>`;

  // ตรวจว่าเป็น PDF หรือรูป
  const isPdf = cv.fileUrl && (cv.fileUrl.toLowerCase().endsWith('.pdf') || (cv.fileName && cv.fileName.toLowerCase().endsWith('.pdf')));

  let previewHtml;
  if (isPdf) {
    // ถ้าเป็น Cloudinary PDF ให้แปลงเป็น .jpg
    const displayUrl = cv.fileUrl.includes('cloudinary.com') ? cv.fileUrl.replace(/\.pdf$/i, '.jpg') : cv.fileUrl;
    previewHtml = `<img src="${displayUrl}" alt="CV" style="max-width:300px; max-height:400px; border-radius:8px; border:1px solid #e2e8f0; cursor:pointer;" onclick="window.open('${cv.fileUrl}', '_blank')" />`;
  } else {
    previewHtml = `<img src="${cv.fileUrl}" alt="CV" style="max-width:300px; max-height:400px; border-radius:8px; border:1px solid #e2e8f0; cursor:pointer;" onclick="window.open('${cv.fileUrl}', '_blank')" />`;
  }

  section.innerHTML = `
    <div style="display:flex; gap:20px; flex-wrap:wrap; align-items:flex-start;">
      <div>${previewHtml}</div>
      <div style="flex:1; min-width:250px;">
        <p style="font-size:14px; margin-bottom:8px;"><strong>ไฟล์:</strong> ${cv.fileName || 'CV'}</p>
        <p style="font-size:14px; margin-bottom:12px;"><strong>สถานะปัจจุบัน:</strong> ${statusBadge}</p>
        ${cv.note ? `<p style="font-size:13px; color:#64748b; margin-bottom:12px;">หมายเหตุ: ${cv.note}</p>` : ''}
        <div style="display:flex; flex-direction:column; gap:10px; max-width:350px;">
          <label style="font-size:13px; font-weight:600; color:#334155;">ตั้งสถานะ CV</label>
          <select class="input-field" id="cv-admin-status" style="font-size:13px; padding:8px 10px;">
            <option value="PENDING" ${cv.status === 'PENDING' ? 'selected' : ''}>☐ รอผล (รออาจารย์ตรวจ)</option>
            <option value="APPROVED" ${cv.status === 'APPROVED' ? 'selected' : ''}>✓ CVตรวจแล้ว / ผ่าน</option>
            <option value="REJECTED" ${cv.status === 'REJECTED' ? 'selected' : ''}>✗ CVไม่ผ่าน / ทำใหม่</option>
          </select>
          <input type="text" class="input-field" id="cv-admin-note" value="${cv.note || ''}" placeholder="Comment / หมายเหตุ..." />
          <button class="btn btn-primary btn-sm" onclick="saveCvStatus()" style="width:fit-content;">💾 บันทึกสถานะ CV</button>
        </div>
      </div>
    </div>
  `;
}

window.saveCvStatus = async function() {
  const selectEl = document.getElementById('cv-admin-status');
  const noteEl = document.getElementById('cv-admin-note');
  const status = selectEl ? selectEl.value : 'PENDING';
  const note = noteEl ? noteEl.value : '';

  try {
    const res = await fetch(`/api/admin/students/${studentId}/cv-status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, note }),
    });
    const data = await res.json();
    if (data.success) {
      alert('✅ อัปเดตสถานะ CV สำเร็จ');
      initStudentDetail();
    } else {
      alert('เกิดข้อผิดพลาด: ' + data.message);
    }
  } catch (err) {
    console.error(err);
  }
};

// ==========================================
// 4. Checklist บริษัท (อ่านอย่างเดียว — แบบ Figma + ดูตัวอย่าง modal)
// ==========================================

// เก็บข้อมูล companies ไว้ใช้ใน modal
let cachedCompanies = [];

function renderCompanies(companies) {
  const tbody = document.getElementById('admin-companies-tbody');
  const reviewStatusDiv = document.getElementById('checklist-review-status');
  const reviewBadge = document.getElementById('checklist-review-badge');
  tbody.innerHTML = '';
  cachedCompanies = companies || [];

  if (!companies || companies.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-gray-400">ยังไม่มีข้อมูล checklist</td></tr>';
    if (reviewStatusDiv) reviewStatusDiv.style.display = 'none';
    return;
  }

  companies.forEach((c, idx) => {
    let statusText = '☐ รอผล';
    let statusStyle = 'color:#94a3b8;';
    if (c.checklistStatus === 'APPROVED') {
      statusText = '✓ ผ่าน';
      statusStyle = 'color:#22c55e; font-weight:600;';
    } else if (c.checklistStatus === 'REJECTED') {
      statusText = '✗ ไม่ผ่าน';
      statusStyle = 'color:#ef4444; font-weight:600;';
    }

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${idx + 1}</td>
      <td>${c.name}</td>
      <td style="${statusStyle}">${statusText}</td>
      <td style="text-align:center;">
        <a href="#" onclick="openChecklistModal(${idx}); return false;" style="color:#2563eb; font-size:13px; text-decoration:none;">ดูตัวอย่าง</a>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // สถานะผลรีวิว
  if (reviewStatusDiv && reviewBadge) {
    const hasApproved = companies.some(c => c.checklistStatus === 'APPROVED');
    const hasRejected = companies.some(c => c.checklistStatus === 'REJECTED');
    const allPending = companies.every(c => !c.checklistStatus || c.checklistStatus === 'PENDING');

    reviewStatusDiv.style.display = 'block';

    if (hasApproved) {
      reviewBadge.innerHTML = '<span style="display:inline-block; padding:10px 32px; border-radius:8px; background:#22c55e; color:white; font-size:14px; font-weight:600;">อาจารย์รีวิวแล้ว</span>';
    } else if (hasRejected) {
      reviewBadge.innerHTML = '<span style="display:inline-block; padding:10px 32px; border-radius:8px; background:#ef4444; color:white; font-size:14px; font-weight:600;">ไม่ผ่าน / ทำ checklist เพิ่ม</span>';
    } else if (allPending) {
      reviewBadge.innerHTML = '<span style="display:inline-block; padding:10px 32px; border-radius:8px; background:#f59e0b; color:white; font-size:14px; font-weight:600;">รอผล</span>';
    }
  }
}

// เปิด Modal ดูตัวอย่าง Checklist ของบริษัท (styling เหมือน checklist.html)
window.openChecklistModal = function(companyIdx) {
  const company = cachedCompanies[companyIdx];
  if (!company) return;

  const modal = document.getElementById('checklist-modal');
  const title = document.getElementById('checklist-modal-title');
  const body = document.getElementById('checklist-modal-body');

  // ซ่อน title ด้านบนเดิม เพราะจะใช้ header สีน้ำเงินแทน
  title.style.display = 'none';

  // จัดกลุ่มคำตอบตาม section
  const answers = company.answers || [];
  if (answers.length === 0) {
    body.innerHTML = `
      <div style="border-radius:12px; overflow:hidden; box-shadow:0 4px 12px rgba(0,0,0,0.08); border:1px solid #d1d5db; background:white;">
        <div style="background:linear-gradient(90deg,#1e3a8a,#2563eb); color:white; padding:12px 20px; display:flex; align-items:center; justify-content:space-between;">
          <div style="display:flex; align-items:center; gap:10px;">
            <span class="material-icons" style="font-size:24px;">business</span>
            <span style="font-weight:600; font-size:1.1rem;">${company.name}</span>
          </div>
          <button onclick="closeChecklistModal()" style="background:none; border:none; cursor:pointer; color:white; font-size:14px;">ปิด</button>
        </div>
        <p style="color:#94a3b8; text-align:center; padding:40px 20px;">นิสิตยังไม่ได้กรอก Checklist สำหรับบริษัทนี้</p>
      </div>`;
  } else {
    // จัดกลุ่มตาม section
    const sectionMap = {};
    const sectionOrder = [];
    answers.forEach(a => {
      const sectionName = a.checklistItem?.section?.title || 'อื่นๆ';
      if (!sectionMap[sectionName]) {
        sectionMap[sectionName] = [];
        sectionOrder.push(sectionName);
      }
      sectionMap[sectionName].push(a);
    });

    let sectionsHtml = '';
    sectionOrder.forEach(sectionName => {
      const items = sectionMap[sectionName];
      let rowsHtml = '';
      items.forEach(a => {
        const itemLabel = a.checklistItem?.description || a.checklistItem?.label || '-';
        const isChecked = a.checked === true || a.checked === 'true' || a.value === true || a.value === 'true' || a.value === 'PASS';
        const detail = a.detail || a.note || '';

        rowsHtml += `
          <tr>
            <td style="text-align:left; color:#1f2937; width:60%; border:1px solid #e5e7eb; padding:10px 14px;">${itemLabel}</td>
            <td style="text-align:center; width:10%; border:1px solid #e5e7eb; padding:10px 14px;">
              <input type="checkbox" ${isChecked ? 'checked' : ''} disabled style="width:20px; height:20px; accent-color:#2563eb; cursor:default;" />
            </td>
            <td style="width:30%; border:1px solid #e5e7eb; padding:10px 14px; color:#64748b; font-size:13px;">${detail || '-'}</td>
          </tr>`;
      });

      sectionsHtml += `
        <div style="padding:0 24px 8px 24px;">
          <h3 style="font-size:1.25rem; font-weight:600; color:#1d4ed8; margin:24px 0 12px 0; display:flex; align-items:center; gap:8px;">
            <span class="material-icons" style="color:#2563eb;">bookmark</span>
            ${sectionName}
          </h3>
          <table style="width:100%; border-collapse:collapse; margin-bottom:20px; font-size:0.95rem;">
            <thead>
              <tr>
                <th style="background-color:#f9fafb; font-weight:600; text-align:center; color:#374151; border:1px solid #e5e7eb; padding:10px 14px;">รายละเอียดที่ต้องพิจารณา</th>
                <th style="background-color:#f9fafb; font-weight:600; text-align:center; color:#374151; border:1px solid #e5e7eb; padding:10px 14px;">Checklist</th>
                <th style="background-color:#f9fafb; font-weight:600; text-align:center; color:#374151; border:1px solid #e5e7eb; padding:10px 14px;">รายละเอียดเพิ่ม</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </div>`;
    });

    body.innerHTML = `
      <div style="border-radius:12px; overflow:hidden; box-shadow:0 4px 12px rgba(0,0,0,0.08); border:1px solid #d1d5db; background:white;">
        <div style="background:linear-gradient(90deg,#1e3a8a,#2563eb); color:white; padding:12px 20px; display:flex; align-items:center; justify-content:space-between;">
          <div style="display:flex; align-items:center; gap:10px;">
            <span class="material-icons" style="font-size:24px;">business</span>
            <span style="font-weight:600; font-size:1.1rem;">${company.name}</span>
          </div>
          <button onclick="closeChecklistModal()" style="background:none; border:none; cursor:pointer; color:white; font-size:14px; font-weight:500;">ปิด</button>
        </div>
        ${sectionsHtml}
      </div>`;
  }

  modal.style.display = 'flex';
};

window.closeChecklistModal = function() {
  const modal = document.getElementById('checklist-modal');
  if (modal) modal.style.display = 'none';
};

// ==========================================
// 5. สถานะการยื่น (อ่านอย่างเดียว)
// ==========================================
function renderSubmissions(companies) {
  const tbody = document.getElementById('admin-submissions-tbody');
  tbody.innerHTML = '';

  const approvedCompanies = companies.filter(c => c.checklistStatus === 'APPROVED');

  if (approvedCompanies.length === 0) {
    tbody.innerHTML = '<tr><td colspan="3" class="text-center py-4 text-gray-400">ยังไม่มีบริษัทที่ผ่าน checklist</td></tr>';
    return;
  }

  const statusLabels = {
    NOT_SUBMITTED: 'ยังไม่ได้ยื่น',
    SUBMITTED_WAITING: 'ยื่นแล้ว รอสัมภาษณ์',
    INTERVIEWED_PENDING: 'สัมภาษณ์แล้ว รอผล',
    INTERVIEW_PASSED: 'สัมภาษณ์ผ่านแล้ว',
    INTERVIEW_FAILED_REAPPLIED: 'สัมภาษณ์ไม่ผ่าน ยื่นเพิ่มแล้ว',
  };

  approvedCompanies.forEach((c, idx) => {
    const subStatus = c.submission ? c.submission.status : 'NOT_SUBMITTED';
    const label = statusLabels[subStatus] || subStatus;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${idx + 1}</td>
      <td>${c.name}</td>
      <td>${label}</td>
    `;
    tbody.appendChild(tr);
  });
}

// ==========================================
// 6. ข้อมูลบริษัท ที่เข้าฝึกงาน (admin อนุมัติได้)
// ==========================================
function renderPlacement(placement) {
  const section = document.getElementById('admin-placement-section');
  const body = document.getElementById('admin-placement-body');

  if (!placement) {
    section.style.display = 'none';
    return;
  }

  section.style.display = 'block';

  let statusBadge = '<span class="status-wait">☐ รอผล</span>';
  if (placement.status === 'APPROVED') statusBadge = '<span class="status-pass">✓ อนุมัติที่ฝึกงาน</span>';
  else if (placement.status === 'REJECTED') statusBadge = '<span class="status-fail">✗ ไม่อนุมัติที่ฝึกงาน</span>';

  body.innerHTML = `
    <div style="margin-bottom:16px; padding:12px 18px; border-radius:8px; background:#f8fafc; border:1px solid #e2e8f0; display:flex; align-items:center; gap:10px;">
      <strong>สถานะปัจจุบัน:</strong> ${statusBadge}
      ${placement.note ? `<span style="color:#64748b; font-size:13px;">หมายเหตุ: ${placement.note}</span>` : ''}
    </div>
    <div class="form-grid">
      <div class="form-group"><label class="form-label">ตำแหน่งที่ฝึก</label><input class="input-field" value="${placement.position || '-'}" readonly /></div>
      <div class="form-group"><label class="form-label">ชื่อแหล่งฝึกงาน</label><input class="input-field" value="${placement.companyNameTh || '-'}" readonly /></div>
      <div class="form-group"><label class="form-label">บุคคลที่ให้ทำหนังสือ</label><input class="input-field" value="${placement.contactPersonName || '-'}" readonly /></div>
      <div class="form-group"><label class="form-label">ตำแหน่งบุคคล</label><input class="input-field" value="${placement.contactPersonPosition || '-'}" readonly /></div>
      <div class="form-group"><label class="form-label">ที่อยู่บริษัท</label><input class="input-field" value="${placement.companyAddress || '-'}" readonly /></div>
      <div class="form-group"><label class="form-label">เบอร์โทร 1</label><input class="input-field" value="${placement.companyPhone1 || '-'}" readonly /></div>
      <div class="form-group"><label class="form-label">เบอร์โทร 2</label><input class="input-field" value="${placement.companyPhone2 || '-'}" readonly /></div>
      <div class="form-group"><label class="form-label">Email</label><input class="input-field" value="${placement.companyEmail || '-'}" readonly /></div>
      <div class="form-group"><label class="form-label">จังหวัด</label><input class="input-field" value="${placement.province || '-'}" readonly /></div>
    </div>
    <div style="margin-top:16px; display:flex; flex-direction:column; gap:10px; max-width:350px;">
      <label style="font-size:13px; font-weight:600; color:#334155;">ตั้งสถานะอนุมัติที่ฝึกงาน</label>
      <select class="input-field" id="placement-admin-status" style="font-size:13px; padding:8px 10px;">
        <option value="PENDING" ${placement.status === 'PENDING' ? 'selected' : ''}>☐ รอผล</option>
        <option value="APPROVED" ${placement.status === 'APPROVED' ? 'selected' : ''}>✓ อนุมัติที่ฝึกงาน</option>
        <option value="REJECTED" ${placement.status === 'REJECTED' ? 'selected' : ''}>✗ ไม่อนุมัติที่ฝึกงาน / เปลี่ยนที่ฝึกงาน</option>
      </select>
      <input type="text" class="input-field" id="placement-admin-note" value="${placement.note || ''}" placeholder="Comment / หมายเหตุ..." />
      <button class="btn btn-primary btn-sm" onclick="savePlacementStatus()" style="width:fit-content;">💾 บันทึกสถานะอนุมัติ</button>
    </div>
  `;
}

window.savePlacementStatus = async function() {
  const selectEl = document.getElementById('placement-admin-status');
  const noteEl = document.getElementById('placement-admin-note');
  const status = selectEl ? selectEl.value : 'PENDING';
  const note = noteEl ? noteEl.value : '';

  try {
    const res = await fetch(`/api/admin/students/${studentId}/placement-status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, note }),
    });
    const data = await res.json();
    if (data.success) {
      alert('✅ อัปเดตสถานะอนุมัติที่ฝึกงานสำเร็จ');
      initStudentDetail();
    } else {
      alert('เกิดข้อผิดพลาด: ' + data.message);
    }
  } catch (err) {
    console.error(err);
  }
};

// ==========================================
// 7. สรุปข้อมูลเอกสาร
// ==========================================
function renderDocumentSummary(data) {
  const body = document.getElementById('admin-summary-body');
  const s = data.student;
  const cv = data.cv;
  const ts = data.trainingSummary;
  const companies = data.companies;
  const placement = data.placement;

  const cvStatus = cv ? (cv.status === 'APPROVED' ? '✅ ผ่าน' : cv.status === 'REJECTED' ? '❌ ไม่ผ่าน' : '⏳ รอผล') : '❌ ยังไม่ได้อัปโหลด';
  const trainingStatus = (ts.approvedSoft >= 12 && ts.approvedHard >= 18) ? '✅ ครบ 30 ชม.' : `⏳ Soft ${ts.approvedSoft}/12 | Hard ${ts.approvedHard}/18`;
  const checklistApproved = companies.filter(c => c.checklistStatus === 'APPROVED').length;
  const interviewPassed = companies.filter(c => c.submission && c.submission.status === 'INTERVIEW_PASSED').length;
  const placementStatus = placement ? (placement.status === 'APPROVED' ? '✅ อนุมัติแล้ว' : placement.status === 'REJECTED' ? '❌ ไม่อนุมัติ' : '⏳ รอผล') : '❌ ยังไม่ได้กรอก';

  body.innerHTML = `
    <table class="data-table" style="font-size:14px;">
      <tbody>
        <tr><td style="font-weight:600; width:220px;">ชื่อ-สกุล</td><td>${s.nameTh} (${s.nameEn || '-'})</td></tr>
        <tr><td style="font-weight:600;">รหัสนิสิต</td><td>${s.studentCode}</td></tr>
        <tr><td style="font-weight:600;">สาขา / ชั้นปี</td><td>${s.major || '-'} / ปี ${s.year || '-'}</td></tr>
        <tr><td style="font-weight:600;">GPA</td><td>${s.gpa ? Number(s.gpa).toFixed(2) : '-'}</td></tr>
        <tr><td style="font-weight:600;">อาจารย์ที่ปรึกษา</td><td>${s.advisorName || '-'}</td></tr>
        <tr><td colspan="2" style="padding-top:14px; border-top:2px solid #e2e8f0;"></td></tr>
        <tr><td style="font-weight:600;">สถานะ CV</td><td>${cvStatus}</td></tr>
        <tr><td style="font-weight:600;">ชั่วโมงอบรม (ที่ผ่านแล้ว)</td><td>${trainingStatus}</td></tr>
        <tr><td style="font-weight:600;">Checklist ผ่าน</td><td>${checklistApproved > 0 ? `✅ ${checklistApproved} บริษัท` : '❌ ยังไม่มี'}</td></tr>
        <tr><td style="font-weight:600;">สัมภาษณ์ผ่าน</td><td>${interviewPassed > 0 ? `✅ ${interviewPassed} บริษัท` : '❌ ยังไม่มี'}</td></tr>
        <tr><td style="font-weight:600;">สถานะอนุมัติที่ฝึกงาน</td><td>${placementStatus}</td></tr>
      </tbody>
    </table>
  `;
}

// เริ่มโหลด
initStudentDetail();
