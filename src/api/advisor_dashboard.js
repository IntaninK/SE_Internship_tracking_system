// advisor_dashboard.js — Dashboard อาจารย์ที่ปรึกษา
// กราฟ 2 วง (Checklist, ความพร้อม) + รายชื่อนิสิตในความดูแล + Action Dropdown

let currentFilter = null;
let currentPage = 1;
const pageLimit = 12;
let selectedStudentIds = new Set();
let openDropdownStudentId = null;

// ==========================================
// เริ่มต้นโหลดข้อมูล
// ==========================================
async function initAdvisorDashboard() {
  await loadDashboardSummary();
  await loadStudents();
  await populateYearFilter('/api/advisor/students');
}

// ==========================================
// 1. โหลดข้อมูลสรุป (กราฟ 2 วง)
// ==========================================
async function loadDashboardSummary() {
  try {
    const res = await fetch('/api/advisor/dashboard-summary');
    const data = await res.json();
    if (!data.success) return;

    // --- กราฟ 1: สถานะ Checklist ของนิสิต ---
    const c = data.checklistStats;
    const checklistTotal = c.reviewed + c.pending + c.failed;
    renderPieChart('chart-checklist', 'checklist', [
      { key: 'reviewed', label: 'อาจารย์รีวิวแล้ว', value: c.reviewed, color: '#FF3EA5' },
      { key: 'pending', label: 'รอผล', value: c.pending, color: '#FFD233' },
      { key: 'failed', label: 'ไม่ผ่าน /ทำchecklist เพิ่ม', value: c.failed, color: '#EF4444' },
    ], 'สถานะ Checklist', 'checklist-legend-table', checklistTotal || data.totalStudents);

    // --- กราฟ 2: สถานะความพร้อม ---
    const r = data.readinessStats;
    renderPieChart('chart-readiness', 'readiness', [
      { key: 'registered', label: 'ยื่นสมัครสำเร็จ', value: r.registered, color: '#00C3D0' },
      { key: 'cvApproved', label: 'ตรวจCVผ่าน', value: r.cvApproved, color: '#8B5CF6' },
      { key: 'noData', label: 'ยังไม่มีข้อมูล', value: r.noData, color: '#FF3EA5' },
      { key: 'hoursIncomplete', label: 'ชั่วโมงอบรมยังไม่ครบ', value: r.hoursIncomplete, color: '#FFD233' },
      { key: 'trainingComplete', label: 'ตรวจชม.อบรมครบ', value: r.trainingComplete, color: '#10B981' },
    ], 'สถานะความพร้อม', 'readiness-legend-table', data.totalStudents);

  } catch (err) {
    console.error('Load advisor dashboard summary error:', err);
  }
}

// ==========================================
// สร้างกราฟวงกลม SVG + ตารางสถานะ
// ==========================================
function renderPieChart(containerId, chartType, segments, headerLabel, tableId, total) {
  const container = document.getElementById(containerId);
  if (!container) return;

  let cumulativeOffset = 0;
  const circumference = 2 * Math.PI * 14; // r=14

  let svgCircles = '';
  segments.forEach((seg) => {
    const pct = total > 0 ? (seg.value / total) * 100 : 0;
    const dashLen = (pct / 100) * circumference;
    const dashGap = circumference - dashLen;
    const offset = -(cumulativeOffset / 100) * circumference;

    if (pct > 0) {
      svgCircles += `<circle cx="18" cy="18" r="14" fill="none" stroke="${seg.color}" stroke-width="4"
        stroke-dasharray="${dashLen} ${dashGap}" stroke-dashoffset="${offset}" />`;
    }
    cumulativeOffset += pct;
  });

  if (total === 0 || cumulativeOffset === 0) {
    svgCircles = `<circle cx="18" cy="18" r="14" fill="none" stroke="#e5e7eb" stroke-width="4" />`;
  }

  container.innerHTML = `
    <h4 class="text-xs font-bold text-blue-700 mb-2 text-center">${headerLabel}</h4>
    <div class="flex flex-col sm:flex-row items-center gap-6 flex-1">
      <div class="relative w-[120px] h-[120px] flex-shrink-0">
        <svg viewBox="0 0 36 36" class="w-full h-full -rotate-90">
          ${svgCircles}
        </svg>
        <div class="absolute inset-0 flex flex-col items-center justify-center">
          <span class="text-[10px] text-gray-400">Total Value</span>
          <span class="text-xl font-bold text-gray-800">${total}</span>
        </div>
      </div>
      <table class="text-[11px] border-collapse flex-1" id="${tableId}">
        <thead>
          <tr>
            <th class="text-left pr-4 pb-1 font-medium text-gray-600">${headerLabel}</th>
            <th class="text-right pr-4 pb-1 font-medium text-gray-600">จำนวน</th>
            <th class="text-right pb-1 font-medium text-gray-600">%</th>
          </tr>
        </thead>
        <tbody>
          ${segments.map((seg) => {
            const pct = total > 0 ? ((seg.value / total) * 100).toFixed(1) : '0.0';
            return `<tr class="chart-status-row cursor-pointer hover:bg-purple-50 transition-colors" data-chart="${chartType}" data-key="${seg.key}" data-label="${seg.label}">
              <td class="pr-4 py-1">
                <span class="inline-block w-2 h-2 rounded-full mr-1.5" style="background:${seg.color}"></span>${seg.label}
              </td>
              <td class="text-right pr-4">${seg.value}</td>
              <td class="text-right">${pct}%</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;

  // Event: คลิกแถวในตารางเพื่อกรองนิสิต
  container.querySelectorAll('.chart-status-row').forEach(row => {
    row.addEventListener('click', () => {
      const isAlreadyActive = row.classList.contains('bg-purple-100');
      document.querySelectorAll('.chart-status-row').forEach(r => r.classList.remove('bg-purple-100', 'font-bold'));

      if (isAlreadyActive) {
        currentFilter = null;
      } else {
        row.classList.add('bg-purple-100', 'font-bold');
        currentFilter = {
          chartType: row.dataset.chart,
          chartKey: row.dataset.key,
          label: row.dataset.label,
        };
      }
      currentPage = 1;
      updateFilterUI();
      loadStudents();
    });
  });
}

// ==========================================
// 2. โหลดรายชื่อนิสิต
// ==========================================
async function loadStudents() {
  try {
    const searchInput = document.getElementById('student-search');
    const searchVal = searchInput ? searchInput.value.trim() : '';

    let url = `/api/advisor/students?page=${currentPage}&limit=${pageLimit}`;
    if (searchVal) url += `&search=${encodeURIComponent(searchVal)}`;
    if (currentFilter) {
      url += `&chartType=${encodeURIComponent(currentFilter.chartType)}&chartKey=${encodeURIComponent(currentFilter.chartKey)}`;
    }
    const yearFilter = document.getElementById('year-filter');
    const selectedYear = yearFilter ? yearFilter.value : '';
    if (selectedYear) url += `&yearPrefix=${encodeURIComponent(selectedYear)}`;

    // Dropdown filters ใหม่
    const statusFilter = document.getElementById('status-filter');
    const skillFilter = document.getElementById('skill-filter');
    if (statusFilter && statusFilter.value) url += `&statusFilter=${encodeURIComponent(statusFilter.value)}`;
    if (skillFilter && skillFilter.value) url += `&skillFilter=${encodeURIComponent(skillFilter.value)}`;

    const res = await fetch(url);
    const data = await res.json();
    if (!data.success) return;

    let studentsToRender = data.students || [];
    let totalToRender = data.total;
    // Fallback: กรองฝั่ง client-side
    if (selectedYear) {
      studentsToRender = studentsToRender.filter(s => s.studentCode && s.studentCode.startsWith(selectedYear));
      totalToRender = studentsToRender.length;
    }

    renderStudentTable(studentsToRender, totalToRender, data.page, Math.max(1, Math.ceil(totalToRender / pageLimit)));
  } catch (err) {
    console.error('Load students error:', err);
  }
}

// ==========================================
// 3. แสดงตารางรายชื่อนิสิต
// ==========================================
function renderStudentTable(students, total, page, totalPages) {
  const tbody = document.getElementById('students-tbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (students.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center py-8 text-gray-400">ไม่พบข้อมูลนิสิต</td></tr>';
    renderPagination(1, 1, 0);
    return;
  }

  students.forEach((s) => {
    const isChecked = selectedStudentIds.has(s.id);
    let badgeColor = 'bg-yellow-100 text-yellow-700';
    let badgeText = s.checklistStatusLabel;

    if (s.checklistStatusCode === 'APPROVED') {
      badgeColor = 'bg-green-100 text-green-700';
    } else if (s.checklistStatusCode === 'REJECTED') {
      badgeColor = 'bg-red-100 text-red-600';
    }

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${s.studentCode}</td>
      <td>${s.nameTh}</td>
      <td>${s.advisorName || '<span class="text-gray-400">-</span>'}</td>
      <td>
        <span class="inline-block px-2 py-0.5 text-xs font-medium rounded-full ${badgeColor}">
          ${badgeText}
        </span>
      </td>
      <td class="text-center" style="width: 80px;">
        <div style="display: flex; align-items: center; gap: 8px; justify-content: center; position: relative;">
          <button class="btn-detail-dots" title="เมนูจัดการ" onclick="toggleActionMenu(event, ${s.id})" style="background:none;border:none;cursor:pointer;padding:4px;">
            <span class="material-icons text-gray-500 hover:text-blue-600" style="font-size:18px;">more_vert</span>
          </button>
          <input type="checkbox" class="student-checkbox" data-id="${s.id}" ${isChecked ? 'checked' : ''} style="width:16px;height:16px;cursor:pointer;" />

          <!-- Dropdown เมนู (Profile / Check list) -->
          <div id="dropdown-${s.id}" class="action-dropdown hidden absolute right-0 top-8 bg-white border border-gray-200 rounded-xl shadow-lg z-30 py-1 w-32 text-left">
            <a href="/pages/admin_student_detail.html?id=${s.id}" class="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 no-underline transition-colors">
              <span class="material-icons text-base">person</span> Profile
            </a>
            <div class="border-t border-gray-100 my-1"></div>
            <a href="/pages/advisor_checklist_review.html?studentId=${s.id}" class="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 no-underline transition-colors font-medium">
              <span class="material-icons text-base">fact_check</span> Check list
            </a>
          </div>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Checkbox change events
  tbody.querySelectorAll('.student-checkbox').forEach((cb) => {
    cb.addEventListener('change', (e) => {
      const id = parseInt(e.target.dataset.id);
      if (e.target.checked) {
        selectedStudentIds.add(id);
      } else {
        selectedStudentIds.delete(id);
      }
    });
  });

  renderPagination(page, totalPages, total);
}

// ==========================================
// ควบคุม Dropdown Menu (3 จุด)
// ==========================================
window.toggleActionMenu = function(event, studentId) {
  event.stopPropagation();
  const dropdown = document.getElementById(`dropdown-${studentId}`);
  if (!dropdown) return;

  const isAlreadyOpen = !dropdown.classList.contains('hidden');

  // ปิดทุก dropdown ก่อน
  document.querySelectorAll('.action-dropdown').forEach(d => d.classList.add('hidden'));

  if (!isAlreadyOpen) {
    dropdown.classList.remove('hidden');
    openDropdownStudentId = studentId;
  } else {
    openDropdownStudentId = null;
  }
};

// ปิด dropdown เมื่อคลิกที่อื่น
document.addEventListener('click', () => {
  document.querySelectorAll('.action-dropdown').forEach(d => d.classList.add('hidden'));
  openDropdownStudentId = null;
});

// ==========================================
// Pagination
// ==========================================
function renderPagination(page, totalPages, total) {
  const paginationEl = document.getElementById('pagination-controls');
  const infoEl = document.getElementById('pagination-info');
  if (!paginationEl) return;

  const start = total === 0 ? 0 : (page - 1) * pageLimit + 1;
  const end = Math.min(page * pageLimit, total);
  if (infoEl) infoEl.textContent = `Showing ${start}-${end} from ${total} data`;

  paginationEl.innerHTML = '';
  for (let i = 1; i <= Math.min(totalPages, 5); i++) {
    const btn = document.createElement('button');
    btn.textContent = i;
    btn.className = i === page
      ? 'w-7 h-7 rounded-lg bg-[#1541D2] text-white text-xs font-medium cursor-pointer border-none'
      : 'w-7 h-7 rounded-lg bg-gray-100 text-gray-600 text-xs hover:bg-gray-200 cursor-pointer border-none';
    btn.onclick = () => { currentPage = i; loadStudents(); };
    paginationEl.appendChild(btn);
  }
}

// ==========================================
// Export CSV (ดึงจาก API ข้อมูลครบจาก schema)
// ==========================================
window.exportStudents = async function() {
  try {
    const res = await fetch('/api/advisor/export');
    const data = await res.json();
    if (!data.success) {
      alert('Export ไม่สำเร็จ: ' + data.message);
      return;
    }

    const headers = [
      'STD_ID',
      'ชื่อ นามสกุล',
      'ปีการศึกษา',
      'Email',
      'Line ID',
      'Facebook',
      'Link ประวัติและผลงาน CV',
      'จำนวนชั่วโมง Hard Skill',
      'สถานะการตรวจสอบ ชม. Hard Skill',
      'เบอร์โทรนิสิต',
      'อาจารย์รีวิว',
      'ผลรีวิว (เก็บสถานะครบกำหนดส่ง)',
      'ผลรีวิว (ช่วงรอผลอ.รีวิว เพิ่มเติม)',
      'สถานะการยื่น',
      'ตำแหน่งที่ฝึก',
      'ชื่อแหล่งฝึกงาน (ชื่อเต็มเป็นภาษาไทย)',
      'ชื่อบุคคลที่ให้ทำหนังสือขอความอนุเคราะห์',
      'ตำแหน่งบุคคลที่ให้ทำหนังสือขอความอนุเคราะห์',
      'ที่อยู่บริษัท',
      'เบอร์โทรติดต่อสถานประกอบการ / แหล่งฝึก',
      'Email สถานประกอบการ / แหล่งฝึก',
      'จังหวัด',
    ];

    const rows = data.data.map(s => [
      s.studentCode,
      s.nameTh,
      s.year,
      s.email,
      s.lineId,
      s.facebook,
      s.cvLink,
      s.hardHours,
      s.hardStatus,
      s.phone,
      s.checklistReviewStatus,
      s.resultWaiting,
      s.resultAdditional,
      s.submissionStatus,
      s.position,
      s.companyNameTh,
      s.contactPersonName,
      s.contactPersonPosition,
      s.companyAddress,
      s.companyPhone,
      s.companyEmail,
      s.province,
    ].map(v => `"${(v ?? '').toString().replace(/"/g, '""')}"`).join(','));

    const csvContent = '\uFEFF' + [headers.map(h => `"${h}"`).join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `รายชื่อนิสิตที่ปรึกษา_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Export error:', err);
    alert('เกิดข้อผิดพลาดในการ Export');
  }
};

// ==========================================
// Filter UI & Clear Filter
// ==========================================
function updateFilterUI() {
  const badge = document.getElementById('active-filter-badge');
  const btn = document.getElementById('btn-clear-filter');

  const statusVal = document.getElementById('status-filter')?.value;
  const skillVal = document.getElementById('skill-filter')?.value;
  const yearVal = document.getElementById('year-filter')?.value;
  const searchVal = document.getElementById('student-search')?.value?.trim();

  const hasAnyFilter = currentFilter || statusVal || skillVal || yearVal || searchVal;

  if (currentFilter || statusVal || skillVal) {
    const parts = [];
    if (currentFilter) parts.push(`กราฟ: ${currentFilter.label}`);
    if (statusVal) parts.push(document.getElementById('status-filter').selectedOptions[0]?.text);
    if (skillVal) parts.push(document.getElementById('skill-filter').selectedOptions[0]?.text);
    if (badge) {
      badge.textContent = `กรอง: ${parts.join(', ')}`;
      badge.style.display = 'inline-block';
    }
  } else {
    if (badge) badge.style.display = 'none';
  }

  if (btn) {
    btn.style.display = hasAnyFilter ? 'inline-flex' : 'none';
  }
}

// Clear filter (จากกราฟ)
window.clearFilter = function() {
  currentFilter = null;
  currentPage = 1;
  document.querySelectorAll('.chart-status-row').forEach(r => r.classList.remove('bg-purple-100', 'font-bold'));
  updateFilterUI();
  loadStudents();
};

// Clear ALL filters (ทุก dropdown + กราฟ + ค้นหา)
window.clearAllFilters = function() {
  currentFilter = null;
  currentPage = 1;
  document.querySelectorAll('.chart-status-row').forEach(r => r.classList.remove('bg-purple-100', 'font-bold'));
  ['status-filter', 'skill-filter', 'year-filter'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const searchEl = document.getElementById('student-search');
  if (searchEl) searchEl.value = '';
  updateFilterUI();
  loadStudents();
};

// Dropdown filter events (สถานะ, Skill)
['status-filter', 'skill-filter'].forEach(id => {
  const el = document.getElementById(id);
  if (el) {
    el.addEventListener('change', () => {
      // เมื่อผู้ใช้เลือก dropdown สถานะ ให้ปลดไฮไลต์กราฟออก เพื่อไม่ให้เงื่อนไขขัดแย้งกัน
      if (currentFilter) {
        currentFilter = null;
        document.querySelectorAll('.chart-status-row').forEach(r => r.classList.remove('bg-purple-100', 'font-bold'));
      }
      currentPage = 1;
      updateFilterUI();
      loadStudents();
    });
  }
});

// Search event
const searchInput = document.getElementById('student-search');
if (searchInput) {
  let searchTimeout;
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      currentPage = 1;
      updateFilterUI();
      loadStudents();
    }, 300);
  });
}

// Year filter event
window.onYearFilterChange = function() {
  currentPage = 1;
  updateFilterUI();
  loadStudents();
};

const yearFilterEl = document.getElementById('year-filter');
if (yearFilterEl) {
  yearFilterEl.addEventListener('change', window.onYearFilterChange);
}

// ดึงรายปีจากรหัสนิสิตทั้งหมดมาใส่ Dropdown
async function populateYearFilter(apiUrl) {
  try {
    const select = document.getElementById('year-filter');
    if (!select) return;
    const currentVal = select.value;
    const res = await fetch(`${apiUrl}?page=1&limit=9999`);
    const data = await res.json();
    if (!data.success || !Array.isArray(data.students)) return;
    const years = [...new Set(
      data.students
        .filter(s => s.studentCode && s.studentCode.length >= 2)
        .map(s => s.studentCode.substring(0, 2))
    )].sort();
    select.innerHTML = '<option value="">ทุกชั้นปี</option>';
    years.forEach(y => {
      const opt = document.createElement('option');
      opt.value = y;
      opt.textContent = `ปี ${y} (25${y})`;
      if (y === currentVal) opt.selected = true;
      select.appendChild(opt);
    });
  } catch (err) {
    console.error('Populate year filter error:', err);
  }
}

// ==========================================
// 4. Modal: ตั้งสถานะนิสิต (Batch Update)
// ==========================================
window.openSetStatusModal = function() {
  if (selectedStudentIds.size === 0) {
    alert('กรุณาเลือกนิสิตอย่างน้อย 1 คนโดยการติ๊กถูกที่ช่องสี่เหลี่ยมด้านหน้า');
    return;
  }
  document.getElementById('modal-selected-count').textContent = selectedStudentIds.size;
  document.getElementById('modal-set-status').classList.remove('hidden');
};

window.closeSetStatusModal = function() {
  document.getElementById('modal-set-status').classList.add('hidden');
};

window.submitBatchStatus = async function() {
  const status = document.getElementById('batch-status-select').value;
  const note = document.getElementById('batch-status-note').value;

  try {
    const res = await fetch('/api/advisor/batch-checklist-status', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentIds: Array.from(selectedStudentIds),
        status,
        note,
      }),
    });
    const data = await res.json();
    if (data.success) {
      alert(data.message);
      closeSetStatusModal();
      selectedStudentIds.clear();
      await loadDashboardSummary();
      await loadStudents();
    } else {
      alert('เกิดข้อผิดพลาด: ' + data.message);
    }
  } catch (err) {
    console.error('Batch status update error:', err);
    alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
  }
};

// เริ่มโหลด
initAdvisorDashboard();

// ⚡ เมื่อมีสัญญาณ Real-time จาก Socket.io ให้อัปเดต Dashboard อาจารย์ที่ปรึกษาทันที
window.addEventListener('app:data-updated', () => {
  initAdvisorDashboard();
});
