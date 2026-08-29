// admin_dashboard.js — Dashboard อาจารย์รายวิชา (Admin)
// ดึงข้อมูลจาก API แล้วแสดงกราฟวงกลม ตารางนิสิต ตารางอาจารย์ สรุปจำนวน

let allStudents = [];
let currentFilter = null;
let currentPage = 1;
const pageLimit = 12;
let selectedStudentIds = new Set();

// ==========================================
// โหลดข้อมูลสรุปและรายชื่อนิสิต
// ==========================================
async function initAdminDashboard() {
  await loadDashboardSummary();
  await loadStudents();
}

// ==========================================
// 1. โหลดข้อมูลสรุป (กราฟวงกลม + อาจารย์ + จำนวน)
// ==========================================
async function loadDashboardSummary() {
  try {
    const res = await fetch('/api/admin/dashboard-summary');
    const data = await res.json();
    if (!data.success) return;

    // --- กราฟ 1: สถานะความพร้อม ---
    const r = data.readinessStats;
    renderPieChart('chart-readiness', [
      { label: 'อนุมัติที่ฝึกงานแล้ว', value: r.approvedPlacement, color: '#FF3EA5' },
      { label: 'ตรวจCVผ่าน', value: r.cvApproved, color: '#FFD233' },
      { label: 'ไม่มีข้อมูล/ชม.ไม่ครบ', value: r.noDataOrHoursLack, color: '#8B5CF6' },
      { label: 'ผ่านการตรวจชม.ครบ', value: r.trainingComplete, color: '#00C3D0' },
      { label: 'ยังไม่ได้รีวิว CV', value: r.cvNotReviewed, color: '#3B82F6' },
    ], 'สถานะความพร้อม', 'readiness-table', data.totalStudents);

    // --- กราฟ 2: สถานะการอบรม ---
    const t = data.trainingStats;
    renderPieChart('chart-training', [
      { label: 'ผ่านการตรวจชม.ครบ', value: t.passedComplete, color: '#FF3EA5' },
      { label: 'ชม.ครบ ยังไม่ตรวจ', value: t.completeNotChecked, color: '#FFD233' },
      { label: 'ตรวจแล้ว ยังไม่ผ่าน', value: t.checkedNotPass, color: '#00C3D0' },
      { label: 'ชั่วโมงยังไม่ครบ', value: t.hoursNotComplete, color: '#8B5CF6' },
    ], 'สถานะการอบรม', 'training-table', data.totalStudents);

    // --- กราฟ 3: สถานะ CV ---
    const c = data.cvStats;
    renderPieChart('chart-cv', [
      { label: 'รีวิวCVแล้ว', value: c.reviewed, color: '#FF3EA5' },
      { label: 'ยังไม่ได้รีวิว CV', value: c.notReviewed, color: '#FFD233' },
      { label: 'ไม่ผ่าน CV', value: c.failed, color: '#00C3D0' },
      { label: 'ยังไม่ทำ CV', value: c.noCv, color: '#8B5CF6' },
    ], 'สถานะการตรวจCV', 'cv-table', data.totalStudents);

    // --- กราฟ 4: สถานะอนุมัติฝึกงาน ---
    const p = data.placementStats;
    const placementTotal = p.pending + p.approved + p.rejected;
    renderPieChart('chart-placement', [
      { label: 'รอผล', value: p.pending, color: '#FF3EA5' },
      { label: 'อนุมัติที่ฝึกงานแล้ว', value: p.approved, color: '#00C3D0' },
      { label: 'ไม่อนุมัติที่ฝึกงาน', value: p.rejected, color: '#FFD233' },
    ], 'สถานะอนุมัติฝึกงาน', 'placement-table', placementTotal || 1);

    // --- ตารางอาจารย์ที่ปรึกษา ---
    renderAdvisorTable(data.advisorSummary);

    // --- สรุปจำนวนนิสิต ---
    const totalEl = document.getElementById('summary-total');
    const withEl = document.getElementById('summary-with-advisor');
    const withoutEl = document.getElementById('summary-without-advisor');
    if (totalEl) totalEl.textContent = data.totalStudents;
    if (withEl) withEl.textContent = data.studentsWithAdvisor;
    if (withoutEl) withoutEl.textContent = data.studentsWithoutAdvisor;
  } catch (err) {
    console.error('Load dashboard summary error:', err);
  }
}

// ==========================================
// สร้างกราฟวงกลม SVG + ตารางสถานะ
// ==========================================
function renderPieChart(containerId, segments, headerLabel, tableId, total) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // คำนวณ percentage และ dasharray
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

  // ถ้าไม่มีข้อมูลเลย แสดงวงกลมสีเทา
  if (total === 0 || cumulativeOffset === 0) {
    svgCircles = `<circle cx="18" cy="18" r="14" fill="none" stroke="#e5e7eb" stroke-width="4" />`;
  }

  container.innerHTML = `
    <div class="flex items-start gap-4">
      <div class="relative w-[100px] h-[100px] flex-shrink-0">
        <svg viewBox="0 0 36 36" class="w-full h-full -rotate-90">
          ${svgCircles}
        </svg>
        <div class="absolute inset-0 flex flex-col items-center justify-center">
          <span class="text-[7px] text-gray-400">Total Value</span>
          <span class="text-lg font-bold text-gray-800">${total}</span>
        </div>
      </div>
      <table class="text-[9px] border-collapse" id="${tableId}">
        <thead>
          <tr>
            <th class="text-left pr-3 pb-1 font-medium text-gray-600">${headerLabel}</th>
            <th class="text-right pr-3 pb-1 font-medium text-gray-600">จำนวน</th>
            <th class="text-right pb-1 font-medium text-gray-600">%</th>
          </tr>
        </thead>
        <tbody>
          ${segments.map((seg) => {
            const pct = total > 0 ? ((seg.value / total) * 100).toFixed(1) : '0.0';
            return `<tr class="chart-status-row cursor-pointer hover:bg-purple-50 transition-colors" data-filter="${seg.label}">
              <td class="pr-3 py-0.5">
                <span class="inline-block w-1.5 h-1.5 rounded-full mr-1" style="background:${seg.color}"></span>${seg.label}
              </td>
              <td class="text-right pr-3">${seg.value}</td>
              <td class="text-right">${pct}%</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;

  // Event: คลิกสถานะในตาราง → กรองรายชื่อนิสิต
  container.querySelectorAll('.chart-status-row').forEach(row => {
    row.addEventListener('click', () => {
      // ลบ highlight ทั้งหมด
      document.querySelectorAll('.chart-status-row').forEach(r => r.classList.remove('bg-purple-100', 'font-bold'));
      // Highlight row ที่คลิก
      row.classList.add('bg-purple-100', 'font-bold');

      const filterLabel = row.dataset.filter;
      currentFilter = filterLabel;
      currentPage = 1;
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

    let url = `/api/admin/students?page=${currentPage}&limit=${pageLimit}`;
    if (searchVal) url += `&search=${encodeURIComponent(searchVal)}`;
    // ไม่ใช้ status filter จาก API แล้ว เราจะ filter ฝั่ง frontend ตาม overallStatus label

    const res = await fetch(url);
    const data = await res.json();
    if (!data.success) return;

    let students = data.students;

    // Filter ตาม label ของกราฟถ้ามี
    if (currentFilter) {
      students = students.filter(s => s.overallStatus === currentFilter);
    }

    renderStudentTable(students, data.total, data.page, data.totalPages);
  } catch (err) {
    console.error('Load students error:', err);
  }
}

// ==========================================
// Render ตารางรายชื่อนิสิต
// ==========================================
function renderStudentTable(students, total, page, totalPages) {
  const tbody = document.getElementById('students-tbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (students.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center py-8 text-gray-400">ไม่พบข้อมูลนิสิต</td></tr>';
    return;
  }

  students.forEach((s) => {
    const statusColor = getStatusBadgeColor(s.statusCategory);
    const isChecked = selectedStudentIds.has(s.id);

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${s.studentCode}</td>
      <td>${s.nameTh}</td>
      <td>${s.advisorName || '<span class="text-gray-400">-</span>'}</td>
      <td>
        <span class="inline-block px-2 py-0.5 text-xs font-medium rounded-full ${statusColor}">${s.overallStatus}</span>
      </td>
      <td class="text-center" style="width: 40px;">
        <div style="display: flex; align-items: center; gap: 8px; justify-content: center;">
          <button class="btn-detail-dots" title="ดูรายละเอียด" onclick="window.location.href='/pages/admin_student_detail.html?id=${s.id}'" style="background:none;border:none;cursor:pointer;padding:4px;">
            <span class="material-icons text-gray-500 hover:text-blue-600" style="font-size:18px;">more_vert</span>
          </button>
          <input type="checkbox" class="student-checkbox" data-id="${s.id}" ${isChecked ? 'checked' : ''} style="width:16px;height:16px;cursor:pointer;" />
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Checkbox events
  tbody.querySelectorAll('.student-checkbox').forEach(cb => {
    cb.addEventListener('change', (e) => {
      const id = parseInt(e.target.dataset.id);
      if (e.target.checked) {
        selectedStudentIds.add(id);
      } else {
        selectedStudentIds.delete(id);
      }
    });
  });

  // Pagination
  renderPagination(page, totalPages, total);
}

function getStatusBadgeColor(category) {
  const colors = {
    placement_approved: 'bg-green-100 text-green-700',
    placement_rejected: 'bg-red-100 text-red-600',
    placement_pending: 'bg-yellow-100 text-yellow-700',
    interview_passed: 'bg-green-100 text-green-700',
    ready: 'bg-green-100 text-green-700',
    cv_approved: 'bg-green-100 text-green-700',
    cv_rejected: 'bg-red-100 text-red-600',
    cv_pending: 'bg-yellow-100 text-yellow-700',
    training_complete: 'bg-green-100 text-green-700',
    training_rejected: 'bg-red-100 text-red-600',
    training_incomplete: 'bg-yellow-100 text-yellow-700',
    none: 'bg-red-100 text-red-600',
  };
  return colors[category] || 'bg-gray-100 text-gray-600';
}

function renderPagination(page, totalPages, total) {
  const paginationEl = document.getElementById('pagination-controls');
  const infoEl = document.getElementById('pagination-info');
  if (!paginationEl) return;

  const start = (page - 1) * pageLimit + 1;
  const end = Math.min(page * pageLimit, total);
  if (infoEl) infoEl.textContent = `Showing ${start}-${end} from ${total} data`;

  paginationEl.innerHTML = '';
  for (let i = 1; i <= Math.min(totalPages, 5); i++) {
    const btn = document.createElement('button');
    btn.textContent = i;
    btn.className = i === page
      ? 'w-7 h-7 rounded-lg bg-[#1541D2] text-white text-xs font-medium'
      : 'w-7 h-7 rounded-lg bg-gray-100 text-gray-600 text-xs hover:bg-gray-200';
    btn.addEventListener('click', () => {
      currentPage = i;
      loadStudents();
    });
    paginationEl.appendChild(btn);
  }
}

// ==========================================
// ตารางอาจารย์ที่ปรึกษา
// ==========================================
function renderAdvisorTable(advisors) {
  const tbody = document.getElementById('advisor-tbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (advisors.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-gray-400">ยังไม่มีข้อมูลอาจารย์ที่ปรึกษา</td></tr>';
    return;
  }

  advisors.forEach((a) => {
    const notCheckedColor = a.checklistNotReviewed > 5 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${a.name}</td>
      <td>${a.totalAdvised}</td>
      <td>${a.checklistReviewed}</td>
      <td><span class="inline-block px-2 py-0.5 text-xs font-medium rounded-full ${notCheckedColor}">${a.checklistNotReviewed}</span></td>
    `;
    tbody.appendChild(tr);
  });
}

// ==========================================
// Modal: ตั้งสถานะนิสิต
// ==========================================
window.openSetStatusModal = function() {
  if (selectedStudentIds.size === 0) {
    alert('กรุณาเลือก checkbox นิสิตอย่างน้อย 1 คน');
    return;
  }
  const modal = document.getElementById('status-modal');
  if (modal) modal.style.display = 'flex';
};

window.closeSetStatusModal = function() {
  const modal = document.getElementById('status-modal');
  if (modal) modal.style.display = 'none';
};

window.submitBatchStatus = async function() {
  const statusType = document.getElementById('batch-status-type').value;
  const statusValue = document.getElementById('batch-status-value').value;
  const note = document.getElementById('batch-status-note').value;

  if (!statusType || !statusValue) {
    alert('กรุณาเลือกประเภทสถานะและค่าสถานะ');
    return;
  }

  try {
    const res = await fetch('/api/admin/students/batch-status', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentIds: Array.from(selectedStudentIds),
        statusType,
        statusValue,
        note,
      }),
    });
    const data = await res.json();
    if (data.success) {
      alert(`✅ ตั้งสถานะสำเร็จ (${data.updatedCount} รายการ)`);
      selectedStudentIds.clear();
      closeSetStatusModal();
      loadDashboardSummary();
      loadStudents();
    } else {
      alert('เกิดข้อผิดพลาด: ' + data.message);
    }
  } catch (err) {
    console.error(err);
    alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
  }
};

// ==========================================
// Modal: ตั้งอาจารย์ที่ปรึกษา
// ==========================================
window.openSetAdvisorModal = async function() {
  if (selectedStudentIds.size === 0) {
    alert('กรุณาเลือก checkbox นิสิตอย่างน้อย 1 คน');
    return;
  }

  // โหลดรายชื่ออาจารย์
  try {
    const res = await fetch('/api/admin/advisors');
    const data = await res.json();
    const select = document.getElementById('advisor-select');
    if (select && data.success) {
      select.innerHTML = '<option value="">-- เลือกอาจารย์ที่ปรึกษา --</option>';
      data.advisors.forEach(a => {
        select.innerHTML += `<option value="${a.id}">${a.name} (ดูแล ${a.studentCount} คน)</option>`;
      });
    }
  } catch (err) {
    console.error(err);
  }

  const modal = document.getElementById('advisor-modal');
  if (modal) modal.style.display = 'flex';
};

window.closeSetAdvisorModal = function() {
  const modal = document.getElementById('advisor-modal');
  if (modal) modal.style.display = 'none';
};

window.submitBatchAdvisor = async function() {
  const advisorId = document.getElementById('advisor-select').value;
  if (!advisorId) {
    alert('กรุณาเลือกอาจารย์ที่ปรึกษา');
    return;
  }

  try {
    const res = await fetch('/api/admin/students/batch-advisor', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentIds: Array.from(selectedStudentIds),
        advisorId: parseInt(advisorId),
      }),
    });
    const data = await res.json();
    if (data.success) {
      alert(`✅ ตั้งอาจารย์ที่ปรึกษาสำเร็จ (${data.updatedCount} คน)`);
      selectedStudentIds.clear();
      closeSetAdvisorModal();
      loadDashboardSummary();
      loadStudents();
    } else {
      alert('เกิดข้อผิดพลาด: ' + data.message);
    }
  } catch (err) {
    console.error(err);
    alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
  }
};

// ==========================================
// Export Excel (ใช้ basic CSV download)
// ==========================================
window.exportStudents = function() {
  if (selectedStudentIds.size === 0) {
    alert('กรุณาเลือก checkbox นิสิตที่ต้องการ export');
    return;
  }

  // Simple CSV export (ไม่ต้อง library)
  const rows = [];
  rows.push(['Student ID', 'ชื่อ-สกุล', 'อาจารย์ที่ปรึกษา', 'สถานะ'].join(','));

  document.querySelectorAll('.student-checkbox:checked').forEach(cb => {
    const tr = cb.closest('tr');
    if (tr) {
      const cells = tr.querySelectorAll('td');
      rows.push([
        cells[0].textContent.trim(),
        cells[1].textContent.trim(),
        cells[2].textContent.trim(),
        cells[3].textContent.trim(),
      ].map(v => `"${v}"`).join(','));
    }
  });

  const csvContent = '\uFEFF' + rows.join('\n'); // BOM for Excel UTF-8
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `รายชื่อนิสิต_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

// Search event
const searchInput = document.getElementById('student-search');
if (searchInput) {
  let searchTimeout;
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      currentPage = 1;
      loadStudents();
    }, 300);
  });
}

// Clear filter
window.clearFilter = function() {
  currentFilter = null;
  currentPage = 1;
  document.querySelectorAll('.chart-status-row').forEach(r => r.classList.remove('bg-purple-100', 'font-bold'));
  loadStudents();
};

// เริ่มโหลด
initAdminDashboard();
