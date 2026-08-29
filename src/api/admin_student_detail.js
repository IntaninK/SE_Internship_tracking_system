// admin_student_detail.js — หน้าดูข้อมูลนิสิตรายบุคคลสำหรับ Admin
// ดึงข้อมูลจาก /api/admin/students/:studentId แล้ว render ทั้ง 7 section

const urlParams = new URLSearchParams(window.location.search);
const studentId = urlParams.get('id');

if (!studentId) {
  document.getElementById('student-header-name').textContent = 'ไม่พบ ID นิสิต';
}

async function initStudentDetail() {
  if (!studentId) return;

  try {
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
// 2. ชั่วโมงการอบรม (admin ตรวจได้)
// ==========================================
function renderTrainings(trainings, summary) {
  const tbody = document.getElementById('admin-trainings-tbody');
  const summaryEl = document.getElementById('training-summary-text');
  tbody.innerHTML = '';

  if (summaryEl) {
    summaryEl.textContent = `Soft: ${summary.approvedSoft}/${summary.totalSoft} ชม. | Hard: ${summary.approvedHard}/${summary.totalHard} ชม.`;
  }

  if (!trainings || trainings.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-gray-400">ยังไม่มีข้อมูลการอบรม</td></tr>';
    return;
  }

  trainings.forEach((t, idx) => {
    let statusBadge = '<span class="status-wait">☐ รอผล</span>';
    if (t.status === 'APPROVED') statusBadge = '<span class="status-pass">✓ ผ่าน</span>';
    else if (t.status === 'REJECTED') statusBadge = '<span class="status-fail">✗ ไม่ผ่าน</span>';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${idx + 1}</td>
      <td>${t.title}</td>
      <td>${t.skillType === 'HARD' ? 'Hard skill' : 'Soft skill'}</td>
      <td>${t.hours}</td>
      <td>${statusBadge}</td>
      <td>
        <input type="text" class="input-field" id="training-note-${t.id}" value="${t.note || ''}" placeholder="Comment..." style="font-size:12px; min-width:120px;" />
      </td>
      <td>
        <div style="display:flex; gap:4px;">
          <button class="btn btn-primary btn-xs" onclick="setTrainingStatus(${t.id}, 'APPROVED')" style="font-size:11px;">ผ่าน</button>
          <button class="btn btn-tonal btn-xs" onclick="setTrainingStatus(${t.id}, 'REJECTED')" style="font-size:11px;">ไม่ผ่าน</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

window.setTrainingStatus = async function(trainingId, status) {
  const noteEl = document.getElementById(`training-note-${trainingId}`);
  const note = noteEl ? noteEl.value : '';

  try {
    const res = await fetch(`/api/admin/students/${studentId}/training/${trainingId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, note }),
    });
    const data = await res.json();
    if (data.success) {
      alert('✅ อัปเดตสถานะสำเร็จ');
      initStudentDetail();
    } else {
      alert('เกิดข้อผิดพลาด: ' + data.message);
    }
  } catch (err) {
    console.error(err);
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
        <div style="display:flex; flex-direction:column; gap:10px; max-width:300px;">
          <input type="text" class="input-field" id="cv-admin-note" value="${cv.note || ''}" placeholder="Comment / หมายเหตุ..." />
          <div style="display:flex; gap:8px;">
            <button class="btn btn-primary btn-sm" onclick="setCvStatus('APPROVED')">✓ ผ่าน</button>
            <button class="btn btn-tonal btn-sm" onclick="setCvStatus('REJECTED')">✗ ไม่ผ่าน</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

window.setCvStatus = async function(status) {
  const noteEl = document.getElementById('cv-admin-note');
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
// 4. Checklist บริษัท (อ่านอย่างเดียว)
// ==========================================
function renderCompanies(companies) {
  const tbody = document.getElementById('admin-companies-tbody');
  tbody.innerHTML = '';

  if (!companies || companies.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-gray-400">ยังไม่มีข้อมูล checklist</td></tr>';
    return;
  }

  companies.forEach((c, idx) => {
    let statusBadge = '☐ รอผล';
    let cls = 'status-wait';
    if (c.checklistStatus === 'APPROVED') { statusBadge = '✓ อาจารย์รีวิวแล้ว / ผ่าน'; cls = 'status-pass'; }
    else if (c.checklistStatus === 'REJECTED') { statusBadge = '✗ ไม่ผ่าน'; cls = 'status-fail'; }

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${idx + 1}</td>
      <td>${c.name}</td>
      <td class="${cls}">${statusBadge}</td>
      <td>${c.checklistNote || '-'}</td>
    `;
    tbody.appendChild(tr);
  });
}

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
      <input type="text" class="input-field" id="placement-admin-note" value="${placement.note || ''}" placeholder="Comment / หมายเหตุ..." />
      <div style="display:flex; gap:8px;">
        <button class="btn btn-primary btn-sm" onclick="setPlacementStatus('APPROVED')">✓ อนุมัติที่ฝึกงาน</button>
        <button class="btn btn-tonal btn-sm" onclick="setPlacementStatus('REJECTED')">✗ ไม่อนุมัติ</button>
      </div>
    </div>
  `;
}

window.setPlacementStatus = async function(status) {
  const noteEl = document.getElementById('placement-admin-note');
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
