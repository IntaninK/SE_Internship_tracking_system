// @ts-nocheck
// checklist.js - หน้า Checklist บริษัทที่สนใจยื่นฝึกงาน (นโยบายใหม่: ยื่นได้ทีละ 1 บริษัท + Auto-suggest Master Data + ข้อมูลออกหนังสือราชการ + Archive)

let templateSections = [];
let companiesData = [];
let masterCompaniesList = [];
let currentPlacementData = null;
let isDroppedStudent = false;

// ตำแหน่งงานมาตรฐาน จัดกลุ่มตามสายงาน (keywords = คำค้นภาษาไทย/คำพ้อง เพื่อให้พิมพ์ค้นหาได้ง่าย)
const POSITION_GROUPS: Array<{ label: string; items: Array<{ name: string; keywords?: string }> }> = [
  {
    label: "พัฒนาซอฟต์แวร์ (SE / CS / IT)",
    items: [
      { name: "Full-Stack Developer", keywords: "ฟูลสแต็ก โปรแกรมเมอร์ เว็บ web" },
      { name: "Frontend Developer", keywords: "ฟรอนต์เอนด์ หน้าบ้าน เว็บ web react vue" },
      { name: "Backend Developer", keywords: "แบ็กเอนด์ หลังบ้าน api server" },
      { name: "Mobile App Developer (iOS / Android / Flutter)", keywords: "โมบาย แอป มือถือ app" },
      { name: "Software Engineer / Developer", keywords: "วิศวกรซอฟต์แวร์ นักพัฒนา โปรแกรมเมอร์ programmer software developer" },
      { name: "DevOps / Cloud Engineer", keywords: "คลาวด์ aws azure gcp" },
      { name: "QA / Software Tester", keywords: "ทดสอบ เทสเตอร์ test" },
      { name: "System Analyst / Business Analyst", keywords: "นักวิเคราะห์ระบบ วิเคราะห์ระบบ sa ba" },
    ],
  },
  {
    label: "AI / ข้อมูล / ฐานข้อมูล (CS / DSA / IT)",
    items: [
      { name: "AI / Machine Learning Engineer", keywords: "ปัญญาประดิษฐ์ เอไอ ml" },
      { name: "Data Scientist", keywords: "นักวิทยาศาสตร์ข้อมูล ข้อมูล" },
      { name: "Data Analyst", keywords: "นักวิเคราะห์ข้อมูล ข้อมูล" },
      { name: "Data Engineer", keywords: "วิศวกรข้อมูล ข้อมูล" },
      { name: "Business Intelligence (BI) Analyst", keywords: "บีไอ ข้อมูล dashboard" },
      { name: "Database Administrator (DBA)", keywords: "ฐานข้อมูล ดาต้าเบส sql" },
    ],
  },
  {
    label: "เครือข่าย / ความปลอดภัย / ฮาร์ดแวร์ (IT / CPE)",
    items: [
      { name: "Network & Security Engineer", keywords: "เครือข่าย เน็ตเวิร์ก ความปลอดภัย" },
      { name: "Cybersecurity Specialist", keywords: "ไซเบอร์ ความปลอดภัย security" },
      { name: "System Administrator / IT Support", keywords: "ไอทีซัพพอร์ต ดูแลระบบ แอดมิน helpdesk" },
      { name: "Embedded Systems / IoT Developer", keywords: "ไอโอที สมองกลฝังตัว iot" },
      { name: "Hardware & Computer Engineer", keywords: "ฮาร์ดแวร์ วิศวกรคอมพิวเตอร์" },
    ],
  },
  {
    label: "กราฟิก / มัลติมีเดีย / เกม (CGM)",
    items: [
      { name: "UI/UX Designer / Product Designer", keywords: "ออกแบบ ดีไซน์ ux ui ดีไซเนอร์" },
      { name: "Graphic Designer / 2D Artist", keywords: "กราฟิก ออกแบบ ดีไซน์" },
      { name: "3D Modeler / 3D Animator", keywords: "สามมิติ แอนิเมชัน 3d" },
      { name: "Game Developer / Game Programmer", keywords: "เกม game unity unreal" },
      { name: "Video Editor / Motion Graphics", keywords: "ตัดต่อ วิดีโอ โมชัน" },
    ],
  },
  {
    label: "ภูมิสารสนเทศ (GIS)",
    items: [
      { name: "GIS Specialist / GIS Developer", keywords: "ภูมิสารสนเทศ แผนที่ gis" },
      { name: "Spatial Data Analyst", keywords: "ข้อมูลเชิงพื้นที่ ภูมิสารสนเทศ" },
      { name: "Remote Sensing Specialist", keywords: "รีโมทเซนซิง ภาพถ่ายดาวเทียม" },
      { name: "เจ้าหน้าที่สารสนเทศภูมิศาสตร์", keywords: "gis ภูมิศาสตร์" },
    ],
  },
  {
    label: "ธุรกิจดิจิทัล (DB)",
    items: [
      { name: "Digital Marketing Specialist", keywords: "การตลาดดิจิทัล การตลาด marketing" },
      { name: "E-Commerce Specialist", keywords: "อีคอมเมิร์ซ ขายออนไลน์" },
      { name: "ERP / CRM Consultant (SAP, Odoo)", keywords: "อีอาร์พี ที่ปรึกษา sap odoo" },
      { name: "Digital Business Coordinator", keywords: "ธุรกิจดิจิทัล ประสานงาน" },
    ],
  },
];

const STANDARD_POSITIONS = POSITION_GROUPS.flatMap(g => g.items.map(i => i.name));

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
    renderInternshipWindowBox(compData);

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

// =====================================================================
// ช่องตำแหน่งงานแบบพิมพ์ค้นหาได้ (Searchable Combobox)
// - พิมพ์ภาษาไทย/อังกฤษเพื่อกรองตำแหน่งมาตรฐาน (ค้นจากชื่อ + keywords + ชื่อกลุ่ม)
// - ใช้ลูกศรขึ้น/ลง + Enter เลือก, Esc ปิด
// - ถ้าไม่มีในรายการ สามารถใช้ข้อความที่พิมพ์เป็นตำแหน่งได้เลย
// =====================================================================
const positionActiveIdx: Record<number, number> = {};

function positionMatches(query: string) {
  const q = query.trim().toLowerCase();
  const tokens = q.split(/\s+/).filter(Boolean);
  return POSITION_GROUPS.map(g => ({
    label: g.label,
    items: g.items.filter(i => {
      if (!tokens.length) return true;
      const hay = `${i.name} ${i.keywords || ''} ${g.label}`.toLowerCase();
      return tokens.every(t => hay.includes(t));
    }),
  })).filter(g => g.items.length > 0);
}

function highlightMatch(text: string, query: string) {
  const safe = escapeHtml(text);
  const q = query.trim();
  if (!q) return safe;
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx < 0) return safe;
  return escapeHtml(text.slice(0, idx)) +
    `<mark style="background:#E0E7FF; color:inherit; padding:0 1px; border-radius:3px;">${escapeHtml(text.slice(idx, idx + q.length))}</mark>` +
    escapeHtml(text.slice(idx + q.length));
}

window.renderPositionOptions = function(index: number, showAll = false) {
  const input = document.getElementById(`company-position-input-${index}`) as HTMLInputElement | null;
  const list = document.getElementById(`company-position-list-${index}`);
  if (!input || !list || input.readOnly) return;

  // ตอนเพิ่งคลิกช่อง (มีค่าเดิมอยู่แล้ว) ให้เห็นรายการทั้งหมดก่อน แล้วค่อยกรองเมื่อเริ่มพิมพ์
  const query = showAll ? '' : input.value;
  const groups = positionMatches(query);
  const typed = query.trim();
  const exact = STANDARD_POSITIONS.some(p => p.toLowerCase() === typed.toLowerCase());

  let optIdx = 0;
  let html = groups.map(g => `
    <div style="padding:6px 12px 3px; font-size:11px; font-weight:800; color:#64748B; background:#F8FAFC; position:sticky; top:0;">${escapeHtml(g.label)}</div>
    ${g.items.map(i => `
      <div class="position-option" data-idx="${optIdx++}" data-value="${escapeHtml(i.name)}"
        onmousedown="event.preventDefault(); window.selectPosition(${index}, this.dataset.value)"
        style="padding:7px 14px; font-size:12.5px; cursor:pointer; color:#1E293B;">
        ${highlightMatch(i.name, typed)}
      </div>`).join('')}
  `).join('');

  if (typed && !exact) {
    html += `
      <div class="position-option" data-idx="${optIdx++}" data-value="${escapeHtml(typed)}"
        onmousedown="event.preventDefault(); window.selectPosition(${index}, this.dataset.value)"
        style="padding:8px 14px; font-size:12.5px; cursor:pointer; color:#4338CA; border-top:1px solid #E2E8F0; font-weight:600;">
        ✏️ ใช้ "${escapeHtml(typed)}" เป็นตำแหน่งที่ระบุเอง
      </div>`;
  }
  if (!html) {
    html = `<div style="padding:10px 14px; font-size:12px; color:#94A3B8;">ไม่พบตำแหน่งที่ตรงกัน</div>`;
  }

  list.innerHTML = html;
  list.style.display = 'block';
  positionActiveIdx[index] = -1;

  // ไฮไลต์ตำแหน่งที่เลือกอยู่ปัจจุบัน
  const current = input.value.trim().toLowerCase();
  if (current) {
    const opts = Array.from(list.querySelectorAll('.position-option')) as HTMLElement[];
    const i = opts.findIndex(o => (o.dataset.value || '').toLowerCase() === current);
    if (i >= 0) {
      opts[i].style.fontWeight = '700';
      opts[i].style.color = '#4338CA';
      if (showAll) opts[i].scrollIntoView({ block: 'nearest' });
    }
  }
};

function setActivePositionOption(index: number, next: number) {
  const list = document.getElementById(`company-position-list-${index}`);
  if (!list) return;
  const opts = Array.from(list.querySelectorAll('.position-option')) as HTMLElement[];
  if (!opts.length) return;
  const clamped = Math.max(0, Math.min(opts.length - 1, next));
  opts.forEach((o, i) => { o.style.background = i === clamped ? '#EEF2FF' : ''; });
  opts[clamped].scrollIntoView({ block: 'nearest' });
  positionActiveIdx[index] = clamped;
}

window.selectPosition = function(index: number, value: string) {
  const input = document.getElementById(`company-position-input-${index}`) as HTMLInputElement | null;
  const list = document.getElementById(`company-position-list-${index}`);
  if (input) input.value = value;
  if (list) list.style.display = 'none';
};

window.closePositionList = function(index: number) {
  const list = document.getElementById(`company-position-list-${index}`);
  if (list) list.style.display = 'none';
};

window.handlePositionKeydown = function(index: number, e: KeyboardEvent) {
  const list = document.getElementById(`company-position-list-${index}`);
  const isOpen = list && list.style.display !== 'none';
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault();
    if (!isOpen) window.renderPositionOptions(index);
    const cur = positionActiveIdx[index] ?? -1;
    setActivePositionOption(index, e.key === 'ArrowDown' ? cur + 1 : cur - 1);
  } else if (e.key === 'Enter') {
    if (isOpen && (positionActiveIdx[index] ?? -1) >= 0) {
      e.preventDefault();
      const opt = list!.querySelectorAll('.position-option')[positionActiveIdx[index]] as HTMLElement | undefined;
      if (opt) window.selectPosition(index, opt.dataset.value || '');
    } else if (isOpen) {
      e.preventDefault();
      window.closePositionList(index);
    }
  } else if (e.key === 'Escape') {
    window.closePositionList(index);
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
  const currentPos = plc.position && plc.position !== 'OTHER' ? plc.position : '';

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
            <div style="position:relative;">
              <span class="material-icons" style="position:absolute; left:10px; top:50%; transform:translateY(-50%); font-size:17px; color:#94A3B8; pointer-events:none; z-index:1;">search</span>
              <input type="text" id="company-position-input-${index}" value="${escapeHtml(currentPos)}"
                placeholder="พิมพ์ค้นหา เช่น frontend, ข้อมูล, เกม, ออกแบบ"
                autocomplete="off" role="combobox" aria-autocomplete="list" aria-controls="company-position-list-${index}"
                onfocus="window.renderPositionOptions(${index}, true)"
                oninput="window.renderPositionOptions(${index})"
                onkeydown="window.handlePositionKeydown(${index}, event)"
                onblur="setTimeout(() => window.closePositionList(${index}), 120)"
                class="input-field"
                style="width:100%; padding:7px 10px !important; padding-left:36px !important; font-size:12.5px; border:1px solid #CBD5E1; border-radius:8px; background:${isLocked ? '#f8fafc' : 'white'}; ${isLocked ? 'cursor:not-allowed;' : ''}"
                ${isLocked ? 'readonly' : ''} />
              <div id="company-position-list-${index}" role="listbox"
                style="display:none; position:absolute; top:calc(100% + 4px); left:0; right:0; z-index:50; max-height:280px; overflow-y:auto; background:white; border:1px solid #CBD5E1; border-radius:10px; box-shadow:0 12px 28px -6px rgba(15,23,42,0.18);"></div>
            </div>
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

    const posInput = document.getElementById(`company-position-input-0`) as HTMLInputElement | null;
    const position = posInput ? posInput.value.trim() : '';
    if (!position) {
      alert('กรุณาระบุตำแหน่งที่เข้าฝึกงาน');
      if (posInput) posInput.focus();
      saveBtn.disabled = false;
      saveBtn.innerHTML = '<span class="material-icons text-2xl">check_circle</span> <span>ยืนยันและส่งให้อาจารย์ที่ปรึกษาตรวจสอบ</span>';
      return;
    }

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
      // รอบออกฝึก: ส่งเฉพาะกรณีมีให้เลือกหลายรอบ (รอบเดียว server ผูกให้อัตโนมัติ)
      internshipWindowId: (document.getElementById('internship-window-select') as HTMLSelectElement | null)?.value || undefined,
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
      if (data.needWindowSelection) {
        const sel = document.getElementById('internship-window-select') as HTMLSelectElement | null;
        if (sel) { sel.scrollIntoView({ behavior: 'smooth', block: 'center' }); sel.focus(); }
      }
      return;
    }

    alert('✅ ' + (data.message || 'บันทึกข้อมูล Checklist สถานประกอบการเรียบร้อยแล้ว'));
    window.location.href = '/status-all';
  } catch (err) {
    console.error('Error saving companies:', err);
    alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
  } finally {
    saveBtn.disabled = false;
    saveBtn.innerHTML = '<span class="material-icons text-2xl">check_circle</span> <span>ยืนยันและส่งให้อาจารย์ที่ปรึกษาตรวจสอบ</span>';
  }
});

// =====================================================================
// รอบออกฝึก: เปิดรอบเดียว = แสดงข้อความ (ผูกอัตโนมัติ) / หลายรอบ = dropdown ให้เลือก
// =====================================================================
function renderInternshipWindowBox(compData) {
  const saveBtn = document.getElementById('save-all-btn');
  const anchor = saveBtn ? saveBtn.parentElement : null;
  if (!anchor || !anchor.parentElement) return;

  let box = document.getElementById('internship-window-box');
  if (!box) {
    box = document.createElement('div');
    box.id = 'internship-window-box';
    box.style.cssText = 'max-width:720px; margin:24px auto 0;';
    anchor.parentElement.insertBefore(box, anchor);
  }

  const windows = Array.isArray(compData.openInternshipWindows) ? compData.openInternshipWindows : [];
  if (windows.length === 0) {
    box.innerHTML = '';
    box.style.display = 'none';
    return;
  }
  box.style.display = '';

  const closeText = (w) => w.closeDate ? ` • ยื่นได้ถึง ${new Date(w.closeDate + 'T00:00:00').toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}` : '';
  const cohortText = (w) => compData.isStraggler ? ` (รอบของรุ่น ${escapeHtml(w.cohortCode)})` : '';

  if (windows.length === 1) {
    const w = windows[0];
    box.innerHTML = `
      <div style="display:flex; align-items:center; gap:10px; padding:12px 16px; background:#EEF2FF; border:1px solid #C7D2FE; border-radius:14px;">
        <span class="material-icons" style="color:#4338CA;">event_available</span>
        <div style="font-size:13.5px; color:#1E1B4B;">
          รอบออกฝึกของคุณ: <strong>${escapeHtml(w.label)}</strong>${cohortText(w)}
          <div style="font-size:12px; color:#4338CA; margin-top:2px;">ระบบเลือกให้อัตโนมัติ${closeText(w)}</div>
        </div>
      </div>`;
    return;
  }

  const assigned = windows.some(w => w.id === compData.assignedWindowId) ? compData.assignedWindowId : '';
  box.innerHTML = `
    <div style="padding:14px 16px; background:#FFFBEB; border:1px solid #FCD34D; border-radius:14px;">
      <label for="internship-window-select" style="display:flex; align-items:center; gap:8px; font-size:13.5px; font-weight:800; color:#92400E; margin-bottom:6px;">
        <span class="material-icons" style="font-size:20px;">event</span>
        เลือกรอบออกฝึกงาน <span style="color:#DC2626;">*</span>
      </label>
      <div style="font-size:12px; color:#92400E; margin-bottom:8px;">
        ${compData.isStraggler
          ? 'คุณมีสิทธิ์เลือกรอบออกฝึกที่เปิดอยู่ของรุ่นถัดไปได้'
          : 'ขณะนี้เปิดรับหลายรอบพร้อมกัน (เช่น Summer และภาคปกติ) — เลือกรอบที่คุณจะออกฝึก'}
      </div>
      <select id="internship-window-select" class="input-field" style="width:100%; padding:8px 10px; font-size:13px; border:1px solid #FCD34D; border-radius:10px; background:white;">
        <option value="">-- เลือกรอบออกฝึก --</option>
        ${windows.map(w => `<option value="${w.id}" ${w.id === assigned ? 'selected' : ''}>${escapeHtml(w.label)}${cohortText(w)}${closeText(w)}</option>`).join('')}
      </select>
    </div>`;
}

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

