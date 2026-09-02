// advisor_checklist_review.js — หน้าตรวจ Checklist นิสิตสำหรับอาจารย์ที่ปรึกษา (Figma ภาพที่ 4 & 5)

const params = new URLSearchParams(window.location.search);
const studentId = params.get('studentId');

document.addEventListener('DOMContentLoaded', () => {
  if (!studentId) {
    alert('ไม่พบรหัสนิสิตที่ต้องการตรวจสอบ');
    window.location.href = '/pages/dashboard_ที่ปรึกษา.html';
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
          <a href="/pages/dashboard_ที่ปรึกษา.html" class="inline-block mt-4 px-6 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium no-underline">
            กลับหน้า Dashboard
          </a>
        </div>
      `;
      return;
    }

    const { student, sections, companies } = data;

    // อัปเดตข้อมูลหัวเว็บ
    if (subtitle) {
      subtitle.textContent = `รหัสนิสิต: ${student.studentCode} | ชื่อ: ${student.nameTh} (${student.nameEn}) | ชั้นปี: ${student.year || '-'} | อีเมล: ${student.email}`;
    }

    if (!companies || companies.length === 0) {
      container.innerHTML = `
        <div class="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-200">
          <span class="material-icons text-5xl text-gray-400 mb-3">info</span>
          <p class="text-gray-600 text-lg font-medium">นิสิตยังไม่ได้เพิ่มข้อมูลบริษัทหรือกรอก Checklist</p>
          <a href="/pages/dashboard_ที่ปรึกษา.html" class="inline-block mt-4 px-6 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium no-underline">
            กลับหน้า Dashboard
          </a>
        </div>
      `;
      return;
    }

    container.innerHTML = '';

    // Render บริษัทแต่ละแห่งเป็น Accordion
    companies.forEach((comp, idx) => {
      const card = renderCompanyReviewCard(comp, sections, idx);
      container.appendChild(card);
    });

  } catch (err) {
    console.error('Error loading student checklist data:', err);
    container.innerHTML = `
      <div class="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-200">
        <p class="text-red-500 font-medium">เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์</p>
      </div>
    `;
  }
}

function renderCompanyReviewCard(comp, sections, index) {
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

      <!-- ส่วนที่ 5 และการประเมินด้านล่าง (ตาม Figma ภาพที่ 5) -->
      <div class="border-t border-gray-200 mt-8 pt-8 px-6 pb-6 bg-gray-50/50 rounded-2xl">
        <div class="max-w-xl mx-auto space-y-6">

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
  const status = selectEl ? selectEl.value : 'PENDING';
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
