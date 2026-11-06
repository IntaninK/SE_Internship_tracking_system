// @ts-nocheck
// checklist.js - หน้า Checklist บริษัทที่สนใจยื่นฝึกงาน (นโยบายใหม่: ยื่นได้ทีละ 1 บริษัท + Auto-suggest Master Data + Archive)

let templateSections = [];
let companiesData = [];
let masterCompaniesList = [];
let isDroppedStudent = false;

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

    // เติมข้อมูล Auto-suggest รายชื่อบริษัทจากฐานข้อมูลกลาง (Master Data)
    masterCompaniesList = compData.masterCompanies || [];
    const datalistEl = document.getElementById('master-companies-datalist');
    if (datalistEl && masterCompaniesList.length > 0) {
      datalistEl.innerHTML = masterCompaniesList.map(mc =>
        `<option value="${mc.nameTh}">${mc.nameEn || ''} (${mc.province || ''})</option>`
      ).join('');
    }

    // แสดงประวัติ Archive แบบย่อ (ถ้ามี)
    const archivedList = compData.archivedCompanies || [];
    const archiveBox = document.getElementById('archived-companies-box');
    const archiveListEl = document.getElementById('archived-companies-list');
    if (archiveBox && archiveListEl && archivedList.length > 0) {
      archiveBox.style.display = 'block';
      archiveListEl.innerHTML = archivedList.map((a, idx) => `
        <div style="padding:8px 12px; background:white; border:1px solid #E2E8F0; border-radius:10px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
          <div>
            <strong>ครั้งที่ ${idx + 1}: ${a.companyName}</strong>
            <span style="color:#DC2626; font-weight:600; margin-left:6px;">
              (${a.reason === 'COMPANY_REJECTED' ? 'สถานประกอบการปฏิเสธ' : 'ที่ปรึกษาไม่อนุมัติ'})
            </span>
            <span style="color:#64748B; margin-left:6px;">— ${a.note || '-'}</span>
          </div>
          <span style="font-size:11.5px; color:#94A3B8;">${new Date(a.archivedAt).toLocaleDateString('th-TH')}</span>
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

function renderCompanyCard(comp, index) {
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
            <input type="checkbox" onchange="window.updateChecklistProgress ? window.updateChecklistProgress(${index}) : null" class="custom-checkbox" data-item-id="${item.id}" data-section-id="${sec.id}" ${ans.checked ? 'checked' : ''} ${isDroppedStudent ? 'disabled style="cursor: not-allowed;"' : ''} />
          </td>
          <td class="detail-col">
            <input type="text" class="detail-input" placeholder="${item.placeholder || 'รายละเอียดเพิ่ม'}" data-item-id="${item.id}" value="${ans.detail || ''}" ${isDroppedStudent ? 'readonly style="background-color: #f8fafc; cursor: not-allowed;"' : ''} />
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
          <button type="button" onclick="window.selectAllInSection(${index}, ${sec.id})" ${isDroppedStudent ? 'disabled style="display:none;"' : ''} style="font-size:11.5px; font-weight:600; color:#2563EB; background:#EFF6FF; border:1px solid #BFDBFE; padding:3px 10px; border-radius:6px; cursor:pointer; display:inline-flex; align-items:center; gap:4px;">
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

  card.innerHTML = `
    <div class="company-header cursor-pointer" onclick="toggleCompany(${index})">
      <div class="flex items-center gap-3 flex-1 flex-wrap" onclick="event.stopPropagation()">
        <span class="material-icons text-2xl">business</span>
        <input type="text" list="master-companies-datalist" class="company-name-input" value="${comp.name || ''}" placeholder="พิมพ์เพื่อเลือกบริษัทจากฐานข้อมูลกลาง หรือพิมพ์ชื่อบริษัทใหม่..." ${isDroppedStudent ? 'readonly style="background-color: #f8fafc; cursor: not-allowed;"' : ''} />
        ${statusBadge}
      </div>
      <div class="flex items-center gap-3">
        <span id="chevron-${index}" class="material-icons text-3xl transition-transform transform">expand_more</span>
      </div>
    </div>
    <div id="body-${index}" class="company-body" style="display: block;">
      <!-- Progress Bar สรุปความคืบหน้าการกรอก -->
      <div style="padding:14px 24px; background:#F8FAFC; border-bottom:1px solid #E2E8F0; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px;">
        <div style="font-size:13px; font-weight:700; color:#334155; display:flex; align-items:center; gap:6px;">
          <span class="material-icons" style="color:#2563EB; font-size:18px;">task_alt</span>
          <span>ความคืบหน้าการตรวจสอบ:</span>
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
    let res;
    if (companyId) {
      res = await fetch(`/api/student/companies/${companyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, answers })
      });
    } else {
      res = await fetch('/api/student/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, answers })
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
