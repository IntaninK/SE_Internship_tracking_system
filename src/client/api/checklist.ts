// @ts-nocheck
// checklist.js - หน้า Checklist บริษัทที่สนใจยื่นฝึกงาน (นโยบายใหม่: ยื่นได้ทีละ 1 บริษัท + Auto-suggest Master Data + ข้อมูลออกหนังสือราชการ + Archive)

let templateSections = [];
let companiesData = [];
let masterCompaniesList = [];
let currentPlacementData = null;
let isDroppedStudent = false;

const STANDARD_POSITIONS = [
  "Software Engineer / Developer",
  "Frontend Developer",
  "Backend Developer",
  "Full-Stack Developer",
  "Mobile App Developer (iOS / Android / Flutter)",
  "Data Scientist / Data Analyst / Data Engineer",
  "DevOps / Cloud Engineer",
  "QA / Software Tester",
  "UI/UX Designer / Product Designer",
  "System Analyst / Business Analyst",
  "Network & Security / Cybersecurity",
  "IT Support / System Administrator",
  "AI / Machine Learning Engineer",
  "Game Developer",
  "OTHER"
];

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function loadData() {
  try {
    const [trainRes, cvRes, profRes] = await Promise.all([
      fetch('/api/student/trainings'),
      fetch('/api/student/cv'),
      fetch('/api/student/profile')
    ]);
    const trainData = await trainRes.json();
    const cvData = await cvRes.json();
    const profData = await profRes.json();

    isDroppedStudent = Boolean(profData.student && profData.student.isDropped);

    const approvedSoftHours = (trainData.trainings || [])
      .filter(t => t.status === 'APPROVED' && t.skillType === 'SOFT')
      .reduce((sum, t) => sum + (Number(t.hours) || 0), 0);
    const approvedHardHours = (trainData.trainings || [])
      .filter(t => t.status === 'APPROVED' && t.skillType === 'HARD')
      .reduce((sum, t) => sum + (Number(t.hours) || 0), 0);

    const isTrainingComplete = approvedSoftHours >= 12 && approvedHardHours >= 18;
    const isCvApproved = cvData.success && cvData.cv && cvData.cv.status === 'APPROVED';

    if (!isDroppedStudent && (!isTrainingComplete || !isCvApproved)) {
      alert('⚠️ ยังไม่สามารถเข้าใช้งานหน้า Checklist บริษัทได้ เนื่องจากยังไม่ผ่านเงื่อนไขการอบรม (Soft >= 12, Hard >= 18 ชม.) หรือ CV ยังไม่ได้รับการอนุมัติ');
      window.location.href = '/status-all';
      return;
    }

    const [tplRes, compRes] = await Promise.all([
      fetch('/api/student/checklist-template'),
      fetch('/api/student/companies')
    ]);

    const tplData = await tplRes.json();
    const compData = await compRes.json();

    if (tplData.success) {
      templateSections = tplData.sections;
    }

    currentPlacementData = compData.placement || null;

    // เติมข้อมูล Auto-suggest รายชื่อบริษัทจากฐานข้อมูลกลาง (Master Data)
    masterCompaniesList = compData.masterCompanies || [];
    const datalistEl = document.getElementById('master-companies-datalist');
    if (datalistEl && masterCompaniesList.length > 0) {
      datalistEl.innerHTML = masterCompaniesList.map(mc =>
        `<option value="${escapeHtml(mc.nameTh)}">${escapeHtml(mc.nameEn || '')} (${escapeHtml(mc.province || '')})</option>`
      ).join('');
    }

    // แสดงประวัติ Archive (ถ้ามี)
    const archivedList = compData.archivedCompanies || [];
    const archiveBox = document.getElementById('archived-companies-box');
    const archiveListEl = document.getElementById('archived-companies-list');
    if (archiveBox && archiveListEl && archivedList.length > 0) {
      archiveBox.style.display = 'block';
      archiveListEl.innerHTML = archivedList.map((a, idx) => `
        <div style="background:white; border:1px solid #E2E8F0; border-radius:12px; padding:12px 16px; margin-bottom:8px;">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
            <div>
              <span style="font-weight:800; color:#1E1B4B; font-size:13.5px;">รอบที่ ${idx + 1}: ${escapeHtml(a.companyName)}</span>
              <span style="font-size:12px; color:#475569; margin-left:8px;">ตำแหน่ง: ${escapeHtml(a.position || 'นิสิตฝึกงาน')}</span>
              <span style="background:#FEE2E2; color:#991B1B; font-size:11px; font-weight:700; padding:2px 8px; border-radius:999px; margin-left:8px;">
                ${a.reason === 'COMPANY_REJECTED' ? '✗ สถานประกอบการปฏิเสธ' : '✗ อาจารย์ที่ปรึกษาไม่อนุมัติ'}
              </span>
              <div style="font-size:12px; color:#64748B; margin-top:3px;">
                เหตุผล: ${escapeHtml(a.note || '-')}
              </div>
            </div>
            <div style="display:flex; align-items:center; gap:8px;">
              <span style="font-size:11.5px; color:#94A3B8;">${new Date(a.archivedAt).toLocaleDateString('th-TH')}</span>
              ${Array.isArray(a.answers) && a.answers.length > 0 ? `
                <button type="button" onclick="window.toggleArchivedAnswers(${idx})" style="background:#EFF6FF; color:#1D4ED8; border:1px solid #BFDBFE; padding:3px 9px; border-radius:6px; font-size:11px; font-weight:700; cursor:pointer;">
                  👁️ ดูคำตอบเดิม (${a.answers.length} ข้อ)
                </button>
              ` : ''}
            </div>
          </div>
          ${Array.isArray(a.answers) && a.answers.length > 0 ? `
            <div id="archived-answers-${idx}" style="display:none; margin-top:10px; border-top:1px dashed #CBD5E1; padding-top:10px; font-size:12px;">
              <div style="font-weight:700; color:#334155; margin-bottom:6px;">รายการ Checklist ที่เคยตอบไว้ในรอบนี้:</div>
              <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:6px;">
                ${a.answers.map(ans => `
                  <div style="display:flex; align-items:flex-start; gap:6px; color:#334155; background:#F8FAFC; padding:5px 8px; border-radius:6px;">
                    <span>${ans.checked ? '☑️' : '⬜'}</span>
                    <span style="flex:1;">${escapeHtml(ans.description)} ${ans.detail ? `<span style="color:#2563EB;">(${escapeHtml(ans.detail)})</span>` : ''}</span>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}
        </div>
      `).join('');
    }

    const container = document.getElementById('companies-container');
    container.innerHTML = '';

    if (isDroppedStudent) {
      let banner = document.getElementById('dropped-checklist-banner');
      if (!banner) {
        banner = document.createElement('div');
        banner.id = 'dropped-checklist-banner';
        banner.className = 'mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl shadow-sm';
        banner.innerHTML = `
          <div class="flex items-center gap-3">
            <span class="material-icons text-red-500 text-3xl">lock</span>
            <div>
              <h4 class="text-sm font-bold text-red-800">โหมดดูข้อมูลเท่านั้น (View-only): บัญชีของคุณอยู่ในสถานะดรอป</h4>
              <p class="text-xs text-red-700 mt-0.5">คุณสามารถดูข้อมูล Checklist บริษัทเดิมที่เคยบันทึกไว้ได้ แต่ไม่สามารถเพิ่ม ลบ หรือแก้ไขข้อมูลได้</p>
            </div>
          </div>
        `;
        if (container && container.parentElement) {
          container.parentElement.insertBefore(banner, container);
        }
      }
      const addBtn = document.getElementById('add-company-btn');
      if (addBtn) addBtn.style.display = 'none';

      const saveBtn = document.getElementById('save-all-btn');
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.style.opacity = '0.55';
        saveBtn.style.cursor = 'not-allowed';
        saveBtn.innerHTML = '<span class="material-icons text-2xl">lock</span> <span>บัญชีถูกดรอป (ปิดการแก้ไขข้อมูล)</span>';
      }
    }

    if (compData.success && compData.companies && compData.companies.length > 0) {
      companiesData = compData.companies.slice(0, 1); // บังคับแสดง/ยื่นทีละ 1 บริษัทตามนโยบายใหม่
      companiesData.forEach((comp, idx) => {
        renderCompanyCard(comp, idx);
      });
      // หากบริษัทปัจจุบันถูกอาจารย์ที่ปรึกษา REJECTED ให้แสดงปุ่มปลดล็อกยื่นบริษัทใหม่
      const currentComp = companiesData[0];
      const addBtn = document.getElementById('add-company-btn');
      if (addBtn && currentComp && currentComp.checklistStatus === 'REJECTED' && !isDroppedStudent) {
        addBtn.style.display = 'inline-flex';
      }

      // หากอาจารย์ที่ปรึกษาอนุมัติ Checklist แล้ว ล็อคปุ่มบันทึกและแสดงสถานะ
      const saveBtn = document.getElementById('save-all-btn') as HTMLButtonElement | null;
      if (currentComp && currentComp.checklistStatus === 'APPROVED' && saveBtn) {
        saveBtn.disabled = true;
        saveBtn.style.opacity = '0.85';
        saveBtn.style.cursor = 'default';
        saveBtn.style.background = '#10B981';
        saveBtn.innerHTML = '<span class="material-icons text-2xl">verified</span> <span>อาจารย์ที่ปรึกษาอนุมัติ Checklist แล้ว (ปิดการแก้ไขข้อมูล)</span>';
      }
    } else {
      if (!isDroppedStudent) {
        addNewCompanyCard('');
      } else {
        container.innerHTML = '<div class="text-center text-gray-500 py-10 font-medium">ไม่มีข้อมูล Checklist บริษัทเดิมที่บันทึกไว้</div>';
      }
    }
  } catch (err) {
    console.error('Error loading checklist data:', err);
    document.getElementById('companies-container').innerHTML = '<div class="text-center text-red-500 font-medium">เกิดข้อผิดพลาดในการโหลดข้อมูล</div>';
  }
}

window.toggleArchivedAnswers = function(idx) {
  const el = document.getElementById(`archived-answers-${idx}`);
  if (el) {
    el.style.display = el.style.display === 'none' ? 'block' : 'none';
  }
};

window.handlePositionSelectChange = function(index) {
  const sel = document.getElementById(`company-position-select-${index}`);
  const customInput = document.getElementById(`company-custom-position-${index}`);
  if (!sel || !customInput) return;
  if (sel.value === 'OTHER') {
    customInput.style.display = 'block';
    customInput.focus();
  } else {
    customInput.style.display = 'none';
  }
};

window.onCompanyNameInput = function(index) {
  const card = document.getElementById(`company-card-${index}`);
  if (!card) return;
  const nameInput = card.querySelector('.company-name-input');
  if (!nameInput) return;
  const val = nameInput.value.trim().toLowerCase().replace(/\s+/g, '');
  if (!val) return;

  const matched = masterCompaniesList.find(mc =>
    mc.nameTh.toLowerCase().replace(/\s+/g, '') === val ||
    (mc.nameEn && mc.nameEn.toLowerCase().replace(/\s+/g, '') === val)
  );

  if (matched) {
    const addrInput = document.getElementById(`company-address-${index}`);
    const provInput = document.getElementById(`company-province-${index}`);
    const contactInput = document.getElementById(`company-contact-name-${index}`);
    const phoneInput = document.getElementById(`company-phone1-${index}`);
    const emailInput = document.getElementById(`company-email-${index}`);

    if (addrInput && (!addrInput.value || addrInput.value === 'รอตรวจสอบที่อยู่')) {
      addrInput.value = matched.address && matched.address !== '-' ? matched.address : '';
    }
    if (provInput && (!provInput.value || provInput.value === 'รอระบุจังหวัด')) {
      provInput.value = matched.province && matched.province !== '-' ? matched.province : '';
    }
    if (contactInput && !contactInput.value) {
      contactInput.value = matched.hrContactName && matched.hrContactName !== '-' ? matched.hrContactName : '';
    }
    if (phoneInput && !phoneInput.value) {
      phoneInput.value = matched.hrPhone && matched.hrPhone !== '-' ? matched.hrPhone : '';
    }
    if (emailInput && !emailInput.value) {
      emailInput.value = matched.hrEmail && matched.hrEmail !== '-' ? matched.hrEmail : '';
    }
  }
};

function renderCompanyCard(comp, index) {
  const isLocked = isDroppedStudent || comp.checklistStatus === 'APPROVED';
  const container = document.getElementById('companies-container');
  const card = document.createElement('div');
  card.className = 'company-card';
  card.id = `company-card-${index}`;
  card.dataset.companyId = comp.id || '';

  const answersMap = {};
  if (comp.answers && Array.isArray(comp.answers)) {
    comp.answers.forEach(a => {
      answersMap[a.checklistItemId] = a;
    });
  }

  let sectionsHtml = '';
  templateSections.forEach(sec => {
    let rowsHtml = '';
    sec.items.forEach(item => {
      const ans = answersMap[item.id] || { checked: false, detail: '' };
      rowsHtml += `
        <tr>
          <td class="desc-col">
            ${item.description}
            ${item.isRequired ? '<span style="color:#DC2626; font-size:11px; font-weight:700; margin-left:6px; background:#FEE2E2; padding:1px 6px; border-radius:4px;">*จำเป็น</span>' : ''}
          </td>
          <td class="check-col">
            <input type="checkbox" onchange="window.updateChecklistProgress ? window.updateChecklistProgress(${index}) : null" class="custom-checkbox" data-item-id="${item.id}" data-section-id="${sec.id}" ${ans.checked ? 'checked' : ''} ${isLocked ? 'disabled style="cursor: not-allowed;"' : ''} />
          </td>
          <td class="detail-col">
            <input type="text" class="detail-input" placeholder="${item.placeholder || 'รายละเอียดเพิ่ม'}" data-item-id="${item.id}" value="${escapeHtml(ans.detail || '')}" ${isLocked ? 'readonly style="background-color: #f8fafc; cursor: not-allowed;"' : ''} />
          </td>
        </tr>
      `;
    });

    sectionsHtml += `
      <div class="px-6 py-2">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; flex-wrap:wrap; gap:8px;">
          <h3 class="section-title" style="margin:0;">
            <span class="material-icons text-blue-600">bookmark</span>
            ${sec.title}
          </h3>
          <button type="button" onclick="window.selectAllInSection(${index}, ${sec.id})" ${isLocked ? 'disabled style="display:none;"' : ''} style="font-size:11.5px; font-weight:600; color:#2563EB; background:#EFF6FF; border:1px solid #BFDBFE; padding:3px 10px; border-radius:6px; cursor:pointer; display:inline-flex; align-items:center; gap:4px;">
            <span class="material-icons" style="font-size:15px;">done_all</span> เลือกทั้งหมดในหมวดนี้
          </button>
        </div>
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

  const statusBadge = comp.checklistStatus === 'APPROVED'
    ? `<span style="background:#DCFCE7; color:#166534; font-size:12px; font-weight:700; padding:4px 12px; border-radius:999px;">✓ อาจารย์ที่ปรึกษาอนุมัติแล้ว</span>`
    : comp.checklistStatus === 'REJECTED'
    ? `<span style="background:#FEE2E2; color:#991B1B; font-size:12px; font-weight:700; padding:4px 12px; border-radius:999px;">✗ ไม่ผ่านการอนุมัติ (${comp.checklistNote || 'กรุณายื่นบริษัทใหม่'})</span>`
    : comp.id
    ? `<span style="background:#FEF3C7; color:#92400E; font-size:12px; font-weight:700; padding:4px 12px; border-radius:999px;">⏳ รออาจารย์ที่ปรึกษาตรวจสอบ</span>`
    : '';

  const plc = currentPlacementData || {};
  const currentPos = plc.position || 'Software Developer';
  const isCustomPos = !STANDARD_POSITIONS.includes(currentPos) && currentPos !== 'OTHER';

  const positionOptionsHtml = STANDARD_POSITIONS.map(p => {
    if (p === 'OTHER') {
      return `<option value="OTHER" ${isCustomPos ? 'selected' : ''}>-- อื่นๆ (ระบุตำแหน่งเอง...) --</option>`;
    }
    const isSelected = (!isCustomPos && currentPos === p) || (p === 'Software Developer' && !currentPos);
    return `<option value="${p}" ${isSelected ? 'selected' : ''}>${p}</option>`;
  }).join('');

  card.innerHTML = `
    <div class="company-header cursor-pointer" onclick="toggleCompany(${index})">
      <div class="flex items-center gap-3 flex-1 flex-wrap" onclick="event.stopPropagation()">
        <span class="material-icons text-2xl">business</span>
        <input type="text" list="master-companies-datalist" oninput="window.onCompanyNameInput(${index})" class="company-name-input" value="${escapeHtml(comp.name || plc.companyNameTh || '')}" placeholder="พิมพ์เพื่อเลือกบริษัทจากฐานข้อมูลกลาง หรือพิมพ์ชื่อบริษัทใหม่..." ${isLocked ? 'readonly style="background-color: #f8fafc; cursor: not-allowed;"' : ''} />
        ${statusBadge}
      </div>
      <div class="flex items-center gap-3">
        <span id="chevron-${index}" class="material-icons text-3xl transition-transform transform">expand_more</span>
      </div>
    </div>
    <div id="body-${index}" class="company-body" style="display: block;">
      <!-- ส่วนที่ 1: ข้อมูลสถานประกอบการและตำแหน่งสำหรับออกหนังสือราชการ (ย้ายมารวมไว้ใน Checklist) -->
      <div style="padding:18px 24px; background:#F8FAFC; border-bottom:1.5px solid #E2E8F0;">
        <div style="display:flex; align-items:center; gap:8px; margin-bottom:12px;">
          <span class="material-icons" style="color:#4338CA; font-size:22px;">apartment</span>
          <h4 style="font-size:14px; font-weight:800; color:#1E1B4B; margin:0;">
            ข้อมูลสถานประกอบการและตำแหน่งงานสำหรับออกหนังสือขอความอนุเคราะห์ (+แบบตอบรับ)
          </h4>
        </div>

        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(260px, 1fr)); gap:14px;">
          <!-- ตำแหน่งงานที่ฝึก -->
          <div>
            <label style="display:block; font-size:12px; font-weight:700; color:#334155; margin-bottom:4px;">
              ตำแหน่งที่เข้าฝึกงาน <span style="color:#DC2626;">*</span>
            </label>
            <select id="company-position-select-${index}" onchange="window.handlePositionSelectChange(${index})" class="input-field" style="width:100%; padding:7px 10px; font-size:12.5px; border:1px solid #CBD5E1; border-radius:8px; background:white;" ${isLocked ? 'disabled style="background-color: #f8fafc; cursor: not-allowed;"' : ''}>
              ${positionOptionsHtml}
            </select>
            <input type="text" id="company-custom-position-${index}" value="${isCustomPos ? escapeHtml(currentPos) : ''}" placeholder="พิมพ์ระบุชื่อตำแหน่งงานเอง..." class="input-field" style="width:100%; padding:7px 10px; font-size:12.5px; border:1.5px solid #4338CA; border-radius:8px; margin-top:6px; display:${isCustomPos ? 'block' : 'none'};" ${isLocked ? 'readonly style="background-color: #f8fafc; cursor: not-allowed;"' : ''} />
          </div>

          <!-- จังหวัด -->
          <div>
            <label style="display:block; font-size:12px; font-weight:700; color:#334155; margin-bottom:4px;">
              จังหวัดที่ตั้งสถานประกอบการ <span style="color:#DC2626;">*</span>
            </label>
            <input type="text" id="company-province-${index}" list="provinces-datalist" value="${escapeHtml(plc.province || '')}" placeholder="เช่น กรุงเทพมหานคร, เชียงใหม่, พะเยา" class="input-field" style="width:100%; padding:7px 10px; font-size:12.5px; border:1px solid #CBD5E1; border-radius:8px;" ${isLocked ? 'readonly style="background-color: #f8fafc; cursor: not-allowed;"' : ''} />
          </div>

          <!-- ชื่อบุคคลที่ให้ทำหนังสือขอความอนุเคราะห์ (เรียน...) -->
          <div>
            <label style="display:block; font-size:12px; font-weight:700; color:#334155; margin-bottom:4px;">
              ชื่อบุคคลที่ให้ทำหนังสือขอความอนุเคราะห์ (เรียน...)
            </label>
            <input type="text" id="company-contact-name-${index}" value="${escapeHtml(plc.contactPersonName || '')}" placeholder="เช่น ผู้จัดการฝ่ายทรัพยากรบุคคล หรือ คุณสมชาย ใจดี" class="input-field" style="width:100%; padding:7px 10px; font-size:12.5px; border:1px solid #CBD5E1; border-radius:8px;" ${isLocked ? 'readonly style="background-color: #f8fafc; cursor: not-allowed;"' : ''} />
          </div>

          <!-- ตำแหน่งบุคคลที่ให้ทำหนังสือขอความอนุเคราะห์ -->
          <div>
            <label style="display:block; font-size:12px; font-weight:700; color:#334155; margin-bottom:4px;">
              ตำแหน่งบุคคลที่ให้ทำหนังสือขอความอนุเคราะห์
            </label>
            <input type="text" id="company-contact-pos-${index}" value="${escapeHtml(plc.contactPersonPosition || '')}" placeholder="เช่น HR Director หรือ หัวหน้าฝ่ายบุคคล" class="input-field" style="width:100%; padding:7px 10px; font-size:12.5px; border:1px solid #CBD5E1; border-radius:8px;" ${isLocked ? 'readonly style="background-color: #f8fafc; cursor: not-allowed;"' : ''} />
          </div>

          <!-- ที่อยู่บริษัท -->
          <div style="grid-column: 1 / -1;">
            <label style="display:block; font-size:12px; font-weight:700; color:#334155; margin-bottom:4px;">
              ที่อยู่สถานประกอบการ / แหล่งฝึกงาน <span style="color:#DC2626;">*</span>
            </label>
            <input type="text" id="company-address-${index}" value="${escapeHtml(plc.companyAddress || '')}" placeholder="เลขที่ ถนน ตำบล/แขวง อำเภอ/เขต จังหวัด รหัสไปรษณีย์" class="input-field" style="width:100%; padding:7px 10px; font-size:12.5px; border:1px solid #CBD5E1; border-radius:8px;" ${isLocked ? 'readonly style="background-color: #f8fafc; cursor: not-allowed;"' : ''} />
          </div>

          <!-- เบอร์โทรศัพท์ -->
          <div>
            <label style="display:block; font-size:12px; font-weight:700; color:#334155; margin-bottom:4px;">
              เบอร์โทรติดต่อสถานประกอบการ
            </label>
            <input type="text" id="company-phone1-${index}" value="${escapeHtml(plc.companyPhone1 || '')}" placeholder="เช่น 02-xxx-xxxx หรือ 08x-xxx-xxxx" class="input-field" style="width:100%; padding:7px 10px; font-size:12.5px; border:1px solid #CBD5E1; border-radius:8px;" ${isLocked ? 'readonly style="background-color: #f8fafc; cursor: not-allowed;"' : ''} />
          </div>

          <!-- เบอร์โทรศัพท์สำรอง -->
          <div>
            <label style="display:block; font-size:12px; font-weight:700; color:#334155; margin-bottom:4px;">
              เบอร์โทรติดต่อ (สำรอง)
            </label>
            <input type="text" id="company-phone2-${index}" value="${escapeHtml(plc.companyPhone2 || '')}" placeholder="เช่น 02-xxx-xxxx (ถ้ามี)" class="input-field" style="width:100%; padding:7px 10px; font-size:12.5px; border:1px solid #CBD5E1; border-radius:8px;" ${isLocked ? 'readonly style="background-color: #f8fafc; cursor: not-allowed;"' : ''} />
          </div>

          <!-- Email -->
          <div>
            <label style="display:block; font-size:12px; font-weight:700; color:#334155; margin-bottom:4px;">
              Email สถานประกอบการ
            </label>
            <input type="email" id="company-email-${index}" value="${escapeHtml(plc.companyEmail || '')}" placeholder="hr@company.com" class="input-field" style="width:100%; padding:7px 10px; font-size:12.5px; border:1px solid #CBD5E1; border-radius:8px;" ${isLocked ? 'readonly style="background-color: #f8fafc; cursor: not-allowed;"' : ''} />
          </div>
        </div>
      </div>

      <!-- Progress Bar สรุปความคืบหน้าการกรอก -->
      <div style="padding:14px 24px; background:#F8FAFC; border-bottom:1px solid #E2E8F0; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px;">
        <div style="font-size:13px; font-weight:700; color:#334155; display:flex; align-items:center; gap:6px;">
          <span class="material-icons" style="color:#2563EB; font-size:18px;">task_alt</span>
          <span>ความคืบหน้าการตรวจสอบข้อคำถาม Checklist:</span>
          <span id="progress-text-${index}" style="color:#2563EB;">0/0 ข้อ (0%)</span>
        </div>
        <div style="width:200px; max-width:100%; height:8px; background:#E2E8F0; border-radius:999px; overflow:hidden;">
          <div id="progress-bar-${index}" style="width:0%; height:100%; background:linear-gradient(90deg, #3B82F6, #10B981); border-radius:999px; transition:width 0.25s ease;"></div>
        </div>
      </div>
      ${sectionsHtml}
    </div>
  `;

  container.appendChild(card);
}

function addNewCompanyCard(name = '') {
  if (isDroppedStudent) return;
  const container = document.getElementById('companies-container');
  if (container) container.innerHTML = '';
  renderCompanyCard({ name: name, answers: [] }, 0);
}

window.toggleCompany = function(index) {
  const body = document.getElementById(`body-${index}`);
  const chevron = document.getElementById(`chevron-${index}`);
  if (body.style.display === 'none') {
    body.style.display = 'block';
    chevron.style.transform = 'rotate(0deg)';
  } else {
    body.style.display = 'none';
    chevron.style.transform = 'rotate(180deg)';
  }
};

document.getElementById('add-company-btn').addEventListener('click', () => {
  if (isDroppedStudent) return;
  if (confirm('ต้องการเคลียร์ฟอร์มเพื่อยื่น Checklist บริษัทแห่งใหม่ใช่หรือไม่? (ข้อมูลบริษัทเดิมที่ถูกปฏิเสธจะถูกเก็บไว้ใน Archive อัตโนมัติ)')) {
    addNewCompanyCard('');
  }
});

// บันทึกข้อมูลบริษัท (ทีละ 1 แห่ง)
document.getElementById('save-all-btn').addEventListener('click', async () => {
  if (isDroppedStudent) {
    alert('บัญชีของคุณอยู่ในสถานะดรอปการฝึกงาน ไม่สามารถแก้ไขหรือบันทึก Checklist ได้');
    return;
  }
  const cards = document.querySelectorAll('.company-card');
  if (cards.length === 0) {
    alert('กรุณากรอกข้อมูลบริษัทอย่างน้อย 1 แห่ง');
    return;
  }

  const saveBtn = document.getElementById('save-all-btn');
  saveBtn.disabled = true;
  saveBtn.innerHTML = '<span class="material-icons text-3xl">hourglass_top</span> <span>กำลังบันทึกข้อมูล...</span>';

  try {
    const card = cards[0];
    const nameInput = card.querySelector('.company-name-input');
    const name = nameInput ? nameInput.value.trim() : '';
    if (!name || name === 'บริษัท...') {
      alert('กรุณาระบุชื่อสถานประกอบการให้เรียบร้อย');
      saveBtn.disabled = false;
      saveBtn.innerHTML = '<span class="material-icons text-2xl">check_circle</span> <span>ยืนยันและส่งให้อาจารย์ที่ปรึกษาตรวจสอบ</span>';
      return;
    }

    const posSelect = document.getElementById(`company-position-select-0`);
    const customPosInput = document.getElementById(`company-custom-position-0`);
    const position = posSelect && posSelect.value === 'OTHER'
      ? (customPosInput ? customPosInput.value.trim() : 'Software Developer')
      : (posSelect ? posSelect.value : 'Software Developer');

    const province = document.getElementById(`company-province-0`) ? document.getElementById(`company-province-0`).value.trim() : '';
    const contactPersonName = document.getElementById(`company-contact-name-0`) ? document.getElementById(`company-contact-name-0`).value.trim() : '';
    const contactPersonPosition = document.getElementById(`company-contact-pos-0`) ? document.getElementById(`company-contact-pos-0`).value.trim() : '';
    const companyAddress = document.getElementById(`company-address-0`) ? document.getElementById(`company-address-0`).value.trim() : '';
    const companyPhone1 = document.getElementById(`company-phone1-0`) ? document.getElementById(`company-phone1-0`).value.trim() : '';
    const companyPhone2 = document.getElementById(`company-phone2-0`) ? document.getElementById(`company-phone2-0`).value.trim() : '';
    const companyEmail = document.getElementById(`company-email-0`) ? document.getElementById(`company-email-0`).value.trim() : '';

    const answers = [];
    const checkboxes = card.querySelectorAll('.custom-checkbox');
    checkboxes.forEach(cb => {
      const itemId = cb.dataset.itemId;
      const detailInput = card.querySelector(`.detail-input[data-item-id="${itemId}"]`);
      answers.push({
        checklistItemId: itemId,
        checked: cb.checked,
        detail: detailInput ? detailInput.value.trim() : ''
      });
    });

    const companyId = card.dataset.companyId;
    const payload = {
      name,
      answers,
      position,
      province,
      contactPersonName,
      contactPersonPosition,
      companyAddress,
      companyPhone1,
      companyPhone2,
      companyEmail,
    };

    let res;
    if (companyId) {
      res = await fetch(`/api/student/companies/${companyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } else {
      res = await fetch('/api/student/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    }

    const data = await res.json();
    if (!data.success) {
      alert('⚠️ ' + (data.message || 'ไม่สามารถบันทึกได้'));
      return;
    }

    alert('✅ บันทึกข้อมูล Checklist สถานประกอบการเรียบร้อยแล้ว');
    window.location.href = '/status-all';
  } catch (err) {
    console.error('Error saving companies:', err);
    alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
  } finally {
    saveBtn.disabled = false;
    saveBtn.innerHTML = '<span class="material-icons text-2xl">check_circle</span> <span>ยืนยันและส่งให้อาจารย์ที่ปรึกษาตรวจสอบ</span>';
  }
});

loadData();

window.selectAllInSection = function(compIndex: number, sectionId: number) {
  const card = document.getElementById(`company-card-${compIndex}`);
  if (!card) return;
  const checkboxes = card.querySelectorAll(`input[type="checkbox"][data-section-id="${sectionId}"]`) as NodeListOf<HTMLInputElement>;
  
  // ตรวจสอบว่าถ้าติ๊กหมดแล้ว ให้เอาออก ถ้ายังไม่หมด ให้ติ๊กให้ครบ
  const allChecked = Array.from(checkboxes).every(cb => cb.checked);
  checkboxes.forEach(cb => {
    if (!cb.disabled) cb.checked = !allChecked;
  });

  if (window.updateChecklistProgress) window.updateChecklistProgress(compIndex);
};

window.updateChecklistProgress = function(compIndex: number) {
  const card = document.getElementById(`company-card-${compIndex}`);
  if (!card) return;
  const checkboxes = card.querySelectorAll('input.custom-checkbox') as NodeListOf<HTMLInputElement>;
  const total = checkboxes.length;
  if (total === 0) return;

  const checkedCount = Array.from(checkboxes).filter(cb => cb.checked).length;
  const pct = Math.round((checkedCount / total) * 100);

  const textEl = document.getElementById(`progress-text-${compIndex}`);
  const barEl = document.getElementById(`progress-bar-${compIndex}`);

  if (textEl) textEl.textContent = `ติ๊กแล้ว ${checkedCount}/${total} ข้อ (${pct}%)`;
  if (barEl) barEl.style.width = `${pct}%`;
};

// Auto update progress after render
const origRenderCompanyCard = renderCompanyCard;
renderCompanyCard = function(comp: any, index: number) {
  const card = origRenderCompanyCard(comp, index);
  setTimeout(() => {
    if (window.updateChecklistProgress) window.updateChecklistProgress(index);
  }, 50);
  return card;
};

loadData();

