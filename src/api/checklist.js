// checklist.js - หน้า Checklist บริษัทที่สนใจยื่นฝึกงาน (ภาพที่ 9, 10, 11)

let templateSections = [];
let companiesData = [];

// โหลด Template ข้อพิจารณา 5 ส่วน และรายชื่อบริษัทเดิม
async function loadData() {
  try {
    const [tplRes, compRes] = await Promise.all([
      fetch('/api/student/checklist-template'),
      fetch('/api/student/companies')
    ]);

    const tplData = await tplRes.json();
    const compData = await compRes.json();

    if (tplData.success) {
      templateSections = tplData.sections;
    }

    const container = document.getElementById('companies-container');
    container.innerHTML = '';

    if (compData.success && compData.companies && compData.companies.length > 0) {
      companiesData = compData.companies;
      companiesData.forEach((comp, idx) => {
        renderCompanyCard(comp, idx);
      });
    } else {
      // ถ้ายังไม่มีบริษัท ให้เปิดกล่องบริษัทที่ 1 ให้เริ่มต้น
      addNewCompanyCard('บริษัท...');
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

  // หาคำตอบของบริษัทนี้
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
          <td class="desc-col">${item.description}</td>
          <td class="check-col">
            <input type="checkbox" class="custom-checkbox" data-item-id="${item.id}" ${ans.checked ? 'checked' : ''} />
          </td>
          <td class="detail-col">
            <input type="text" class="detail-input" placeholder="รายละเอียดเพิ่ม" data-item-id="${item.id}" value="${ans.detail || ''}" />
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

  card.innerHTML = `
    <div class="company-header cursor-pointer" onclick="toggleCompany(${index})">
      <div class="flex items-center gap-3 flex-1" onclick="event.stopPropagation()">
        <span class="material-icons text-2xl">business</span>
        <input type="text" class="company-name-input" value="${comp.name || 'บริษัท...'}" placeholder="พิมพ์ชื่อบริษัทที่นี่..." />
      </div>
      <div class="flex items-center gap-3">
        <button type="button" class="bg-red-500 hover:bg-red-600 text-white rounded-full w-8 h-8 flex items-center justify-center border-none cursor-pointer" onclick="removeCompanyCard(${index}); event.stopPropagation();" title="ลบบริษัทนี้">
          <span class="material-icons text-xl">remove</span>
        </button>
        <span id="chevron-${index}" class="material-icons text-3xl transition-transform transform">expand_more</span>
      </div>
    </div>
    <div id="body-${index}" class="company-body" style="display: block;">
      ${sectionsHtml}
    </div>
  `;

  container.appendChild(card);
}

function addNewCompanyCard(name = 'บริษัท...') {
  const newIndex = document.querySelectorAll('.company-card').length;
  renderCompanyCard({ name: name, answers: [] }, newIndex);
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

window.removeCompanyCard = function(index) {
  if (confirm('คุณต้องการลบบริษัทนี้หรือไม่?')) {
    const card = document.getElementById(`company-card-${index}`);
    if (card) card.remove();
  }
};

document.getElementById('add-company-btn').addEventListener('click', () => {
  addNewCompanyCard('บริษัท...');
});

// บันทึกข้อมูลบริษัททั้งหมด (ปุ่มเขียวด้านล่าง)
document.getElementById('save-all-btn').addEventListener('click', async () => {
  const cards = document.querySelectorAll('.company-card');
  if (cards.length === 0) {
    alert('กรุณากด "+ เพิ่มบริษัท" เพื่อใส่ข้อมูลอย่างน้อย 1 บริษัท');
    return;
  }

  const saveBtn = document.getElementById('save-all-btn');
  saveBtn.disabled = true;
  saveBtn.innerHTML = '<span class="material-icons text-3xl">hourglass_top</span> <span>กำลังบันทึกข้อมูล...</span>';

  try {
    for (const card of cards) {
      const nameInput = card.querySelector('.company-name-input');
      const name = nameInput ? nameInput.value.trim() : '';
      if (!name || name === 'บริษัท...') {
        alert('กรุณากรอกชื่อบริษัทให้เรียบร้อย');
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<span class="material-icons text-3xl">check_circle</span> <span>ยืนยันและบันทึกข้อมูล</span>';
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

      if (companyId) {
        // อัปเดตบริษัทเดิม
        await fetch(`/api/student/companies/${companyId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, answers })
        });
      } else {
        // สร้างบริษัทใหม่
        await fetch('/api/student/companies', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, answers })
        });
      }
    }

    alert('✅ บันทึกข้อมูล Checklist บริษัทสำเร็จ');
    // นำทางกลับไปยังหน้าตั้งค่าปรับเปลี่ยน (ภาพที่ 6, 7, 8)
    window.location.href = '/pages/status_all.html';
  } catch (err) {
    console.error('Error saving companies:', err);
    alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
  } finally {
    saveBtn.disabled = false;
    saveBtn.innerHTML = '<span class="material-icons text-3xl">check_circle</span> <span>ยืนยันและบันทึกข้อมูล</span>';
  }
});

loadData();
