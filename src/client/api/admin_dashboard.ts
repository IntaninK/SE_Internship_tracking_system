// @ts-nocheck
function formatMajorName(major?: string | null): string {
  if (!major) return '-';
  if (major.includes('วิศวกรรมซอฟต์แวร์')) return 'วิศวกรรมซอฟต์แวร์ (SE)';
  if (major.includes('ธุรกิจดิจิทัล')) return 'ธุรกิจดิจิทัล (DB)';
  if (major.includes('วิทยาการคอมพิวเตอร์')) return 'วิทยาการคอมพิวเตอร์ (CS)';
  if (major.includes('เทคโนโลยีสารสนเทศ')) return 'เทคโนโลยีสารสนเทศ (IT)';
  if (major.includes('วิศวกรรมคอมพิวเตอร์')) return 'วิศวกรรมคอมพิวเตอร์ (CPE)';
  if (major.includes('คอมพิวเตอร์กราฟิก')) return 'คอมพิวเตอร์กราฟิกฯ (CGM)';
  if (major.includes('ภูมิสารสนเทศ')) return 'ภูมิสารสนเทศศาสตร์ (GIS)';
  if (major.includes('วิทยาการข้อมูล')) return 'วิทยาการข้อมูลฯ (DSA)';
  return major.replace(/^(สาขาวิชาวิศวกรรม|สาขาวิชา|สาขา)/, '').trim() || major;
}

let allStudents = [];
let currentPage = 1;
const pageLimit = 12;
let selectedStudentIds = new Set();
let currentUserRole = null; // เก็บ role ของ user ที่ login อยู่
let currentTab = 'active'; // 'active' | 'dropped'
let totalActiveStudents = 0;
let totalDroppedStudents = 0;
let currentFilteredCount = 0;

// ==========================================
// โหลดข้อมูลสรุปและรายชื่อนิสิต
// ==========================================
async function initAdminDashboard() {
  // ดึง role ของ user ที่ login อยู่
  try {
    const meRes = await fetch('/auth/me');
    const meData = await meRes.json();
    if (meData.authenticated) {
      currentUserRole = meData.user.role;
      const user = meData.user;
      const isCourseAdminOrStaff = Boolean(user.isCourseAdmin || user.isStaff || user.role === 'STAFF' || user.role === 'ADMIN');

      // ถ้า user เป็น advisor/supervisor อย่างเดียวแต่หลุดมาหน้านี้ ให้พาไป dashboard ที่ปรึกษา
      if (!isCourseAdminOrStaff && (user.isAdvisor || user.role === 'ADVISOR' || user.isSupervisor)) {
        window.location.replace('/advisor-dashboard');
        return;
      }

      const majorSelect = document.getElementById('major-filter') as HTMLSelectElement | null;
      const isCentral = Boolean(user.role === 'ADMIN' || user.role === 'STAFF' || user.isStaff || !user.department);

      const urlParams = new URLSearchParams(window.location.search);
      const urlRoleMode = urlParams.get('roleMode');
      const activeRoleMode = urlRoleMode || user.activeRoleMode;

      // ตรวจสอบว่าเป็นบทบาทอาจารย์ประจำวิชา (Course Instructor) หรือไม่
      const isCourseInstructor = activeRoleMode === 'COURSE_INSTRUCTOR' || (!user.isStaff && user.role !== 'STAFF' && Boolean(user.department));

      const adminSidebar = document.getElementById('admin-sidebar');
      const adminLayout = document.getElementById('admin-layout');
      const btnSetSupervisor = document.getElementById('btn-set-supervisor');
      const btnDropStudent = document.getElementById('btn-drop-student');
      const btnManageStaffRoles = document.getElementById('btn-manage-staff-roles');
      const btnSetAdvisor = document.getElementById('btn-set-advisor');
      const btnSetStatus = document.getElementById('btn-set-status');

      if (isCourseInstructor) {
        // === มุมมองอาจารย์ประจำวิชา (Course Instructor) ประจำสาขา ===
        if (majorSelect && user.department) {
          majorSelect.value = user.department;
          majorSelect.disabled = true;
          majorSelect.title = `คุณดูแลเฉพาะสาขาวิชา${user.department}`;
        }

        // 1. ซ่อนแถบเมนู Super Admin ด้านซ้าย และปรับ layout ขยายเต็มจอ
        if (adminSidebar) adminSidebar.style.display = 'none';
        if (adminLayout) adminLayout.classList.add('no-sidebar');

        // 2. ซ่อนปุ่มเฉพาะงานส่วนกลางของ Super Admin / เจ้าหน้าที่คณะ (พี่จอม)
        if (btnSetSupervisor) btnSetSupervisor.style.display = 'none';
        if (btnDropStudent) btnDropStudent.style.display = 'none';
        if (btnManageStaffRoles) btnManageStaffRoles.style.display = 'none';

        // 3. แสดงปุ่มหน้าที่หลักของอาจารย์ประจำวิชา
        if (btnSetAdvisor) btnSetAdvisor.style.display = 'inline-flex';
        if (btnSetStatus) btnSetStatus.style.display = 'inline-flex';
      } else {
        // === มุมมอง Super Admin / เจ้าหน้าที่ส่วนกลางทั้งคณะ (พี่จอม) ===
        if (adminSidebar) adminSidebar.style.display = 'flex';
        if (adminLayout) adminLayout.classList.remove('no-sidebar');

        if (btnSetSupervisor) btnSetSupervisor.style.display = 'inline-flex';
        if (btnDropStudent) btnDropStudent.style.display = 'inline-flex';
        if (btnManageStaffRoles) btnManageStaffRoles.style.display = 'inline-flex';
        if (btnSetAdvisor) btnSetAdvisor.style.display = 'inline-flex';
        if (btnSetStatus) btnSetStatus.style.display = 'inline-flex';
      }
    }
  } catch (err) {
    console.error('Failed to fetch user role:', err);
  }

  updateTableHeader();

  await loadDashboardSummary();
  // เติม dropdown ชั้นปีก่อน เพื่อให้ค่า default (นิสิตปี 3 ปัจจุบัน) มีผลตั้งแต่โหลดตารางครั้งแรก
  await populateYearFilter('/api/admin/students');
  await loadStudents();
  await populateAdvisorFilter();
}

// ==========================================
// 1. โหลดข้อมูลสรุปและตารางอาจารย์
// ==========================================
async function loadDashboardSummary() {
  const errorEl = document.getElementById('admin-summary-error');
  const showSummaryError = (message) => {
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.hidden = false;
    }
    console.error(`Dashboard summary unavailable: ${message}`);
  };

  try {
    const majorFilter = document.getElementById('major-filter') as HTMLSelectElement | null;
    const selectedMajor = majorFilter ? majorFilter.value : 'ALL';
    const yearFilter = document.getElementById('year-filter') as HTMLSelectElement | null;
    const selectedYear = yearFilter ? yearFilter.value : '';
    const semesterFilter = document.getElementById('semester-filter') as HTMLSelectElement | null;
    const selectedSemester = semesterFilter ? semesterFilter.value : '';

    const summaryParams = new URLSearchParams();
    if (selectedMajor && selectedMajor !== 'ALL') summaryParams.set('major', selectedMajor);
    if (selectedYear) summaryParams.set('yearPrefix', selectedYear);
    if (selectedSemester) summaryParams.set('semester', selectedSemester);

    const summaryQuery = summaryParams.toString();
    const summaryUrl = summaryQuery ? `/api/admin/dashboard-summary?${summaryQuery}` : '/api/admin/dashboard-summary';
    const res = await fetch(summaryUrl);
    if (res.redirected || !res.headers.get('content-type')?.includes('application/json')) {
      showSummaryError('โหลดข้อมูลสรุปไม่ได้ กรุณาเข้าสู่ระบบใหม่และตรวจสอบสิทธิ์การใช้งาน');
      return;
    }

    const data = await res.json();
    if (!res.ok || !data.success) {
      showSummaryError(data.message || 'โหลดข้อมูลสรุปไม่ได้ กรุณาลองใหม่อีกครั้ง');
      return;
    }

    const placementStats = data.placementStats || {};
    const summaryValues = {
      'kpi-total-students': data.totalStudents ?? 0,
      'kpi-placement-approved': placementStats.approved ?? 0,
      'kpi-placement-pending': placementStats.pending ?? 0,
      'kpi-students-without-advisor': data.studentsWithoutAdvisor ?? 0,
    };
    Object.entries(summaryValues).forEach(([id, value]) => {
      const element = document.getElementById(id);
      if (element) element.textContent = String(value);
    });
    if (errorEl) {
      errorEl.textContent = '';
      errorEl.hidden = true;
    }

    // --- ตารางอาจารย์ที่ปรึกษา ---
    renderAdvisorTable(data.advisorSummary);

    // --- สรุปจำนวนนิสิต ---
    const totalEl = document.getElementById('summary-total');
    const withEl = document.getElementById('summary-with-advisor');
    const withoutEl = document.getElementById('summary-without-advisor');
    if (totalEl) totalEl.textContent = data.totalStudents;
    if (withEl) withEl.textContent = data.studentsWithAdvisor;
    if (withoutEl) withoutEl.textContent = data.studentsWithoutAdvisor;

    // --- Badge บนแท็บ (Active vs Dropped) ---
    totalActiveStudents = data.totalStudents ?? 0;
    totalDroppedStudents = data.totalDropped ?? 0;
    const tabActiveBadge = document.getElementById('tab-badge-active');
    const tabDroppedBadge = document.getElementById('tab-badge-dropped');
    if (tabActiveBadge) tabActiveBadge.textContent = totalActiveStudents;
    if (tabDroppedBadge) tabDroppedBadge.textContent = totalDroppedStudents;
  } catch (err) {
    showSummaryError('เชื่อมต่อเพื่อโหลดข้อมูลสรุปไม่ได้ กรุณาลองใหม่อีกครั้ง');
    console.error('Load dashboard summary error:', err);
  }
}

// ==========================================
// สลับแท็บ นิสิตปกติ (Active) vs นิสิตที่ดรอป (Dropped)
// ==========================================
window.switchStudentTab = function(tab) {
  if (currentTab === tab) return;
  currentTab = tab;
  selectedStudentIds.clear();
  currentPage = 1;

  const btnActive = document.getElementById('tab-active');
  const btnDropped = document.getElementById('tab-dropped');
  const activeActions = document.getElementById('active-action-buttons');
  const droppedActions = document.getElementById('dropped-action-buttons');

  if (tab === 'active') {
    if (btnActive) {
      btnActive.className = 'tab-pill px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 bg-white text-blue-700 shadow-sm cursor-pointer border border-blue-100';
    }
    if (btnDropped) {
      btnDropped.className = 'tab-pill px-3 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 text-gray-500 hover:text-gray-800 cursor-pointer border border-transparent bg-transparent';
    }
    if (activeActions) activeActions.style.display = 'flex';
    if (droppedActions) droppedActions.style.display = 'none';
  } else {
    if (btnActive) {
      btnActive.className = 'tab-pill px-3 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 text-gray-500 hover:text-gray-800 cursor-pointer border border-transparent bg-transparent';
    }
    if (btnDropped) {
      btnDropped.className = 'tab-pill px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 bg-white text-red-700 shadow-sm cursor-pointer border border-red-200';
    }
    if (activeActions) activeActions.style.display = 'none';
    if (droppedActions) droppedActions.style.display = 'flex';
  }

  updateTableHeader();
  loadStudents();
};

function updateTableHeader() {
  const thead = document.getElementById('students-thead');
  if (!thead) return;

  if (currentTab === 'dropped') {
    thead.innerHTML = `
      <tr>
        <th style="width: 13%;">Student ID</th>
        <th style="width: 18%;">ชื่อ-นามสกุล</th>
        <th style="width: 16%;">สาขาวิชา</th>
        <th style="width: 16%;">อาจารย์ที่ปรึกษา</th>
        <th style="width: 17%;">เหตุผลที่ดรอป</th>
        <th style="width: 12%;">วันที่ดรอป</th>
        <th style="width: 8%; min-width: 90px;" class="text-center">
          <label style="display:inline-flex;align-items:center;gap:4px;cursor:pointer;white-space:nowrap;" title="เลือกนักศึกษาทั้งหมดในหน้านี้">
            <span style="font-size:12px;">เลือกทั้งหมด</span>
            <input type="checkbox" id="select-all-students" style="width:16px;height:16px;cursor:pointer;" />
          </label>
        </th>
      </tr>
    `;
  } else {
    thead.innerHTML = `
      <tr>
        <th style="width: 14%;">Student ID</th>
        <th style="width: 20%;">ชื่อ-นามสกุล</th>
        <th style="width: 17%;">สาขาวิชา</th>
        <th style="width: 17%;">อาจารย์ที่ปรึกษา</th>
        <th style="width: 24%;">สถานะ</th>
        <th style="width: 8%; min-width: 90px;" class="text-center">
          <label style="display:inline-flex;align-items:center;gap:4px;cursor:pointer;white-space:nowrap;" title="เลือกนักศึกษาทั้งหมดในหน้านี้">
            <span style="font-size:12px;">เลือกทั้งหมด</span>
            <input type="checkbox" id="select-all-students" style="width:16px;height:16px;cursor:pointer;" />
          </label>
        </th>
      </tr>
    `;
  }
}

// ==========================================
// 2. โหลดรายชื่อนิสิต
// ==========================================
async function loadStudents() {
  try {
    const searchInput = document.getElementById('student-search');
    const searchVal = searchInput ? searchInput.value.trim() : '';

    let url = `/api/admin/students?page=${currentPage}&limit=${pageLimit}&viewDropped=${currentTab === 'dropped'}`;
    if (searchVal) url += `&search=${encodeURIComponent(searchVal)}`;
    const yearFilter = document.getElementById('year-filter') as HTMLSelectElement | null;
    const selectedYear = yearFilter ? yearFilter.value : '';
    if (selectedYear) url += `&yearPrefix=${encodeURIComponent(selectedYear)}`;

    const semesterFilter = document.getElementById('semester-filter') as HTMLSelectElement | null;
    const selectedSemester = semesterFilter ? semesterFilter.value : '';
    if (selectedSemester) url += `&semester=${encodeURIComponent(selectedSemester)}`;

    // Dropdown filters ใหม่
    const statusFilter = document.getElementById('status-filter');
    const advisorFilter = document.getElementById('advisor-filter');
    const skillFilter = document.getElementById('skill-filter');
    if (statusFilter && statusFilter.value) url += `&statusFilter=${encodeURIComponent(statusFilter.value)}`;
    if (advisorFilter && advisorFilter.value) url += `&advisorFilter=${encodeURIComponent(advisorFilter.value)}`;
    if (skillFilter && skillFilter.value) url += `&skillFilter=${encodeURIComponent(skillFilter.value)}`;
    const majorFilter = document.getElementById('major-filter');
    if (majorFilter && majorFilter.value && majorFilter.value !== 'ALL') url += `&major=${encodeURIComponent(majorFilter.value)}`;
    const sortBy = (document.getElementById('sort-by') as HTMLSelectElement | null)?.value || 'critical';
    url += `&sortBy=${encodeURIComponent(sortBy)}`;

    const res = await fetch(url);
    const data = await res.json();
    if (!data.success) return;

    const studentsToRender = data.students || [];
    currentFilteredCount = data.total;

    renderStudentTable(studentsToRender, data.total, data.page, Math.max(1, Math.ceil(data.total / pageLimit)));
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

  const colCount = currentTab === 'dropped' ? 7 : 6;
  const emptyText = currentTab === 'dropped' ? 'ไม่พบนิสิตที่ดรอป' : 'ไม่พบข้อมูลนิสิต';

  if (students.length === 0) {
    tbody.innerHTML = `<tr><td colspan="${colCount}" class="text-center py-8 text-gray-400">${emptyText}</td></tr>`;
    renderPagination(1, 1, 0);
    return;
  }

  students.forEach((s) => {
    const isChecked = selectedStudentIds.has(s.id);
    const tr = document.createElement('tr');

    if (currentTab === 'dropped') {
      const dropDateFormatted = s.droppedAt
        ? new Date(s.droppedAt).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
        : '-';

      tr.innerHTML = `
        <td>
          <div style="display:flex; align-items:center; gap:6px;">
            <span>${s.studentCode}</span>
            <span class="inline-block px-1.5 py-0.2 text-[10.5px] font-semibold rounded bg-indigo-50 text-indigo-700 border border-indigo-200" title="รอบฝึกงาน: ${s.semester === 'SUMMER' ? 'Summer' : 'เทอม ' + (s.semester || '2')}">${(s.studentCode ? s.studentCode.substring(0, 2) : '67') + '/' + (s.semester || '2')}</span>
          </div>
        </td>
        <td>${s.nameTh}</td>
        <td><span class="text-xs font-medium text-slate-700" title="${s.major || '-'}">${formatMajorName(s.major)}</span></td>
        <td>${s.advisorName || '<span class="text-gray-400">-</span>'}</td>
        <td>
          <span class="inline-block px-2.5 py-0.5 text-xs font-semibold rounded-full bg-red-100 text-red-700">
            ${s.dropReason || 'ดรอปจากระบบ'}
          </span>
        </td>
        <td class="text-gray-500 text-xs">${dropDateFormatted}</td>
        <td class="text-center">
          <div style="display: flex; align-items: center; gap: 8px; justify-content: center;">
            <button class="btn-detail-dots" title="ดูรายละเอียด" onclick="window.location.href='/admin-student-detail?id=${s.id}'" style="background:none;border:none;cursor:pointer;padding:4px;">
              <span class="material-icons text-gray-500 hover:text-blue-600" style="font-size:18px;">more_vert</span>
            </button>
            <input type="checkbox" class="student-checkbox" data-id="${s.id}" ${isChecked ? 'checked' : ''} style="width:16px;height:16px;cursor:pointer;" />
          </div>
        </td>
      `;
    } else {
      const displayStatus = s.activeStatus || s.overallStatus;
      const statusColor = getStatusBadgeColor(s.statusCategory, displayStatus);

      // สร้างป้ายเตือนเฉพาะจุด (Alert / Context tag) เมื่อมีประเด็นเรื่องชั่วโมงหรือเมื่อใช้ฟิลเตอร์ (ตอบโจทย์ข้อ 1, 2 และ 3)
      const alertTags = [];
      const softHours = s.trainingApprovedSoft || 0;
      const hardHours = s.trainingApprovedHard || 0;
      const softLack = softHours < 12;
      const hardLack = hardHours < 18;

      const currentSkillFilter = document.getElementById('skill-filter')?.value;
      if (currentSkillFilter === 'lack_soft' && softLack) {
        alertTags.push(`<span class="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-md bg-amber-50 text-amber-800 border border-amber-200">
          <span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span> ขาด Soft (${softHours}/12 ชม.)
        </span>`);
      } else if (currentSkillFilter === 'lack_hard' && hardLack) {
        alertTags.push(`<span class="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-md bg-amber-50 text-amber-800 border border-amber-200">
          <span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span> ขาด Hard (${hardHours}/18 ชม.)
        </span>`);
      } else if (currentSkillFilter === 'lack_both' && (softLack || hardLack)) {
        alertTags.push(`<span class="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-md bg-amber-50 text-amber-800 border border-amber-200">
          <span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span> ขาด Soft (${softHours}/12) + Hard (${hardHours}/18)
        </span>`);
      } else if (!s.isTrainingComplete && (s.statusCategory === 'placement_approved' || s.statusCategory === 'ready' || s.hasChecklistApproved || s.cvStatus === 'APPROVED')) {
        // ประเด็นข้อ 3: ขั้นตอนอื่นผ่านแล้วแต่ชั่วโมงอบรมตกเกณฑ์ / ขาด
        if (softLack && hardLack) {
          alertTags.push(`<span class="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-md bg-rose-50 text-rose-700 border border-rose-200" title="Soft: ${softHours}/12, Hard: ${hardHours}/18 ชม.">
            ⚠️ ตกเกณฑ์อบรม (Soft ${softHours}/12, Hard ${hardHours}/18)
          </span>`);
        } else if (softLack) {
          alertTags.push(`<span class="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-md bg-amber-50 text-amber-800 border border-amber-200" title="Soft: ${softHours}/12 ชม.">
            ⚠️ ขาด Soft (${softHours}/12 ชม.)
          </span>`);
        } else if (hardLack) {
          alertTags.push(`<span class="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-md bg-amber-50 text-amber-800 border border-amber-200" title="Hard: ${hardHours}/18 ชม.">
            ⚠️ ขาด Hard (${hardHours}/18 ชม.)
          </span>`);
        }
      }

      tr.innerHTML = `
        <td>${s.studentCode}</td>
        <td>${s.nameTh}</td>
        <td><span class="text-xs font-medium text-slate-700" title="${s.major || '-'}">${formatMajorName(s.major)}</span></td>
        <td>${s.advisorName || '<span class="text-gray-400">-</span>'}</td>
        <td>
          <div class="flex flex-col items-start gap-1 py-0.5">
            <span class="inline-block px-2.5 py-0.5 text-xs font-semibold rounded-full ${statusColor}">${displayStatus}</span>
            ${s.isMatchedWithChecklist === false ? `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-bold rounded-md bg-red-50 text-red-700 border border-red-300">🚨 [REQ-06] บริษัทไม่ตรง Checklist (${s.placementCompanyName || '-'})</span>` : ''}
            ${s.isMatchedWithChecklist === true && s.placementCompanyName ? `<span class="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">✅ ตรงกับ Checklist (${s.placementCompanyName})</span>` : ''}
            ${alertTags.join('')}
          </div>
        </td>
        <td class="text-center">
          <div style="display: flex; align-items: center; gap: 8px; justify-content: center;">
            <button class="btn-detail-dots" title="ดูรายละเอียด" onclick="window.location.href='/admin-student-detail?id=${s.id}'" style="background:none;border:none;cursor:pointer;padding:4px;">
              <span class="material-icons text-gray-500 hover:text-blue-600" style="font-size:18px;">more_vert</span>
            </button>
            <input type="checkbox" class="student-checkbox" data-id="${s.id}" ${isChecked ? 'checked' : ''} style="width:16px;height:16px;cursor:pointer;" />
          </div>
        </td>
      `;
    }
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
      updateSelectAllCheckbox();
    });
  });

  const selectAllCheckbox = document.getElementById('select-all-students');
  if (selectAllCheckbox) {
    selectAllCheckbox.addEventListener('change', (e) => {
      tbody.querySelectorAll('.student-checkbox').forEach(cb => {
        cb.checked = e.target.checked;
        const id = parseInt(cb.dataset.id);
        if (e.target.checked) {
          selectedStudentIds.add(id);
        } else {
          selectedStudentIds.delete(id);
        }
      });
      updateSelectAllCheckbox();
    });
    updateSelectAllCheckbox();
  }

  // Pagination
  renderPagination(page, totalPages, total);
}

function updateSelectAllCheckbox() {
  const selectAllCheckbox = document.getElementById('select-all-students');
  const visibleCheckboxes = document.querySelectorAll('#students-tbody .student-checkbox');
  if (!selectAllCheckbox || visibleCheckboxes.length === 0) {
    if (selectAllCheckbox) {
      selectAllCheckbox.checked = false;
      selectAllCheckbox.indeterminate = false;
    }
    return;
  }

  const selectedCount = [...visibleCheckboxes].filter(cb => cb.checked).length;
  selectAllCheckbox.checked = selectedCount === visibleCheckboxes.length;
  selectAllCheckbox.indeterminate = selectedCount > 0 && selectedCount < visibleCheckboxes.length;
}

function getStatusBadgeColor(category, displayStatus) {
  if (displayStatus === 'ยังไม่ได้รีวิว CV' || displayStatus === 'รอผล' || displayStatus === 'ชม.ครบ ยังไม่ตรวจ' || displayStatus === 'รออนุมัติที่ฝึกงาน') {
    return 'bg-yellow-100 text-yellow-700';
  }
  if (displayStatus === 'ไม่ผ่าน CV' || displayStatus === 'ไม่อนุมัติที่ฝึกงาน' || displayStatus === 'ตรวจแล้ว ยังไม่ผ่าน' || displayStatus === 'ชั่วโมงยังไม่ครบ' || displayStatus === 'ยังไม่ทำ CV' || displayStatus === 'ชั่วโมงอบรมไม่ผ่าน') {
    return 'bg-red-100 text-red-600';
  }
  if (displayStatus === 'รีวิวCVแล้ว' || displayStatus === 'อนุมัติที่ฝึกงานแล้ว' || displayStatus === 'ผ่านการตรวจชม.ครบ' || displayStatus === 'ตรวจCVผ่าน' || displayStatus === 'สัมภาษณ์ผ่านแล้ว' || displayStatus === 'ตรวจCVผ่าน + ชม.ครบ') {
    return 'bg-green-100 text-green-700';
  }
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

  const start = total > 0 ? (page - 1) * pageLimit + 1 : 0;
  const end = Math.min(page * pageLimit, total);
  if (infoEl) infoEl.textContent = `แสดง ${start}-${end} จาก ${total} รายการ`;

  paginationEl.innerHTML = totalPages > 1 ? `
    <button type="button" data-page-direction="previous" ${page <= 1 ? 'disabled' : ''}
      style="border:1px solid #CBD5E1; border-radius:6px; background:#FFFFFF; color:#334155; padding:5px 10px; cursor:${page <= 1 ? 'not-allowed' : 'pointer'}; opacity:${page <= 1 ? '.5' : '1'};">ก่อนหน้า</button>
    <button type="button" data-page-direction="next" ${page >= totalPages ? 'disabled' : ''}
      style="border:1px solid #CBD5E1; border-radius:6px; background:#FFFFFF; color:#334155; padding:5px 10px; cursor:${page >= totalPages ? 'not-allowed' : 'pointer'}; opacity:${page >= totalPages ? '.5' : '1'};">ถัดไป</button>
  ` : '';
  paginationEl.querySelectorAll<HTMLButtonElement>('[data-page-direction]').forEach(button => {
    button.addEventListener('click', () => {
      if (button.disabled) return;
      currentPage += button.dataset.pageDirection === 'next' ? 1 : -1;
      loadStudents();
    });
  });
}

// ==========================================
// ตารางอาจารย์ที่ปรึกษา (จัดกลุ่มแยกตามสาขาวิชา + รองรับ Filter)
// ==========================================
function getDepartmentGroupTitle(department?: string | null): string {
  if (!department || department === '-' || department === 'OTHER') {
    return 'สาขาวิชาอื่นๆ / ยังไม่ระบุสาขา';
  }
  const formatted = formatMajorName(department);
  if (formatted === '-') return 'สาขาวิชาอื่นๆ / ยังไม่ระบุสาขา';
  if (formatted.startsWith('สาขา')) return formatted;
  return `สาขาวิชา${formatted}`;
}

function renderAdvisorTable(advisors) {
  const tbody = document.getElementById('advisor-tbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (!advisors || advisors.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="text-center py-6 text-gray-400 font-medium">ไม่พบข้อมูลอาจารย์ที่ปรึกษาตามเงื่อนไขที่เลือก</td></tr>';
    return;
  }

  // 1. Group advisors by department
  const groups: Record<string, any[]> = {};
  advisors.forEach((a) => {
    const title = getDepartmentGroupTitle(a.department);
    if (!groups[title]) {
      groups[title] = [];
    }
    groups[title].push(a);
  });

  const MAJOR_ORDER = [
    'วิศวกรรมซอฟต์แวร์',
    'ธุรกิจดิจิทัล',
    'วิทยาการคอมพิวเตอร์',
    'เทคโนโลยีสารสนเทศ',
    'วิศวกรรมคอมพิวเตอร์',
    'คอมพิวเตอร์กราฟิก',
    'ภูมิสารสนเทศ',
    'วิทยาการข้อมูล',
  ];

  const sortedGroups = Object.keys(groups).sort((a, b) => {
    const idxA = MAJOR_ORDER.findIndex((m) => a.includes(m));
    const idxB = MAJOR_ORDER.findIndex((m) => b.includes(m));
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.localeCompare(b, 'th');
  });

  sortedGroups.forEach((deptTitle) => {
    const deptAdvisors = groups[deptTitle];
    // Sort advisors alphabetically
    deptAdvisors.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'th'));

    const totalAdvisedInDept = deptAdvisors.reduce((sum, a) => sum + (Number(a.totalAdvised) || 0), 0);
    const totalPendingInDept = deptAdvisors.reduce((sum, a) => sum + (Number(a.checklistNotReviewed) || 0), 0);

    // Group Header Row (คลิกเพื่อย่อ/ขยายพร้อมลูกศร)
    const headerTr = document.createElement('tr');
    headerTr.className = 'advisor-dept-header-row';
    headerTr.style.cursor = 'pointer';
    headerTr.title = 'คลิกเพื่อย่อ/ขยายรายชื่ออาจารย์ในสาขานี้';
    headerTr.innerHTML = `
      <td colspan="4" style="background: #F1F5F9; border-top: 2px solid #E2E8F0; border-bottom: 1px solid #CBD5E1; padding: 9px 14px; user-select: none;">
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
          <div style="display: flex; align-items: center; gap: 7px; font-weight: 700; color: #1E3A8A; font-size: 13.5px;">
            <span class="material-icons dept-arrow" style="font-size: 20px; color: #2563EB; transition: transform 0.2s ease; display: inline-flex; align-items: center; justify-content: center;">keyboard_arrow_down</span>
            <span class="material-icons" style="font-size: 18px; color: #3B82F6;">school</span>
            <span>${deptTitle}</span>
          </div>
          <div style="display: flex; align-items: center; gap: 6px; font-size: 11.5px;">
            <span style="background: #FFFFFF; color: #334155; padding: 2px 8px; border-radius: 9999px; font-weight: 600; border: 1px solid #CBD5E1;">
              อาจารย์ ${deptAdvisors.length} ท่าน
            </span>
            <span style="background: #EFF6FF; color: #1D4ED8; padding: 2px 8px; border-radius: 9999px; font-weight: 600; border: 1px solid #BFDBFE;">
              นิสิตในสังกัด ${totalAdvisedInDept} คน
            </span>
            ${
              totalPendingInDept > 0
                ? `<span style="background: #FEF2F2; color: #DC2626; padding: 2px 8px; border-radius: 9999px; font-weight: 600; border: 1px solid #FECACA;">
                    รอตรวจ ${totalPendingInDept} รายการ
                  </span>`
                : ''
            }
          </div>
        </div>
      </td>
    `;
    tbody.appendChild(headerTr);

    // Hover effect on header row
    headerTr.addEventListener('mouseenter', () => {
      const td = headerTr.querySelector('td');
      if (td) td.style.background = '#E2E8F0';
    });
    headerTr.addEventListener('mouseleave', () => {
      const td = headerTr.querySelector('td');
      if (td) td.style.background = '#F1F5F9';
    });

    const advisorRows: HTMLTableRowElement[] = [];
    let isExpanded = true;

    headerTr.addEventListener('click', () => {
      isExpanded = !isExpanded;
      const arrow = headerTr.querySelector('.dept-arrow') as HTMLElement | null;
      if (arrow) {
        arrow.style.transform = isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)';
      }
      advisorRows.forEach((row) => {
        row.style.display = isExpanded ? '' : 'none';
      });
    });

    // Advisor Rows in this department
    deptAdvisors.forEach((a) => {
      const notCheckedColor =
        a.checklistNotReviewed > 5
          ? 'bg-red-100 text-red-600'
          : a.checklistNotReviewed > 0
          ? 'bg-amber-100 text-amber-700'
          : 'bg-green-100 text-green-700';

      const tr = document.createElement('tr');
      tr.style.transition = 'background-color 0.15s ease';
      tr.innerHTML = `
        <td style="padding-left: 22px;">
          <div style="display: flex; align-items: center; gap: 7px;">
            <span class="material-icons" style="font-size: 16px; color: #94A3B8;">person_outline</span>
            <span style="font-weight: 500; color: #1E293B; font-size: 13px;">${a.name}</span>
          </div>
        </td>
        <td style="font-weight: 600; color: #334155; font-size: 13px;">${a.totalAdvised}</td>
        <td style="color: #059669; font-weight: 600; font-size: 13px;">${a.checklistReviewed}</td>
        <td>
          <span class="inline-block px-2.5 py-0.5 text-xs font-semibold rounded-full ${notCheckedColor}">
            ${a.checklistNotReviewed}
          </span>
        </td>
      `;
      tbody.appendChild(tr);
      advisorRows.push(tr);
    });
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

  // โหลดรายชื่ออาจารย์ (สัมพันธ์กับสาขาที่เลือก)
  try {
    const majorFilter = document.getElementById('major-filter') as HTMLSelectElement | null;
    const selectedMajor = majorFilter ? majorFilter.value : 'ALL';
    const advisorUrl = selectedMajor && selectedMajor !== 'ALL'
      ? `/api/admin/advisors?major=${encodeURIComponent(selectedMajor)}`
      : '/api/admin/advisors';
    const res = await fetch(advisorUrl);
    const data = await res.json();
    const select = document.getElementById('advisor-select') as HTMLSelectElement | null;
    if (select && data.success && Array.isArray(data.advisors)) {
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

// สลับการเปิด/ปิดช่องกรอกหมายเหตุตามเหตุผลที่เลือก
window.toggleDropReasonNote = function() {
  const presetEl = document.getElementById('drop-reason-preset');
  const noteEl = document.getElementById('drop-reason-note');
  if (!presetEl || !noteEl) return;

  const isCustom = presetEl.value === 'custom';
  noteEl.disabled = !isCustom;
  if (isCustom) {
    noteEl.style.backgroundColor = '#ffffff';
    noteEl.style.cursor = 'text';
    noteEl.placeholder = 'ระบุเหตุผลการดรอป...';
    noteEl.focus();
  } else {
    noteEl.value = '';
    noteEl.style.backgroundColor = '#f1f5f9';
    noteEl.style.cursor = 'not-allowed';
    noteEl.placeholder = "เปิดให้กรอกเมื่อเลือก 'อื่นๆ (ระบุในหมายเหตุ)'";
  }
};

// ==========================================
// Modal: ดรอปนิสิต (Drop Student)
// ==========================================
window.openDropStudentModal = function() {
  if (selectedStudentIds.size === 0) {
    alert('กรุณาเลือก checkbox นิสิตอย่างน้อย 1 คน');
    return;
  }
  const countEl = document.getElementById('drop-selected-count');
  if (countEl) countEl.textContent = selectedStudentIds.size;
  const presetEl = document.getElementById('drop-reason-preset');
  if (presetEl) presetEl.selectedIndex = 0;
  const noteEl = document.getElementById('drop-reason-note');
  if (noteEl) noteEl.value = '';
  toggleDropReasonNote();

  const modal = document.getElementById('drop-modal');
  if (modal) modal.style.display = 'flex';
};

window.closeDropStudentModal = function() {
  const modal = document.getElementById('drop-modal');
  if (modal) modal.style.display = 'none';
};

window.submitDropStudents = async function() {
  if (selectedStudentIds.size === 0) return;
  const preset = document.getElementById('drop-reason-preset')?.value || '';
  const note = document.getElementById('drop-reason-note')?.value.trim() || '';
  let reason = preset;
  if (preset === 'custom') {
    if (!note) {
      alert('กรุณาระบุเหตุผลการดรอปในช่องหมายเหตุ');
      document.getElementById('drop-reason-note')?.focus();
      return;
    }
    reason = note;
  }

  try {
    const res = await fetch('/api/admin/students/drop', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentIds: Array.from(selectedStudentIds),
        reason,
      }),
    });
    const data = await res.json();
    if (data.success) {
      alert(`✅ ${data.message}`);
      selectedStudentIds.clear();
      closeDropStudentModal();
      await loadDashboardSummary();
      await loadStudents();
    } else {
      alert('เกิดข้อผิดพลาด: ' + data.message);
    }
  } catch (err) {
    console.error('Drop students error:', err);
    alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
  }
};

// ==========================================
// Modal: กู้คืนสถานะนิสิต (Restore Student)
// ==========================================
window.openRestoreStudentModal = function() {
  if (selectedStudentIds.size === 0) {
    alert('กรุณาเลือก checkbox นิสิตที่ต้องการกู้คืนอย่างน้อย 1 คน');
    return;
  }
  const countEl = document.getElementById('restore-selected-count');
  if (countEl) countEl.textContent = selectedStudentIds.size;

  const modal = document.getElementById('restore-modal');
  if (modal) modal.style.display = 'flex';
};

window.closeRestoreStudentModal = function() {
  const modal = document.getElementById('restore-modal');
  if (modal) modal.style.display = 'none';
};

window.submitRestoreStudents = async function() {
  if (selectedStudentIds.size === 0) return;
  try {
    const res = await fetch('/api/admin/students/restore', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentIds: Array.from(selectedStudentIds),
      }),
    });
    const data = await res.json();
    if (data.success) {
      alert(`✅ ${data.message}`);
      selectedStudentIds.clear();
      closeRestoreStudentModal();
      await loadDashboardSummary();
      await loadStudents();
    } else {
      alert('เกิดข้อผิดพลาด: ' + data.message);
    }
  } catch (err) {
    console.error('Restore students error:', err);
    alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
  }
};

// ==========================================
// Export Excel / CSV ด้วย Export Modal Dialog
// ==========================================
window.openExportModal = function() {
  const modal = document.getElementById('export-modal');
  if (!modal) return;

  const totalSelected = selectedStudentIds.size;
  const totalFiltered = currentFilteredCount;
  const totalAll = (currentTab === 'dropped' ? totalDroppedStudents : totalActiveStudents) || totalFiltered;

  // ตั้งค่าตัวเลขจำนวน
  const countFilteredEl = document.getElementById('export-count-filtered');
  const countSelectedEl = document.getElementById('export-count-selected');
  const countAllEl = document.getElementById('export-count-all');
  if (countFilteredEl) countFilteredEl.textContent = `${totalFiltered} รายการ`;
  if (countSelectedEl) countSelectedEl.textContent = `${totalSelected} รายการ`;
  if (countAllEl) countAllEl.textContent = `${totalAll} รายการ`;

  const allTitleEl = document.getElementById('export-all-title');
  if (allTitleEl) {
    allTitleEl.textContent = currentTab === 'dropped' ? 'นิสิตที่ดรอปทั้งหมดในระบบ' : 'นิสิตปกติทั้งหมดในระบบ';
  }

  const radioSelected = document.getElementById('export-scope-selected');
  const radioFiltered = document.getElementById('export-scope-filtered');
  const optSelectedLabel = document.getElementById('export-opt-selected-label');
  const selectedDesc = document.getElementById('export-selected-desc');

  if (totalSelected > 0) {
    if (radioSelected) {
      radioSelected.disabled = false;
      radioSelected.checked = true;
    }
    if (optSelectedLabel) {
      optSelectedLabel.style.opacity = '1';
      optSelectedLabel.style.cursor = 'pointer';
    }
    if (selectedDesc) selectedDesc.textContent = `ส่งออกเฉพาะนิสิต ${totalSelected} คนที่ติ๊กเลือกไว้`;
  } else {
    if (radioSelected) {
      radioSelected.disabled = true;
      radioSelected.checked = false;
    }
    if (optSelectedLabel) {
      optSelectedLabel.style.opacity = '0.5';
      optSelectedLabel.style.cursor = 'not-allowed';
    }
    if (selectedDesc) selectedDesc.textContent = 'ยังไม่ได้ติ๊กเลือกนิสิตในตาราง';
    if (radioFiltered) radioFiltered.checked = true;
  }

  updateExportSummary();
  modal.style.display = 'flex';
};

window.closeExportModal = function() {
  const modal = document.getElementById('export-modal');
  if (modal) modal.style.display = 'none';
};

window.updateExportSummary = function() {
  const selectedRadio = document.querySelector('input[name="export-scope"]:checked');
  const scope = selectedRadio ? selectedRadio.value : 'filtered';
  const totalSelected = selectedStudentIds.size;
  const totalFiltered = currentFilteredCount;
  const totalAll = (currentTab === 'dropped' ? totalDroppedStudents : totalActiveStudents) || totalFiltered;

  ['filtered', 'selected', 'all'].forEach(s => {
    const label = document.getElementById(`export-opt-${s}-label`);
    if (label) {
      if (s === scope) {
        label.style.borderColor = '#1541D2';
        label.style.backgroundColor = '#F0F5FF';
      } else {
        label.style.borderColor = '#E2E8F0';
        label.style.backgroundColor = '#FFFFFF';
      }
    }
  });

  const summaryText = document.getElementById('export-summary-text');
  if (!summaryText) return;

  if (scope === 'selected') {
    summaryText.textContent = `เตรียมส่งออกข้อมูลนิสิต ${totalSelected} รายการ (เฉพาะที่ติ๊กเลือก)`;
  } else if (scope === 'filtered') {
    summaryText.textContent = `เตรียมส่งออกข้อมูลนิสิต ${totalFiltered} รายการ (ตามตัวกรอง / การค้นหา)`;
  } else {
    summaryText.textContent = `เตรียมส่งออกข้อมูลนิสิต ${totalAll} รายการ (ทั้งหมดในระบบ)`;
  }
};

window.confirmExport = async function() {
  const btn = document.getElementById('btn-confirm-export');
  const originalBtnHtml = btn ? btn.innerHTML : '';
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<span class="material-icons text-sm" style="animation: spin 1s linear infinite;">autorenew</span> กำลังสร้างไฟล์...`;
  }

  try {
    const selectedRadio = document.querySelector('input[name="export-scope"]:checked');
    const scope = selectedRadio ? selectedRadio.value : 'filtered';

    let url = '/api/admin/export?';
    if (scope === 'selected') {
      if (selectedStudentIds.size === 0) {
        alert('กรุณาเลือกนิสิตในตารางก่อนทำการส่งออก');
        return;
      }
      url += `ids=${Array.from(selectedStudentIds).join(',')}`;
    } else if (scope === 'filtered') {
      const searchInput = document.getElementById('student-search');
      const searchVal = searchInput ? searchInput.value.trim() : '';
      const yearFilter = document.getElementById('year-filter');
      const selectedYear = yearFilter ? yearFilter.value : '';
      const statusFilter = document.getElementById('status-filter');
      const advisorFilter = document.getElementById('advisor-filter');
      const skillFilter = document.getElementById('skill-filter');
      const majorFilter = document.getElementById('major-filter') as HTMLSelectElement | null;

      const params = new URLSearchParams();
      params.set('viewDropped', String(currentTab === 'dropped'));
      if (searchVal) params.set('search', searchVal);
      if (selectedYear) params.set('yearPrefix', selectedYear);
      if (selectedSemester) params.set('semester', selectedSemester);
      if (statusFilter && (statusFilter as HTMLSelectElement).value) params.set('statusFilter', (statusFilter as HTMLSelectElement).value);
      if (advisorFilter && (advisorFilter as HTMLSelectElement).value) params.set('advisorFilter', (advisorFilter as HTMLSelectElement).value);
      if (skillFilter && (skillFilter as HTMLSelectElement).value) params.set('skillFilter', (skillFilter as HTMLSelectElement).value);
      if (majorFilter && majorFilter.value && majorFilter.value !== 'ALL') params.set('major', majorFilter.value);
      url += params.toString();
    } else {
      url += `viewDropped=${currentTab === 'dropped'}&all=true`;
    }

    const res = await fetch(url);
    const data = await res.json();
    if (!data.success) {
      alert('Export ไม่สำเร็จ: ' + (data.message || ''));
      return;
    }

    let exportList = data.data || [];

    // Fallback กรองฝั่ง client-side หากต้องการ
    if (scope === 'selected' && selectedStudentIds.size > 0 && exportList.length > selectedStudentIds.size) {
      exportList = exportList.filter(s => selectedStudentIds.has(s.id));
    }

    if (exportList.length === 0) {
      alert('ไม่พบข้อมูลนิสิตสำหรับ export ตามเงื่อนไขที่เลือก');
      return;
    }

    const headers = [
      'รหัสนิสิต',
      'ชื่อ - นามสกุล',
      'เบอร์โทรนิสิต',
      'อาจารย์ที่ปรึกษา',
      'ชั่วโมงอบรม (Soft/Hard/รวม)',
      'สถานะ CV',
      'สถานะ Checklist',
      'ผลการสมัคร/สัมภาษณ์',
      'ชื่อสถานประกอบการ / บริษัท',
      'ตำแหน่งที่ฝึก',
      'ชื่อบุคคลที่ให้ทำหนังสือ (เรียน...)',
      'ตำแหน่งบุคคลที่ให้ทำหนังสือ',
      'ที่อยู่บริษัท',
      'จังหวัด',
      'เบอร์โทรศัพท์บริษัท',
      'อีเมลติดต่อบริษัท',
      'สถานะอนุมัติที่ฝึกงาน',
      'สถานะในระบบ',
    ];

    const rows = exportList.map(s => [
      s.studentCode,
      s.nameTh,
      s.phone,
      s.advisorName,
      s.trainingProgress,
      s.cvStatus,
      s.checklistStatus,
      s.interviewStatus,
      s.companyNameTh,
      s.position,
      s.contactPersonName,
      s.contactPersonPosition,
      s.companyAddress,
      s.province,
      s.companyPhone,
      s.companyEmail,
      s.placementStatus,
      s.dropStatus,
    ].map(v => `"${(v ?? '').toString().replace(/"/g, '""')}"`).join(','));

    const csvContent = '\uFEFF' + [headers.map(h => `"${h}"`).join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    const dateStr = new Date().toISOString().slice(0, 10);
    const tabSuffix = currentTab === 'dropped' ? '_dropped' : '';
    a.download = `รายชื่อและข้อมูลนิสิตฝึกงาน_${scope}${tabSuffix}_${dateStr}.csv`;
    a.click();
    URL.revokeObjectURL(blobUrl);

    closeExportModal();
  } catch (err) {
    console.error('Export error:', err);
    alert('เกิดข้อผิดพลาดในการ Export');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = originalBtnHtml;
    }
  }
};

window.exportStudents = function() {
  window.openExportModal();
};

// ปิด Export Modal เมื่อคลิกพื้นหลัง หรือกดปุ่ม Escape
window.addEventListener('click', (e) => {
  const exportModal = document.getElementById('export-modal');
  if (e.target === exportModal) {
    closeExportModal();
  }
});

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeExportModal();
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
      loadStudents();
    }, 300);
  });
}

// Year filter event
window.onYearFilterChange = function() {
  clearSearchBox();
  currentPage = 1;
  loadStudents();
};

const yearFilterEl = document.getElementById('year-filter');
if (yearFilterEl) {
  yearFilterEl.addEventListener('change', () => {
    (window as any).onYearFilterChange();
    loadDashboardSummary();
  });
}

const semesterFilterEl = document.getElementById('semester-filter');
if (semesterFilterEl) {
  semesterFilterEl.addEventListener('change', () => {
    clearSearchBox();
    currentPage = 1;
    updateFilterUI();
    loadStudents();
    loadDashboardSummary();
  });
}

// Dropdown filter events (สถานะ, อาจารย์, Skill)
['status-filter', 'advisor-filter', 'skill-filter', 'sort-by'].forEach(id => {
  const el = document.getElementById(id);
  if (el) {
    el.addEventListener('change', () => {
      clearSearchBox();
      currentPage = 1;
      updateFilterUI();
      loadStudents();
    });
  }
});

// Dropdown filter สาขาวิชา (สัมพันธ์กับตัวกรองอาจารย์ และ Dashboard Summary)
const majorFilterEl = document.getElementById('major-filter');
if (majorFilterEl) {
  majorFilterEl.addEventListener('change', async () => {
    clearSearchBox();
    currentPage = 1;
    await populateAdvisorFilter();
    updateFilterUI();
    loadStudents();
    loadDashboardSummary();
  });
}

// รหัสปีของนิสิตชั้นปี 3 ในปีการศึกษาปัจจุบัน (ตัดรอบปีการศึกษาที่เดือน มิ.ย. เหมือน studentImportParser)
// เช่น ต.ค. 2569 → ปีการศึกษา 2569 → ปี 3 = รหัส 67 | ม.ค. 2570 → ยังเป็นปีการศึกษา 2569 → รหัส 67
function getDefaultYearPrefix(date = new Date()) {
  const beYear = date.getFullYear() + 543;
  const academicYear = date.getMonth() + 1 < 6 ? beYear - 1 : beYear;
  return String((academicYear - 2) % 100).padStart(2, '0');
}

let yearFilterInitialized = false;

// ดึงรายปีจากรหัสนิสิตทั้งหมดมาใส่ Dropdown
async function populateYearFilter(apiUrl) {
  try {
    const select = document.getElementById('year-filter');
    if (!select) return;
    let currentVal = select.value;
    const res = await fetch(`${apiUrl}?page=1&limit=9999`);
    const data = await res.json();
    if (!data.success || !Array.isArray(data.students)) return;
    const years = [...new Set(
      data.students
        .filter(s => s.studentCode && s.studentCode.length >= 2)
        .map(s => s.studentCode.substring(0, 2))
    )].sort((a, b) => Number(b) - Number(a));
    // โหลดหน้าครั้งแรก: default เป็นนิสิตปี 3 ปัจจุบัน (ถ้ามีนิสิตรุ่นนั้นในระบบ ไม่งั้นแสดงทุกชั้นปี)
    // ครั้งถัดไป (เช่น realtime refresh) คงค่าที่ผู้ใช้เลือกไว้
    if (!yearFilterInitialized) {
      yearFilterInitialized = true;
      const defaultPrefix = getDefaultYearPrefix();
      if (years.includes(defaultPrefix)) currentVal = defaultPrefix;
    }
    select.innerHTML = '';
    const allYearsOption = document.createElement('option');
    allYearsOption.value = '';
    allYearsOption.textContent = 'ทุกชั้นปี';
    allYearsOption.selected = !years.includes(currentVal);
    select.appendChild(allYearsOption);
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

// ดึงรายชื่ออาจารย์มาใส่ Dropdown ฟิลเตอร์ (สัมพันธ์กับสาขาที่เลือก)
async function populateAdvisorFilter(targetMajor?: string) {
  try {
    const select = document.getElementById('advisor-filter') as HTMLSelectElement | null;
    if (!select) return;

    const majorSelect = document.getElementById('major-filter') as HTMLSelectElement | null;
    const major = targetMajor ?? (majorSelect ? majorSelect.value : 'ALL');

    const currentAdvisor = select.value;

    const url = major && major !== 'ALL'
      ? `/api/admin/advisors?major=${encodeURIComponent(major)}`
      : '/api/admin/advisors';

    const res = await fetch(url);
    const data = await res.json();
    if (!data.success || !Array.isArray(data.advisors)) return;

    select.innerHTML = '<option value="">ทุกอาจารย์</option>';
    let advisorFound = false;

    data.advisors.forEach((a: any) => {
      const opt = document.createElement('option');
      opt.value = a.name;
      opt.textContent = `${a.name} (${a.studentCount} คน)`;
      if (currentAdvisor && a.name === currentAdvisor) {
        opt.selected = true;
        advisorFound = true;
      }
      select.appendChild(opt);
    });

    // หากอาจารย์ที่เคยเลือกไว้ ไม่ได้อยู่ในสาขานี้แล้ว ให้รีเซ็ตค่าเป็นทุกอาจารย์
    if (currentAdvisor && !advisorFound) {
      select.value = '';
    }
  } catch (err) {
    console.error('Populate advisor filter error:', err);
  }
}

// ล้างช่องค้นหาทุกครั้งที่มีการใช้ filter อื่น (dropdown/กราฟ) เพื่อไม่ให้เงื่อนไขค้นหา+filter ขัดแย้งกัน
function clearSearchBox() {
  const searchEl = document.getElementById('student-search');
  if (searchEl) searchEl.value = '';
}

// Custom Dropdown: สถานะนิสิต
window.toggleStatusDropdown = function() {
  const menu = document.getElementById('status-dropdown-menu');
  const arrow = document.getElementById('status-arrow-icon');
  if (menu) {
    const isHidden = menu.style.display === 'none' || !menu.style.display;
    menu.style.display = isHidden ? 'block' : 'none';
    if (arrow) {
      arrow.textContent = isHidden ? 'keyboard_arrow_up' : 'keyboard_arrow_down';
    }
  }
};

window.selectStatusFilter = function(value: string, label: string) {
  const hiddenInput = document.getElementById('status-filter') as HTMLInputElement | null;
  const labelEl = document.getElementById('status-filter-label');
  const menu = document.getElementById('status-dropdown-menu');
  const arrow = document.getElementById('status-arrow-icon');

  if (hiddenInput) {
    hiddenInput.value = value;
    hiddenInput.dataset.label = label;
  }
  if (labelEl) {
    labelEl.textContent = label;
  }
  if (menu) {
    menu.style.display = 'none';
    const items = menu.querySelectorAll('.status-option');
    items.forEach(it => {
      if ((it.getAttribute('data-val') || '') === value) {
        it.classList.add('selected');
      } else {
        it.classList.remove('selected');
      }
    });
  }
  if (arrow) arrow.textContent = 'keyboard_arrow_down';

  clearSearchBox();
  currentPage = 1;
  updateFilterUI();
  loadStudents();
};

function updateFilterUI() {
  const badge = document.getElementById('active-filter-badge');
  const btn = document.getElementById('btn-clear-filter');

  // เช็คว่ามี filter ไหนที่เลือกอยู่บ้าง
  const statusEl = document.getElementById('status-filter') as HTMLInputElement | HTMLSelectElement | null;
  const statusVal = statusEl?.value;
  const advisorVal = (document.getElementById('advisor-filter') as HTMLSelectElement | null)?.value;
  const skillVal = (document.getElementById('skill-filter') as HTMLSelectElement | null)?.value;
  const hasDropdownFilter = Boolean(statusVal || advisorVal || skillVal);

  if (hasDropdownFilter) {
    const parts = [];
    if (statusVal) {
      const statusLabel = statusEl?.dataset?.label || (statusEl as HTMLSelectElement).selectedOptions?.[0]?.text || statusVal;
      parts.push(statusLabel);
    }
    if (advisorVal) parts.push(advisorVal);
    if (skillVal) parts.push((document.getElementById('skill-filter') as HTMLSelectElement).selectedOptions?.[0]?.text);
    if (badge) {
      badge.textContent = `กรอง: ${parts.join(', ')}`;
      badge.style.display = 'inline-block';
    }
    if (btn) btn.style.display = 'inline-flex';
  } else {
    if (badge) badge.style.display = 'none';
    if (btn) btn.style.display = 'none';
  }
}

// Clear ALL filters
window.clearAllFilters = function() {
  currentPage = 1;
  ['status-filter', 'advisor-filter', 'skill-filter', 'year-filter'].forEach(id => {
    const el = document.getElementById(id) as HTMLInputElement | HTMLSelectElement | null;
    if (el) {
      el.value = '';
      if ('dataset' in el && el.dataset) el.dataset.label = 'ทุกสถานะ';
    }
  });
  const sortEl = document.getElementById('sort-by') as HTMLSelectElement | null;
  if (sortEl) sortEl.value = 'critical';
  const statusLabelEl = document.getElementById('status-filter-label');
  if (statusLabelEl) statusLabelEl.textContent = 'ทุกสถานะ';
  const statusMenu = document.getElementById('status-dropdown-menu');
  if (statusMenu) {
    statusMenu.querySelectorAll('.status-option').forEach(it => {
      if ((it.getAttribute('data-val') || '') === '') {
        it.classList.add('selected');
      } else {
        it.classList.remove('selected');
      }
    });
  }
  const searchEl = document.getElementById('student-search');
  if (searchEl) (searchEl as HTMLInputElement).value = '';
  updateFilterUI();
  loadStudents();
};

// เริ่มโหลด
initAdminDashboard();

// ⚡ เมื่อมีสัญญาณ Real-time จาก Socket.io ให้อัปเดต Dashboard อาจารย์รายวิชาทันที
window.addEventListener('app:data-updated', () => {
  initAdminDashboard();
});

// =========================================================================
// นำเข้ารายชื่อนิสิตจากระบบ REG (Excel / CSV)
// =========================================================================
let currentImportStudents = [];
let selectedImportFile = null;

window.openImportModal = function() {
  const modal = document.getElementById('import-modal');
  if (modal) {
    modal.style.display = 'flex';
    resetImportFile();
  }
};

window.closeImportModal = function() {
  const modal = document.getElementById('import-modal');
  if (modal) modal.style.display = 'none';
  resetImportFile();
};

window.resetImportFile = function() {
  currentImportStudents = [];
  selectedImportFile = null;
  const fileInput = document.getElementById('import-file-input');
  if (fileInput) fileInput.value = '';

  const uploadZone = document.getElementById('import-upload-zone');
  const fileWrap = document.getElementById('import-selected-file-wrap');
  const previewWrap = document.getElementById('import-preview-wrap');
  const loading = document.getElementById('import-loading');
  const btnConfirm = document.getElementById('btn-confirm-import');

  if (uploadZone) uploadZone.style.display = 'block';
  if (fileWrap) fileWrap.style.display = 'none';
  if (previewWrap) previewWrap.style.display = 'none';
  if (loading) loading.style.display = 'none';
  if (btnConfirm) btnConfirm.style.display = 'none';
};

window.handleImportDrop = function(e) {
  e.preventDefault();
  const uploadZone = document.getElementById('import-upload-zone');
  if (uploadZone) {
    uploadZone.style.borderColor = '#CBD5E1';
    uploadZone.style.background = '#FAFAFA';
  }
  if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
    processImportFile(e.dataTransfer.files[0]);
  }
};

window.handleImportFileSelect = function(e) {
  if (e.target.files && e.target.files.length > 0) {
    processImportFile(e.target.files[0]);
  }
};

async function processImportFile(file) {
  if (!file) return;

  const validExts = ['.xlsx', '.xls', '.csv'];
  const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
  if (!validExts.includes(ext)) {
    alert('กรุณาเลือกไฟล์ Excel (.xlsx, .xls) หรือ .csv เท่านั้น');
    return;
  }

  selectedImportFile = file;

  const uploadZone = document.getElementById('import-upload-zone');
  const fileWrap = document.getElementById('import-selected-file-wrap');
  const fileNameEl = document.getElementById('import-selected-file-name');
  const loading = document.getElementById('import-loading');
  const previewWrap = document.getElementById('import-preview-wrap');
  const btnConfirm = document.getElementById('btn-confirm-import');

  if (uploadZone) uploadZone.style.display = 'none';
  if (fileWrap) fileWrap.style.display = 'flex';
  if (fileNameEl) fileNameEl.textContent = `${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
  if (loading) loading.style.display = 'block';
  if (previewWrap) previewWrap.style.display = 'none';
  if (btnConfirm) btnConfirm.style.display = 'none';

  const formData = new FormData();
  formData.append('file', file);

  try {
    const res = await fetch('/api/admin/students/import-preview', {
      method: 'POST',
      body: formData
    });

    const data = await res.json();
    if (loading) loading.style.display = 'none';

    if (!data.success) {
      alert(data.message || 'ไม่สามารถอ่านไฟล์ได้');
      resetImportFile();
      return;
    }

    currentImportStudents = data.matchedStudents || [];
    
    // Render Stats
    const totalEl = document.getElementById('import-stat-total');
    const matchedEl = document.getElementById('import-stat-matched');
    const skippedEl = document.getElementById('import-stat-skipped');
    const acadYearEl = document.getElementById('import-stat-acad-year');
    const previewCountEl = document.getElementById('import-preview-count');
    const tbody = document.getElementById('import-preview-tbody');

    if (totalEl) totalEl.textContent = data.summary.totalRows || 0;
    if (matchedEl) matchedEl.textContent = data.summary.matchedCount || 0;
    if (skippedEl) skippedEl.textContent = data.summary.skippedCount || 0;
    if (acadYearEl) acadYearEl.textContent = data.summary.academicYear || '-';
    if (previewCountEl) previewCountEl.textContent = currentImportStudents.length;

    const newCountEl = document.getElementById('import-stat-new');
    const updatedCountEl = document.getElementById('import-stat-updated');
    const unchangedCountEl = document.getElementById('import-stat-unchanged');
    if (newCountEl) newCountEl.textContent = data.summary.newCount ?? currentImportStudents.length;
    if (updatedCountEl) updatedCountEl.textContent = data.summary.updateCount ?? 0;
    if (unchangedCountEl) unchangedCountEl.textContent = data.summary.unchangedCount ?? 0;

    // [REQ-03] Render Update Detection Box
    const updateBox = document.getElementById('import-update-detection-box');
    const updateListEl = document.getElementById('import-update-detection-list');
    const updatePreviewList = data.updatePreview || [];
    if (updateBox && updateListEl) {
      if (updatePreviewList.length > 0) {
        updateBox.style.display = 'block';
        updateListEl.innerHTML = updatePreviewList.slice(0, 15).map(u => `
          <div style="display:flex; justify-content:space-between; gap:8px; padding:3px 0; border-bottom:1px dashed #FDE68A;">
            <span><strong>${u.studentCode}</strong> ${u.nameTh || ''}</span>
            <span style="color:#B45309; font-weight:600;">${(u.changes || []).join(', ')}</span>
          </div>
        `).join('');
      } else {
        updateBox.style.display = 'none';
        updateListEl.innerHTML = '';
      }
    }

    // Render Preview Table Rows
    if (tbody) {
      if (currentImportStudents.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="padding:20px; text-align:center; color:#E11D48;">ไม่พบรายชื่อนิสิตสาขาวิศวกรรมซอฟต์แวร์ในไฟล์นี้ (ข้ามสาขาอื่น ${data.summary.skippedCount} คน)</td></tr>`;
      } else {
        const previewList = currentImportStudents.slice(0, 20);
        tbody.innerHTML = previewList.map(s => `
          <tr style="border-bottom:1px solid #F1F5F9;">
            <td style="padding:6px 10px; font-weight:600; color:#1E293B;">${s.studentCode}</td>
            <td style="padding:6px 10px; color:#334155;">${s.nameTh || '-'}</td>
            <td style="padding:6px 10px; color:#4338CA; font-weight:600;">${s.major || 'วิศวกรรมซอฟต์แวร์'}</td>
            <td style="padding:6px 10px; text-align:center;"><span style="background:#E0E7FF; color:#3730A3; padding:2px 8px; border-radius:9999px; font-size:11px; font-weight:600;">ปี ${s.year}</span> • ${typeof s.gpa === 'number' ? s.gpa.toFixed(2) : '-'}</td>
            <td style="padding:6px 10px; color:#059669; font-weight:600;">${(data.updatePreview || []).some(u => u.studentCode === s.studentCode) ? '<span style="color:#D97706;">🔄 อัปเดตข้อมูลเดิม</span>' : '✨ นิสิตใหม่ / คงเดิม'}</td>

          </tr>
        `).join('');
      }
    }

    if (previewWrap) previewWrap.style.display = 'block';

    if (currentImportStudents.length > 0 && btnConfirm) {
      const btnText = document.getElementById('btn-confirm-import-text');
      if (btnText) btnText.textContent = `ยืนยันนำเข้าข้อมูล (${currentImportStudents.length} คน)`;
      btnConfirm.style.display = 'inline-flex';
    }

  } catch (err) {
    console.error('Import preview error:', err);
    if (loading) loading.style.display = 'none';
    alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    resetImportFile();
  }
}

window.confirmImport = async function() {
  if (!currentImportStudents || currentImportStudents.length === 0) {
    alert('ไม่มีข้อมูลนิสิตที่ต้องนำเข้า');
    return;
  }

  const btnConfirm = document.getElementById('btn-confirm-import');
  if (btnConfirm) {
    btnConfirm.disabled = true;
    btnConfirm.style.opacity = '0.7';
    btnConfirm.innerHTML = '<span class="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span> กำลังบันทึก...';
  }

  try {
    const res = await fetch('/api/admin/students/import-confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ students: currentImportStudents })
    });

    const data = await res.json();
    if (data.success) {
      const updateSummaryMsg = data.updatedCount > 0
        ? `\n🔄 [REQ-03] อัปเดตข้อมูลนิสิตเดิม ${data.updatedCount} คน (นิสิตใหม่ ${data.newCount || 0} คน, ข้อมูลคงเดิม ${data.unchangedCount || 0} คน)`
        : '';
      alert(`✅ นำเข้ารายชื่อนิสิตสำเร็จ ${data.importedCount} คน` + updateSummaryMsg + (data.failedCount > 0 ? ` (ไม่สำเร็จ ${data.failedCount} คน)` : ''));
      closeImportModal();
      loadStudents();
      initAdminDashboard();
    } else {
      alert('เกิดข้อผิดพลาด: ' + (data.message || 'บันทึกไม่สำเร็จ'));
      if (btnConfirm) {
        btnConfirm.disabled = false;
        btnConfirm.style.opacity = '1';
        btnConfirm.innerHTML = `<span class="material-icons" style="font-size:16px;">check_circle</span> ยืนยันนำเข้าข้อมูล (${currentImportStudents.length} คน)`;
      }
    }
  } catch (err) {
    console.error('Import confirm error:', err);
    alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    if (btnConfirm) {
      btnConfirm.disabled = false;
      btnConfirm.style.opacity = '1';
      btnConfirm.innerHTML = `<span class="material-icons" style="font-size:16px;">check_circle</span> ยืนยันนำเข้าข้อมูล (${currentImportStudents.length} คน)`;
    }
  }
};


// =========================================================================
// Modal: ตั้งอาจารย์นิเทศก์ (Batch Supervisor Assignment)
// =========================================================================
window.openSetSupervisorModal = async function() {
  if (selectedStudentIds.size === 0) {
    alert('กรุณาเลือก checkbox นิสิตอย่างน้อย 1 คน');
    return;
  }

  try {
    const res = await fetch('/api/admin/staff');
    const data = await res.json();
    const select = document.getElementById('supervisor-select');
    if (select && data.success) {
      select.innerHTML = '<option value="">-- เลือกอาจารย์นิเทศก์ --</option>';
      (data.staff || [])
        .filter(st => st.isSupervisor || st.isAdvisor)
        .forEach(st => {
          select.innerHTML += `<option value="${st.id}">${st.name} (${st.department ? `สาขา${st.department}` : 'คณะ ICT'} • นิเทศ ${st.supervisedCount || 0} คน)</option>`;
        });
    }
  } catch (err) {
    console.error('Load supervisors error:', err);
  }

  const modal = document.getElementById('supervisor-modal');
  if (modal) modal.style.display = 'flex';
};

window.closeSetSupervisorModal = function() {
  const modal = document.getElementById('supervisor-modal');
  if (modal) modal.style.display = 'none';
};

window.submitBatchSupervisor = async function() {
  const supervisorId = document.getElementById('supervisor-select')?.value;
  if (!supervisorId) {
    alert('กรุณาเลือกอาจารย์นิเทศก์');
    return;
  }

  try {
    const res = await fetch('/api/admin/students/batch-supervisor', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentIds: Array.from(selectedStudentIds),
        supervisorId: parseInt(supervisorId, 10),
      }),
    });
    const data = await res.json();
    if (data.success) {
      alert(`✅ ตั้งอาจารย์นิเทศก์สำเร็จ (${data.updatedCount} คน)`);
      selectedStudentIds.clear();
      closeSetSupervisorModal();
      loadDashboardSummary();
      loadStudents();
    } else {
      alert('เกิดข้อผิดพลาด: ' + (data.message || 'ไม่สามารถบันทึกได้'));
    }
  } catch (err) {
    console.error(err);
    alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
  }
};

// =========================================================================
// Modal: จัดการสิทธิ์อาจารย์และบุคลากรคณะ (Multi-Role Staff Management)
// =========================================================================
const ICT_MAJORS_LIST = [
  'วิศวกรรมซอฟต์แวร์',
  'ธุรกิจดิจิทัล',
  'วิทยาการคอมพิวเตอร์',
  'เทคโนโลยีสารสนเทศ',
  'วิศวกรรมคอมพิวเตอร์',
  'คอมพิวเตอร์กราฟิกและมัลติมีเดีย',
  'ภูมิสารสนเทศศาสตร์',
  'วิทยาการข้อมูลและการประยุกต์',
];

interface StaffRoleRecord {
  id: number;
  userId?: number;
  name: string;
  email: string;
  department: string | null;
  isCourseAdmin: boolean;
  isAdvisor: boolean;
  isSupervisor: boolean;
  isStaff: boolean;
}

let staffRolesCache: StaffRoleRecord[] = [];

// ซิงค์ค่าจาก DOM กลับเข้าไปเก็บใน staffRolesCache ของบุคลากรแต่ละคน
(window as any).syncStaffInputToMemory = function(staffId: number) {
  const item = staffRolesCache.find(s => s.id === staffId);
  if (!item) return;

  const deptEl = document.getElementById(`staff-dept-${staffId}`) as HTMLSelectElement | null;
  if (deptEl) item.department = deptEl.value ? deptEl.value.trim() : null;

  const advEl = document.getElementById(`staff-adv-${staffId}`) as HTMLInputElement | null;
  if (advEl) item.isAdvisor = advEl.checked;

  const supEl = document.getElementById(`staff-sup-${staffId}`) as HTMLInputElement | null;
  if (supEl) item.isSupervisor = supEl.checked;

  const courseEl = document.getElementById(`staff-course-${staffId}`) as HTMLInputElement | null;
  if (courseEl) item.isCourseAdmin = courseEl.checked;

  const facEl = document.getElementById(`staff-fac-${staffId}`) as HTMLInputElement | null;
  if (facEl) item.isStaff = facEl.checked;
};

// ซิงค์ทุกแถวที่กำลังแสดงใน DOM กลับเข้าแคช เพื่อไม่ให้ข้อมูลที่ผู้ใช้ติ๊กไว้หายไปเวลาพิมพ์ค้นหาหรือกรอง
function syncCurrentDomRowsToMemory() {
  const tbody = document.getElementById('staff-roles-tbody');
  if (!tbody) return;
  const rows = tbody.querySelectorAll('tr[id^="staff-row-"]');
  rows.forEach((row) => {
    const id = parseInt(row.id.replace('staff-row-', ''), 10);
    if (!isNaN(id)) (window as any).syncStaffInputToMemory(id);
  });
}

function renderStaffRolesRows(list: StaffRoleRecord[]) {
  const tbody = document.getElementById('staff-roles-tbody');
  if (!tbody) return;

  if (list.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center py-10" style="color:#64748B;">
          <div style="display:flex; flex-direction:column; align-items:center; gap:8px;">
            <span class="material-icons" style="font-size:36px; color:#94A3B8;">search_off</span>
            <div style="font-size:14px; font-weight:600; color:#334155;">ไม่พบบุคลากรที่ตรงกับเงื่อนไขการค้นหา</div>
            <div style="font-size:12px; color:#94A3B8;">ลองเปลี่ยนคำค้นหา หรือเลือกตัวกรองสาขา/บทบาทเป็น "ทั้งหมด"</div>
            <button type="button" class="btn btn-outline btn-sm" onclick="clearStaffRolesFilters()" style="margin-top:4px; font-size:12px; border-radius:8px;">
              ล้างตัวกรองทั้งหมด
            </button>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = list.map(st => {
    const deptOptions = `<option value="">ส่วนกลางทั้งคณะ ICT (8 สาขา)</option>` +
      ICT_MAJORS_LIST.map(m => `<option value="${m}" ${st.department === m ? 'selected' : ''}>สาขา${m}</option>`).join('');

    return `
      <tr id="staff-row-${st.id}">
        <td>
          <div style="font-weight:700; color:#0F172A; font-size:13px;">${st.name}</div>
          <div style="font-size:11.5px; color:#64748B;">${st.email}</div>
        </td>
        <td>
          <select id="staff-dept-${st.id}" class="input-field" onchange="syncStaffInputToMemory(${st.id})" style="font-size:12px; padding:6px 10px !important; min-width:170px;">
            ${deptOptions}
          </select>
        </td>
        <td class="text-center">
          <input type="checkbox" id="staff-adv-${st.id}" ${st.isAdvisor ? 'checked' : ''} onchange="syncStaffInputToMemory(${st.id})" style="width:17px; height:17px; accent-color:#2563EB; cursor:pointer;" />
        </td>
        <td class="text-center">
          <input type="checkbox" id="staff-sup-${st.id}" ${st.isSupervisor ? 'checked' : ''} onchange="syncStaffInputToMemory(${st.id})" style="width:17px; height:17px; accent-color:#0284C7; cursor:pointer;" />
        </td>
        <td class="text-center">
          <input type="checkbox" id="staff-course-${st.id}" ${st.isCourseAdmin ? 'checked' : ''} onchange="syncStaffInputToMemory(${st.id})" style="width:17px; height:17px; accent-color:#7C3AED; cursor:pointer;" />
        </td>
        <td class="text-center">
          <input type="checkbox" id="staff-fac-${st.id}" ${st.isStaff ? 'checked' : ''} onchange="syncStaffInputToMemory(${st.id})" style="width:17px; height:17px; accent-color:#D97706; cursor:pointer;" />
        </td>
        <td class="text-center">
          <button type="button" class="btn btn-primary btn-sm" onclick="saveStaffRoleRow(${st.id})" style="font-size:12px; padding:5px 12px; border-radius:8px;">
            บันทึก
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

(window as any).filterStaffRolesTable = function() {
  syncCurrentDomRowsToMemory();

  const searchInput = document.getElementById('staff-search-input') as HTMLInputElement | null;
  const deptFilter = document.getElementById('staff-dept-filter') as HTMLSelectElement | null;
  const roleFilter = document.getElementById('staff-role-filter') as HTMLSelectElement | null;
  const clearBtn = document.getElementById('staff-search-clear-btn') as HTMLElement | null;
  const countEl = document.getElementById('staff-filtered-count') as HTMLElement | null;

  const q = (searchInput?.value || '').trim().toLowerCase();
  const selectedDept = deptFilter?.value || 'ALL';
  const selectedRole = roleFilter?.value || 'ALL';

  if (clearBtn) {
    clearBtn.style.display = q ? 'block' : 'none';
  }

  const filtered = staffRolesCache.filter(st => {
    // 1. Text search: Name or Email
    if (q) {
      const matchName = (st.name || '').toLowerCase().includes(q);
      const matchEmail = (st.email || '').toLowerCase().includes(q);
      if (!matchName && !matchEmail) return false;
    }

    // 2. Department filter
    if (selectedDept !== 'ALL') {
      if (selectedDept === '__FACULTY__') {
        if (st.department && st.department.trim() !== '') return false;
      } else {
        if (st.department !== selectedDept) return false;
      }
    }

    // 3. Role filter
    if (selectedRole !== 'ALL') {
      if (selectedRole === 'ADVISOR' && !st.isAdvisor) return false;
      if (selectedRole === 'SUPERVISOR' && !st.isSupervisor) return false;
      if (selectedRole === 'COURSE_ADMIN' && !st.isCourseAdmin) return false;
      if (selectedRole === 'STAFF' && !st.isStaff) return false;
      if (selectedRole === 'NONE' && (st.isAdvisor || st.isSupervisor || st.isCourseAdmin || st.isStaff)) return false;
    }

    return true;
  });

  if (countEl) {
    countEl.textContent = `แสดง ${filtered.length} จากทั้งหมด ${staffRolesCache.length} ท่าน`;
  }

  renderStaffRolesRows(filtered);
};

(window as any).clearStaffSearchInput = function() {
  const searchInput = document.getElementById('staff-search-input') as HTMLInputElement | null;
  if (searchInput) {
    searchInput.value = '';
    (window as any).filterStaffRolesTable();
    searchInput.focus();
  }
};

(window as any).clearStaffRolesFilters = function() {
  const searchInput = document.getElementById('staff-search-input') as HTMLInputElement | null;
  const deptFilter = document.getElementById('staff-dept-filter') as HTMLSelectElement | null;
  const roleFilter = document.getElementById('staff-role-filter') as HTMLSelectElement | null;

  if (searchInput) searchInput.value = '';
  if (deptFilter) deptFilter.value = 'ALL';
  if (roleFilter) roleFilter.value = 'ALL';

  (window as any).filterStaffRolesTable();
};

window.openStaffRolesModal = async function() {
  const modal = document.getElementById('staff-roles-modal');
  const tbody = document.getElementById('staff-roles-tbody');
  const countEl = document.getElementById('staff-filtered-count');
  if (!modal || !tbody) return;

  modal.style.display = 'flex';
  tbody.innerHTML = '<tr><td colspan="7" class="text-center py-6 text-gray-400">กำลังโหลดข้อมูลบุคลากร...</td></tr>';
  if (countEl) countEl.textContent = 'กำลังโหลด...';

  // Reset filters
  const searchInput = document.getElementById('staff-search-input') as HTMLInputElement | null;
  const deptFilter = document.getElementById('staff-dept-filter') as HTMLSelectElement | null;
  const roleFilter = document.getElementById('staff-role-filter') as HTMLSelectElement | null;
  const clearBtn = document.getElementById('staff-search-clear-btn') as HTMLElement | null;
  if (searchInput) searchInput.value = '';
  if (deptFilter) deptFilter.value = 'ALL';
  if (roleFilter) roleFilter.value = 'ALL';
  if (clearBtn) clearBtn.style.display = 'none';

  try {
    const res = await fetch('/api/admin/staff');
    const data = await res.json();
    if (!data.success || !Array.isArray(data.staff)) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center py-6 text-red-500">ไม่สามารถโหลดข้อมูลบุคลากรได้</td></tr>';
      if (countEl) countEl.textContent = 'เกิดข้อผิดพลาด';
      return;
    }

    if (data.staff.length === 0) {
      staffRolesCache = [];
      tbody.innerHTML = '<tr><td colspan="7" class="text-center py-6 text-gray-400">ยังไม่มีข้อมูลอาจารย์/บุคลากรในระบบ</td></tr>';
      if (countEl) countEl.textContent = '0 ท่าน';
      return;
    }

    staffRolesCache = data.staff.map((st: any) => ({
      id: Number(st.id),
      userId: st.userId,
      name: String(st.name || ''),
      email: String(st.email || ''),
      department: st.department ? String(st.department).trim() : null,
      isCourseAdmin: Boolean(st.isCourseAdmin),
      isAdvisor: Boolean(st.isAdvisor),
      isSupervisor: Boolean(st.isSupervisor),
      isStaff: Boolean(st.isStaff),
    }));

    (window as any).filterStaffRolesTable();
  } catch (err) {
    console.error('Load staff roles error:', err);
    tbody.innerHTML = '<tr><td colspan="7" class="text-center py-6 text-red-500">เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์</td></tr>';
    if (countEl) countEl.textContent = 'เกิดข้อผิดพลาด';
  }
};

window.closeStaffRolesModal = function() {
  const modal = document.getElementById('staff-roles-modal');
  if (modal) modal.style.display = 'none';
};

window.saveStaffRoleRow = async function(staffId: number) {
  (window as any).syncStaffInputToMemory(staffId);
  const cached = staffRolesCache.find(s => s.id === staffId);
  if (!cached) return;

  try {
    const res = await fetch(`/api/admin/staff/${staffId}/roles`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        department: cached.department,
        isAdvisor: cached.isAdvisor,
        isSupervisor: cached.isSupervisor,
        isCourseAdmin: cached.isCourseAdmin,
        isStaff: cached.isStaff,
      }),
    });
    const data = await res.json();
    if (data.success) {
      alert(`✅ บันทึกสิทธิ์ของ ${data.staff?.name || cached.name || 'บุคลากร'} เรียบร้อยแล้ว`);
      await populateAdvisorFilter();
    } else {
      alert('เกิดข้อผิดพลาด: ' + (data.message || 'ไม่สามารถบันทึกได้'));
    }
  } catch (err) {
    console.error('Save staff role error:', err);
    alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
  }
};

(window as any).saveAllStaffRoles = async function() {
  syncCurrentDomRowsToMemory();

  if (staffRolesCache.length === 0) {
    alert('ไม่มีข้อมูลบุคลากรให้บันทึก');
    return;
  }

  const saveBtns = document.querySelectorAll('#btn-save-all-staff, #btn-save-all-staff-footer');
  saveBtns.forEach(b => {
    (b as HTMLButtonElement).disabled = true;
    b.innerHTML = '<span class="material-icons" style="font-size:16px;">sync</span> กำลังบันทึก...';
  });

  try {
    const updates = staffRolesCache.map(st => ({
      id: st.id,
      department: st.department || null,
      isAdvisor: Boolean(st.isAdvisor),
      isSupervisor: Boolean(st.isSupervisor),
      isCourseAdmin: Boolean(st.isCourseAdmin),
      isStaff: Boolean(st.isStaff),
    }));

    const res = await fetch('/api/admin/staff/batch-roles', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ updates }),
    });

    const data = await res.json();
    if (data.success) {
      alert(`✅ ${data.message || 'บันทึกสิทธิ์บุคลากรทั้งหมดเรียบร้อยแล้ว'}`);
      await populateAdvisorFilter();
    } else {
      alert('เกิดข้อผิดพลาด: ' + (data.message || 'ไม่สามารถบันทึกข้อมูลได้'));
    }
  } catch (err) {
    console.error('Batch save staff roles error:', err);
    alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
  } finally {
    saveBtns.forEach(b => {
      (b as HTMLButtonElement).disabled = false;
      b.innerHTML = '<span class="material-icons" style="font-size:16px;">save</span> <span>บันทึกทั้งหมด</span>';
    });
  }
};

// SUPER ADMIN (พี่จอม - เจ้าหน้าที่คณะ) COMMAND CENTER — 6 WORKSPACE MODULES
// =========================================================================
let superAdminData = {
  academicConfig: {
    currentAcademicYear: '2568',
    currentSemester: '2',
    defaultDocPrefix: 'อว 7316/',
    deanSignatory: 'ผู้ช่วยศาสตราจารย์ ดร.พรเทพ โรจนวสุ',
    deanPosition: 'คณบดีคณะเทคโนโลยีสารสนเทศและการสื่อสาร',
    signatureDataUrl: '',
  },
  majorUnlockRules: [],
  trainingEvents: [],
  companyMasterData: [],
  pendingMasterCompaniesCount: 0,
  documentQueue: [],
  companyGroups: [],
  archivedApplications: [],
};

type AdminWorkspace = 'overview' | 'unlock' | 'events' | 'companies' | 'documents' | 'coop' | 'checklist';

let currentWorkspace: AdminWorkspace = 'overview';

function renderAcademicSignaturePreview(signatureDataUrl) {
  const preview = document.getElementById('cfg-signature-preview') as HTMLImageElement | null;
  const emptyLabel = document.getElementById('cfg-signature-empty');
  const uploadButton = document.getElementById('cfg-signature-upload-button');
  const changeButton = document.getElementById('cfg-signature-change-button');
  const deleteButton = document.getElementById('cfg-signature-delete-button');
  if (!preview || !emptyLabel || !uploadButton || !changeButton || !deleteButton) return;

  const hasSignature = Boolean(signatureDataUrl);
  preview.src = hasSignature ? signatureDataUrl : '';
  preview.style.display = hasSignature ? 'block' : 'none';
  emptyLabel.style.display = hasSignature ? 'none' : 'inline';
  uploadButton.style.display = hasSignature ? 'none' : 'inline-flex';
  changeButton.style.display = hasSignature ? 'inline-flex' : 'none';
  deleteButton.style.display = hasSignature ? 'inline-flex' : 'none';
}

window.switchAdminWorkspace = function(wsKey: AdminWorkspace) {
  if (currentWorkspace === 'checklist' && wsKey !== 'checklist' && typeof (window as any).hasUnsavedChecklistChanges === 'function' && (window as any).hasUnsavedChecklistChanges()) {
    if (!window.confirm('คุณมีการแก้ไขเกณฑ์ Checklist ที่ยังไม่ได้กดบันทึก\nหากเปลี่ยนหน้า การแก้ไขที่ทำค้างไว้จะถูกยกเลิก ต้องการเปลี่ยนหน้าหรือไม่?')) {
      return;
    }
    if (typeof (window as any).discardChecklistDraftChanges === 'function') {
      (window as any).discardChecklistDraftChanges(true);
    }
  }
  currentWorkspace = wsKey;
  const workspaces: AdminWorkspace[] = ['overview', 'unlock', 'events', 'companies', 'documents', 'coop', 'checklist'];
  workspaces.forEach(k => {
    const panel = document.getElementById(`workspace-${k}`);
    const tabBtn = document.getElementById(`ws-tab-${k}`);
    if (panel) {
      panel.style.display = k === wsKey ? 'block' : 'none';
    }
    if (tabBtn) {
      tabBtn.setAttribute('aria-current', k === wsKey ? 'page' : 'false');
    }
  });
  if (wsKey === 'companies') renderPendingCompaniesTable();
  if (wsKey === 'checklist') {
    if (typeof (window as any).hasUnsavedChecklistChanges === 'function' && (window as any).hasUnsavedChecklistChanges()) {
      return;
    }
    if (window.loadChecklistSettings) {
      window.loadChecklistSettings();
    }
  }
};

window.loadSuperAdminOverview = async function() {
  try {
    const res = await fetch('/api/admin/super-admin/overview');
    const data = await res.json();
    if (!data.success) return;

    superAdminData = data;

    // Update top tab badges
    const unlockedCount = (data.majorUnlockRules || []).filter(r => r.isUnlocked).length;
    const totalMajors = (data.majorUnlockRules || []).length || 8;
    const badgeUnlocked = document.getElementById('badge-unlocked-majors');
    if (badgeUnlocked) badgeUnlocked.textContent = `${unlockedCount}/${totalMajors} เปิด`;

    const badgeEvents = document.getElementById('badge-events-count');
    if (badgeEvents) badgeEvents.textContent = `${(data.trainingEvents || []).length} กิจกรรม`;

    const badgePendingComp = document.getElementById('badge-pending-companies');
    if (badgePendingComp) {
      const cnt = data.pendingMasterCompaniesCount || 0;
      badgePendingComp.textContent = `${cnt} รอยืนยัน`;
      badgePendingComp.style.background = cnt > 0 ? '#FEF3C7' : '#E2E8F0';
      badgePendingComp.style.color = cnt > 0 ? '#B45309' : '#475569';
    }

    const docQueueCount = (data.documentQueue || []).filter(
      d => d.companyName !== 'ยังไม่ยื่นบริษัท' && !d.dispatchLetterIssued
    ).length;
    const badgeDocQueue = document.getElementById('badge-doc-queue');
    if (badgeDocQueue) {
      badgeDocQueue.textContent = `${docQueueCount} คิวงาน`;
    }

    // Populate Academic Config inputs
    if (data.academicConfig) {
      const ayEl = document.getElementById('cfg-academic-year');
      const semEl = document.getElementById('cfg-semester');
      const prefEl = document.getElementById('cfg-doc-prefix');
      const deanEl = document.getElementById('cfg-dean-name');
      if (ayEl) ayEl.value = data.academicConfig.currentAcademicYear || '2568';
      if (semEl) semEl.value = data.academicConfig.currentSemester || '2';
      if (prefEl) prefEl.value = data.academicConfig.defaultDocPrefix || 'อว 7316/';
      if (deanEl) deanEl.value = data.academicConfig.deanSignatory || '';
      renderAcademicSignaturePreview(data.academicConfig.signatureDataUrl || '');
    }

    // Set default date for new event if empty
    const evtDateEl = document.getElementById('evt-date');
    if (evtDateEl && !evtDateEl.value) {
      evtDateEl.value = new Date().toISOString().slice(0, 10);
    }

    renderMajorUnlockTable();
    if (typeof window.initEventSessions === "function") window.initEventSessions();
    renderEventsDropdownAndCheckins();
    renderPendingCompaniesTable();
    renderMasterCompanyTable();
    renderCompanyGroups();
    renderDocumentQueueTable();
    renderArchiveHistoryTable();
    renderCoop01PreviewTable();
  } catch (err) {
    console.error('loadSuperAdminOverview error:', err);
  }
};

window.uploadAcademicSignature = async function(event) {
  const input = event.currentTarget as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  const isPng = file.name.toLowerCase().endsWith('.png') && file.type === 'image/png';
  const isJpeg = /\.(jpe?g)$/i.test(file.name) && file.type === 'image/jpeg';
  if (!isPng && !isJpeg) {
    alert('รองรับเฉพาะไฟล์ PNG, JPG หรือ JPEG');
    input.value = '';
    return;
  }
  if (file.size > 2 * 1024 * 1024) {
    alert('ไฟล์ลายเซ็นต้องมีขนาดไม่เกิน 2 MB');
    input.value = '';
    return;
  }

  const formData = new FormData();
  formData.append('signature', file);
  try {
    const res = await fetch('/api/admin/super-admin/academic-config/signature', {
      method: 'POST',
      body: formData,
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      alert('อัปโหลดลายเซ็นไม่สำเร็จ: ' + (data.message || 'กรุณาลองใหม่'));
      return;
    }

    superAdminData.academicConfig.signatureDataUrl = data.signatureDataUrl;
    renderAcademicSignaturePreview(data.signatureDataUrl);
    alert('อัปโหลดลายเซ็นเรียบร้อยแล้ว');
  } catch (err) {
    console.error('Failed to upload academic signature:', err);
    alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
  } finally {
    input.value = '';
  }
};

window.deleteAcademicSignature = async function(event) {
  event.stopPropagation();
  if (!window.confirm('ยืนยันลบลายเซ็นออกจากระบบหรือไม่?')) return;

  try {
    const res = await fetch('/api/admin/super-admin/academic-config/signature', { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok || !data.success) {
      alert('ลบลายเซ็นไม่สำเร็จ: ' + (data.message || 'กรุณาลองใหม่'));
      return;
    }

    superAdminData.academicConfig.signatureDataUrl = '';
    renderAcademicSignaturePreview('');
    alert('ลบลายเซ็นเรียบร้อยแล้ว');
  } catch (err) {
    console.error('Failed to delete academic signature:', err);
    alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
  }
};

// =========================================================================
// WORKSPACE 2: รอบปีการศึกษา & การปลดล็อก (Unlock) แยกตาม 8 สาขาวิชา
// =========================================================================
window.saveAcademicConfig = async function() {
  const currentAcademicYear = document.getElementById('cfg-academic-year')?.value || '2568';
  const currentSemester = document.getElementById('cfg-semester')?.value || '2';
  const defaultDocPrefix = document.getElementById('cfg-doc-prefix')?.value || 'อว 7316/';
  const deanSignatory = document.getElementById('cfg-dean-name')?.value || '';

  try {
    const res = await fetch('/api/admin/super-admin/academic-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        currentAcademicYear,
        currentSemester,
        defaultDocPrefix,
        deanSignatory,
      }),
    });
    const data = await res.json();
    if (data.success) {
      alert('✅ ' + data.message);
      await window.loadSuperAdminOverview();
    } else {
      alert('เกิดข้อผิดพลาด: ' + (data.message || 'ไม่สามารถบันทึกได้'));
    }
  } catch (err) {
    console.error(err);
    alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
  }
};

function renderMajorUnlockTable() {
  const tbody = document.getElementById('major-unlock-tbody');
  if (!tbody) return;
  const rules = superAdminData.majorUnlockRules || [];
  if (rules.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center py-6 text-gray-400">ไม่พบข้อมูลสาขาวิชา</td></tr>';
    return;
  }

  tbody.innerHTML = rules.map(r => {
    const statusBadge = r.isUnlocked
      ? `<span style="display:inline-flex; align-items:center; gap:5px; background:#DCFCE7; color:#166534; border:1px solid #86EFAC; padding:4px 10px; border-radius:999px; font-size:12px; font-weight:700;">
           <span class="material-icons" style="font-size:14px;">lock_open</span> เปิดยื่นฝึกงาน (Unlocked)
         </span>`
      : `<span style="display:inline-flex; align-items:center; gap:5px; background:#FEE2E2; color:#991B1B; border:1px solid #FCA5A5; padding:4px 10px; border-radius:999px; font-size:12px; font-weight:700;">
           <span class="material-icons" style="font-size:14px;">lock</span> ล็อกชั่วคราว (Locked)
         </span>`;

    return `
      <tr>
        <td>
          <div style="font-weight:800; color:#1E1B4B; font-size:13.5px;">สาขาวิชา${r.majorName} (${r.code})</div>
          <div style="font-size:11.5px; color:#64748B; margin-top:2px;">นิสิตในระบบ: <strong>${r.studentCount || 0}</strong> คน</div>
        </td>
        <td>
          <div style="font-size:12px; color:#334155;"><strong>เตรียมความพร้อม:</strong> ${r.prepSchedule}</div>
          <div style="font-size:11.5px; color:#4338CA; font-weight:600; margin-top:2px;"><strong>ออกฝึกงาน:</strong> ${r.internSchedule}</div>
        </td>
        <td>
          <input type="text" id="major-term-${r.code}" class="input-field" value="${r.targetTerm || '2/2568'}" style="font-size:12px; padding:5px 8px !important; width:95px; font-weight:700;" />
        </td>
        <td>
          <div style="display:flex; align-items:center; gap:4px; font-size:11.5px;">
            <input type="date" id="major-open-${r.code}" class="input-field" value="${r.openDate || ''}" style="font-size:11.5px; padding:4px 6px !important;" />
            <span>ถึง</span>
            <input type="date" id="major-close-${r.code}" class="input-field" value="${r.closeDate || ''}" style="font-size:11.5px; padding:4px 6px !important;" />
          </div>
          <input type="text" id="major-note-${r.code}" class="input-field" value="${r.note || ''}" placeholder="หมายเหตุแจ้งนิสิต..." style="font-size:11.5px; padding:4px 8px !important; margin-top:4px; width:100%;" />
        </td>
        <td>${statusBadge}</td>
        <td class="text-center">
          <div style="display:flex; flex-direction:column; gap:5px; align-items:center;">
            <button type="button" onclick="toggleMajorUnlock('${r.code}', ${!r.isUnlocked})"
              style="width:100%; border:none; padding:6px 10px; border-radius:8px; font-size:11.5px; font-weight:700; cursor:pointer; color:white; background:${r.isUnlocked ? '#EF4444' : '#10B981'};">
              ${r.isUnlocked ? '🔒 กดล็อกสาขา' : '🔓 กดปลดล็อกสาขา'}
            </button>
            <button type="button" onclick="saveMajorRuleDetails('${r.code}', ${r.isUnlocked})"
              style="width:100%; border:1px solid #CBD5E1; background:white; color:#334155; padding:4px 8px; border-radius:8px; font-size:11px; font-weight:600; cursor:pointer;">
              บันทึกรอบ/วันที่
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

window.toggleMajorUnlock = async function(code, nextUnlocked) {
  await window.saveMajorRuleDetails(code, nextUnlocked);
};

window.saveMajorRuleDetails = async function(code, isUnlocked) {
  const targetTerm = document.getElementById(`major-term-${code}`)?.value || '2/2568';
  const openDate = document.getElementById(`major-open-${code}`)?.value || '';
  const closeDate = document.getElementById(`major-close-${code}`)?.value || '';
  const note = document.getElementById(`major-note-${code}`)?.value || '';

  try {
    const res = await fetch('/api/admin/super-admin/major-unlock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, isUnlocked, targetTerm, openDate, closeDate, note }),
    });
    const data = await res.json();
    if (data.success) {
      await window.loadSuperAdminOverview();
    } else {
      alert('เกิดข้อผิดพลาด: ' + (data.message || 'ไม่สามารถอัปเดตได้'));
    }
  } catch (err) {
    console.error(err);
    alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
  }
};

window.bulkToggleMajors = async function(bulkAction) {
  try {
    const res = await fetch('/api/admin/super-admin/major-unlock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bulkAction }),
    });
    const data = await res.json();
    if (data.success) {
      alert('✅ ' + data.message);
      await window.loadSuperAdminOverview();
    }
  } catch (err) {
    console.error(err);
  }
};

// =========================================================================
// WORKSPACE 3: สร้างกิจกรรมอบรมภายใน (หลายช่วงเวลา / กรอกชั่วโมงเอง) & Check-in รหัสนิสิต (Option 1)
// =========================================================================

window.eventSessions = window.eventSessions || [];

window.initEventSessions = function() {
  if (!Array.isArray(window.eventSessions) || window.eventSessions.length === 0) {
    window.eventSessions = [
      {
        id: 'SES-1',
        title: 'ช่วงที่ 1',
        date: getTodayDateStr(),
        startTime: '09:00',
        endTime: '16:00',
        hours: 6,
      },
    ];
  }
  window.renderEventSessionsList();
  window.calculateTotalEventHours();
};

window.renderEventSessionsList = function() {
  const listEl = document.getElementById('evt-sessions-list');
  if (!listEl) return;

  if (!Array.isArray(window.eventSessions) || window.eventSessions.length === 0) {
    window.eventSessions = [
      {
        id: 'SES-1',
        title: 'ช่วงที่ 1',
        date: getTodayDateStr(),
        startTime: '09:00',
        endTime: '16:00',
        hours: 6,
      },
    ];
  }

  listEl.innerHTML = window.eventSessions.map((s: any, idx: number) => `
    <div style="background:#FFFFFF; border:1px solid #CBD5E1; border-radius:10px; padding:12px; display:flex; flex-direction:column; gap:9px; box-shadow:0 1px 2px rgba(0,0,0,0.03);">
      <!-- แถวที่ 1: ป้ายช่วงเวลา + ช่องชื่อช่วง + ปุ่มลบ -->
      <div style="display:flex; align-items:center; gap:8px;">
        <span style="font-size:11.5px; font-weight:700; background:#EEF2FF; color:#4338CA; border:1px solid #C7D2FE; padding:3px 8px; border-radius:6px; white-space:nowrap;">ช่วงที่ ${idx + 1}</span>
        <input type="text" class="input-field" value="${s.title || ''}" placeholder="ระบุชื่อช่วง เช่น วันที่ ${idx + 1} (บรรยาย)" oninput="window.updateSessionField(${idx}, 'title', this.value)" style="flex:1; padding:4px 8px; font-size:12px; height:30px; margin:0;" />
        ${window.eventSessions.length > 1 ? `
          <button type="button" onclick="window.removeEventSession(${idx})" title="ลบช่วงเวลานี้" style="background:#FEE2E2; border:1px solid #FECACA; color:#DC2626; border-radius:6px; width:30px; height:30px; display:inline-flex; align-items:center; justify-content:center; cursor:pointer; flex-shrink:0; transition:background 0.15s;" class="hover:bg-red-200">
            <span class="material-icons" style="font-size:17px;">delete</span>
          </button>
        ` : ''}
      </div>

      <!-- แถวที่ 2: วันที่จัด (เต็มแถว ไม่เบียดกับเวลา) -->
      <div>
        <label style="font-size:11.5px; font-weight:600; color:#475569; display:block; margin-bottom:2px;">
          📅 วันที่จัดกิจกรรม
        </label>
        <input type="date" class="input-field" value="${s.date}" onchange="window.updateSessionField(${idx}, 'date', this.value)" style="width:100%; box-sizing:border-box; padding:4px 8px; font-size:12px; height:32px; margin:0;" />
      </div>

      <!-- แถวที่ 3: เวลาเริ่ม และ เวลาสิ้นสุด (แบ่ง 2 คอลัมน์ชัดเจน ไม่อัดในช่องเดียว) -->
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
        <div>
          <label style="font-size:11.5px; font-weight:600; color:#475569; display:block; margin-bottom:2px;">
            ⏰ เวลาเริ่ม
          </label>
          <input type="time" class="input-field" value="${s.startTime}" onchange="window.updateSessionField(${idx}, 'startTime', this.value)" style="width:100%; box-sizing:border-box; padding:3px 6px; font-size:12px; height:32px; margin:0;" />
        </div>
        <div>
          <label style="font-size:11.5px; font-weight:600; color:#475569; display:block; margin-bottom:2px;">
            ⏰ เวลาสิ้นสุด
          </label>
          <input type="time" class="input-field" value="${s.endTime}" onchange="window.updateSessionField(${idx}, 'endTime', this.value)" style="width:100%; box-sizing:border-box; padding:3px 6px; font-size:12px; height:32px; margin:0;" />
        </div>
      </div>

      <!-- แถวที่ 4: ชั่วโมงที่ได้รับของช่วงนี้ (กรอกเอง Highlight) -->
      <div style="display:flex; justify-content:space-between; align-items:center; background:#F0FDF4; border:1px solid #BBF7D0; border-radius:8px; padding:6px 10px; margin-top:2px;">
        <span style="font-size:12px; font-weight:700; color:#166534; display:flex; align-items:center; gap:4px;">
          <span class="material-icons" style="font-size:16px; color:#16A34A;">schedule</span>
          <span>ชั่วโมงที่ได้รับช่วงนี้ (กรอกเอง):</span>
        </span>
        <div style="display:flex; align-items:center; gap:4px;">
          <input type="number" min="1" max="24" step="1" class="input-field" value="${s.hours}" oninput="window.updateSessionField(${idx}, 'hours', this.value)" style="padding:2px 6px; font-size:13px; font-weight:800; color:#15803D; height:30px; width:65px; margin:0; text-align:center; background:#FFFFFF; border:1.5px solid #86EFAC; border-radius:6px;" />
          <span style="font-size:12px; font-weight:700; color:#166534;">ชม.</span>
        </div>
      </div>
    </div>
  `).join('');
};

window.updateSessionField = function(idx: number, field: string, value: any) {
  if (window.eventSessions && window.eventSessions[idx]) {
    if (field === 'hours') {
      window.eventSessions[idx].hours = Math.max(1, Math.round(Number(value) || 1));
    } else {
      window.eventSessions[idx][field] = value;
    }
    window.calculateTotalEventHours();
  }
};

window.addEventSession = function() {
  const currentSessions = window.eventSessions || [];
  const nextIdx = currentSessions.length + 1;
  const lastSession = currentSessions.length > 0 ? currentSessions[currentSessions.length - 1] : null;
  let nextDate = getTodayDateStr();

  if (lastSession && lastSession.date) {
    const d = new Date(lastSession.date);
    d.setDate(d.getDate() + 1);
    if (!isNaN(d.getTime())) {
      nextDate = d.toISOString().slice(0, 10);
    }
  }

  currentSessions.push({
    id: `SES-${nextIdx}`,
    title: `ช่วงที่ ${nextIdx}`,
    date: nextDate,
    startTime: '09:00',
    endTime: '16:00',
    hours: 3,
  });

  window.eventSessions = currentSessions;
  window.renderEventSessionsList();
  window.calculateTotalEventHours();
};

window.removeEventSession = function(idx: number) {
  if (window.eventSessions && window.eventSessions.length > 1) {
    window.eventSessions.splice(idx, 1);
    window.renderEventSessionsList();
    window.calculateTotalEventHours();
  }
};

window.calculateTotalEventHours = function() {
  const sessions = window.eventSessions || [];
  const total = sessions.reduce((sum: number, s: any) => sum + (Number(s.hours) || 0), 0);
  const count = sessions.length;

  const badgeEl = document.getElementById('evt-total-hours-badge');
  const noteEl = document.getElementById('evt-hours-summary-note');

  if (badgeEl) badgeEl.textContent = String(total);
  if (noteEl) {
    noteEl.textContent = count > 1
      ? `รวม ${count} ช่วงเวลา (เฉลี่ยรอบละ ${Math.round((total / count) * 10) / 10} ชม. กรอกชั่วโมงแยกเองได้)`
      : `รวม 1 ช่วงเวลา (กรอกชั่วโมงแต่ละช่วงเองได้)`;
  }
};

window.previewEventHours = function() {
  window.calculateTotalEventHours();
};

// ==========================================
// Multi-Select: สาขาวิชาเป้าหมายของกิจกรรมอบรม
// ==========================================
window.toggleMajorDropdown = function() {
  const menu = document.getElementById('evt-major-dropdown-menu');
  const arrow = document.getElementById('evt-major-arrow-icon');
  if (menu) {
    const isHidden = menu.style.display === 'none' || !menu.style.display;
    menu.style.display = isHidden ? 'block' : 'none';
    if (arrow) {
      arrow.textContent = isHidden ? 'arrow_drop_up' : 'arrow_drop_down';
    }
  }
};

window.toggleSelectAllMajors = function(checked) {
  const items = document.querySelectorAll('.evt-major-item') as NodeListOf<HTMLInputElement>;
  items.forEach(cb => { cb.checked = checked; });
  window.updateSelectedMajors();
};

window.updateSelectedMajors = function() {
  const items = Array.from(document.querySelectorAll('.evt-major-item') as NodeListOf<HTMLInputElement>);
  const allCheckbox = document.getElementById('evt-major-all') as HTMLInputElement | null;
  const labelEl = document.getElementById('evt-major-selected-label');
  const countEl = document.getElementById('evt-target-major-count');
  const hiddenInput = document.getElementById('evt-target-major') as HTMLInputElement | null;

  const checkedItems = items.filter(cb => cb.checked);
  const total = items.length;

  if (allCheckbox) {
    allCheckbox.checked = checkedItems.length === total;
  }

  if (checkedItems.length === total || checkedItems.length === 0) {
    if (labelEl) labelEl.textContent = 'ทุกสาขาวิชา (ทั้งคณะ ICT)';
    if (countEl) countEl.textContent = '(เลือก 8 สาขา)';
    if (hiddenInput) hiddenInput.value = 'ALL';
  } else {
    const names = checkedItems.map(cb => cb.value);
    const shortNames = checkedItems.map(cb => {
      const v = cb.value;
      if (v === 'วิศวกรรมซอฟต์แวร์') return 'SE';
      if (v === 'วิทยาการคอมพิวเตอร์') return 'CS';
      if (v === 'วิศวกรรมคอมพิวเตอร์') return 'CPE';
      if (v === 'เทคโนโลยีสารสนเทศ') return 'IT';
      if (v === 'ธุรกิจดิจิทัล') return 'DB';
      if (v === 'คอมพิวเตอร์กราฟิกและมัลติมีเดีย') return 'CGM';
      if (v === 'ภูมิสารสนเทศศาสตร์') return 'GIS';
      if (v === 'วิทยาการข้อมูลและการประยุกต์') return 'DSA';
      return v;
    });

    if (labelEl) labelEl.textContent = shortNames.join(', ');
    if (countEl) countEl.textContent = `(เลือก ${checkedItems.length} สาขา)`;
    if (hiddenInput) hiddenInput.value = names.join(', ');
  }
};

// ==========================================
// Multi-Select: ชั้นปีเป้าหมายของกิจกรรมอบรม
// ==========================================
window.toggleYearDropdown = function() {
  const menu = document.getElementById('evt-year-dropdown-menu');
  const arrow = document.getElementById('evt-year-arrow-icon');
  if (menu) {
    const isHidden = menu.style.display === 'none' || !menu.style.display;
    menu.style.display = isHidden ? 'block' : 'none';
    if (arrow) {
      arrow.textContent = isHidden ? 'arrow_drop_up' : 'arrow_drop_down';
    }
  }
};

window.toggleSelectAllYears = function(checked) {
  const items = document.querySelectorAll('.evt-year-item') as NodeListOf<HTMLInputElement>;
  items.forEach(cb => { cb.checked = checked; });
  window.updateSelectedYears();
};

window.updateSelectedYears = function() {
  const items = Array.from(document.querySelectorAll('.evt-year-item') as NodeListOf<HTMLInputElement>);
  const allCheckbox = document.getElementById('evt-year-all') as HTMLInputElement | null;
  const labelEl = document.getElementById('evt-year-selected-label');
  const countEl = document.getElementById('evt-target-year-count');
  const hiddenInput = document.getElementById('evt-target-year') as HTMLInputElement | null;

  const checkedItems = items.filter(cb => cb.checked);
  const total = items.length;

  if (allCheckbox) {
    allCheckbox.checked = checkedItems.length === total;
  }

  if (checkedItems.length === total || checkedItems.length === 0) {
    if (labelEl) labelEl.textContent = 'ทุกชั้นปี (ทุกรหัสนิสิต)';
    if (countEl) countEl.textContent = '(เลือกทุกชั้นปี)';
    if (hiddenInput) hiddenInput.value = 'ALL';
  } else {
    const years = checkedItems.map(cb => cb.value);
    const yearLabels = checkedItems.map(cb => `ปี ${cb.value}`);

    if (labelEl) labelEl.textContent = yearLabels.join(', ');
    if (countEl) countEl.textContent = `(เลือก ${checkedItems.length} ชั้นปี)`;
    if (hiddenInput) hiddenInput.value = years.join(', ');
  }
};

// ปิด dropdown เมื่อคลิกภายนอก
document.addEventListener('click', (e) => {
  const statusContainer = document.getElementById('status-dropdown-container');
  const statusMenu = document.getElementById('status-dropdown-menu');
  const statusArrow = document.getElementById('status-arrow-icon');
  if (statusContainer && statusMenu && statusMenu.style.display !== 'none' && !statusContainer.contains(e.target as Node)) {
    statusMenu.style.display = 'none';
    if (statusArrow) statusArrow.textContent = 'keyboard_arrow_down';
  }

  const majorContainer = document.getElementById('evt-major-dropdown-container');
  const majorMenu = document.getElementById('evt-major-dropdown-menu');
  const majorArrow = document.getElementById('evt-major-arrow-icon');
  if (majorContainer && majorMenu && majorMenu.style.display !== 'none' && !majorContainer.contains(e.target as Node)) {
    majorMenu.style.display = 'none';
    if (majorArrow) majorArrow.textContent = 'arrow_drop_down';
  }

  const yearContainer = document.getElementById('evt-year-dropdown-container');
  const yearMenu = document.getElementById('evt-year-dropdown-menu');
  const yearArrow = document.getElementById('evt-year-arrow-icon');
  if (yearContainer && yearMenu && yearMenu.style.display !== 'none' && !yearContainer.contains(e.target as Node)) {
    yearMenu.style.display = 'none';
    if (yearArrow) yearArrow.textContent = 'arrow_drop_down';
  }
});

window.createTrainingEvent = async function() {
  const title = document.getElementById('evt-title')?.value?.trim();
  const skillType = document.getElementById('evt-skill-type')?.value || 'SOFT';
  const targetMajor = document.getElementById('evt-target-major')?.value || 'ALL';
  const targetYear = document.getElementById('evt-target-year')?.value || 'ALL';
  const location = document.getElementById('evt-location')?.value || '';

  if (!title) {
    alert('กรุณากรอกชื่อกิจกรรมอบรม');
    return;
  }

  const sessions = (window.eventSessions || []).map((s: any, idx: number) => ({
    id: s.id || `SES-${idx + 1}`,
    title: s.title && String(s.title).trim() ? String(s.title).trim() : `ช่วงที่ ${idx + 1}`,
    date: s.date || getTodayDateStr(),
    startTime: s.startTime || '09:00',
    endTime: s.endTime || '16:00',
    hours: Math.max(1, Math.round(Number(s.hours) || 1)),
  }));

  try {
    const res = await fetch('/api/admin/super-admin/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        skillType,
        sessions,
        targetMajor,
        targetYear,
        location,
      }),
    });
    const data = await res.json();
    if (data.success) {
      alert('✅ ' + data.message);
      const titleEl = document.getElementById('evt-title');
      if (titleEl) titleEl.value = '';
      window.eventSessions = [];
      window.initEventSessions();
      if (typeof window.resetEventFilters === 'function') {
        window.resetEventFilters();
      }
      await window.loadSuperAdminOverview();
      const selectEl = document.getElementById('checkin-event-select');
      if (selectEl && data.event?.id) {
        selectEl.value = data.event.id;
        window.renderSelectedEventCheckins();
      }
    } else {
      alert('เกิดข้อผิดพลาด: ' + (data.message || 'ไม่สามารถสร้างกิจกรรมได้'));
    }
  } catch (err) {
    console.error(err);
    alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
  }
};

function getTodayDateStr(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getThisMonthStr(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

window.handleEventDatePresetChange = function() {
  const presetEl = document.getElementById('filter-event-date-preset') as HTMLSelectElement | null;
  const customDateEl = document.getElementById('filter-event-custom-date') as HTMLInputElement | null;
  if (!presetEl || !customDateEl) return;

  if (presetEl.value === 'CUSTOM') {
    customDateEl.style.display = 'inline-block';
    if (!customDateEl.value) {
      customDateEl.value = getTodayDateStr();
    }
  } else {
    customDateEl.style.display = 'none';
  }
  window.applyEventFilters();
};

window.resetEventFilters = function() {
  const keywordEl = document.getElementById('filter-event-keyword') as HTMLInputElement | null;
  const majorEl = document.getElementById('filter-event-major') as HTMLSelectElement | null;
  const yearEl = document.getElementById('filter-event-year') as HTMLSelectElement | null;
  const presetEl = document.getElementById('filter-event-date-preset') as HTMLSelectElement | null;
  const customDateEl = document.getElementById('filter-event-custom-date') as HTMLInputElement | null;

  if (keywordEl) keywordEl.value = '';
  if (majorEl) majorEl.value = 'ALL';
  if (yearEl) yearEl.value = 'ALL';
  if (presetEl) presetEl.value = 'ALL';
  if (customDateEl) {
    customDateEl.value = '';
    customDateEl.style.display = 'none';
  }
  window.applyEventFilters();
};

window.applyEventFilters = function() {
  const selectEl = document.getElementById('checkin-event-select') as HTMLSelectElement | null;
  const countBadge = document.getElementById('filter-event-count-badge');
  const keywordEl = document.getElementById('filter-event-keyword') as HTMLInputElement | null;
  const majorEl = document.getElementById('filter-event-major') as HTMLSelectElement | null;
  const yearEl = document.getElementById('filter-event-year') as HTMLSelectElement | null;
  const presetEl = document.getElementById('filter-event-date-preset') as HTMLSelectElement | null;
  const customDateEl = document.getElementById('filter-event-custom-date') as HTMLInputElement | null;

  if (!selectEl) return;

  const currentVal = selectEl.value;
  const events = superAdminData.trainingEvents || [];
  if (events.length === 0) {
    selectEl.innerHTML = '<option value="">-- ยังไม่มีกิจกรรมอบรม กรุณาสร้างกิจกรรมทางด้านซ้าย --</option>';
    if (countBadge) countBadge.textContent = '';
    window.renderSelectedEventCheckins();
    return;
  }

  const keyword = (keywordEl?.value || '').trim().toLowerCase();
  const selectedMajor = majorEl?.value || 'ALL';
  const selectedYear = yearEl?.value || 'ALL';
  const datePreset = presetEl?.value || 'ALL';
  const customDate = customDateEl?.value || '';

  const todayStr = getTodayDateStr();
  const thisMonthStr = getThisMonthStr();

  const filtered = events.filter((e: any) => {
    // 1. ค้นหาชื่อกิจกรรม
    if (keyword && !e.title.toLowerCase().includes(keyword)) {
      return false;
    }
    // 2. กรองสาขาวิชาเป้าหมาย
    if (selectedMajor !== 'ALL') {
      const tm = e.targetMajor || 'ALL';
      if (tm !== 'ALL' && !tm.includes(selectedMajor)) {
        return false;
      }
    }
    // 2.1 กรองชั้นปีเป้าหมาย
    if (selectedYear !== 'ALL') {
      const ty = e.targetYear || 'ALL';
      if (ty !== 'ALL' && !ty.includes(selectedYear)) {
        return false;
      }
    }
    // 3. กรองวันที่จัดกิจกรรม
    if (datePreset === 'TODAY') {
      if (e.eventDate !== todayStr && !e.eventDate?.includes(todayStr)) return false;
    } else if (datePreset === 'THIS_MONTH') {
      if (!e.eventDate || !e.eventDate.includes(thisMonthStr)) return false;
    } else if (datePreset === 'CUSTOM' && customDate) {
      if (!e.eventDate || !e.eventDate.includes(customDate)) return false;
    }
    return true;
  });

  if (countBadge) {
    countBadge.textContent = filtered.length === events.length
      ? `(ทั้งหมด ${events.length} กิจกรรม)`
      : `(พบ ${filtered.length}/${events.length} กิจกรรม)`;
  }

  if (filtered.length === 0) {
    selectEl.innerHTML = '<option value="">-- ไม่พบกิจกรรมที่ตรงกับตัวกรองค้นหา --</option>';
    selectEl.value = '';
    window.renderSelectedEventCheckins();
    return;
  }

  selectEl.innerHTML = filtered.map((e: any) => `
    <option value="${e.id}">
      [${e.skillType} Skill +${e.creditedHours} ชม.] ${e.title} (${e.eventDate} • Check-in แล้ว ${(e.checkIns || []).length} คน)
    </option>
  `).join('');

  if (currentVal && filtered.some((e: any) => e.id === currentVal)) {
    selectEl.value = currentVal;
  } else {
    selectEl.value = filtered[0].id;
  }

  window.renderSelectedEventCheckins();
};

function renderEventsDropdownAndCheckins() {
  window.applyEventFilters();
}

window.handleCheckInSessionChange = function() {
  const selectEl = document.getElementById('checkin-event-select') as HTMLSelectElement | null;
  const sessionSelectEl = document.getElementById('checkin-session-select') as HTMLSelectElement | null;
  const badgeEl = document.getElementById('checkin-session-hours-badge');
  const hintEl = document.getElementById('checkin-session-hint');

  if (!selectEl || !sessionSelectEl) return;
  const event = (superAdminData.trainingEvents || []).find((e: any) => e.id === selectEl.value);
  if (!event) return;

  const val = sessionSelectEl.value;
  if (val === 'ALL') {
    if (badgeEl) badgeEl.textContent = `+${event.creditedHours} ชม. (ทุกช่วง)`;
    if (hintEl) hintEl.textContent = `* บันทึก Check-in ทั้งกิจกรรม ได้รับชั่วโมงรวม ${event.creditedHours} ชม.`;
  } else {
    const ses = (event.sessions || []).find((s: any) => s.id === val);
    if (ses) {
      if (badgeEl) badgeEl.textContent = `+${ses.hours} ชม.`;
      if (hintEl) hintEl.textContent = `* บันทึก Check-in สำหรับ "${ses.title}" วันที่ ${ses.date} ได้รับ +${ses.hours} ชม.`;
    }
  }
};

window.renderSelectedEventCheckins = function() {
  const selectEl = document.getElementById('checkin-event-select') as HTMLSelectElement | null;
  const metaEl = document.getElementById('checkin-selected-event-meta');
  const countEl = document.getElementById('checkin-list-count');
  const tbody = document.getElementById('checkin-history-tbody');
  const filterMajorEl = document.getElementById('checkin-filter-major') as HTMLSelectElement | null;
  const filterYearEl = document.getElementById('checkin-filter-year') as HTMLSelectElement | null;
  const filterSessionEl = document.getElementById('checkin-filter-session') as HTMLSelectElement | null;
  const sessionSelectEl = document.getElementById('checkin-session-select') as HTMLSelectElement | null;
  const btnDeleteAll = document.getElementById('btn-delete-all-checkin') as HTMLButtonElement | null;
  const btnDeleteAllText = document.getElementById('btn-delete-all-text');

  if (!selectEl || !tbody) return;

  const eventId = selectEl.value;
  const event = (superAdminData.trainingEvents || []).find((e: any) => e.id === eventId);
  if (!event) {
    if (metaEl) metaEl.textContent = '';
    if (countEl) countEl.textContent = '0';
    if (btnDeleteAll) btnDeleteAll.style.display = 'none';
    tbody.innerHTML = '<tr><td colspan="7" class="text-center py-6 text-gray-400">กรุณาเลือกกิจกรรมอบรม</td></tr>';
    return;
  }

  // Ensure sessions exist
  if (!event.sessions || event.sessions.length === 0) {
    event.sessions = [
      {
        id: 'SES-1',
        title: 'ทั้งกิจกรรม',
        date: event.eventDate,
        startTime: event.startTime,
        endTime: event.endTime,
        hours: event.creditedHours,
      },
    ];
  }

  // Update checkin session select dropdown
  if (sessionSelectEl) {
    const curVal = sessionSelectEl.value;
    if (event.sessions.length > 1) {
      sessionSelectEl.innerHTML = `
        <option value="ALL">🌟 เช็คอินทั้งกิจกรรม (ทุกช่วงพร้อมกัน) [+${event.creditedHours} ชม.]</option>
        ${event.sessions.map((s: any, idx: number) => `
          <option value="${s.id}">ช่วงที่ ${idx + 1}: ${s.title || ''} (${s.date}) [+${s.hours} ชม.]</option>
        `).join('')}
      `;
    } else {
      sessionSelectEl.innerHTML = `
        <option value="${event.sessions[0].id}">${event.sessions[0].title || 'ช่วงที่ 1'} (${event.sessions[0].date}) [+${event.sessions[0].hours} ชม.]</option>
        <option value="ALL">🌟 เช็คอินทั้งกิจกรรม [+${event.creditedHours} ชม.]</option>
      `;
    }
    if (curVal && (curVal === 'ALL' || event.sessions.some((s: any) => s.id === curVal))) {
      sessionSelectEl.value = curVal;
    } else {
      sessionSelectEl.value = event.sessions.length > 1 ? event.sessions[0].id : 'ALL';
    }
    window.handleCheckInSessionChange();
  }

  // Update filter session dropdown
  if (filterSessionEl) {
    const curFilterVal = filterSessionEl.value || 'ALL';
    filterSessionEl.innerHTML = `
      <option value="ALL">ทุกช่วง (ทั้งหมด)</option>
      ${event.sessions.map((s: any) => `
        <option value="${s.id}">${s.title || s.id} (${s.date})</option>
      `).join('')}
    `;
    if (event.sessions.some((s: any) => s.id === curFilterVal)) {
      filterSessionEl.value = curFilterVal;
    } else {
      filterSessionEl.value = 'ALL';
    }
  }

  // แสดง Metadata กิจกรรม พร้อมสาขา ชั้นปี และช่วงเวลา
  if (metaEl) {
    const targetMajorLabel = event.targetMajor === 'ALL' || !event.targetMajor
      ? 'ทุกสาขาวิชา (ทั้งคณะ ICT)'
      : event.targetMajor;

    const targetYearLabel = event.targetYear === 'ALL' || !event.targetYear
      ? 'ทุกชั้นปี'
      : event.targetYear.split(',').map((y: string) => `ปี ${y.trim()}`).join(', ');

    const sessionsBadgeList = event.sessions.length > 1
      ? `<span style="background:#EEF2FF; color:#4338CA; padding:2px 8px; border-radius:999px; font-weight:700; font-size:11.5px;">🗓️ มี ${event.sessions.length} ช่วงเวลา</span>`
      : '';

    metaEl.innerHTML = `
      <span style="display:inline-flex; align-items:center; gap:6px; flex-wrap:wrap;">
        <span style="background:#DBEAFE; color:#1E40AF; padding:2px 8px; border-radius:999px; font-weight:700;">${event.skillType} SKILL (+${event.creditedHours} ชม.)</span>
        ${sessionsBadgeList}
        <span>📅 ${event.eventDate} (${event.startTime} - ${event.endTime} น.)</span>
        <span>📍 ${event.location}</span>
        <span style="background:#FEF3C7; color:#92400E; padding:2px 8px; border-radius:999px; font-weight:600; font-size:11.5px;">🎯 สาขาเป้าหมาย: ${targetMajorLabel}</span>
        <span style="background:#EDE9FE; color:#5B21B6; padding:2px 8px; border-radius:999px; font-weight:600; font-size:11.5px;">🎓 ชั้นปีเป้าหมาย: ${targetYearLabel}</span>
      </span>
    `;
  }

  const allCheckIns = event.checkIns || [];

  // 1. อัปเดตตัวเลือกสาขาวิชาใน Dropdown กรอง
  if (filterMajorEl) {
    const currentFilterVal = filterMajorEl.value || 'ALL';
    const uniqueMajors = Array.from(new Set(allCheckIns.map((c: any) => c.major).filter(Boolean)));
    uniqueMajors.sort();

    filterMajorEl.innerHTML = '<option value="ALL">ทุกสาขาวิชา (ทั้งหมด)</option>' +
      uniqueMajors.map((m: any) => `<option value="${m}">${m}</option>`).join('');

    if (uniqueMajors.includes(currentFilterVal)) {
      filterMajorEl.value = currentFilterVal;
    } else {
      filterMajorEl.value = 'ALL';
    }
  }

  // 2. อัปเดตตัวเลือกชั้นปีใน Dropdown กรอง
  if (filterYearEl) {
    const currentYearVal = filterYearEl.value || 'ALL';
    const uniqueYears = Array.from(new Set(
      allCheckIns
        .map((c: any) => c.studentCode && c.studentCode.length >= 2 ? c.studentCode.substring(0, 2) : '')
        .filter(Boolean)
    )).sort((a: any, b: any) => Number(b) - Number(a));

    if (uniqueYears.length === 1) {
      filterYearEl.innerHTML = `<option value="${uniqueYears[0]}">ปี ${uniqueYears[0]}</option>`;
      filterYearEl.value = uniqueYears[0];
    } else if (uniqueYears.length > 1) {
      filterYearEl.innerHTML = '<option value="ALL">ทุกชั้นปี (ทั้งหมด)</option>' +
        uniqueYears.map((y: any) => `<option value="${y}">ปี ${y}</option>`).join('');

      if (uniqueYears.includes(currentYearVal)) {
        filterYearEl.value = currentYearVal;
      } else {
        filterYearEl.value = 'ALL';
      }
    } else {
      filterYearEl.innerHTML = '<option value="ALL">ทุกชั้นปี (ทั้งหมด)</option>';
      filterYearEl.value = 'ALL';
    }
  }

  const selectedMajor = filterMajorEl ? filterMajorEl.value : 'ALL';
  const selectedYear = filterYearEl ? filterYearEl.value : 'ALL';
  const selectedSession = filterSessionEl ? filterSessionEl.value : 'ALL';

  const isMajorFiltered = selectedMajor && selectedMajor !== 'ALL';
  const isYearFiltered = selectedYear && selectedYear !== 'ALL';
  const isSessionFiltered = selectedSession && selectedSession !== 'ALL';
  const isFiltered = isMajorFiltered || isYearFiltered || isSessionFiltered;

  const filteredCheckIns = allCheckIns.filter((c: any) => {
    if (isMajorFiltered && c.major !== selectedMajor) {
      return false;
    }
    if (isYearFiltered) {
      const y = c.studentCode ? c.studentCode.substring(0, 2) : '';
      if (y !== selectedYear) return false;
    }
    if (isSessionFiltered) {
      if (c.sessionId !== selectedSession && c.sessionId !== 'ALL') {
        return false;
      }
    }
    return true;
  });

  // อัปเดตตัวเลขนับจำนวนคน
  if (countEl) {
    if (!isFiltered) {
      countEl.textContent = String(allCheckIns.length);
    } else {
      countEl.textContent = `${filteredCheckIns.length} จาก ${allCheckIns.length}`;
    }
  }

  // อัปเดตปุ่ม "ลบทั้งหมด" / "ลบเฉพาะที่กรอง"
  if (btnDeleteAll) {
    if (filteredCheckIns.length === 0) {
      btnDeleteAll.style.display = 'none';
    } else {
      btnDeleteAll.style.display = 'inline-flex';
      if (btnDeleteAllText) {
        if (!isFiltered) {
          btnDeleteAllText.textContent = `ลบทั้งหมด (${allCheckIns.length})`;
          btnDeleteAll.title = `ลบนิสิตทั้งหมดในกิจกรรม (${allCheckIns.length} คน)`;
        } else {
          const descList: string[] = [];
          if (isSessionFiltered) descList.push(`ช่วง ${selectedSession}`);
          if (isMajorFiltered) descList.push(selectedMajor);
          if (isYearFiltered) descList.push(`ปี ${selectedYear}`);
          btnDeleteAllText.textContent = `ลบเฉพาะ ${descList.join(' ')} (${filteredCheckIns.length})`;
          btnDeleteAll.title = `ลบเฉพาะนิสิต ${descList.join(' ')} (${filteredCheckIns.length} คน)`;
        }
      }
    }
  }

  if (allCheckIns.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center py-6 text-gray-400">ยังไม่มีรายชื่อนิสิตที่ Check-in ในกิจกรรมนี้ — สามารถกรอกหรือวางรหัสนิสิตด้านบนเพื่อบันทึกได้ทันที</td></tr>';
    return;
  }

  if (filteredCheckIns.length === 0) {
    const emptyDesc: string[] = [];
    if (isSessionFiltered) emptyDesc.push(`ช่วง "${selectedSession}"`);
    if (isMajorFiltered) emptyDesc.push(`สาขา "${selectedMajor}"`);
    if (isYearFiltered) emptyDesc.push(`ชั้นปี "${selectedYear}"`);
    tbody.innerHTML = `<tr><td colspan="7" class="text-center py-6 text-gray-400">ไม่พบนิสิต ${emptyDesc.join(' และ ')} ในรายการ Check-in กิจกรรมนี้</td></tr>`;
    return;
  }

  tbody.innerHTML = filteredCheckIns.map((c: any) => {
    const sessionLabel = c.sessionTitle || (c.sessionId && c.sessionId !== 'ALL' ? `ช่วง ${c.sessionId}` : 'ทั้งกิจกรรม');
    const hoursEarned = c.creditedHours || event.creditedHours;
    return `
      <tr>
        <td style="font-weight:700; color:#1E1B4B;">${c.studentCode}</td>
        <td>${c.nameTh}</td>
        <td><span style="font-weight:600; color:#334155;">${c.major}</span></td>
        <td>
          <span style="background:#EDE9FE; color:#5B21B6; padding:2px 8px; border-radius:6px; font-size:11.5px; font-weight:700; display:inline-block; max-width:180px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${sessionLabel}">
            ${sessionLabel}
          </span>
        </td>
        <td class="text-center">
          <span style="background:#DCFCE7; color:#166534; padding:2px 9px; border-radius:999px; font-size:11.5px; font-weight:700;">
            +${hoursEarned} ชม. (${event.skillType})
          </span>
        </td>
        <td style="font-size:11.5px; color:#64748B;">${new Date(c.checkedInAt).toLocaleString('th-TH')}</td>
        <td class="text-center">
          <button type="button" 
            title="ยกเลิก Check-in และหักชั่วโมงคืน" 
            onclick="window.deleteEventCheckIn('${event.id}', '${c.studentCode}', '${c.nameTh}', ${c.trainingRecordId || 'null'}, '${c.sessionId || ''}')" 
            style="background:#FEE2E2; border:1px solid #FECACA; color:#DC2626; border-radius:8px; padding:5px 8px; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; transition:background 0.15s ease;">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              <line x1="10" y1="11" x2="10" y2="17"></line>
              <line x1="14" y1="11" x2="14" y2="17"></line>
            </svg>
          </button>
        </td>
      </tr>
    `;
  }).join('');
};

window.filterCheckInList = function() {
  window.renderSelectedEventCheckins();
};
window.filterCheckInListByMajor = window.filterCheckInList;

window.submitEventCheckIn = async function() {
  const selectEl = document.getElementById('checkin-event-select') as HTMLSelectElement | null;
  const sessionSelectEl = document.getElementById('checkin-session-select') as HTMLSelectElement | null;
  const codesEl = document.getElementById('checkin-student-codes') as HTMLTextAreaElement | null;
  const bannerEl = document.getElementById('checkin-result-banner');

  const eventId = selectEl?.value;
  const sessionId = sessionSelectEl?.value || 'ALL';
  const studentCodesInput = codesEl?.value?.trim();

  if (!eventId) {
    alert('กรุณาเลือกกิจกรรมอบรมก่อน');
    return;
  }
  if (!studentCodesInput) {
    alert('กรุณากรอกหรือวางรหัสนิสิตอย่างน้อย 1 รหัส');
    return;
  }

  try {
    const res = await fetch(`/api/admin/super-admin/events/${encodeURIComponent(eventId)}/checkin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentCodesInput, sessionId }),
    });
    const data = await res.json();
    if (data.success) {
      if (codesEl) codesEl.value = '';
      if (bannerEl) {
        bannerEl.style.display = 'block';
        bannerEl.style.background = '#DCFCE7';
        bannerEl.style.border = '1px solid #86EFAC';
        bannerEl.style.color = '#166534';
        let extra = '';
        if (data.duplicateCount > 0) extra += ` (ซ้ำในรอบนี้ ${data.duplicateCount} คน)`;
        if (data.notFoundCodes && data.notFoundCodes.length > 0) {
          extra += ` | ⚠️ ไม่พบรหัสนิสิตในฐานข้อมูล: ${data.notFoundCodes.join(', ')}`;
        }
        bannerEl.textContent = `✅ ${data.message}${extra}`;
      }
      await window.loadSuperAdminOverview();
      await loadDashboardSummary();
      await loadStudents();
      if (selectEl) {
        selectEl.value = eventId;
        window.renderSelectedEventCheckins();
      }
    } else {
      alert('เกิดข้อผิดพลาด: ' + (data.message || 'บันทึก Check-in ไม่สำเร็จ'));
    }
  } catch (err) {
    console.error(err);
    alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
  }
};

// =========================================================================
// [SCRUM-63] นำเข้ารายชื่อนิสิตเข้าร่วมกิจกรรมอบรมจากไฟล์ Excel / CSV (Preview & Confirm)
// =========================================================================
let currentCheckInImportReadyCodes: string[] = [];
let currentCheckInImportEventId = '';
let currentCheckInImportSessionId = 'ALL';

window.openCheckInImportModal = function() {
  const selectEl = document.getElementById('checkin-event-select') as HTMLSelectElement | null;
  const sessionSelectEl = document.getElementById('checkin-session-select') as HTMLSelectElement | null;
  const eventId = selectEl?.value;
  if (!eventId) {
    alert('กรุณาเลือกกิจกรรมอบรมที่ต้องการนำเข้ารายชื่อก่อน');
    return;
  }

  const events = (typeof superAdminData !== 'undefined' && superAdminData?.trainingEvents) ? superAdminData.trainingEvents : [];
  const event = events.find((e: any) => e.id === eventId);

  currentCheckInImportEventId = eventId;
  currentCheckInImportSessionId = sessionSelectEl?.value || 'ALL';

  const eventTitleEl = document.getElementById('checkin-import-event-title');
  const sessionTitleEl = document.getElementById('checkin-import-session-title');
  if (eventTitleEl) {
    eventTitleEl.textContent = event
      ? `[${event.skillType} Skill] ${event.title}`
      : (selectEl?.options[selectEl.selectedIndex]?.text || eventId);
  }
  if (sessionTitleEl) {
    const selectedSessionText =
      sessionSelectEl?.options[sessionSelectEl.selectedIndex]?.text ||
      (event ? `ทั้งกิจกรรม (+${event.creditedHours} ชม.)` : 'ทั้งกิจกรรม');
    sessionTitleEl.textContent = selectedSessionText;
  }

  const modal = document.getElementById('checkin-import-modal');
  if (modal) {
    modal.style.display = 'flex';
    window.resetCheckInImportFile();
  }
};

window.closeCheckInImportModal = function() {
  const modal = document.getElementById('checkin-import-modal');
  if (modal) modal.style.display = 'none';
  window.resetCheckInImportFile();
};

window.resetCheckInImportFile = function() {
  currentCheckInImportReadyCodes = [];
  const fileInput = document.getElementById('checkin-import-file-input') as HTMLInputElement | null;
  if (fileInput) fileInput.value = '';

  const uploadZone = document.getElementById('checkin-import-upload-zone');
  const fileWrap = document.getElementById('checkin-import-selected-file-wrap');
  const previewWrap = document.getElementById('checkin-import-preview-wrap');
  const loading = document.getElementById('checkin-import-loading');
  const btnConfirm = document.getElementById('btn-confirm-checkin-import');

  if (uploadZone) uploadZone.style.display = 'block';
  if (fileWrap) fileWrap.style.display = 'none';
  if (previewWrap) previewWrap.style.display = 'none';
  if (loading) loading.style.display = 'none';
  if (btnConfirm) btnConfirm.style.display = 'none';
};

window.handleCheckInImportDrop = function(e: DragEvent) {
  e.preventDefault();
  const uploadZone = document.getElementById('checkin-import-upload-zone');
  if (uploadZone) {
    uploadZone.style.borderColor = '#CBD5E1';
    uploadZone.style.background = '#F8FAFC';
  }
  if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
    processCheckInImportFile(e.dataTransfer.files[0]);
  }
};

window.handleCheckInImportFileSelect = function(e: any) {
  if (e.target.files && e.target.files.length > 0) {
    processCheckInImportFile(e.target.files[0]);
  }
};

async function processCheckInImportFile(file: File) {
  if (!file) return;

  const validExts = ['.xlsx', '.xls', '.csv'];
  const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
  if (!validExts.includes(ext)) {
    alert('กรุณาเลือกไฟล์ Excel (.xlsx, .xls) หรือ .csv เท่านั้น');
    return;
  }

  const uploadZone = document.getElementById('checkin-import-upload-zone');
  const fileWrap = document.getElementById('checkin-import-selected-file-wrap');
  const fileNameEl = document.getElementById('checkin-import-selected-file-name');
  const loading = document.getElementById('checkin-import-loading');
  const previewWrap = document.getElementById('checkin-import-preview-wrap');
  const btnConfirm = document.getElementById('btn-confirm-checkin-import');

  if (uploadZone) uploadZone.style.display = 'none';
  if (fileWrap) fileWrap.style.display = 'flex';
  if (fileNameEl) fileNameEl.textContent = `${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
  if (loading) loading.style.display = 'block';
  if (previewWrap) previewWrap.style.display = 'none';
  if (btnConfirm) btnConfirm.style.display = 'none';

  const formData = new FormData();
  formData.append('file', file);
  formData.append('sessionId', currentCheckInImportSessionId);

  try {
    const res = await fetch(
      `/api/admin/super-admin/events/${encodeURIComponent(currentCheckInImportEventId)}/checkin-import-preview`,
      {
        method: 'POST',
        body: formData,
      }
    );
    const data = await res.json();
    if (loading) loading.style.display = 'none';

    if (!data.success) {
      alert(data.message || 'ไม่สามารถอ่านไฟล์ได้');
      window.resetCheckInImportFile();
      return;
    }

    currentCheckInImportReadyCodes = data.readyCodes || [];
    const items = data.items || [];
    const summary = data.summary || {};
    const creditedHours = data.eventInfo?.creditedHours ?? 0;

    const totalEl = document.getElementById('checkin-import-stat-total');
    const readyEl = document.getElementById('checkin-import-stat-ready');
    const dupEl = document.getElementById('checkin-import-stat-duplicate');
    const notFoundEl = document.getElementById('checkin-import-stat-notfound');
    const previewCountEl = document.getElementById('checkin-import-preview-count');
    const tbody = document.getElementById('checkin-import-preview-tbody');

    if (totalEl) totalEl.textContent = String(summary.totalCount ?? items.length);
    if (readyEl) readyEl.textContent = String(summary.readyCount ?? 0);
    if (dupEl) dupEl.textContent = String(summary.duplicateCount ?? 0);
    if (notFoundEl) notFoundEl.textContent = String(summary.notFoundCount ?? 0);
    if (previewCountEl) previewCountEl.textContent = String(items.length);

    if (tbody) {
      if (items.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="padding:20px; text-align:center; color:#E11D48;">ไม่พบรหัสนิสิตในไฟล์นี้</td></tr>`;
      } else {
        tbody.innerHTML = items
          .map((item: any) => {
            let statusHtml = '';
            let rowBg = '';
            if (item.status === 'READY') {
              statusHtml = `<span style="color:#059669; font-weight:700;">✅ พร้อมบันทึก (+${creditedHours} ชม.)</span>`;
            } else if (item.status === 'DUPLICATE') {
              statusHtml = `<span style="color:#D97706; font-weight:600;">🔄 เช็คอินในรอบนี้แล้ว</span>`;
              rowBg = 'background:#FFFBEB;';
            } else {
              statusHtml = `<span style="color:#E11D48; font-weight:600;">⚠️ ไม่พบรหัสนิสิตในระบบ</span>`;
              rowBg = 'background:#FFF1F2;';
            }
            const yearBadge = item.year
              ? `<span style="background:#E0E7FF; color:#3730A3; padding:2px 8px; border-radius:9999px; font-size:11px; font-weight:600;">ปี ${item.year}</span>`
              : '-';

            return `
              <tr style="border-bottom:1px solid #F1F5F9; ${rowBg}">
                <td style="padding:7px 10px; font-weight:700; font-family:monospace; color:#1E293B;">${escapeHtmlText(item.studentCode)}</td>
                <td style="padding:7px 10px; color:#334155;">${escapeHtmlText(item.nameTh || '-')}</td>
                <td style="padding:7px 10px; color:#4338CA; font-weight:600;">${escapeHtmlText(item.major || '-')}</td>
                <td style="padding:7px 10px; text-align:center;">${yearBadge}</td>
                <td style="padding:7px 10px;">${statusHtml}</td>
              </tr>
            `;
          })
          .join('');
      }
    }

    if (previewWrap) previewWrap.style.display = 'block';

    if (currentCheckInImportReadyCodes.length > 0 && btnConfirm) {
      const btnText = document.getElementById('btn-confirm-checkin-import-text');
      if (btnText) {
        btnText.textContent = `ยืนยันบันทึก Check-in (${currentCheckInImportReadyCodes.length} คน)`;
      }
      btnConfirm.style.display = 'inline-flex';
    }
  } catch (err) {
    console.error('Check-in import preview error:', err);
    if (loading) loading.style.display = 'none';
    alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    window.resetCheckInImportFile();
  }
}

window.confirmCheckInImport = async function() {
  if (!currentCheckInImportEventId || currentCheckInImportReadyCodes.length === 0) return;

  const btnConfirm = document.getElementById('btn-confirm-checkin-import') as HTMLButtonElement | null;
  const btnText = document.getElementById('btn-confirm-checkin-import-text');
  const origText = btnText ? btnText.textContent : 'ยืนยันบันทึก Check-in';

  if (btnConfirm) btnConfirm.disabled = true;
  if (btnText) btnText.textContent = 'กำลังบันทึกชั่วโมง...';

  try {
    const res = await fetch(
      `/api/admin/super-admin/events/${encodeURIComponent(currentCheckInImportEventId)}/checkin`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentCodesInput: currentCheckInImportReadyCodes,
          sessionId: currentCheckInImportSessionId,
        }),
      }
    );
    const data = await res.json();
    if (data.success) {
      const selectEl = document.getElementById('checkin-event-select') as HTMLSelectElement | null;
      const bannerEl = document.getElementById('checkin-result-banner');
      if (bannerEl) {
        bannerEl.style.display = 'block';
        bannerEl.style.background = '#DCFCE7';
        bannerEl.style.border = '1px solid #86EFAC';
        bannerEl.style.color = '#166534';
        bannerEl.textContent = `✅ นำเข้าจากไฟล์สำเร็จ: ${data.message}`;
      }
      window.closeCheckInImportModal();
      await window.loadSuperAdminOverview();
      await loadDashboardSummary();
      await loadStudents();
      if (selectEl) {
        selectEl.value = currentCheckInImportEventId;
        window.renderSelectedEventCheckins();
      }
    } else {
      alert('เกิดข้อผิดพลาด: ' + (data.message || 'บันทึก Check-in ไม่สำเร็จ'));
    }
  } catch (err) {
    console.error('Confirm check-in import error:', err);
    alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
  } finally {
    if (btnConfirm) btnConfirm.disabled = false;
    if (btnText && origText) btnText.textContent = origText;
  }
};

window.deleteEventCheckIn = async function(eventId, studentCode, nameTh, trainingRecordId, sessionId) {
  const confirmMsg = `ยืนยันการยกเลิก Check-in ของ "${nameTh}" (${studentCode}) หรือไม่?\n\n* ระบบจะลบรายการนี้ออกจากกิจกรรม และหักชั่วโมงอบรมออกจากนิสิตทันที`;
  if (!confirm(confirmMsg)) return;

  try {
    let url = `/api/admin/super-admin/events/${encodeURIComponent(eventId)}/checkin/${encodeURIComponent(studentCode)}?`;
    if (trainingRecordId) url += `trainingRecordId=${trainingRecordId}&`;
    if (sessionId) url += `sessionId=${encodeURIComponent(sessionId)}`;

    const res = await fetch(url, {
      method: 'DELETE',
    });
    const data = await res.json();
    if (data.success) {
      alert(data.message || 'ยกเลิก Check-in สำเร็จ');
      await window.loadSuperAdminOverview();
      await loadDashboardSummary();
      await loadStudents();
      const selectEl = document.getElementById('checkin-event-select') as HTMLSelectElement | null;
      if (selectEl) {
        selectEl.value = eventId;
        window.renderSelectedEventCheckins();
      }
    } else {
      alert('เกิดข้อผิดพลาด: ' + (data.message || 'ยกเลิก Check-in ไม่สำเร็จ'));
    }
  } catch (err) {
    console.error(err);
    alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
  }
};

window.deleteAllEventCheckIns = async function() {
  const selectEl = document.getElementById('checkin-event-select') as HTMLSelectElement | null;
  const filterMajorEl = document.getElementById('checkin-filter-major') as HTMLSelectElement | null;
  const filterYearEl = document.getElementById('checkin-filter-year') as HTMLSelectElement | null;
  const filterSessionEl = document.getElementById('checkin-filter-session') as HTMLSelectElement | null;
  const eventId = selectEl?.value;
  if (!eventId) return;

  const event = (superAdminData.trainingEvents || []).find((e: any) => e.id === eventId);
  if (!event) return;

  const selectedMajor = filterMajorEl ? filterMajorEl.value : 'ALL';
  const selectedYear = filterYearEl ? filterYearEl.value : 'ALL';
  const selectedSession = filterSessionEl ? filterSessionEl.value : 'ALL';
  const isMajorFiltered = selectedMajor && selectedMajor !== 'ALL';
  const isYearFiltered = selectedYear && selectedYear !== 'ALL';
  const isSessionFiltered = selectedSession && selectedSession !== 'ALL';
  const isFiltered = isMajorFiltered || isYearFiltered || isSessionFiltered;

  const targetCheckIns = (event.checkIns || []).filter((c: any) => {
    if (isMajorFiltered && c.major !== selectedMajor) return false;
    if (isYearFiltered) {
      const y = c.studentCode ? c.studentCode.substring(0, 2) : '';
      if (y !== selectedYear) return false;
    }
    if (isSessionFiltered) {
      if (c.sessionId !== selectedSession && c.sessionId !== 'ALL') return false;
    }
    return true;
  });

  if (targetCheckIns.length === 0) {
    alert('ไม่พบนิสิตตามเงื่อนไขที่เลือก');
    return;
  }

  const descList: string[] = [];
  if (isSessionFiltered) descList.push(`ช่วง ${selectedSession}`);
  if (isMajorFiltered) descList.push(selectedMajor);
  if (isYearFiltered) descList.push(`ปี ${selectedYear}`);
  const scopeMsg = isFiltered ? descList.join(' ') : 'ทั้งหมด';

  const confirmMsg = `⚠️ ยืนยันการยกเลิก Check-in นิสิต ${scopeMsg} จำนวน ${targetCheckIns.length} รายการ หรือไม่?\n\n* ระบบจะลบรายการและหักชั่วโมงอบรมคืนให้นิสิตทุกคนในกลุ่มนี้ทันที`;
  if (!confirm(confirmMsg)) return;

  try {
    let url = `/api/admin/super-admin/events/${encodeURIComponent(eventId)}/checkin-all?major=${encodeURIComponent(selectedMajor)}&year=${encodeURIComponent(selectedYear)}&sessionId=${encodeURIComponent(selectedSession)}`;
    const res = await fetch(url, {
      method: 'DELETE',
    });
    const data = await res.json();
    if (data.success) {
      alert(`✅ ${data.message || 'ยกเลิก Check-in เรียบร้อยแล้ว'}`);
      await window.loadSuperAdminOverview();
      await loadDashboardSummary();
      await loadStudents();
      if (selectEl) {
        selectEl.value = eventId;
        window.renderSelectedEventCheckins();
      }
    } else {
      alert('เกิดข้อผิดพลาด: ' + (data.message || 'ยกเลิก Check-in ไม่สำเร็จ'));
    }
  } catch (err) {
    console.error(err);
    alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
  }
};

// WORKSPACE 4: ฐานข้อมูลสถานประกอบการกลาง (Company Master Data)
// =========================================================================
const PENDING_COMPANIES_COLLAPSED_PAGE_SIZE = 3;
const PENDING_COMPANIES_EXPANDED_PAGE_SIZE = 10;
let pendingCompaniesPage = 1;
let pendingCompaniesSearch = '';
let pendingCompaniesSearchTimeout: ReturnType<typeof setTimeout> | null = null;
let pendingCompaniesExpanded = true;
const selectedPendingCompanyIds = new Set<string>();
const pendingCompanyMergeTargets = new Map<string, string>();
let pendingCompanyBulkInProgress = false;
let pendingCompanyBulkToastTimeout: ReturnType<typeof setTimeout> | null = null;

function escapePendingCompanyHtml(value: unknown) {
  return String(value ?? '').replace(/[&<>"']/g, character => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return entities[character];
  });
}

window.setPendingCompanySearch = function(event) {
  event.stopPropagation();
  const searchInput = event.currentTarget as HTMLInputElement;
  const clearButton = document.getElementById('pending-companies-search-clear');
  pendingCompaniesSearch = searchInput.value.trim().toLowerCase();
  pendingCompaniesPage = 1;
  if (clearButton) clearButton.style.display = searchInput.value ? 'block' : 'none';

  if (pendingCompaniesSearchTimeout) clearTimeout(pendingCompaniesSearchTimeout);
  pendingCompaniesSearchTimeout = setTimeout(() => {
    pendingCompaniesSearchTimeout = null;
    renderPendingCompaniesTable();
  }, 200);
};

window.clearPendingCompanySearch = function(event) {
  event.preventDefault();
  event.stopPropagation();
  const searchInput = document.getElementById('pending-companies-search') as HTMLInputElement | null;
  if (!searchInput) return;
  searchInput.value = '';
  pendingCompaniesSearch = '';
  pendingCompaniesPage = 1;
  const clearButton = document.getElementById('pending-companies-search-clear');
  if (clearButton) clearButton.style.display = 'none';
  if (pendingCompaniesSearchTimeout) {
    clearTimeout(pendingCompaniesSearchTimeout);
    pendingCompaniesSearchTimeout = null;
  }
  renderPendingCompaniesTable();
  searchInput.focus();
};

window.togglePendingCompanies = function(event) {
  event.stopPropagation();
  const toggleButton = document.getElementById('pending-companies-toggle');
  const toggleIcon = document.getElementById('pending-companies-toggle-icon');
  if (!toggleButton) return;

  pendingCompaniesExpanded = !pendingCompaniesExpanded;
  pendingCompaniesPage = 1;
  toggleButton.setAttribute('aria-expanded', String(pendingCompaniesExpanded));
  if (toggleIcon) toggleIcon.style.transform = pendingCompaniesExpanded ? 'rotate(180deg)' : 'rotate(0deg)';
  renderPendingCompaniesTable();
};

function updatePendingCompanySelectionUi() {
  const tbody = document.getElementById('pending-companies-tbody');
  const visibleCheckboxes = tbody?.querySelectorAll<HTMLInputElement>('.pending-company-checkbox') || [];
  const headerCheckbox = document.getElementById('select-all-pending-companies') as HTMLInputElement | null;
  const selectedVisibleCount = [...visibleCheckboxes].filter(checkbox => checkbox.checked).length;
  visibleCheckboxes.forEach(checkbox => {
    checkbox.disabled = pendingCompanyBulkInProgress;
  });
  if (headerCheckbox) {
    headerCheckbox.checked = visibleCheckboxes.length > 0 && selectedVisibleCount === visibleCheckboxes.length;
    headerCheckbox.indeterminate = selectedVisibleCount > 0 && selectedVisibleCount < visibleCheckboxes.length;
    headerCheckbox.disabled = pendingCompanyBulkInProgress;
  }

  const bulkActions = document.getElementById('pending-companies-bulk-actions');
  const selectedCount = document.getElementById('pending-companies-selected-count');
  const confirmLabel = document.getElementById('pending-companies-bulk-confirm-label');
  const confirmButton = document.getElementById('pending-companies-bulk-confirm') as HTMLButtonElement | null;
  const mergeLabel = document.getElementById('pending-companies-bulk-merge-label');
  const mergeButton = document.getElementById('pending-companies-bulk-merge') as HTMLButtonElement | null;
  const mergeTargetSelect = document.getElementById('pending-companies-bulk-merge-target') as HTMLSelectElement | null;
  const clearButton = document.getElementById('pending-companies-clear-selection') as HTMLButtonElement | null;
  tbody?.querySelectorAll<HTMLButtonElement>('[data-pending-action]').forEach(button => {
    button.disabled = pendingCompanyBulkInProgress;
  });
  if (bulkActions) bulkActions.style.display = selectedPendingCompanyIds.size ? 'flex' : 'none';
  if (selectedCount) selectedCount.textContent = `เลือกแล้ว ${selectedPendingCompanyIds.size} รายการ`;
  if (confirmLabel) confirmLabel.textContent = `ยืนยันเข้า Master Data (${selectedPendingCompanyIds.size})`;
  if (mergeLabel) mergeLabel.textContent = `ยุบรวมชื่อซ้ำ (${selectedPendingCompanyIds.size})`;
  if (confirmButton) confirmButton.disabled = pendingCompanyBulkInProgress || selectedPendingCompanyIds.size === 0;
  if (mergeButton) mergeButton.disabled = pendingCompanyBulkInProgress || selectedPendingCompanyIds.size === 0;
  if (mergeTargetSelect) {
    const selectedTargets = [...selectedPendingCompanyIds].map(id => pendingCompanyMergeTargets.get(id) || '');
    const firstTarget = selectedTargets[0] || '';
    mergeTargetSelect.value = firstTarget && selectedTargets.every(target => target === firstTarget) ? firstTarget : '';
    mergeTargetSelect.disabled = pendingCompanyBulkInProgress || selectedPendingCompanyIds.size === 0;
  }
  if (clearButton) clearButton.disabled = pendingCompanyBulkInProgress;
}

window.togglePendingCompanySelection = function(event, companyId) {
  event.stopPropagation();
  const checkbox = event.currentTarget as HTMLInputElement;
  if (checkbox.checked) {
    selectedPendingCompanyIds.add(companyId);
  } else {
    selectedPendingCompanyIds.delete(companyId);
  }

  const row = checkbox.closest('tr');
  if (row) row.classList.toggle('bg-blue-50/50', checkbox.checked);
  updatePendingCompanySelectionUi();
};

window.selectAllPendingCompanies = function(event, companyIds) {
  event.stopPropagation();
  const checkbox = event.currentTarget as HTMLInputElement;
  companyIds.forEach(id => {
    if (checkbox.checked) {
      selectedPendingCompanyIds.add(id);
    } else {
      selectedPendingCompanyIds.delete(id);
    }
  });

  document.querySelectorAll<HTMLInputElement>('#pending-companies-tbody .pending-company-checkbox').forEach(rowCheckbox => {
    rowCheckbox.checked = checkbox.checked;
    rowCheckbox.closest('tr')?.classList.toggle('bg-blue-50/50', checkbox.checked);
  });
  updatePendingCompanySelectionUi();
};

window.setPendingCompanyBulkMergeTarget = function(event) {
  event.stopPropagation();
  if (pendingCompanyBulkInProgress) return;
  const mergeTargetSelect = event.currentTarget as HTMLSelectElement;
  const mergeIntoCompanyId = mergeTargetSelect.value;
  selectedPendingCompanyIds.forEach(id => {
    if (mergeIntoCompanyId) {
      pendingCompanyMergeTargets.set(id, mergeIntoCompanyId);
    } else {
      pendingCompanyMergeTargets.delete(id);
    }
  });
  document.querySelectorAll<HTMLSelectElement>('#pending-companies-tbody [data-merge-company-id]').forEach(select => {
    const companyId = select.dataset.mergeCompanyId || '';
    if (selectedPendingCompanyIds.has(companyId)) select.value = mergeIntoCompanyId;
  });
  updatePendingCompanySelectionUi();
};

window.clearPendingCompanySelection = function(event) {
  event.stopPropagation();
  if (pendingCompanyBulkInProgress) return;
  selectedPendingCompanyIds.clear();
  pendingCompanyMergeTargets.clear();
  document.querySelectorAll<HTMLInputElement>('#pending-companies-tbody .pending-company-checkbox').forEach(checkbox => {
    checkbox.checked = false;
    checkbox.closest('tr')?.classList.remove('bg-blue-50/50');
  });
  updatePendingCompanySelectionUi();
};

function showPendingCompanyBulkToast(message: string, hasFailures: boolean) {
  const toast = document.getElementById('pending-companies-bulk-toast');
  if (!toast) return;
  toast.textContent = message;
  toast.style.display = 'block';
  toast.style.background = hasFailures ? '#FEF2F2' : '#ECFDF5';
  toast.style.border = `1px solid ${hasFailures ? '#FECACA' : '#A7F3D0'}`;
  toast.style.color = hasFailures ? '#991B1B' : '#065F46';
  if (pendingCompanyBulkToastTimeout) clearTimeout(pendingCompanyBulkToastTimeout);
  pendingCompanyBulkToastTimeout = setTimeout(() => {
    pendingCompanyBulkToastTimeout = null;
    toast.style.display = 'none';
  }, 5000);
}

async function submitPendingCompanyConfirmation(id: string) {
  const standardizedNameTh = document.getElementById(`std-name-${id}`)?.value?.trim();
  try {
    const res = await fetch(`/api/admin/super-admin/companies/${encodeURIComponent(id)}/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ standardizedNameTh, status: 'VERIFIED' }),
    });
    const data = await res.json();
    return {
      success: Boolean(data.success),
      message: data.message || 'ไม่สามารถยืนยันได้',
    };
  } catch (err) {
    console.error(`Failed to confirm pending company ${id}:`, err);
    return { success: false, message: 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์' };
  }
}

async function submitPendingCompanyMerge(id: string, mergeIntoCompanyId: string) {
  try {
    const res = await fetch(`/api/admin/super-admin/companies/${encodeURIComponent(id)}/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mergeIntoCompanyId }),
    });
    const data = await res.json();
    return {
      success: Boolean(data.success),
      message: data.message || 'ไม่สามารถยุบรวมได้',
    };
  } catch (err) {
    console.error(`Failed to merge pending company ${id}:`, err);
    return { success: false, message: 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์' };
  }
}

window.confirmSelectedPendingCompanies = async function(event) {
  event.stopPropagation();
  if (pendingCompanyBulkInProgress || selectedPendingCompanyIds.size === 0) return;
  const companyIds = [...selectedPendingCompanyIds];
  if (!window.confirm(`ยืนยันเพิ่ม ${companyIds.length} บริษัทเข้า Master Data ใช่หรือไม่?`)) return;

  pendingCompanyBulkInProgress = true;
  updatePendingCompanySelectionUi();
  let successCount = 0;
  let failureCount = 0;
  try {
    for (const id of companyIds) {
      const result = await submitPendingCompanyConfirmation(id);
      if (result.success) {
        successCount += 1;
        selectedPendingCompanyIds.delete(id);
      } else {
        failureCount += 1;
        console.error(`Could not confirm pending company ${id}: ${result.message}`);
      }
    }

    if (successCount > 0) await window.loadSuperAdminOverview();
    showPendingCompanyBulkToast(
      failureCount > 0
        ? `เพิ่มสำเร็จ ${successCount} รายการ และไม่สำเร็จ ${failureCount} รายการ`
        : `เพิ่มสำเร็จ ${successCount} รายการ`,
      failureCount > 0
    );
  } finally {
    pendingCompanyBulkInProgress = false;
    updatePendingCompanySelectionUi();
  }
};

window.mergeSelectedPendingCompanies = async function(event) {
  event.stopPropagation();
  if (pendingCompanyBulkInProgress || selectedPendingCompanyIds.size === 0) return;
  const companyIds = [...selectedPendingCompanyIds];
  const readyCount = companyIds.filter(id => pendingCompanyMergeTargets.get(id)).length;
  const missingTargetCount = companyIds.length - readyCount;
  if (readyCount === 0) {
    showPendingCompanyBulkToast('กรุณาเลือกบริษัทปลายทางจาก Dropdown ด้านบนหรือในแต่ละรายการก่อนยุบรวม', true);
    return;
  }
  const confirmationMessage = missingTargetCount > 0
    ? `ยุบรวมชื่อซ้ำ ${readyCount} บริษัทใช่หรือไม่? (ข้าม ${missingTargetCount} รายการที่ยังไม่ได้เลือกบริษัทปลายทาง)`
    : `ยุบรวมชื่อซ้ำ ${readyCount} บริษัทใช่หรือไม่?`;
  if (!window.confirm(confirmationMessage)) return;

  pendingCompanyBulkInProgress = true;
  updatePendingCompanySelectionUi();
  let successCount = 0;
  let failureCount = missingTargetCount;
  try {
    for (const id of companyIds) {
      const mergeIntoCompanyId = pendingCompanyMergeTargets.get(id);
      if (!mergeIntoCompanyId) continue;

      const result = await submitPendingCompanyMerge(id, mergeIntoCompanyId);
      if (result.success) {
        successCount += 1;
        selectedPendingCompanyIds.delete(id);
        pendingCompanyMergeTargets.delete(id);
      } else {
        failureCount += 1;
        console.error(`Could not merge pending company ${id}: ${result.message}`);
      }
    }

    if (successCount > 0) await window.loadSuperAdminOverview();
    showPendingCompanyBulkToast(
      failureCount > 0
        ? `ยุบรวมสำเร็จ ${successCount} รายการ และไม่สำเร็จ ${failureCount} รายการ`
        : `ยุบรวมสำเร็จ ${successCount} รายการ`,
      failureCount > 0
    );
  } finally {
    pendingCompanyBulkInProgress = false;
    updatePendingCompanySelectionUi();
  }
};

function renderPendingCompaniesTable() {
  const tbody = document.getElementById('pending-companies-tbody');
  if (!tbody) return;
  const allCompanies = superAdminData.companyMasterData || [];
  const pendingList = allCompanies.filter(c => c.status === 'PENDING_REVIEW');
  const pendingCompanyIds = new Set(pendingList.map(company => String(company.id)));
  selectedPendingCompanyIds.forEach(id => {
    if (!pendingCompanyIds.has(id)) {
      selectedPendingCompanyIds.delete(id);
      pendingCompanyMergeTargets.delete(id);
    }
  });
  const verifiedList = allCompanies.filter(c => c.status === 'VERIFIED' || c.status === 'PARTNER');
  const mergeOptions = `<option value="">-- หรือเลือกยุบรวมเข้ากับบริษัทเดิมที่มีอยู่แล้ว --</option>` +
    verifiedList.map(company => `<option value="${escapePendingCompanyHtml(company.id)}">${escapePendingCompanyHtml(company.nameTh)} (${escapePendingCompanyHtml(company.province)})</option>`).join('');
  const bulkMergeTargetSelect = document.getElementById('pending-companies-bulk-merge-target') as HTMLSelectElement | null;
  if (bulkMergeTargetSelect) bulkMergeTargetSelect.innerHTML = mergeOptions;
  const filteredList = pendingCompaniesSearch
    ? pendingList.filter(company => [
        company.nameTh,
        company.id,
        company.address,
        company.province,
        company.submittedByStudentName,
        company.submittedByStudentCode,
      ].some(value => String(value ?? '').toLowerCase().includes(pendingCompaniesSearch)))
    : pendingList;
  const pageSize = pendingCompaniesExpanded
    ? PENDING_COMPANIES_EXPANDED_PAGE_SIZE
    : PENDING_COMPANIES_COLLAPSED_PAGE_SIZE;
  const totalPages = Math.ceil(filteredList.length / pageSize);
  pendingCompaniesPage = Math.max(1, Math.min(pendingCompaniesPage, totalPages || 1));
  const pageStart = (pendingCompaniesPage - 1) * pageSize;
  const pageCompanies = filteredList.slice(pageStart, pageStart + pageSize);

  if (filteredList.length === 0) {
    const message = pendingCompaniesSearch
      ? 'ไม่พบบริษัทที่ตรงกับคำค้นหา'
      : '✅ ไม่มีรายการบริษัทใหม่ค้างตรวจสอบ (บริษัททั้งหมดในระบบได้รับการยืนยันเข้า Master Data แล้ว)';
    const messageClass = pendingCompaniesSearch ? 'text-gray-400' : 'text-emerald-700 font-semibold';
    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-6 ${messageClass}">${message}</td></tr>`;
  } else {
    tbody.innerHTML = pageCompanies.map(company => {
      const id = escapePendingCompanyHtml(company.id);
      const name = escapePendingCompanyHtml(company.nameTh);
      const address = escapePendingCompanyHtml(company.address || 'รอตรวจสอบที่อยู่จากนิสิต');
      const province = escapePendingCompanyHtml(company.province || 'รอระบุจังหวัด');
      const studentName = escapePendingCompanyHtml(company.submittedByStudentName || 'นิสิตในระบบ');
      const studentCode = escapePendingCompanyHtml(company.submittedByStudentCode || '-');
      const isSelected = selectedPendingCompanyIds.has(String(company.id));
      const selectedMergeTarget = pendingCompanyMergeTargets.get(String(company.id)) || '';
      return `
        <tr class="${isSelected ? 'bg-blue-50/50' : ''}">
          <td>
            <div title="${name}" style="font-weight:700; color:#0F172A; font-size:14.5px; line-height:1.35; overflow-wrap:anywhere;">${name}</div>
            <div style="margin-top:2px; font-size:11.5px; color:#64748B;">รหัสอ้างอิง: ${id}</div>
          </td>
          <td>
            <div style="font-size:12.5px; color:#1E293B; line-height:1.45; overflow-wrap:anywhere;">${address}</div>
            <div style="margin-top:3px; font-size:11.5px; font-weight:600; color:#4338CA; display:inline-flex; align-items:center; gap:3px;">
              <span class="material-icons" style="font-size:13px;">location_on</span> ${province}
            </div>
          </td>
          <td>
            <div style="font-weight:700; color:#1E293B;">${studentName}</div>
            <div style="font-size:11.5px; color:#64748B;">รหัส ${studentCode}</div>
          </td>
          <td>
            <input type="text" id="std-name-${id}" class="input-field" value="${name}" placeholder="ปรับชื่อบริษัทให้เป็นมาตรฐาน..." style="font-size:12px; padding:6px 10px !important; margin-bottom:6px; font-weight:700;" />
            <select id="merge-into-${id}" data-merge-company-id="${id}" class="input-field" aria-label="เลือกบริษัทปลายทางสำหรับ ${name}" style="font-size:12px; padding:6px 10px !important;">
              ${mergeOptions.replace(
                `<option value="${selectedMergeTarget}">`,
                `<option value="${selectedMergeTarget}" selected>`
              )}
            </select>
          </td>
          <td class="text-center">
            <div style="display:flex; gap:6px; justify-content:center; flex-wrap:wrap;">
              <button type="button" data-pending-action="confirm" data-company-id="${id}"
                style="background:#10B981; color:white; border:none; padding:6px 10px; border-radius:8px; font-size:11.5px; font-weight:700; cursor:pointer; display:inline-flex; align-items:center; gap:4px;">
                <span class="material-icons" style="font-size:14px;">check_circle</span> ยืนยันเข้า Master Data
              </button>
              <button type="button" data-pending-action="merge" data-company-id="${id}"
                style="background:#4338CA; color:white; border:none; padding:6px 10px; border-radius:8px; font-size:11.5px; font-weight:700; cursor:pointer; display:inline-flex; align-items:center; gap:4px;">
                <span class="material-icons" style="font-size:14px;">merge_type</span> ยุบรวมชื่อซ้ำ
              </button>
              <button type="button" data-pending-action="delete" data-company-id="${id}"
                title="ลบรายการนี้ออกจากคิวตรวจสอบ"
                style="background:#FEF2F2; color:#DC2626; border:1px solid #FECACA; padding:6px 10px; border-radius:8px; font-size:11.5px; font-weight:700; cursor:pointer; display:inline-flex; align-items:center; gap:3px;">
                <span class="material-icons" style="font-size:14px;">delete_outline</span> ลบ
              </button>
            </div>
          </td>
          <td class="text-center">
            <input type="checkbox" class="pending-company-checkbox" data-company-id="${id}"
              aria-label="เลือกบริษัท ${name}" ${isSelected ? 'checked' : ''}
              style="width:16px;height:16px;cursor:pointer;" />
          </td>
        </tr>
      `;
    }).join('');

    tbody.querySelectorAll<HTMLButtonElement>('[data-pending-action]').forEach(button => {
      button.addEventListener('click', () => {
        const id = button.dataset.companyId || '';
        if (button.dataset.pendingAction === 'merge') {
          window.mergePendingCompany(id);
        } else if (button.dataset.pendingAction === 'delete') {
          window.deleteMasterCompany(id);
        } else {
          window.confirmPendingCompany(id);
        }
      });
    });

    tbody.querySelectorAll<HTMLInputElement>('.pending-company-checkbox').forEach(checkbox => {
      checkbox.addEventListener('click', event => event.stopPropagation());
      checkbox.addEventListener('change', event => {
        const companyId = (event.currentTarget as HTMLInputElement).dataset.companyId || '';
        window.togglePendingCompanySelection(event, companyId);
      });
    });

    tbody.querySelectorAll<HTMLSelectElement>('[data-merge-company-id]').forEach(select => {
      select.addEventListener('change', event => {
        event.stopPropagation();
        const mergeSelect = event.currentTarget as HTMLSelectElement;
        const companyId = mergeSelect.dataset.mergeCompanyId || '';
        if (mergeSelect.value) {
          pendingCompanyMergeTargets.set(companyId, mergeSelect.value);
        } else {
          pendingCompanyMergeTargets.delete(companyId);
        }
        updatePendingCompanySelectionUi();
      });
    });
  }

  if (bulkMergeTargetSelect) {
    bulkMergeTargetSelect.onchange = event => window.setPendingCompanyBulkMergeTarget(event);
  }

  const selectAllCheckbox = document.getElementById('select-all-pending-companies') as HTMLInputElement | null;
  if (selectAllCheckbox) {
    selectAllCheckbox.onclick = event => event.stopPropagation();
    selectAllCheckbox.onchange = event => {
      window.selectAllPendingCompanies(event, pageCompanies.map(company => String(company.id)));
    };
  }
  updatePendingCompanySelectionUi();

  const pagination = document.getElementById('pending-companies-pagination');
  if (pagination) {
    const firstItem = filteredList.length ? pageStart + 1 : 0;
    const lastItem = Math.min(pageStart + pageSize, filteredList.length);
    const showPageButtons = filteredList.length > pageSize;
    pagination.innerHTML = `
      <span>แสดง ${firstItem}-${lastItem} จาก ${filteredList.length} รายการ</span>
      ${showPageButtons ? `
        <button type="button" data-page-direction="previous" ${pendingCompaniesPage <= 1 ? 'disabled' : ''}
          style="border:1px solid #CBD5E1; border-radius:6px; background:#FFFFFF; color:#334155; padding:5px 10px; cursor:${pendingCompaniesPage <= 1 ? 'not-allowed' : 'pointer'}; opacity:${pendingCompaniesPage <= 1 ? '.5' : '1'};">ก่อนหน้า</button>
        <button type="button" data-page-direction="next" ${pendingCompaniesPage >= totalPages ? 'disabled' : ''}
          style="border:1px solid #CBD5E1; border-radius:6px; background:#FFFFFF; color:#334155; padding:5px 10px; cursor:${pendingCompaniesPage >= totalPages ? 'not-allowed' : 'pointer'}; opacity:${pendingCompaniesPage >= totalPages ? '.5' : '1'};">ถัดไป</button>
      ` : ''}
    `;
    pagination.querySelectorAll<HTMLButtonElement>('[data-page-direction]').forEach(button => {
      button.addEventListener('click', () => {
        if (button.disabled) return;
        pendingCompaniesPage += button.dataset.pageDirection === 'next' ? 1 : -1;
        renderPendingCompaniesTable();
      });
    });
  }

  const content = document.getElementById('pending-companies-content');
  if (content && content.scrollHeight > 0) {
    content.style.maxHeight = `${content.scrollHeight}px`;
    content.style.opacity = '1';
  }
}

window.confirmPendingCompany = async function(id) {
  const result = await submitPendingCompanyConfirmation(id);
  if (result.success) {
    alert('✅ ' + result.message);
    await window.loadSuperAdminOverview();
  } else {
    alert('เกิดข้อผิดพลาด: ' + result.message);
  }
};

window.mergePendingCompany = async function(id) {
  const mergeTargetSelect = document.getElementById('pending-companies-bulk-merge-target') as HTMLSelectElement | null;
  const mergeIntoCompanyId = mergeTargetSelect?.value || pendingCompanyMergeTargets.get(id);
  if (!mergeIntoCompanyId) {
    showPendingCompanyBulkToast('กรุณาเลือกบริษัทปลายทางจาก Dropdown ก่อนกดยุบรวม', true);
    return;
  }
  if (pendingCompanyBulkInProgress) return;
  if (!window.confirm('ยืนยันยุบรวมบริษัทนี้เข้ากับบริษัทปลายทางที่เลือกใช่หรือไม่?')) return;

  pendingCompanyBulkInProgress = true;
  updatePendingCompanySelectionUi();
  try {
    const result = await submitPendingCompanyMerge(id, mergeIntoCompanyId);
    if (!result.success) {
      console.error(`Could not merge pending company ${id}: ${result.message}`);
      showPendingCompanyBulkToast(`ยุบรวมไม่สำเร็จ: ${result.message}`, true);
      return;
    }

    selectedPendingCompanyIds.delete(id);
    pendingCompanyMergeTargets.delete(id);
    await window.loadSuperAdminOverview();
    showPendingCompanyBulkToast('ยุบรวมบริษัทสำเร็จ', false);
  } finally {
    pendingCompanyBulkInProgress = false;
    updatePendingCompanySelectionUi();
  }
};

const MASTER_COMPANIES_COLLAPSED_PAGE_SIZE = 3;
const MASTER_COMPANIES_EXPANDED_PAGE_SIZE = 10;
let masterCompaniesExpanded = true;
let masterCompaniesPage = 1;

window.toggleMasterCompanies = function(event) {
  event.stopPropagation();
  const toggleButton = document.getElementById('master-companies-toggle');
  const toggleIcon = document.getElementById('master-companies-toggle-icon');
  if (!toggleButton) return;

  masterCompaniesExpanded = !masterCompaniesExpanded;
  masterCompaniesPage = 1;
  toggleButton.setAttribute('aria-expanded', String(masterCompaniesExpanded));
  toggleButton.setAttribute('aria-label', masterCompaniesExpanded ? 'ย่อรายการบริษัท' : 'ขยายรายการบริษัท');
  toggleButton.title = masterCompaniesExpanded ? 'ย่อรายการบริษัท' : 'ขยายรายการบริษัท';
  if (toggleIcon) toggleIcon.style.transform = masterCompaniesExpanded ? 'rotate(180deg)' : 'rotate(0deg)';
  window.renderMasterCompanyTable();
};

window.searchMasterCompanies = function() {
  const searchInput = document.getElementById('master-company-search') as HTMLInputElement | null;
  const clearBtn = document.getElementById('master-company-search-clear');
  if (clearBtn) {
    clearBtn.style.display = searchInput && searchInput.value.trim().length > 0 ? 'inline-block' : 'none';
  }
  masterCompaniesPage = 1;
  window.renderMasterCompanyTable();
};

window.clearMasterCompanySearch = function(event) {
  if (event) event.stopPropagation();
  const searchInput = document.getElementById('master-company-search') as HTMLInputElement | null;
  const clearBtn = document.getElementById('master-company-search-clear');
  if (searchInput) {
    searchInput.value = '';
    searchInput.focus();
  }
  if (clearBtn) clearBtn.style.display = 'none';
  masterCompaniesPage = 1;
  window.renderMasterCompanyTable();
};

window.renderMasterCompanyTable = function() {
  const tbody = document.getElementById('master-companies-tbody');
  if (!tbody) return;
  const searchVal = (document.getElementById('master-company-search')?.value || '').trim().toLowerCase();

  let list = (superAdminData.companyMasterData || []).filter(c => c.status !== 'PENDING_REVIEW');
  if (searchVal) {
    list = list.filter(c =>
      `${c.nameTh} ${c.nameEn} ${c.province} ${c.address} ${c.recommendedPositions}`.toLowerCase().includes(searchVal)
    );
  }

  const pageSize = masterCompaniesExpanded
    ? MASTER_COMPANIES_EXPANDED_PAGE_SIZE
    : MASTER_COMPANIES_COLLAPSED_PAGE_SIZE;
  const totalPages = Math.ceil(list.length / pageSize);
  masterCompaniesPage = Math.max(1, Math.min(masterCompaniesPage, totalPages || 1));
  const pageStart = (masterCompaniesPage - 1) * pageSize;
  const pageCompanies = list.slice(pageStart, pageStart + pageSize);

  if (list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center py-6 text-gray-400">ไม่พบรายการสถานประกอบการที่ค้นหา</td></tr>';
  } else {
    tbody.innerHTML = pageCompanies.map(c => {
      let badge = `<span style="background:#DCFCE7; color:#166534; padding:3px 10px; border-radius:999px; font-size:11.5px; font-weight:700;">✅ ยืนยันแล้ว (Master)</span>`;
      if (c.status === 'PARTNER') {
        badge = `<span style="background:#EEF2FF; color:#3730A3; border:1px solid #C7D2FE; padding:3px 10px; border-radius:999px; font-size:11.5px; font-weight:700;">⭐ พันธมิตรคณะ ICT</span>`;
      } else if (c.status === 'BLACKLIST') {
        badge = `<span style="background:#FEE2E2; color:#991B1B; padding:3px 10px; border-radius:999px; font-size:11.5px; font-weight:700;">⛔ งดส่งนิสิต (Blacklist)</span>`;
      }
      const safeId = escapePendingCompanyHtml(c.id);

      return `
        <tr>
          <td>
            <div style="font-weight:800; color:#1E1B4B; font-size:13.5px;">${escapePendingCompanyHtml(c.nameTh)}</div>
            <div style="font-size:11.5px; color:#64748B;">${escapePendingCompanyHtml(c.nameEn || '-')}</div>
            <div style="font-size:11px; color:#94A3B8; margin-top:2px;">${escapePendingCompanyHtml(c.address || '')}</div>
          </td>
          <td style="font-weight:600; color:#334155;">${escapePendingCompanyHtml(c.province || '-')}</td>
          <td>
            <div style="font-size:12.5px; font-weight:600; color:#1E293B;">${escapePendingCompanyHtml(c.hrContactName || '-')}</div>
            <div style="font-size:11.5px; color:#64748B;">📞 ${escapePendingCompanyHtml(c.hrPhone || '-')} | ✉️ ${escapePendingCompanyHtml(c.hrEmail || '-')}</div>
          </td>
          <td style="font-size:12px; color:#475569;">${escapePendingCompanyHtml(c.recommendedPositions || '-')}</td>
          <td class="text-center">${badge}</td>
          <td class="text-center">
            <div style="display:inline-flex; align-items:center; justify-content:center; gap:6px;">
              <button type="button" onclick="window.openEditMasterCompanyModal('${safeId}')"
                title="แก้ไขข้อมูลสถานประกอบการ"
                style="background:#EEF2FF; color:#3730A3; border:1px solid #C7D2FE; padding:5px 10px; border-radius:8px; font-size:11.5px; font-weight:700; cursor:pointer; display:inline-flex; align-items:center; gap:3px;">
                <span class="material-icons" style="font-size:14px;">edit</span> แก้ไข
              </button>
              <button type="button" onclick="window.deleteMasterCompany('${safeId}')"
                title="ลบสถานประกอบการออกจากระบบ"
                style="background:#FEF2F2; color:#DC2626; border:1px solid #FECACA; padding:5px 10px; border-radius:8px; font-size:11.5px; font-weight:700; cursor:pointer; display:inline-flex; align-items:center; gap:3px;">
                <span class="material-icons" style="font-size:14px;">delete_outline</span> ลบ
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  const pagination = document.getElementById('master-companies-pagination');
  if (pagination) {
    const firstItem = list.length ? pageStart + 1 : 0;
    const lastItem = Math.min(pageStart + pageSize, list.length);
    const showPageButtons = list.length > pageSize;
    pagination.innerHTML = `
      <span>แสดง ${firstItem}-${lastItem} จาก ${list.length} รายการ</span>
      ${showPageButtons ? `
        <button type="button" data-page-direction="previous" ${masterCompaniesPage <= 1 ? 'disabled' : ''}
          style="border:1px solid #CBD5E1; border-radius:6px; background:#FFFFFF; color:#334155; padding:5px 10px; cursor:${masterCompaniesPage <= 1 ? 'not-allowed' : 'pointer'}; opacity:${masterCompaniesPage <= 1 ? '.5' : '1'};">ก่อนหน้า</button>
        <button type="button" data-page-direction="next" ${masterCompaniesPage >= totalPages ? 'disabled' : ''}
          style="border:1px solid #CBD5E1; border-radius:6px; background:#FFFFFF; color:#334155; padding:5px 10px; cursor:${masterCompaniesPage >= totalPages ? 'not-allowed' : 'pointer'}; opacity:${masterCompaniesPage >= totalPages ? '.5' : '1'};">ถัดไป</button>
      ` : ''}
    `;
    pagination.querySelectorAll<HTMLButtonElement>('[data-page-direction]').forEach(button => {
      button.addEventListener('click', () => {
        if (button.disabled) return;
        masterCompaniesPage += button.dataset.pageDirection === 'next' ? 1 : -1;
        window.renderMasterCompanyTable();
      });
    });
  }
};

window.openAddMasterCompanyModal = function() {
  const modal = document.getElementById('add-master-company-modal');
  const titleEl = document.getElementById('mc-modal-title');
  const submitBtn = document.getElementById('mc-submit-btn');
  const pendingOpt = document.getElementById('mc-status-opt-pending') as HTMLOptionElement | null;
  if (titleEl) titleEl.textContent = 'เพิ่มสถานประกอบการเข้าฐานข้อมูลกลาง (Master Data)';
  if (submitBtn) submitBtn.textContent = 'บันทึกเข้า Master Data';
  if (pendingOpt) {
    pendingOpt.style.display = 'none';
    pendingOpt.disabled = true;
  }

  const setVal = (id: string, val: string) => {
    const el = document.getElementById(id) as HTMLInputElement | HTMLSelectElement | null;
    if (el) el.value = val;
  };
  setVal('mc-company-id', '');
  setVal('mc-name-th', '');
  setVal('mc-name-en', '');
  setVal('mc-province', '');
  setVal('mc-address', '');
  setVal('mc-hr-name', '');
  setVal('mc-hr-phone', '');
  setVal('mc-hr-email', '');
  setVal('mc-positions', '');
  setVal('mc-status', 'VERIFIED');

  if (modal) modal.style.display = 'flex';
};

window.openEditMasterCompanyModal = function(companyId) {
  const comp = (superAdminData.companyMasterData || []).find(c => String(c.id) === String(companyId));
  if (!comp) {
    alert('ไม่พบข้อมูลสถานประกอบการที่ต้องการแก้ไข');
    return;
  }
  const modal = document.getElementById('add-master-company-modal');
  const titleEl = document.getElementById('mc-modal-title');
  const submitBtn = document.getElementById('mc-submit-btn');
  const pendingOpt = document.getElementById('mc-status-opt-pending') as HTMLOptionElement | null;
  if (titleEl) titleEl.textContent = 'แก้ไขข้อมูลสถานประกอบการ (Company Master Data)';
  if (submitBtn) submitBtn.textContent = 'บันทึกการแก้ไข';

  const isStudentSubmitted = Boolean(
    comp.submittedByStudentCode ||
    comp.submittedByStudentName ||
    String(comp.id || '').startsWith('COMP-NEW-')
  );
  if (pendingOpt) {
    pendingOpt.style.display = isStudentSubmitted ? '' : 'none';
    pendingOpt.disabled = !isStudentSubmitted;
  }

  const setVal = (id: string, val: string) => {
    const el = document.getElementById(id) as HTMLInputElement | HTMLSelectElement | null;
    if (el) el.value = val;
  };
  setVal('mc-company-id', comp.id || '');
  setVal('mc-name-th', comp.nameTh || '');
  setVal('mc-name-en', comp.nameEn && comp.nameEn !== '-' ? comp.nameEn : '');
  setVal('mc-province', comp.province && comp.province !== '-' ? comp.province : '');
  setVal('mc-address', comp.address && comp.address !== '-' ? comp.address : '');
  setVal('mc-hr-name', comp.hrContactName && comp.hrContactName !== '-' ? comp.hrContactName : '');
  setVal('mc-hr-phone', comp.hrPhone && comp.hrPhone !== '-' ? comp.hrPhone : '');
  setVal('mc-hr-email', comp.hrEmail && comp.hrEmail !== '-' ? comp.hrEmail : '');
  setVal('mc-positions', comp.recommendedPositions && comp.recommendedPositions !== '-' ? comp.recommendedPositions : '');
  setVal('mc-status', comp.status === 'PARTNER' || comp.status === 'BLACKLIST' ? comp.status : 'VERIFIED');

  if (modal) modal.style.display = 'flex';
};

window.closeAddMasterCompanyModal = function() {
  const modal = document.getElementById('add-master-company-modal');
  if (modal) modal.style.display = 'none';
};

window.submitNewMasterCompany = async function() {
  const id = document.getElementById('mc-company-id')?.value?.trim() || undefined;
  const nameTh = document.getElementById('mc-name-th')?.value?.trim();
  const nameEn = document.getElementById('mc-name-en')?.value?.trim();
  const province = document.getElementById('mc-province')?.value?.trim();
  const address = document.getElementById('mc-address')?.value?.trim();
  const hrContactName = document.getElementById('mc-hr-name')?.value?.trim();
  const hrPhone = document.getElementById('mc-hr-phone')?.value?.trim();
  const hrEmail = document.getElementById('mc-hr-email')?.value?.trim();
  const recommendedPositions = document.getElementById('mc-positions')?.value?.trim();
  const status = document.getElementById('mc-status')?.value || 'VERIFIED';

  if (!nameTh) {
    alert('กรุณากรอกชื่อสถานประกอบการ');
    return;
  }

  try {
    const res = await fetch('/api/admin/super-admin/companies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id,
        nameTh,
        nameEn,
        province,
        address,
        hrContactName,
        hrPhone,
        hrEmail,
        recommendedPositions,
        status,
      }),
    });
    const data = await res.json();
    if (data.success) {
      alert('✅ ' + data.message);
      window.closeAddMasterCompanyModal();
      await window.loadSuperAdminOverview();
    } else {
      alert('เกิดข้อผิดพลาด: ' + (data.message || 'ไม่สามารถบันทึกได้'));
    }
  } catch (err) {
    console.error(err);
  }
};

window.deleteMasterCompany = async function(companyId) {
  const comp = (superAdminData.companyMasterData || []).find(c => String(c.id) === String(companyId));
  const compName = comp?.nameTh || companyId;
  if (!window.confirm(`ยืนยันการลบสถานประกอบการ "${compName}" ออกจากระบบใช่หรือไม่?`)) {
    return;
  }

  try {
    const res = await fetch(`/api/admin/super-admin/companies/${encodeURIComponent(companyId)}`, {
      method: 'DELETE',
    });
    const data = await res.json();
    if (data.success) {
      selectedPendingCompanyIds.delete(String(companyId));
      pendingCompanyMergeTargets.delete(String(companyId));
      await window.loadSuperAdminOverview();
    } else {
      alert('เกิดข้อผิดพลาด: ' + (data.message || 'ไม่สามารถลบข้อมูลได้'));
    }
  } catch (err) {
    console.error(err);
    alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
  }
};

// =========================================================================
// WORKSPACE 5: ออกเอกสารราชการอัตโนมัติ (หนังสือขอความอนุเคราะห์ + ใบตอบรับ & หนังสือส่งตัว)
// =========================================================================
function renderCompanyGroups() {
  const container = document.getElementById('company-groups-container');
  if (!container) return;
  const groups = superAdminData.companyGroups || [];

  if (groups.length === 0) {
    container.innerHTML = `<div style="grid-column:1/-1; padding:18px; text-align:center; color:#64748B; background:#F8FAFC; border-radius:12px;">ยังไม่มีกลุ่มนิสิตที่ยื่นสถานประกอบการในขณะนี้</div>`;
    return;
  }

  container.innerHTML = groups.map(g => {
    const studentIdsJson = JSON.stringify(g.students.map(s => s.studentId));
    const escapedComp = (g.companyName || '').replace(/'/g, "\\'");
    const allIssued = g.students.every(s => s.requestLetterIssued);

    return `
      <div style="border:1px solid #E2E8F0; border-radius:14px; padding:14px 16px; background:#FFFFFF; box-shadow:0 2px 8px rgba(15,23,42,0.04); display:flex; flex-direction:column; justify-content:space-between; gap:10px;">
        <div>
          <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px;">
            <div style="font-weight:800; color:#1E1B4B; font-size:13.5px;">🏢 ${g.companyName}</div>
            <span style="background:#EEF2FF; color:#4338CA; font-size:11px; font-weight:700; padding:2px 8px; border-radius:999px; white-space:nowrap;">
              ${g.students.length} คน
            </span>
          </div>
          <div style="margin-top:8px; display:flex; flex-direction:column; gap:4px;">
            ${g.students.map((st, idx) => `
              <div style="font-size:12px; color:#334155; display:flex; justify-content:space-between;">
                <span>${idx + 1}. <strong>${st.studentCode}</strong> ${st.nameTh}</span>
                <span style="font-size:11px; color:${st.requestLetterIssued ? '#059669' : '#D97706'}; font-weight:600;">
                  ${st.requestLetterIssued ? '✓ ออกหนังสือแล้ว' : 'รอออกหนังสือ'}
                </span>
              </div>
            `).join('')}
          </div>
        </div>
        <div style="display:flex; gap:6px; padding-top:8px; border-top:1px solid #F1F5F9;">
          <button type="button" onclick='issueGroupRequestLetter(${studentIdsJson}, "${escapedComp}")'
            style="flex:1; background:${allIssued ? '#475569' : '#4338CA'}; color:white; border:none; padding:7px 10px; border-radius:8px; font-size:11.5px; font-weight:700; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; gap:4px;">
            <span class="material-icons" style="font-size:14px;">description</span>
            <span>${g.students.length > 1 ? `ออกหนังสือรวมกลุ่ม (${g.students.length} คน)` : 'ออกหนังสือขอความอนุเคราะห์'}</span>
          </button>
          <button type="button" onclick='openOfficialLetterPreview("REQUEST", ${studentIdsJson}, "${escapedComp}")'
            style="background:#EEF2FF; color:#312E81; border:1px solid #C7D2FE; padding:7px 10px; border-radius:8px; font-size:11.5px; font-weight:700; cursor:pointer; display:inline-flex; align-items:center; gap:4px;">
            <span class="material-icons" style="font-size:14px;">visibility</span> พรีวิว PDF
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function escapeHtmlText(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderCompanyResponseReviewCell(d) {
  const hasFile = Boolean(d.companyResponseFileUrl || d.companyResponseSubmittedByStudent);
  const ocr = d.companyResponseOcr || null;

  let ocrBoxHtml = '';
  if (!hasFile) {
    ocrBoxHtml = `
      <div style="font-size:11.5px; color:#B45309; font-weight:600; margin-bottom:6px;">
        ⏳ รอนิสิตอัปโหลดใบตอบรับจากบริษัท
      </div>
    `;
  } else if (ocr && ocr.status === 'DONE' && ocr.result === 'ACCEPTED') {
    const confPct = Math.round((Number(ocr.confidence) || 0.85) * 100);
    const reasonText = (ocr.reasons && ocr.reasons[0]) || 'ตรวจพบรอยติ๊กหรือรายละเอียดในช่องตอบรับ';
    const warnHtml = Array.isArray(ocr.warnings) && ocr.warnings.length > 0
      ? `<div style="margin-top:3px; font-size:10.5px; color:#B45309; font-weight:600;">⚠️ ${escapeHtmlText(ocr.warnings.join(' / '))}</div>`
      : '';
    ocrBoxHtml = `
      <div style="background:#ECFDF5; border:1px solid #6EE7B7; border-radius:8px; padding:7px 9px; margin-bottom:6px;">
        <div style="font-size:11.5px; font-weight:800; color:#065F46;">
          🤖 OCR ตรวจพบ: คาดว่า "บริษัทตอบรับ" (${confPct}%)
        </div>
        <div style="font-size:10.5px; color:#047857; margin-top:2px;">
          ${escapeHtmlText(reasonText)}
        </div>
        ${ocr.extracted?.acceptDetailText ? `<div style="font-size:10.5px; color:#064E3B; margin-top:2px;">ข้อความที่อ่านได้: "${escapeHtmlText(ocr.extracted.acceptDetailText)}"</div>` : ''}
        ${warnHtml}
      </div>
    `;
  } else if (ocr && ocr.status === 'DONE' && ocr.result === 'REJECTED') {
    const confPct = Math.round((Number(ocr.confidence) || 0.85) * 100);
    const reasonText = (ocr.reasons && ocr.reasons[0]) || 'ตรวจพบรอยติ๊กหรือเหตุผลในช่องปฏิเสธ';
    const warnHtml = Array.isArray(ocr.warnings) && ocr.warnings.length > 0
      ? `<div style="margin-top:3px; font-size:10.5px; color:#B45309; font-weight:600;">⚠️ ${escapeHtmlText(ocr.warnings.join(' / '))}</div>`
      : '';
    ocrBoxHtml = `
      <div style="background:#FEF2F2; border:1px solid #FCA5A5; border-radius:8px; padding:7px 9px; margin-bottom:6px;">
        <div style="font-size:11.5px; font-weight:800; color:#991B1B;">
          🤖 OCR ตรวจพบ: คาดว่า "บริษัทปฏิเสธ" (${confPct}%)
        </div>
        <div style="font-size:10.5px; color:#B91C1C; margin-top:2px;">
          ${escapeHtmlText(reasonText)}
        </div>
        ${ocr.extracted?.rejectReasonText ? `<div style="font-size:10.5px; color:#7F1D1D; margin-top:2px;">เนื่องจาก: "${escapeHtmlText(ocr.extracted.rejectReasonText)}"</div>` : ''}
        ${warnHtml}
      </div>
    `;
  } else {
    const unclearReason =
      (ocr && Array.isArray(ocr.reasons) && ocr.reasons[0]) ||
      'ไม่พบการติ๊กช่อง ☐ และไม่พบข้อความหลังช่องตอบรับ/ปฏิเสธ หรืออ่านไฟล์ไม่ได้';
    ocrBoxHtml = `
      <div style="background:#FFFBEB; border:1.5px solid #F59E0B; border-radius:8px; padding:7px 9px; margin-bottom:6px;">
        <div style="font-size:11.5px; font-weight:800; color:#B45309; display:flex; align-items:center; gap:4px;">
          ⚠️ แจ้งเตือน: ระบบตรวจผลอัตโนมัติไม่ได้
        </div>
        <div style="font-size:10.5px; color:#92400E; margin-top:2px; line-height:1.35;">
          ${escapeHtmlText(unclearReason)} — กรุณาเปิดไฟล์ตรวจด้วยตาก่อนกดยืนยัน
        </div>
      </div>
    `;
  }

  const fileActionsHtml = hasFile
    ? `
      <div style="display:flex; gap:5px; align-items:center; flex-wrap:wrap; margin-bottom:6px;">
        ${d.companyResponseFileUrl
          ? `<a href="${d.companyResponseFileUrl}" target="_blank" rel="noopener"
              style="background:#EFF6FF; color:#1D4ED8; border:1px solid #BFDBFE; padding:3px 8px; border-radius:6px; font-size:11px; font-weight:700; text-decoration:none; display:inline-flex; align-items:center; gap:3px;">
              👁️ เปิดดูใบตอบรับที่นิสิตแนบ
            </a>`
          : `<span style="font-size:11px; color:#475569;">📎 ${escapeHtmlText(d.companyResponseFileName || 'แนบไฟล์แล้ว')}</span>`}
        <button type="button" onclick="rescanCompanyResponseOcr(${d.studentId})"
          style="background:#F8FAFC; color:#334155; border:1px solid #CBD5E1; padding:3px 7px; border-radius:6px; font-size:10.5px; font-weight:600; cursor:pointer;"
          title="สแกนตรวจสอบด้วย PaddleOCR อีกครั้ง">
          🔄 สแกนซ้ำ
        </button>
      </div>
    `
    : '';

  return `
    ${ocrBoxHtml}
    ${fileActionsHtml}
    <div style="display:flex; gap:5px; flex-wrap:wrap;">
      <button type="button" onclick="recordCompanyResponseAction(${d.studentId}, 'ACCEPTED')"
        style="background:#10B981; color:white; border:none; padding:5px 9px; border-radius:7px; font-size:11px; font-weight:700; cursor:pointer;">
        ✓ ยืนยันบริษัทตอบรับ
      </button>
      <button type="button" onclick="recordCompanyResponseAction(${d.studentId}, 'REJECTED')"
        style="background:#EF4444; color:white; border:none; padding:5px 9px; border-radius:7px; font-size:11px; font-weight:700; cursor:pointer;">
        ✗ ยืนยันปฏิเสธ (ปลดล็อก+Archive)
      </button>
    </div>
  `;
}

window.rescanCompanyResponseOcr = async function(studentId) {
  try {
    const res = await fetch('/api/admin/super-admin/documents/rescan-company-response', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId }),
    });
    const data = await res.json();
    if (data.success) {
      alert('🔍 ' + (data.message || 'สแกนใบตอบรับซ้ำเรียบร้อยแล้ว'));
      await window.loadSuperAdminOverview();
    } else {
      alert('ไม่สามารถสแกนซ้ำได้: ' + (data.message || 'เกิดข้อผิดพลาด'));
    }
  } catch (err) {
    console.error(err);
    alert('เกิดข้อผิดพลาดในการเชื่อมต่อระบบ OCR');
  }
};

window.renderDocumentQueueTable = function() {
  const tbody = document.getElementById('doc-workflow-tbody');
  if (!tbody) return;
  const filterVal = document.getElementById('doc-queue-filter')?.value || 'ALL';

  let list = superAdminData.documentQueue || [];
  if (filterVal === 'READY_FOR_REQ') {
    list = list.filter(d => d.companyName !== 'ยังไม่ยื่นบริษัท' && !d.requestLetterIssued);
  } else if (filterVal === 'WAITING_RESPONSE') {
    list = list.filter(d => d.requestLetterIssued && d.companyResponseStatus === 'WAITING_RESPONSE');
  } else if (filterVal === 'ACCEPTED') {
    list = list.filter(d => d.companyResponseStatus === 'ACCEPTED' && !d.dispatchLetterIssued);
  } else if (filterVal === 'DISPATCHED') {
    list = list.filter(d => d.dispatchLetterIssued);
  }

  if (list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center py-6 text-gray-400">ไม่มีรายการนิสิตในตัวกรองนี้</td></tr>';
    return;
  }

  tbody.innerHTML = list.map(d => {
    const escapedComp = (d.companyName || '').replace(/'/g, "\\'");
    const checklistBadge = d.checklistStatus === 'APPROVED'
      ? `<span style="background:#DCFCE7; color:#166534; padding:2px 8px; border-radius:999px; font-size:11px; font-weight:700;">✓ ที่ปรึกษาอนุมัติ</span>`
      : d.checklistStatus === 'PENDING'
      ? `<span style="background:#FEF3C7; color:#B45309; padding:2px 8px; border-radius:999px; font-size:11px; font-weight:700;">⏳ รอที่ปรึกษาตรวจ</span>`
      : `<span style="background:#F1F5F9; color:#64748B; padding:2px 8px; border-radius:999px; font-size:11px;">ยังไม่ยื่น</span>`;

    // คอลัมน์ 1: หนังสือขอความอนุเคราะห์ (+แบบฟอร์มใบตอบรับ)
    let reqColHtml = '';
    if (d.companyName === 'ยังไม่ยื่นบริษัท' || d.companyName === 'รอเลือกบริษัทใหม่ (ปลดล็อกแล้ว)') {
      reqColHtml = `<span style="font-size:11.5px; color:#94A3B8;">รอนิสิตยื่นบริษัทใหม่</span>`;
    } else if (d.requestLetterIssued) {
      reqColHtml = `
        <div style="font-size:11.5px; font-weight:700; color:#059669;">✓ ออกหนังสือแล้ว (${d.requestLetterDocNo})</div>
        <div style="font-size:11px; color:#64748B;">นัดสัมภาษณ์: ${d.interviewDate || '-'}</div>
        <div style="display:flex; gap:4px; margin-top:4px; flex-wrap:wrap;">
          <button type="button" onclick='openOfficialLetterPreview("REQUEST", [${d.studentId}], "${escapedComp}")'
            style="background:#EEF2FF; color:#312E81; border:1px solid #C7D2FE; padding:3px 8px; border-radius:6px; font-size:11px; font-weight:700; cursor:pointer;">
            📄 หนังสือขอความอนุเคราะห์
          </button>
          <a href="/documents/acceptance_form_se.pdf" download="แบบตอบรับนิสิตฝึกงาน_SE.pdf" target="_blank" rel="noopener"
            style="background:#F0FDF4; color:#166534; border:1px solid #BBF7D0; padding:3px 8px; border-radius:6px; font-size:11px; font-weight:700; text-decoration:none;">
            📥 แบบตอบรับเปล่า
          </a>
          <button type="button" onclick="toggleDocumentLockOverride(${d.studentId})"
            style="background:#F8FAFC; color:#475569; border:1px solid #CBD5E1; padding:3px 7px; border-radius:6px; font-size:10.5px; cursor:pointer;" title="ปลดล็อกกรณีฉุกเฉินโดย Super Admin">
            ${d.isLocked ? '🔒 ล็อกอยู่' : '🔓 ปลดล็อกแล้ว'}
          </button>
        </div>
      `;
    } else if (d.checklistStatus !== 'APPROVED') {
      reqColHtml = `<span style="font-size:11.5px; color:#94A3B8;">รอ อ.ที่ปรึกษาอนุมัติ Checklist ก่อน</span>`;
    } else {
      reqColHtml = `
        <div style="margin-bottom:4px;">
          <label style="font-size:10.5px; color:#64748B;">วันสัมภาษณ์:</label>
          <input type="date" id="interview-date-${d.studentId}" value="${d.interviewDate || '2026-02-15'}" class="input-field" style="font-size:11px; padding:3px 6px !important; width:125px;" />
        </div>
        <button type="button" onclick='issueSingleRequestLetter(${d.studentId}, "${escapedComp}")'
          style="background:#4338CA; color:white; border:none; padding:6px 10px; border-radius:8px; font-size:11.5px; font-weight:700; cursor:pointer; width:100%;">
          ออกหนังสือขอความอนุเคราะห์ (+ใบตอบรับ)
        </button>
      `;
    }

    // คอลัมน์ 2: ผลใบตอบรับจากสถานประกอบการ (รับเข้าฝึกงาน vs ปฏิเสธ)
    let respColHtml = '';
    if (!d.requestLetterIssued && (d.companyResponseStatus === 'NOT_SENT' || d.companyResponseStatus === 'REJECTED')) {
      if (d.companyResponseStatus === 'REJECTED') {
        respColHtml = `
          <div style="background:#FEE2E2; color:#991B1B; padding:4px 8px; border-radius:6px; font-size:11px; font-weight:700;">
            ✗ บริษัทเดิมปฏิเสธ (ย้ายเข้า Archive แล้ว)
          </div>
          <div style="font-size:11px; color:#64748B; margin-top:2px;">รอนิสิตยื่นบริษัทใหม่</div>
        `;
      } else {
        respColHtml = `<span style="font-size:11.5px; color:#94A3B8;">รอออกหนังสือขอความอนุเคราะห์ก่อน</span>`;
      }
    } else if (d.companyResponseStatus === 'ACCEPTED') {
      respColHtml = `
        <div style="font-size:12px; font-weight:700; color:#166534;">✅ บริษัทตอบรับเข้าฝึกงานแล้ว</div>
        ${d.companyResponseFileUrl
          ? `<a href="${d.companyResponseFileUrl}" target="_blank" rel="noopener" style="font-size:11px; color:#2563EB;">📎 ${escapeHtmlText(d.companyResponseFileName || 'ไฟล์ใบตอบรับ')}</a>`
          : `<div style="font-size:11px; color:#64748B;">ไฟล์: ${escapeHtmlText(d.companyResponseFileName || 'ใบตอบรับ_ประทับตรา.pdf')}</div>`}
      `;
    } else if (d.companyResponseStatus === 'WAITING_ADVISOR_APPROVAL') {
      respColHtml = `
        <div style="background:#FFFBEB; border:1px solid #FCD34D; border-radius:8px; padding:7px 9px; margin-bottom:4px;">
          <div style="font-size:11.5px; font-weight:800; color:#B45309;">
            ⏳ นิสิตอัปโหลดแล้ว (รอ อ.ที่ปรึกษาตรวจ)
          </div>
          <div style="font-size:10.5px; color:#92400E; margin-top:2px;">
            ที่ปรึกษา: ${escapeHtmlText(d.advisorName || 'ยังไม่ระบุ')}
          </div>
        </div>
        <div style="display:flex; gap:5px; align-items:center; flex-wrap:wrap;">
          ${d.companyResponseFileUrl
            ? `<a href="${d.companyResponseFileUrl}" target="_blank" rel="noopener"
                style="background:#EFF6FF; color:#1D4ED8; border:1px solid #BFDBFE; padding:3px 8px; border-radius:6px; font-size:11px; font-weight:700; text-decoration:none;">
                👁️ เปิดดูใบตอบรับที่นิสิตแนบ
              </a>`
            : ''}
        </div>
      `;
    } else if (d.companyResponseStatus === 'ADVISOR_APPROVED') {
      respColHtml = `
        <div style="background:#ECFDF5; border:1px solid #6EE7B7; border-radius:8px; padding:6px 9px; margin-bottom:5px;">
          <div style="font-size:11.5px; font-weight:800; color:#065F46;">
            ✓ ที่ปรึกษาอนุมัติใบตอบรับแล้ว
          </div>
          ${d.advisorAcceptanceNote ? `<div style="font-size:10.5px; color:#047857;">ข้อความ: "${escapeHtmlText(d.advisorAcceptanceNote)}"</div>` : ''}
        </div>
        ${renderCompanyResponseReviewCell(d)}
      `;
    } else if (d.companyResponseStatus === 'REJECTED') {
      respColHtml = `
        <div style="background:#FEE2E2; color:#991B1B; padding:4px 8px; border-radius:6px; font-size:11px; font-weight:700;">
          ✗ บริษัทเดิมปฏิเสธ (ย้ายเข้า Archive แล้ว)
        </div>
        <div style="font-size:11px; color:#64748B; margin-top:2px;">รอนิสิตยื่นบริษัทใหม่</div>
      `;
    } else {
      respColHtml = renderCompanyResponseReviewCell(d);
    }

    // คอลัมน์ 3: หนังสือส่งตัวนิสิตเข้าฝึกงาน
    let dispColHtml = '';
    if (d.dispatchLetterIssued) {
      dispColHtml = `
        <div style="font-size:12px; font-weight:700; color:#1E40AF;">✓ ออกหนังสือส่งตัวแล้ว</div>
        <div style="font-size:11px; color:#64748B;">เลขที่ ${d.dispatchLetterDocNo || 'อว 7316/ว 0512'}</div>
        <button type="button" onclick='openOfficialLetterPreview("DISPATCH", [${d.studentId}], "${escapedComp}")'
          style="margin-top:4px; background:#DBEAFE; color:#1E40AF; border:1px solid #93C5FD; padding:4px 9px; border-radius:6px; font-size:11px; font-weight:700; cursor:pointer;">
          📄 พิมพ์หนังสือส่งตัว (PDF)
        </button>
      `;
    } else if (d.companyResponseStatus === 'ACCEPTED') {
      dispColHtml = `
        <button type="button" onclick="issueDispatchLetterForStudent(${d.studentId})"
          style="background:#059669; color:white; border:none; padding:7px 12px; border-radius:8px; font-size:11.5px; font-weight:700; cursor:pointer; width:100%; box-shadow:0 2px 6px rgba(5,150,105,0.25);">
          🚀 อนุมัติ &amp; ออกหนังสือส่งตัว
        </button>
      `;
    } else {
      dispColHtml = `<span style="font-size:11.5px; color:#94A3B8;">รอผลตอบรับ "รับเข้าฝึกงาน"</span>`;
    }

    return `
      <tr>
        <td>
          <div style="font-weight:800; color:#1E1B4B;">${d.studentCode}</div>
          <div style="font-size:12.5px; color:#334155; font-weight:600;">${d.nameTh}</div>
          <div style="font-size:11px; color:#64748B;">สาขา${d.major}</div>
        </td>
        <td>
          <div style="font-weight:700; color:#1E293B;">${d.companyName}</div>
          <div style="font-size:11.5px; color:#64748B;">ตำแหน่ง: ${d.position}</div>
          ${d.archiveCount > 0 ? `
            <div style="margin-top:4px;">
              <button type="button" onclick="window.openStudentArchiveModal(${d.studentId})"
                style="background:#FEF3C7; color:#92400E; border:1px solid #FCD34D; padding:2px 8px; border-radius:6px; font-size:10.5px; font-weight:700; cursor:pointer;"
                title="คลิกเพื่อดูประวัติรอบก่อนหน้าที่ถูกปฏิเสธ">
                📜 มีประวัติใน Archive (${d.archiveCount} แห่ง)
              </button>
            </div>
          ` : ''}
        </td>
        <td>${checklistBadge}</td>
        <td>${reqColHtml}</td>
        <td>${respColHtml}</td>
        <td>${dispColHtml}</td>
      </tr>
    `;
  }).join('');
};

window.issueSingleRequestLetter = async function(studentId, companyName) {
  const interviewDate = document.getElementById(`interview-date-${studentId}`)?.value || '2026-02-15';
  await window.issueGroupRequestLetter([studentId], companyName, interviewDate);
};

window.issueGroupRequestLetter = async function(studentIds, companyName, interviewDate) {
  const defaultPrefix = superAdminData.academicConfig?.defaultDocPrefix || 'อว 7316/';
  const suggestedNo = `${defaultPrefix}ว ${Math.floor(100 + Math.random() * 899)}`;
  const docNo = prompt(
    `ระบุเลขที่หนังสือขอความอนุเคราะห์ สำหรับ "${companyName}" (${studentIds.length} คน):\n(ระบบจะแนบแบบฟอร์มใบตอบรับของสถานประกอบการไปพร้อมหนังสือฉบับนี้)`,
    suggestedNo
  );
  if (!docNo) return;

  try {
    const res = await fetch('/api/admin/super-admin/documents/issue-request-letter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentIds,
        docNo,
        companyName,
        interviewDate: interviewDate || '2026-02-15',
      }),
    });
    const data = await res.json();
    if (data.success) {
      alert('✅ ' + data.message);
      await window.loadSuperAdminOverview();
      window.openOfficialLetterPreview('REQUEST', studentIds, companyName);
    } else {
      alert('เกิดข้อผิดพลาด: ' + (data.message || 'ไม่สามารถออกหนังสือได้'));
    }
  } catch (err) {
    console.error(err);
  }
};

window.recordCompanyResponseAction = async function(studentId, responseStatus) {
  const targetDoc = (superAdminData.documentQueue || []).find(d => d.studentId === studentId);
  if (responseStatus === 'REJECTED') {
    const ocrRejectReason = targetDoc?.companyResponseOcr?.extracted?.rejectReasonText || '';
    const defaultReason = ocrRejectReason
      ? `เนื่องจาก: ${ocrRejectReason}`
      : 'สถานประกอบการแจ้งเต็มอัตรา / ไม่ผ่านการคัดเลือก';
    const reason = prompt(
      'ระบุสาเหตุที่สถานประกอบการปฏิเสธ (ระบบจะเก็บประวัติบริษัทนี้ไว้ใน Archive และปลดล็อกให้นิสิตยื่น Checklist บริษัทแห่งใหม่ได้ทันที):',
      defaultReason
    );
    if (reason === null) return;
    try {
      const res = await fetch('/api/admin/super-admin/documents/record-company-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, responseStatus: 'REJECTED', note: reason }),
      });
      const data = await res.json();
      if (data.success) {
        alert('🔓 ' + data.message);
        await window.loadSuperAdminOverview();
        await loadDashboardSummary();
        await loadStudents();
      }
    } catch (err) {
      console.error(err);
    }
    return;
  }

  try {
    const res = await fetch('/api/admin/super-admin/documents/record-company-response', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentId,
        responseStatus: 'ACCEPTED',
        note: 'ตรวจสอบไฟล์สแกนใบตอบรับแล้ว สถานประกอบการตอบรับเข้าฝึกงาน',
      }),
    });
    const data = await res.json();
    if (data.success) {
      alert('✅ ' + data.message);
      await window.loadSuperAdminOverview();
    }
  } catch (err) {
    console.error(err);
  }
};

window.issueDispatchLetterForStudent = async function(studentId) {
  const defaultPrefix = superAdminData.academicConfig?.defaultDocPrefix || 'อว 7316/';
  const suggestedNo = `${defaultPrefix}ว ${Math.floor(500 + Math.random() * 499)}`;
  const docNo = prompt('ระบุเลขที่หนังสือส่งตัวนิสิตเข้าฝึกงาน (Dispatch Letter):', suggestedNo);
  if (!docNo) return;

  try {
    const res = await fetch('/api/admin/super-admin/documents/issue-dispatch-letter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentIds: [studentId], docNo }),
    });
    const data = await res.json();
    if (data.success) {
      alert('🎉 ' + data.message);
      await window.loadSuperAdminOverview();
      await loadDashboardSummary();
      await loadStudents();
      const target = (superAdminData.documentQueue || []).find(d => d.studentId === studentId);
      window.openOfficialLetterPreview('DISPATCH', [studentId], target?.companyName || 'สถานประกอบการ');
    }
  } catch (err) {
    console.error(err);
  }
};

window.toggleDocumentLockOverride = async function(studentId) {
  try {
    const res = await fetch('/api/admin/super-admin/documents/toggle-lock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId }),
    });
    const data = await res.json();
    if (data.success) {
      alert('🔔 ' + data.message);
      await window.loadSuperAdminOverview();
    }
  } catch (err) {
    console.error(err);
  }
};

function renderArchiveHistoryTable() {
  const tbody = document.getElementById('archive-history-tbody');
  if (!tbody) return;
  const list = superAdminData.archivedApplications || [];
  if (list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center py-6 text-gray-400">ยังไม่มีประวัติบริษัทเดิมที่ถูกปฏิเสธใน Archive</td></tr>';
    return;
  }

  tbody.innerHTML = list.map(a => `
    <tr>
      <td style="font-weight:700; color:#1E1B4B;">${a.studentCode}</td>
      <td>${a.studentName}</td>
      <td>${a.major}</td>
      <td style="font-weight:700; color:#991B1B;">${a.companyName}</td>
      <td>
        <span style="background:#FEE2E2; color:#991B1B; padding:2px 8px; border-radius:999px; font-size:11px; font-weight:700;">
          ${a.reason === 'COMPANY_REJECTED' ? 'บริษัทปฏิเสธในใบตอบรับ' : 'ที่ปรึกษาไม่อนุมัติ Checklist'}
        </span>
      </td>
      <td style="font-size:12px; color:#475569;">${a.note || '-'}</td>
      <td style="font-size:11.5px; color:#64748B;">${new Date(a.archivedAt).toLocaleDateString('th-TH')}</td>
    </tr>
  `).join('');
}

window.openStudentArchiveModal = function(studentId: number) {
  const modal = document.getElementById('student-archive-modal');
  const bodyEl = document.getElementById('student-archive-modal-body');
  const titleEl = document.getElementById('student-archive-modal-title');
  const subEl = document.getElementById('student-archive-modal-subtitle');
  if (!modal || !bodyEl) return;

  const allArchives = superAdminData.archivedApplications || [];
  const archives = allArchives.filter((a: any) => a.studentId === studentId || a.studentCode === String(studentId));
  const student = (superAdminData.documentQueue || []).find((d: any) => d.studentId === studentId);

  const studentName = student ? `${student.nameTh} (${student.studentCode})` : (archives[0]?.studentName ? `${archives[0].studentName} (${archives[0].studentCode})` : `รหัสนิสิต ${studentId}`);
  const major = student?.major || archives[0]?.major || '';

  if (titleEl) titleEl.textContent = `ประวัติการยื่นบริษัทเดิม (Archive) - ${studentName}`;
  if (subEl) subEl.textContent = `สาขาวิชา${major} • มีประวัติรอบที่ไม่ผ่านทั้งหมด ${archives.length} รายการ`;

  if (archives.length === 0) {
    bodyEl.innerHTML = `
      <div style="text-align:center; padding:40px 20px; color:#94A3B8;">
        <span class="material-icons" style="font-size:48px; opacity:0.5;">inventory_2</span>
        <p style="margin-top:8px; font-weight:600;">ยังไม่มีประวัติรอบก่อนหน้าในระบบ Archive สำหรับนิสิตคนนี้</p>
      </div>
    `;
  } else {
    bodyEl.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:14px;">
        ${archives.map((a: any, idx: number) => {
          const reasonLabel = a.reason === 'COMPANY_REJECTED'
            ? 'บริษัทปฏิเสธในใบตอบรับ'
            : a.reason === 'ADVISOR_REJECTED'
            ? 'ที่ปรึกษาไม่อนุมัติ Checklist'
            : 'ยกเลิกการสมัคร';
          const reasonColor = a.reason === 'COMPANY_REJECTED' ? '#DC2626' : '#D97706';
          const reasonBg = a.reason === 'COMPANY_REJECTED' ? '#FEF2F2' : '#FFFBEB';
          const dateStr = a.archivedAt ? new Date(a.archivedAt).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';

          return `
            <div style="background:#F8FAFC; border:1px solid #E2E8F0; border-radius:14px; padding:16px;">
              <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:8px;">
                <div>
                  <div style="display:flex; align-items:center; gap:8px;">
                    <span style="background:#EEF2FF; color:#4338CA; font-weight:800; font-size:11px; padding:2px 8px; border-radius:999px;">รอบที่ ${archives.length - idx}</span>
                    <span style="font-weight:800; color:#1E1B4B; font-size:15px;">${escapeHtmlText(a.companyName || '-')}</span>
                  </div>
                  <div style="font-size:12.5px; color:#475569; margin-top:4px;">
                    ตำแหน่ง: <strong>${escapeHtmlText(a.position || 'นิสิตฝึกงาน')}</strong>
                    ${a.province ? ` • จังหวัด: <strong>${escapeHtmlText(a.province)}</strong>` : ''}
                  </div>
                  ${a.contactPersonName || a.phone || a.email ? `
                    <div style="font-size:11.5px; color:#64748B; margin-top:3px;">
                      ผู้ติดต่อ: ${escapeHtmlText(a.contactPersonName || '-')} ${a.phone ? `| โทร: ${escapeHtmlText(a.phone)}` : ''} ${a.email ? `| อีเมล: ${escapeHtmlText(a.email)}` : ''}
                    </div>
                  ` : ''}
                  ${a.companyAddress ? `
                    <div style="font-size:11.5px; color:#64748B; margin-top:2px;">
                      ที่อยู่: ${escapeHtmlText(a.companyAddress)}
                    </div>
                  ` : ''}
                </div>
                <div style="text-align:right;">
                  <span style="display:inline-block; background:${reasonBg}; color:${reasonColor}; border:1px solid ${reasonColor}33; font-weight:700; font-size:11.5px; padding:3px 10px; border-radius:999px;">
                    ${reasonLabel}
                  </span>
                  <div style="font-size:11px; color:#94A3B8; margin-top:4px;">${dateStr}</div>
                </div>
              </div>

              ${a.note ? `
                <div style="margin-top:10px; padding:8px 12px; background:#FFFFFF; border-left:3px solid ${reasonColor}; border-radius:4px; font-size:12px; color:#334155;">
                  <strong>หมายเหตุ / สาเหตุ:</strong> ${escapeHtmlText(a.note)}
                </div>
              ` : ''}

              ${a.fileName || a.fileUrl ? `
                <div style="margin-top:10px; padding:8px 12px; background:#F1F5F9; border-radius:8px; display:flex; align-items:center; justify-content:space-between;">
                  <div style="display:flex; align-items:center; gap:6px; font-size:12px; color:#1E293B;">
                    <span class="material-icons" style="font-size:16px; color:#475569;">attach_file</span>
                    <span>ไฟล์ใบตอบรับที่แนบ: <strong>${escapeHtmlText(a.fileName || 'ไฟล์เอกสาร')}</strong></span>
                  </div>
                  ${a.fileUrl ? `<a href="${a.fileUrl}" target="_blank" style="font-size:11.5px; color:#2563EB; font-weight:700; text-decoration:none;">ดูไฟล์ ↗</a>` : ''}
                </div>
              ` : ''}

              ${a.ocr ? `
                <div style="margin-top:8px; font-size:11.5px; color:#64748B;">
                  ผล OCR: คาดว่าเป็น "${a.ocr.suggestedResult === 'ACCEPTED' ? 'ตอบรับ' : 'ปฏิเสธ'}" (ความมั่นใจ ${Math.round((a.ocr.confidence || 0) * 100)}%)
                </div>
              ` : ''}

              ${a.answers && Object.keys(a.answers).length > 0 ? `
                <details style="margin-top:10px; font-size:12px;">
                  <summary style="cursor:pointer; color:#4F46E5; font-weight:600; user-select:none;">
                    ดูรายละเอียดคำตอบ Checklist ในรอบนี้ (${Object.keys(a.answers).length} ข้อ)
                  </summary>
                  <div style="margin-top:8px; padding:10px; background:white; border-radius:8px; border:1px solid #E2E8F0; max-height:200px; overflow-y:auto;">
                    <ul style="margin:0; padding-left:18px; color:#334155; line-height:1.6;">
                      ${Object.entries(a.answers).map(([k, v]: [string, any]) => `
                        <li>ข้อที่ ${k}: <strong>${v.checked ? '✓ ผ่าน' : '✗ ไม่ผ่าน'}</strong> ${v.text ? `(${escapeHtmlText(v.text)})` : ''}</li>
                      `).join('')}
                    </ul>
                  </div>
                </details>
              ` : ''}
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  modal.style.display = 'flex';
};

window.closeStudentArchiveModal = function() {
  const modal = document.getElementById('student-archive-modal');
  if (modal) modal.style.display = 'none';
};

// พรีวิวและพิมพ์หนังสือราชการ PDF (หนังสือขอความอนุเคราะห์ + แบบฟอร์มใบตอบรับ หรือ หนังสือส่งตัว)
window.openOfficialLetterPreview = function(type, studentIds, companyName) {
  const modal = document.getElementById('official-letter-modal');
  const titleEl = document.getElementById('official-letter-modal-title');
  const areaEl = document.getElementById('official-letter-print-area');
  if (!modal || !areaEl) return;

  const students = (superAdminData.documentQueue || []).filter(d => studentIds.includes(d.studentId));
  const first = students[0] || {
    studentCode: '67023110',
    nameTh: 'นายกรวิชญ์ สิทธิศักดิ์',
    major: 'วิศวกรรมซอฟต์แวร์',
    position: 'Software Developer Intern',
    requestLetterDocNo: 'อว 7316/ว 0142',
    dispatchLetterDocNo: 'อว 7316/ว 0512',
    interviewDate: '2026-02-15',
  };

  const cfg = superAdminData.academicConfig || {};
  const isDocumentIssued = type === 'DISPATCH'
    ? Boolean(first.dispatchLetterIssued)
    : Boolean(first.requestLetterIssued);
  const signatureDataUrl = isDocumentIssued
    ? (type === 'DISPATCH'
      ? first.dispatchLetterSignatureSnapshot
      : first.requestLetterSignatureSnapshot) || ''
    : cfg.signatureDataUrl || '';
  const docNo = type === 'DISPATCH'
    ? (first.dispatchLetterDocNo || `${cfg.defaultDocPrefix || 'อว 7316/'}ว 0512`)
    : (first.requestLetterDocNo || `${cfg.defaultDocPrefix || 'อว 7316/'}ว 0142`);
  const thaiDate = new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
  const subjectText = type === 'DISPATCH'
    ? 'ขอส่งตัวนิสิตเข้าฝึกงานวิชาชีพ / สหกิจศึกษา'
    : 'ขอความอนุเคราะห์รับนิสิตเข้าฝึกงานวิชาชีพ / สหกิจศึกษา และนัดหมายสัมภาษณ์';

  if (titleEl) {
    titleEl.textContent = type === 'DISPATCH'
      ? `พรีวิวหนังสือส่งตัวนิสิตเข้าฝึกงาน (${docNo})`
      : `พรีวิวหนังสือขอความอนุเคราะห์ฝึกงาน (${docNo})`;
  }

  const studentRowsHtml = students.map((s, idx) => `
    <tr>
      <td style="border:1px solid #334155; padding:6px 10px; text-align:center;">${idx + 1}</td>
      <td style="border:1px solid #334155; padding:6px 10px; text-align:center;">${s.studentCode}</td>
      <td style="border:1px solid #334155; padding:6px 10px;">${s.nameTh}</td>
      <td style="border:1px solid #334155; padding:6px 10px;">วท.บ. (${s.major})</td>
      <td style="border:1px solid #334155; padding:6px 10px;">${s.position || 'นิสิตฝึกงาน'}</td>
      <td style="border:1px solid #334155; padding:6px 10px; text-align:center;">${s.phone || '-'}</td>
    </tr>
  `).join('');

  const acceptanceFormHtml = '';

  areaEl.innerHTML = `
    <div style="max-width:720px; margin:0 auto; font-size:14px; color:#0F172A;">
      <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:16px;">
        <div>
          <div style="font-weight:700;">ที่ ${docNo}</div>
        </div>
        <div style="text-align:center;">
          <div style="font-size:17px; font-weight:800; color:#1E1B4B;">คณะเทคโนโลยีสารสนเทศและการสื่อสาร</div>
          <div style="font-size:14px; font-weight:700;">มหาวิทยาลัยพะเยา จ.พะเยา 56000</div>
        </div>
        <div style="text-align:right;">
          <div>วันที่ ${thaiDate}</div>
        </div>
      </div>

      <div style="margin-bottom:10px;"><strong>เรื่อง</strong> &nbsp;&nbsp;${subjectText}</div>
      <div style="margin-bottom:10px;"><strong>เรียน</strong> &nbsp;&nbsp;ผู้จัดการฝ่ายทรัพยากรบุคคล / ผู้บริหาร <strong>${companyName || first.companyName}</strong></div>
      ${type === 'REQUEST' ? `<div style="margin-bottom:14px;"><strong>สิ่งที่ส่งมาด้วย</strong> &nbsp;&nbsp;1. แบบฟอร์มใบตอบรับการเข้าฝึกงานวิชาชีพ และประวัติย่อ (CV) จำนวน ${students.length} ชุด</div>` : ''}

      <p style="text-indent:40px; margin-bottom:12px; text-align:justify;">
        ด้วย คณะเทคโนโลยีสารสนเทศและการสื่อสาร มหาวิทยาลัยพะเยา ได้กำหนดให้นิสิตระดับปริญญาตรี ชั้นปีที่ 3-4 เข้ารับการฝึกงานวิชาชีพและสหกิจศึกษาในสถานประกอบการ เพื่อให้นิสิตได้เพิ่มพูนทักษะและประสบการณ์การทำงานจริงในสายวิชาชีพเทคโนโลยีสารสนเทศ พิจารณาแล้วเห็นว่าหน่วยงานของท่านมีความเหมาะสมและมีมาตรฐานทางวิชาชีพเป็นอย่างดียิ่ง
      </p>

      <p style="text-indent:40px; margin-bottom:14px;">
        ในการนี้ คณะเทคโนโลยีสารสนเทศและการสื่อสาร จึงใคร่<strong>${type === 'DISPATCH' ? 'ขอส่งตัวนิสิตเข้าปฏิบัติงานสหกิจศึกษา/ฝึกงาน' : 'ขอความอนุเคราะห์รับนิสิตเข้าฝึกงานวิชาชีพ/สหกิจศึกษา'}</strong> ประจำปีการศึกษา ${cfg.currentAcademicYear || '2568'} จำนวน ${students.length} คน ดังรายชื่อต่อไปนี้:
      </p>

      <table style="width:100%; border-collapse:collapse; margin-bottom:18px; font-size:13px;">
        <thead>
          <tr style="background:#F1F5F9;">
            <th style="border:1px solid #334155; padding:6px 10px;">ลำดับ</th>
            <th style="border:1px solid #334155; padding:6px 10px;">รหัสนิสิต</th>
            <th style="border:1px solid #334155; padding:6px 10px;">ชื่อ - นามสกุล</th>
            <th style="border:1px solid #334155; padding:6px 10px;">หลักสูตร/สาขาวิชา</th>
            <th style="border:1px solid #334155; padding:6px 10px;">ตำแหน่งที่ยื่นฝึกงาน</th>
            <th style="border:1px solid #334155; padding:6px 10px;">เบอร์โทรศัพท์</th>
          </tr>
        </thead>
        <tbody>
          ${studentRowsHtml}
        </tbody>
      </table>

      <p style="text-indent:40px; margin-bottom:24px;">
        จึงเรียนมาเพื่อโปรดพิจารณาให้ความอนุเคราะห์ และขอขอบพระคุณในความร่วมมือด้วยดีเสมอมา ณ โอกาสนี้
      </p>

      <div style="text-align:center; margin-left:240px; margin-bottom:20px;">
        <div>ขอแสดงความนับถือ</div>
        <div style="height:68px; display:flex; align-items:flex-end; justify-content:center;">
          ${signatureDataUrl ? `<img src="${signatureDataUrl}" alt="ลายเซ็นผู้ลงนาม" style="max-width:150px; max-height:64px; object-fit:contain;" />` : ''}
        </div>
        <div style="font-weight:700;">(${cfg.deanSignatory || 'ผู้ช่วยศาสตราจารย์ ดร.พรเทพ โรจนวสุ'})</div>
        <div>${cfg.deanPosition || 'คณบดีคณะเทคโนโลยีสารสนเทศและการสื่อสาร'}</div>
        <div>มหาวิทยาลัยพะเยา</div>
      </div>

      ${acceptanceFormHtml}
    </div>
  `;

  modal.style.display = 'flex';
};

window.closeOfficialLetterModal = function() {
  const modal = document.getElementById('official-letter-modal');
  if (modal) modal.style.display = 'none';
};

window.printOfficialLetter = function() {
  const areaEl = document.getElementById('official-letter-print-area');
  if (!areaEl) return;
  const win = window.open('', '_blank', 'width=900,height=750');
  if (!win) {
    window.print();
    return;
  }
  win.document.write(`
    <!DOCTYPE html>
    <html lang="th">
      <head>
        <meta charset="utf-8" />
        <title>หนังสือราชการ คณะ ICT มหาวิทยาลัยพะเยา</title>
        <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700;800&display=swap" rel="stylesheet" />
        <style>
          body { font-family: 'Sarabun', sans-serif; padding: 24px 36px; color: #0F172A; line-height: 1.65; }
          @media print {
            body { padding: 0; }
            .official-acceptance-page { border-top: none !important; margin-top: 0 !important; padding-top: 12px !important; page-break-before: always; break-before: page; }
          }
        </style>
      </head>
      <body>
        ${areaEl.innerHTML}
        <script>window.onload = function() { window.print(); };<\/script>
      </body>
    </html>
  `);
  win.document.close();
};

// =========================================================================
// WORKSPACE 6: ส่งออกข้อมูลเชื่อมโยงระบบ Co-op ICT ของพี่แดง (Co-op 01)
// =========================================================================
const selectedCoopStudentIds = new Set<number>();
let currentFilteredCoopList: any[] = [];

window.filterCoopTable = function() {
  renderCoop01PreviewTable();
};

window.clearCoopFilters = function() {
  const searchInput = document.getElementById('coop-search-input') as HTMLInputElement | null;
  const majorSelect = document.getElementById('coop-major-filter') as HTMLSelectElement | null;
  const statusSelect = document.getElementById('coop-status-filter') as HTMLSelectElement | null;

  if (searchInput) searchInput.value = '';
  if (majorSelect) majorSelect.value = 'ALL';
  if (statusSelect) statusSelect.value = 'DISPATCHED';

  renderCoop01PreviewTable();
};

window.toggleCoopStudentSelection = function(event: Event, studentId: number) {
  event.stopPropagation();
  const checkbox = event.currentTarget as HTMLInputElement;
  if (checkbox.checked) {
    selectedCoopStudentIds.add(studentId);
  } else {
    selectedCoopStudentIds.delete(studentId);
  }
  updateCoopSelectionUi();
};

window.toggleSelectAllCoop = function(event: Event) {
  event.stopPropagation();
  const checkbox = event.currentTarget as HTMLInputElement;
  if (checkbox.checked) {
    currentFilteredCoopList.forEach(s => selectedCoopStudentIds.add(s.studentId));
  } else {
    currentFilteredCoopList.forEach(s => selectedCoopStudentIds.delete(s.studentId));
  }
  renderCoop01PreviewTable();
};

window.clearCoopSelection = function() {
  selectedCoopStudentIds.clear();
  renderCoop01PreviewTable();
};

function updateCoopSelectionUi() {
  const selectedBar = document.getElementById('coop-selected-bar');
  const countEl = document.getElementById('coop-selected-count');
  const btnCountEl = document.getElementById('coop-selected-btn-count');
  const selectAllCheckbox = document.getElementById('select-all-coop') as HTMLInputElement | null;

  const count = selectedCoopStudentIds.size;
  if (countEl) countEl.textContent = String(count);
  if (btnCountEl) btnCountEl.textContent = String(count);

  if (selectedBar) {
    selectedBar.style.display = count > 0 ? 'flex' : 'none';
  }

  if (selectAllCheckbox && currentFilteredCoopList.length > 0) {
    selectAllCheckbox.checked = currentFilteredCoopList.every(s => selectedCoopStudentIds.has(s.studentId));
  }
}

function renderCoop01PreviewTable() {
  const tbody = document.getElementById('coop-preview-tbody');
  if (!tbody) return;
  const rawList = superAdminData.documentQueue || [];

  const searchVal = (document.getElementById('coop-search-input') as HTMLInputElement | null)?.value?.trim().toLowerCase() || '';
  const majorVal = (document.getElementById('coop-major-filter') as HTMLSelectElement | null)?.value || 'ALL';
  const statusVal = (document.getElementById('coop-status-filter') as HTMLSelectElement | null)?.value || 'DISPATCHED';

  let list = rawList;

  // กรองตามสถานะส่งตัว
  if (statusVal === 'DISPATCHED') {
    list = list.filter(s => Boolean(s.dispatchLetterIssued));
  } else if (statusVal === 'ACCEPTED') {
    list = list.filter(s => s.companyResponseStatus === 'ACCEPTED' && !s.dispatchLetterIssued);
  } else if (statusVal === 'IN_PROGRESS') {
    list = list.filter(s => !s.dispatchLetterIssued && s.companyResponseStatus !== 'ACCEPTED');
  }

  // กรองตามสาขาวิชา
  if (majorVal !== 'ALL') {
    list = list.filter(s => (s.major || '').includes(majorVal));
  }

  // กรองตามคำค้นหา (รหัสนิสิต / ชื่อ / บริษัท)
  if (searchVal) {
    list = list.filter(s =>
      `${s.studentCode} ${s.nameTh} ${s.companyName} ${s.position}`.toLowerCase().includes(searchVal)
    );
  }

  currentFilteredCoopList = list;

  const countBadge = document.getElementById('coop-filtered-count-badge');
  if (countBadge) {
    countBadge.textContent = `แสดง ${list.length} จากทั้งหมด ${rawList.length} รายการ`;
  }

  if (list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" class="text-center py-6 text-gray-400">ไม่พบนิสิตที่ตรงกับเงื่อนไขตัวกรอง</td></tr>';
    updateCoopSelectionUi();
    return;
  }

  tbody.innerHTML = list.map(s => {
    const isSelected = selectedCoopStudentIds.has(s.studentId);
    const statusBadge = s.dispatchLetterIssued
      ? `<span style="background:#DCFCE7; color:#166534; padding:2px 8px; border-radius:999px; font-size:11px; font-weight:700;">✓ ออกหนังสือส่งตัวแล้ว (${s.dispatchLetterDocNo || '-'})</span>`
      : s.companyResponseStatus === 'ACCEPTED'
      ? `<span style="background:#DBEAFE; color:#1E40AF; padding:2px 8px; border-radius:999px; font-size:11px; font-weight:700;">✓ บริษัทตอบรับแล้ว</span>`
      : `<span style="background:#F1F5F9; color:#64748B; padding:2px 8px; border-radius:999px; font-size:11px;">อยู่ระหว่างดำเนินการ</span>`;

    return `
      <tr class="${isSelected ? 'bg-blue-50/50' : ''}">
        <td style="font-weight:800; color:#1E1B4B;">${s.studentCode}</td>
        <td>${escapeHtmlText(s.nameTh)}</td>
        <td>${escapeHtmlText(s.major)}</td>
        <td style="font-weight:700;">${s.gpa ?? '-'}</td>
        <td style="font-weight:700; color:#1E293B;">${escapeHtmlText(s.companyName)}</td>
        <td>${escapeHtmlText(s.position)}</td>
        <td>
          <div style="font-size:12px;">ที่ปรึกษา: ${escapeHtmlText(s.advisorName)}</div>
          <div style="font-size:11.5px; color:#64748B;">นิเทศก์: ${escapeHtmlText(s.supervisorName)}</div>
        </td>
        <td>${statusBadge}</td>
        <td class="text-center">
          <input type="checkbox" class="coop-student-checkbox" data-student-id="${s.studentId}"
            aria-label="เลือกนิสิต ${escapeHtmlText(s.nameTh)}"
            ${isSelected ? 'checked' : ''}
            style="width:16px;height:16px;cursor:pointer;" />
        </td>
      </tr>
    `;
  }).join('');

  tbody.querySelectorAll<HTMLInputElement>('.coop-student-checkbox').forEach(cb => {
    cb.addEventListener('change', event => {
      const studentId = Number((event.currentTarget as HTMLInputElement).dataset.studentId);
      window.toggleCoopStudentSelection(event, studentId);
    });
  });

  updateCoopSelectionUi();
}

window.openCoopExportModal = function(preferredScope?: string) {
  const modal = document.getElementById('coop-export-modal');
  if (!modal) return;

  const countSelected = selectedCoopStudentIds.size;
  const countFiltered = currentFilteredCoopList.length;
  const countAllDispatched = (superAdminData.documentQueue || []).filter(s => s.dispatchLetterIssued).length;

  const countSelectedEl = document.getElementById('coop-export-count-selected');
  const countFilteredEl = document.getElementById('coop-export-count-filtered');
  const countAllEl = document.getElementById('coop-export-count-all');

  if (countSelectedEl) countSelectedEl.textContent = `${countSelected} รายการ`;
  if (countFilteredEl) countFilteredEl.textContent = `${countFiltered} รายการ`;
  if (countAllEl) countAllEl.textContent = `${countAllDispatched} รายการ`;

  const radioSelected = document.getElementById('coop-export-scope-selected') as HTMLInputElement | null;
  const radioFiltered = document.getElementById('coop-export-scope-filtered') as HTMLInputElement | null;

  if (preferredScope === 'selected' || countSelected > 0) {
    if (radioSelected) radioSelected.checked = true;
  } else {
    if (radioFiltered) radioFiltered.checked = true;
  }

  window.updateCoopExportSummary();
  modal.style.display = 'flex';
};

window.closeCoopExportModal = function() {
  const modal = document.getElementById('coop-export-modal');
  if (modal) modal.style.display = 'none';
};

window.updateCoopExportSummary = function() {
  const scopeRadio = document.querySelector('input[name="coop-export-scope"]:checked') as HTMLInputElement | null;
  const scope = scopeRadio ? scopeRadio.value : 'filtered';

  const labelSelected = document.getElementById('coop-export-opt-selected-label');
  const labelFiltered = document.getElementById('coop-export-opt-filtered-label');
  const labelAll = document.getElementById('coop-export-opt-all-label');
  const summaryEl = document.getElementById('coop-export-summary-text');

  [labelSelected, labelFiltered, labelAll].forEach(lbl => {
    if (lbl) {
      lbl.style.borderColor = '#E2E8F0';
      lbl.style.background = '#FFFFFF';
    }
  });

  let count = 0;
  if (scope === 'selected') {
    if (labelSelected) {
      labelSelected.style.borderColor = '#10B981';
      labelSelected.style.background = '#ECFDF5';
    }
    count = selectedCoopStudentIds.size;
  } else if (scope === 'all_dispatched') {
    if (labelAll) {
      labelAll.style.borderColor = '#10B981';
      labelAll.style.background = '#ECFDF5';
    }
    count = (superAdminData.documentQueue || []).filter(s => s.dispatchLetterIssued).length;
  } else {
    if (labelFiltered) {
      labelFiltered.style.borderColor = '#10B981';
      labelFiltered.style.background = '#ECFDF5';
    }
    count = currentFilteredCoopList.length;
  }

  if (summaryEl) {
    summaryEl.textContent = `เตรียมส่งออกข้อมูล Co-op 01 จำนวน ${count} รายการ`;
  }
};

window.confirmCoopExport = function() {
  const scopeRadio = document.querySelector('input[name="coop-export-scope"]:checked') as HTMLInputElement | null;
  const scope = scopeRadio ? scopeRadio.value : 'filtered';
  const allList = superAdminData.documentQueue || [];

  let exportList: any[] = [];
  if (scope === 'selected') {
    exportList = allList.filter(s => selectedCoopStudentIds.has(s.studentId));
  } else if (scope === 'all_dispatched') {
    exportList = allList.filter(s => s.dispatchLetterIssued);
  } else {
    exportList = currentFilteredCoopList;
  }

  if (exportList.length === 0) {
    alert('ไม่พบรายการนิสิตสำหรับส่งออกตามเงื่อนไขที่เลือก');
    return;
  }

  executeCoopCsvDownload(exportList, scope);
  window.closeCoopExportModal();
};

function executeCoopCsvDownload(list: any[], scopeName: string) {
  const headers = [
    'รหัสนิสิต (Student_ID)',
    'ชื่อ-นามสกุล (Full_Name)',
    'สาขาวิชา (Major)',
    'ชั้นปี (Year)',
    'เกรดเฉลี่ยสะสม (GPAX)',
    'เบอร์โทรศัพท์นิสิต (Phone)',
    'อีเมลมหาวิทยาลัย (Email)',
    'ชื่อสถานประกอบการ (Company_Name_TH)',
    'ตำแหน่งงานสหกิจ/ฝึกงาน (Position)',
    'ที่อยู่สถานประกอบการ (Company_Address)',
    'จังหวัด (Province)',
    'ชื่อผู้ประสานงาน/HR (HR_Contact)',
    'เบอร์โทรศัพท์บริษัท (Company_Phone)',
    'อาจารย์ที่ปรึกษา (Advisor)',
    'อาจารย์นิเทศก์ (Supervisor)',
    'เลขที่หนังสือขอความอนุเคราะห์ (Request_Doc_No)',
    'เลขที่หนังสือส่งตัว (Dispatch_Doc_No)',
    'สถานะส่งต่อ Co-op 01',
  ];

  const rows = list.map(s => [
    s.studentCode,
    s.nameTh,
    s.major,
    s.year,
    s.gpa ?? '',
    s.phone,
    s.email,
    s.companyName,
    s.position,
    s.companyAddress,
    s.companyProvince,
    s.contactPersonName,
    s.contactPersonPhone,
    s.advisorName,
    s.supervisorName,
    s.requestLetterDocNo || '-',
    s.dispatchLetterDocNo || '-',
    s.dispatchLetterIssued ? 'พร้อมส่งต่อ Co-op 01' : 'รอดำเนินการ',
  ].map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','));

  const csvContent = '\uFEFF' + [headers.map(h => `"${h}"`).join(','), ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Coop01_ICT_UP_${scopeName}_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

window.downloadCoop01Csv = function(mode) {
  let list = superAdminData.documentQueue || [];
  if (mode === 'APPROVED_ONLY') {
    const approved = list.filter(s => s.companyResponseStatus === 'ACCEPTED' || s.dispatchLetterIssued);
    if (approved.length > 0) list = approved;
  }
  executeCoopCsvDownload(list, mode || 'direct');
};

// เรียกโหลดข้อมูล Super Admin ทันทีเมื่อเปิดหน้า
window.loadSuperAdminOverview();
window.addEventListener('app:data-updated', () => {
  window.loadSuperAdminOverview();
});


// =====================================================================
// 10. ระบบตั้งค่าและจัดการ CHECKLIST บริษัท (Super Admin / Staff)
// =====================================================================

let allChecklistVersions: any[] = [];
let currentChecklistVersion: any = null;
let originalChecklistSectionsSnapshot: any[] = [];
let isChecklistDirty = false;
let checklistDraftChangesCount = 0;
let tempChecklistDraftIdCounter = -1;
const collapsedChecklistSections = new Set<number>();

(window as any).hasUnsavedChecklistChanges = function() {
  return isChecklistDirty;
};

function resetChecklistDraftBaseline() {
  originalChecklistSectionsSnapshot = JSON.parse(
    JSON.stringify(currentChecklistVersion?.sections || [])
  );
  isChecklistDirty = false;
  checklistDraftChangesCount = 0;
  updateChecklistFloatingBar();
}

function markChecklistDraftDirty() {
  isChecklistDirty = true;
  checklistDraftChangesCount += 1;
  updateChecklistFloatingBar();
}

function renumberChecklistDraftInMemory() {
  if (!currentChecklistVersion || !Array.isArray(currentChecklistVersion.sections)) return;
  currentChecklistVersion.sections.forEach((sec: any, secIdx: number) => {
    const newSecOrder = secIdx + 1;
    sec.order = newSecOrder;
    let curTitle = String(sec.title || '').trim();
    if (/^ส่วนที่\s*\d+/.test(curTitle)) {
      sec.title = curTitle.replace(/^ส่วนที่\s*\d+/, `ส่วนที่ ${newSecOrder}`);
    }
    if (Array.isArray(sec.items)) {
      sec.items.forEach((it: any, itIdx: number) => {
        const newItemOrder = itIdx + 1;
        it.order = newItemOrder;
        const cleanDesc = String(it.description || '').replace(/^(?:\d+[\.\)]\s*)+/, '').trim();
        it.description = `${newItemOrder}. ${cleanDesc}`;
      });
    }
  });
}

function updateChecklistFloatingBar() {
  let bar = document.getElementById('checklist-unsaved-floating-bar');
  const secContainer = document.getElementById('checklist-sections-container');
  if (secContainer) {
    secContainer.style.paddingBottom = isChecklistDirty && currentWorkspace === 'checklist' ? '96px' : '0px';
  }
  if (!isChecklistDirty || currentWorkspace !== 'checklist') {
    if (bar) {
      bar.style.display = 'none';
    }
    return;
  }

  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'checklist-unsaved-floating-bar';
    document.body.appendChild(bar);
  }

  bar.style.cssText = `
    position: fixed;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 990;
    background: rgba(255, 255, 255, 0.98);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    padding: 8px 10px;
    border-radius: 14px;
    border: 1.5px solid #BFDBFE;
    box-shadow: 0 12px 28px -6px rgba(30, 64, 175, 0.22), 0 4px 10px -2px rgba(15, 23, 42, 0.08);
    display: inline-flex;
    align-items: center;
    gap: 10px;
    transition: all 0.2s ease;
  `;

  bar.innerHTML = `
    <button
      type="button"
      id="btn-checklist-discard-draft"
      onclick="window.discardChecklistDraftChanges(true)"
      style="background:#FFFFFF; color:#475569; border:1px solid #CBD5E1; padding:8px 16px; border-radius:10px; font-size:13px; font-weight:600; cursor:pointer; display:inline-flex; align-items:center; gap:6px; transition:all 0.15s ease; white-space:nowrap;"
      onmouseover="this.style.background='#FEF2F2'; this.style.color='#DC2626'; this.style.borderColor='#FCA5A5';"
      onmouseout="this.style.background='#FFFFFF'; this.style.color='#475569'; this.style.borderColor='#CBD5E1';"
    >
      <span class="material-icons" style="font-size:17px;">restart_alt</span>
      <span>ยกเลิก / คืนค่าเดิม</span>
    </button>
    <button
      type="button"
      id="btn-checklist-commit-draft"
      onclick="window.commitChecklistDraftChanges()"
      style="background:linear-gradient(135deg, #1E40AF, #2563EB); color:#FFFFFF; border:none; padding:8px 18px; border-radius:10px; font-size:13px; font-weight:700; cursor:pointer; display:inline-flex; align-items:center; gap:6px; box-shadow:0 4px 12px rgba(37, 99, 235, 0.32); transition:all 0.15s ease; white-space:nowrap;"
      onmouseover="this.style.filter='brightness(1.08)'"
      onmouseout="this.style.filter='none'"
    >
      <span class="material-icons" style="font-size:17px;">save</span>
      <span>บันทึกการเปลี่ยนแปลง</span>
    </button>
  `;
}

(window as any).discardChecklistDraftChanges = function(skipConfirm?: boolean) {
  if (!isChecklistDirty) return;
  if (!skipConfirm && !window.confirm('ยืนยันยกเลิกการแก้ไขและคืนค่าเดิมทั้งหมดหรือไม่?')) {
    return;
  }
  if (currentChecklistVersion) {
    currentChecklistVersion.sections = JSON.parse(
      JSON.stringify(originalChecklistSectionsSnapshot)
    );
  }
  isChecklistDirty = false;
  checklistDraftChangesCount = 0;
  updateChecklistFloatingBar();
  renderChecklistSections();
};

(window as any).commitChecklistDraftChanges = async function() {
  if (!currentChecklistVersion || !isChecklistDirty) return;

  const commitBtn = document.getElementById('btn-checklist-commit-draft') as HTMLButtonElement | null;
  const discardBtn = document.getElementById('btn-checklist-discard-draft') as HTMLButtonElement | null;
  if (commitBtn) {
    commitBtn.disabled = true;
    commitBtn.innerHTML = '<span class="material-icons" style="font-size:16px; animation:spin 1s linear infinite;">sync</span><span>กำลังบันทึก...</span>';
  }
  if (discardBtn) discardBtn.disabled = true;

  try {
    const res = await fetch(`/api/admin/checklist-versions/${currentChecklistVersion.id}/sync-structure`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sections: currentChecklistVersion.sections || [],
      }),
    });
    const data = await res.json();
    if (!data.success) {
      alert(data.message || 'บันทึกการเปลี่ยนแปลงไม่สำเร็จ');
      if (commitBtn) {
        commitBtn.disabled = false;
        commitBtn.innerHTML = '<span class="material-icons" style="font-size:16px;">save</span><span>บันทึกการเปลี่ยนแปลง</span>';
      }
      if (discardBtn) discardBtn.disabled = false;
      return;
    }

    isChecklistDirty = false;
    checklistDraftChangesCount = 0;
    updateChecklistFloatingBar();
    await window.loadChecklistSettings(currentChecklistVersion.id);
  } catch (err) {
    console.error('commitChecklistDraftChanges error:', err);
    alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    if (commitBtn) {
      commitBtn.disabled = false;
      commitBtn.innerHTML = '<span class="material-icons" style="font-size:16px;">save</span><span>บันทึกการเปลี่ยนแปลง</span>';
    }
    if (discardBtn) discardBtn.disabled = false;
  }
};

// โหลดรายการเวอร์ชันและเนื้อหา Checklist
window.loadChecklistSettings = async function(targetVersionId?: number) {
  const container = document.getElementById('checklist-sections-container');
  if (container) {
    container.innerHTML = '<div style="text-align:center; padding:30px; color:#94A3B8;"><span class="material-icons" style="font-size:32px; animation:spin 1s linear infinite;">sync</span><div style="margin-top:8px;">กำลังโหลดเกณฑ์ Checklist...</div></div>';
  }

  try {
    const res = await fetch('/api/admin/checklist-versions');
    const data = await res.json();
    if (!data.success) {
      if (container) container.innerHTML = `<div style="color:#DC2626; padding:20px; text-align:center;">${data.message || 'โหลดข้อมูลไม่สำเร็จ'}</div>`;
      return;
    }

    allChecklistVersions = data.versions || [];

    // หาเวอร์ชันเป้าหมายที่จะแสดง
    const targetId = targetVersionId || currentChecklistVersion?.id;
    currentChecklistVersion = null;
    if (targetId) {
      currentChecklistVersion = allChecklistVersions.find(v => v.id === targetId);
    }
    if (!currentChecklistVersion) {
      currentChecklistVersion = allChecklistVersions.find(v => v.status === 'ACTIVE') || allChecklistVersions[0];
    }

    // อัปเดต badge บนเมนูข้างซ้าย
    const activeVer = allChecklistVersions.find(v => v.status === 'ACTIVE');
    const badgeSidebar = document.getElementById('badge-checklist-version');
    if (badgeSidebar && activeVer) {
      badgeSidebar.textContent = activeVer.versionName.split(' ')[0] || 'v1.0';
    }

    resetChecklistDraftBaseline();
    renderChecklistVersionHeader();
    renderChecklistSections();
  } catch (err) {
    console.error('loadChecklistSettings error:', err);
    if (container) container.innerHTML = '<div style="color:#DC2626; padding:20px; text-align:center;">เกิดข้อผิดพลาดในการโหลดข้อมูล</div>';
  }
};

// เรนเดอร์ Dropdown เวอร์ชัน และปุ่มควบคุม
function renderChecklistVersionHeader() {
  const selectEl = document.getElementById('checklist-version-select') as HTMLSelectElement | null;
  const badgeWrap = document.getElementById('checklist-version-badge-wrap');
  const actionsWrap = document.getElementById('checklist-version-actions');
  const descBox = document.getElementById('checklist-version-desc-box');

  if (selectEl) {
    selectEl.innerHTML = allChecklistVersions.map(v => {
      const isAct = v.status === 'ACTIVE' ? ' (ใช้งานอยู่)' : v.status === 'DRAFT' ? ' (ฉบับร่าง)' : ' (ประวัติเก่า)';
      return `<option value="${v.id}" ${currentChecklistVersion && currentChecklistVersion.id === v.id ? 'selected' : ''}>${v.versionName}${isAct}</option>`;
    }).join('');
  }

  if (currentChecklistVersion) {
    if (badgeWrap) {
      if (currentChecklistVersion.status === 'ACTIVE') {
        badgeWrap.innerHTML = '<span style="background:#DCFCE7; color:#166534; font-size:12px; font-weight:700; padding:4px 12px; border-radius:999px; display:inline-flex; align-items:center; gap:4px;"><span class="material-icons" style="font-size:14px;">check_circle</span> กำลังเปิดใช้งาน (Active)</span>';
      } else if (currentChecklistVersion.status === 'DRAFT') {
        badgeWrap.innerHTML = '<span style="background:#FEF3C7; color:#92400E; font-size:12px; font-weight:700; padding:4px 12px; border-radius:999px; display:inline-flex; align-items:center; gap:4px;"><span class="material-icons" style="font-size:14px;">edit_note</span> ฉบับร่าง (Draft)</span>';
      } else {
        badgeWrap.innerHTML = '<span style="background:#F1F5F9; color:#475569; font-size:12px; font-weight:700; padding:4px 12px; border-radius:999px; display:inline-flex; align-items:center; gap:4px;"><span class="material-icons" style="font-size:14px;">archive</span> ประวัติเก่า (Archived)</span>';
      }
    }

    if (descBox) {
      if (currentChecklistVersion.description) {
        descBox.textContent = `คำอธิบาย: ${currentChecklistVersion.description}`;
        descBox.style.display = 'block';
      } else {
        descBox.style.display = 'none';
      }
    }

    if (actionsWrap) {
      let btnsHtml = '';
      if (currentChecklistVersion.status !== 'ACTIVE') {
        btnsHtml += `<button type="button" onclick="window.activateChecklistVersion(${currentChecklistVersion.id})" style="background:#16A34A; color:white; border:none; padding:6px 14px; border-radius:8px; font-size:12.5px; font-weight:700; cursor:pointer; display:inline-flex; align-items:center; gap:6px;">
          <span class="material-icons" style="font-size:16px;">verified</span> เปิดใช้งานเวอร์ชันนี้
        </button>`;
      }
      btnsHtml += `<button type="button" onclick="window.openEditVersionModal()" style="background:#FFFFFF; color:#334155; border:1px solid #CBD5E1; padding:6px 12px; border-radius:8px; font-size:12.5px; font-weight:600; cursor:pointer; display:inline-flex; align-items:center; gap:4px;">
        <span class="material-icons" style="font-size:16px;">edit</span> แก้ไขข้อมูล
      </button>`;

      const usageCount = currentChecklistVersion._count?.companies || 0;
      if (currentChecklistVersion.status !== 'ACTIVE' && usageCount === 0) {
        btnsHtml += `<button type="button" onclick="window.deleteChecklistVersion(${currentChecklistVersion.id})" style="background:#FFFFFF; color:#DC2626; border:1px solid #FCA5A5; padding:6px 12px; border-radius:8px; font-size:12.5px; font-weight:600; cursor:pointer; display:inline-flex; align-items:center; gap:4px; transition:background-color 0.15s ease;" onmouseover="this.style.background='#FEE2E2'" onmouseout="this.style.background='#FFFFFF'">
          <span class="material-icons" style="font-size:18px; color:#DC2626;">delete_outline</span> ลบเวอร์ชัน
        </button>`;
      } else if (usageCount > 0) {
        btnsHtml += `<span style="font-size:11.5px; color:#64748B;">(มีนิสิตใช้ ${usageCount} บริษัท)</span>`;
      }

      actionsWrap.innerHTML = btnsHtml;
    }
  }
}

// สลับดูเวอร์ชันอื่น
window.switchChecklistVersion = function(versionIdStr: string) {
  const vId = parseInt(versionIdStr, 10);
  if (currentChecklistVersion && currentChecklistVersion.id === vId) return;

  if (isChecklistDirty) {
    if (!window.confirm('คุณมีการแก้ไขเกณฑ์ Checklist ที่ยังไม่ได้กดบันทึก\nหากเปลี่ยนเวอร์ชัน การแก้ไขที่ทำค้างไว้จะถูกยกเลิก ต้องการเปลี่ยนเวอร์ชันหรือไม่?')) {
      const selectEl = document.getElementById('checklist-version-select') as HTMLSelectElement | null;
      if (selectEl && currentChecklistVersion) {
        selectEl.value = String(currentChecklistVersion.id);
      }
      return;
    }
    if (currentChecklistVersion) {
      currentChecklistVersion.sections = JSON.parse(
        JSON.stringify(originalChecklistSectionsSnapshot)
      );
    }
  }

  currentChecklistVersion = allChecklistVersions.find(v => v.id === vId) || currentChecklistVersion;
  collapsedChecklistSections.clear();
  resetChecklistDraftBaseline();
  renderChecklistVersionHeader();
  renderChecklistSections();
};

// สร้างเส้นขีดสีน้ำเงินบอกตำแหน่งวาง (Blue Drop Indicator Line)
function getOrCreateChecklistDropIndicator(): HTMLElement {
  let el = document.getElementById('checklist-drop-indicator');
  if (!el) {
    el = document.createElement('div');
    el.id = 'checklist-drop-indicator';
    el.style.cssText = `
      height: 4px;
      background: linear-gradient(90deg, #1D4ED8, #3B82F6, #1D4ED8);
      border-radius: 999px;
      position: relative;
      margin: 6px 0;
      pointer-events: none;
      box-shadow: 0 0 10px rgba(37, 99, 235, 0.55);
      z-index: 50;
    `;
    el.innerHTML = `
      <div style="
        width: 11px;
        height: 11px;
        background: #2563EB;
        border: 2px solid #FFFFFF;
        border-radius: 50%;
        position: absolute;
        left: -4px;
        top: -3.5px;
        box-shadow: 0 1px 4px rgba(37, 99, 235, 0.6);
      "></div>
      <div style="
        width: 11px;
        height: 11px;
        background: #2563EB;
        border: 2px solid #FFFFFF;
        border-radius: 50%;
        position: absolute;
        right: -4px;
        top: -3.5px;
        box-shadow: 0 1px 4px rgba(37, 99, 235, 0.6);
      "></div>
    `;
  }
  return el;
}

// คำนวณหา Element ถัดไปที่จะแทรกเส้นสีน้ำเงินด้านหน้า
function getChecklistDragAfterElement(container: HTMLElement, y: number, selector: string): HTMLElement | null {
  const draggableElements = [...container.querySelectorAll<HTMLElement>(selector)].filter(
    (el) => !el.classList.contains('is-dragging')
  );

  return draggableElements.reduce<{ offset: number; element: HTMLElement | null }>(
    (closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) {
        return { offset, element: child };
      } else {
        return closest;
      }
    },
    { offset: Number.NEGATIVE_INFINITY, element: null }
  ).element;
}

// เรนเดอร์หมวดหมู่และเกณฑ์คำถาม (พร้อมระบบคลิกค้างลากวาง Drag & Drop + เส้นสีน้ำเงินบอกตำแหน่ง)
function renderChecklistSections() {
  const container = document.getElementById('checklist-sections-container');
  const summaryEl = document.getElementById('checklist-sections-summary');
  if (!container || !currentChecklistVersion) return;

  const sections = currentChecklistVersion.sections || [];
  let totalItems = 0;
  sections.forEach((s: any) => { totalItems += (s.items || []).length; });

  if (summaryEl) {
    summaryEl.textContent = `(${sections.length} หมวดหลัก / ${totalItems} ข้อย่อย)`;
  }

  if (sections.length === 0) {
    container.innerHTML = '<div style="text-align:center; padding:40px; background:#F8FAFC; border:2px dashed #CBD5E1; border-radius:12px; color:#64748B;">ยังไม่มีหมวดหลักในเวอร์ชันนี้ คลิกปุ่ม <strong>"+ เพิ่มหมวดหลักใหม่"</strong> ด้านบนเพื่อเริ่มสร้างเกณฑ์</div>';
    return;
  }

  let html = '';
  sections.forEach((sec: any, secIdx: number) => {
    const items = sec.items || [];
    let displaySecTitle = String(sec.title || '').trim();
    if (/^ส่วนที่\s*\d+/.test(displaySecTitle)) {
      displaySecTitle = displaySecTitle.replace(/^ส่วนที่\s*\d+/, `ส่วนที่ ${secIdx + 1}`);
    }

    let itemsHtml = '';
    if (items.length === 0) {
      itemsHtml = '<div class="checklist-empty-items" style="padding:16px; text-align:center; color:#94A3B8; font-size:13px; background:#F8FAFC; border-radius:8px; margin-top:8px;">ยังไม่มีข้อย่อยในหมวดนี้ คลิก "+ เพิ่มข้อย่อยในหมวดนี้" ด้านล่าง</div>';
    } else {
      itemsHtml = items.map((item: any, itIdx: number) => {
        const cleanDesc = String(item.description || '').replace(/^(?:\d+[\.\)]\s*)+/, '').trim();

        return `
          <div
            class="checklist-item-row"
            data-item-id="${item.id}"
            data-section-id="${sec.id}"
            title="คลิกค้างแล้วลากเพื่อเปลี่ยนลำดับข้อนี้"
            style="display:flex; align-items:flex-start; justify-content:space-between; gap:12px; padding:10px 14px; background:${item.isActive ? '#FFFFFF' : '#F8FAFC'}; border:1px solid #E2E8F0; border-radius:8px; margin-bottom:8px; cursor:grab; user-select:none; transition:transform 0.15s ease, box-shadow 0.15s ease, background-color 0.25s ease, opacity 0.15s ease; ${!item.isActive ? 'opacity:0.65;' : ''}"
          >
            <div style="flex:1;">
              <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                <span class="checklist-item-num" style="font-weight:700; color:#2563EB; font-size:13px; min-width:18px;">${itIdx + 1}.</span>
                <span class="checklist-item-desc" style="font-size:13px; color:#1E293B; font-weight:500;">${cleanDesc}</span>
                ${item.isRequired ? '<span style="background:#FEE2E2; color:#DC2626; font-size:11px; font-weight:700; padding:1px 6px; border-radius:4px;">*จำเป็น</span>' : ''}
                ${!item.isActive ? '<span style="background:#F1F5F9; color:#64748B; font-size:11px; font-weight:700; padding:1px 6px; border-radius:4px;">(ปิดใช้งาน)</span>' : ''}
              </div>
              ${item.placeholder ? `<div style="font-size:11.5px; color:#64748B; margin-top:3px; margin-left:26px;">💡 คำใบ้/ตัวอย่าง: ${item.placeholder}</div>` : ''}
            </div>

            <div class="checklist-no-drag" style="display:flex; align-items:center; gap:5px; flex-shrink:0;">
              <!-- สลับ เปิด/ปิดใช้งาน -->
              <button type="button" onclick="event.stopPropagation(); window.toggleChecklistItemActive(${item.id}, ${item.isActive})" title="${item.isActive ? 'คลิกเพื่อปิดใช้งาน (ซ่อนไม่ให้นิสิตเห็น)' : 'คลิกเพื่อเปิดใช้งาน'}" style="background:${item.isActive ? '#EFF6FF' : '#F1F5F9'}; color:${item.isActive ? '#2563EB' : '#64748B'}; border:none; padding:4px 8px; border-radius:6px; font-size:11.5px; font-weight:600; cursor:pointer;">
                ${item.isActive ? '👁️ เปิดอยู่' : '🙈 ปิดอยู่'}
              </button>

              <!-- แก้ไขข้อความ ✏️ -->
              <button type="button" onclick="event.stopPropagation(); window.openEditItemModal(${item.id})" title="แก้ไข" style="background:#F8FAFC; border:1px solid #CBD5E1; border-radius:6px; padding:3px 6px; color:#2563EB; cursor:pointer;">
                <span class="material-icons" style="font-size:15px; display:block;">edit</span>
              </button>

              <!-- ลบข้อความ 🗑️ -->
              <button type="button" onclick="event.stopPropagation(); window.deleteChecklistItem(${item.id})" title="ลบข้อนี้" style="background:#FFFFFF; border:1px solid #FCA5A5; border-radius:6px; padding:3px 6px; color:#DC2626; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; transition:background-color 0.15s ease;" onmouseover="this.style.background='#FEE2E2'" onmouseout="this.style.background='#FFFFFF'">
                <span class="material-icons" style="font-size:18px; display:block; color:#DC2626;">delete_outline</span>
              </button>
            </div>
          </div>
        `;
      }).join('');
    }

    html += `
      <div
        class="checklist-section-card"
        data-section-id="${sec.id}"
        style="background:#FFFFFF; border:1px solid #CBD5E1; border-radius:12px; margin-bottom:16px; overflow:hidden; box-shadow:0 1px 3px rgba(0,0,0,0.05); transition:transform 0.15s ease, box-shadow 0.2s ease, opacity 0.15s ease;"
      >
        <!-- Section Header (คลิกค้างที่แถบนี้เพื่อลากสลับหมวดหลัก) -->
        <div
          class="checklist-section-header"
          data-section-id="${sec.id}"
          title="คลิกค้างที่แถบหัวข้อนี้เพื่อลากสลับหมวดหลัก (หรือคลิก 1 ครั้งเพื่อย่อ/ขยาย)"
          onclick="window.toggleSectionCollapse(${sec.id})"
          style="background:#F8FAFC; padding:12px 18px; border-bottom:1px solid #E2E8F0; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px; cursor:grab; user-select:none; transition:background-color 0.15s ease;"
        >
          <div style="display:flex; align-items:center; gap:8px;">
            <span class="material-icons" style="color:#2563EB; font-size:20px;">bookmark</span>
            <span class="checklist-section-title" style="font-size:14.5px; font-weight:700; color:#1E293B;">${displaySecTitle}</span>
            <span class="checklist-section-count" style="font-size:12px; font-weight:600; color:#64748B; background:#E2E8F0; padding:2px 8px; border-radius:999px;">${items.length} ข้อ</span>
          </div>

          <div class="checklist-no-drag" style="display:flex; align-items:center; gap:6px;">
            <!-- แก้ไขชื่อหมวด ✏️ -->
            <button type="button" onclick="event.stopPropagation(); window.openEditSectionModal(${sec.id}, '${displaySecTitle.replace(/'/g, "\\'")}' )" title="แก้ไขชื่อหมวด" style="background:#FFFFFF; border:1px solid #CBD5E1; border-radius:6px; padding:4px 8px; color:#2563EB; cursor:pointer;">
              <span class="material-icons" style="font-size:16px; display:block;">edit</span>
            </button>

            <!-- ลบหมวด 🗑️ -->
            <button type="button" onclick="event.stopPropagation(); window.deleteChecklistSection(${sec.id})" title="ลบหมวดนี้" style="background:#FFFFFF; border:1px solid #FCA5A5; border-radius:6px; padding:4px 8px; color:#DC2626; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; transition:background-color 0.15s ease;" onmouseover="this.style.background='#FEE2E2'" onmouseout="this.style.background='#FFFFFF'">
              <span class="material-icons" style="font-size:18px; display:block; color:#DC2626;">delete_outline</span>
            </button>

            <!-- ปุ่มเปิด/ปิด (ย่อ/ขยาย) หัวข้อย่อย ไว้ขวาสุด -->
            <button type="button" onclick="event.stopPropagation(); window.toggleSectionCollapse(${sec.id})" id="btn-collapse-${sec.id}" title="เปิด/ปิดแสดงข้อย่อย" style="background:#FFFFFF; border:1px solid #CBD5E1; border-radius:6px; padding:4px 8px; color:#475569; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; margin-left:4px;">
              <span id="icon-collapse-${sec.id}" class="material-icons" style="font-size:20px; transition:transform 0.2s ease;">${collapsedChecklistSections.has(sec.id) ? 'expand_more' : 'expand_less'}</span>
            </button>
          </div>
        </div>

        <!-- Section Body (Items List) -->
        <div id="section-body-${sec.id}" class="checklist-section-body" data-section-id="${sec.id}" style="padding:14px 18px; display:${collapsedChecklistSections.has(sec.id) ? 'none' : 'block'};">
          <div id="section-items-list-${sec.id}" class="checklist-items-list" data-section-id="${sec.id}">
            ${itemsHtml}
          </div>
          <div style="margin-top:10px;">
            <button type="button" onclick="window.openAddItemModal(${sec.id})" style="background:#F1F5F9; color:#2563EB; border:1px dashed #93C5FD; padding:6px 14px; border-radius:8px; font-size:12.5px; font-weight:600; cursor:pointer; display:inline-flex; align-items:center; gap:6px; width:100%; justify-content:center;">
              <span class="material-icons" style="font-size:17px;">add</span> เพิ่มข้อย่อยในหมวดนี้
            </button>
          </div>
        </div>
      </div>
    `;
  });

  container.style.paddingBottom = isChecklistDirty ? '96px' : '0px';
  container.innerHTML = html;
  initChecklistDragAndDrop(container);
}

// ระบบ Drag & Drop สำหรับทั้ง หมวดหลัก (Sections) และ ข้อย่อย (Items)
function initChecklistDragAndDrop(container: HTMLElement) {
  const dropIndicator = getOrCreateChecklistDropIndicator();
  let activeDragType: 'section' | 'item' | null = null;
  let draggedEl: HTMLElement | null = null;
  let activeSectionId: number | null = null;
  let expandedSectionsBeforeDrag: number[] = [];

  // ----------------------------------------
  // 1. ตั้งค่าการลากระดับ "หมวดหลัก (Section)"
  // ----------------------------------------
  const sectionCards = container.querySelectorAll<HTMLElement>('.checklist-section-card');
  sectionCards.forEach((card) => {
    const header = card.querySelector<HTMLElement>('.checklist-section-header');
    if (!header) return;

    // เปิดให้ลากเฉพาะตอนคลิกค้างที่แถบ Header (และไม่ได้คลิกปุ่มด้านขวา)
    header.addEventListener('mousedown', (e) => {
      const target = e.target as HTMLElement;
      if (target.closest('.checklist-no-drag, button')) {
        card.draggable = false;
      } else {
        card.draggable = true;
      }
    });

    header.addEventListener('mouseup', () => {
      card.draggable = false;
    });

    card.addEventListener('dragstart', (e) => {
      if (e.target !== card) return;
      activeDragType = 'section';
      draggedEl = card;

      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', String(card.dataset.sectionId || ''));
        if (header && e.dataTransfer.setDragImage) {
          e.dataTransfer.setDragImage(header, 40, 22);
        }
      }

      // ย่อข้อย่อยทุกหมวดชั่วคราวขณะลาก เพื่อให้เห็นหมวดที่ 1, 2, 3... เรียงกันชัดเจนและเล็งเส้นสีน้ำเงินง่าย
      setTimeout(() => {
        expandedSectionsBeforeDrag = [];
        container.querySelectorAll<HTMLElement>('.checklist-section-body').forEach((bodyEl) => {
          const sId = Number(bodyEl.dataset.sectionId);
          if (bodyEl.style.display !== 'none') {
            expandedSectionsBeforeDrag.push(sId);
            bodyEl.style.display = 'none';
            const iconEl = document.getElementById(`icon-collapse-${sId}`);
            if (iconEl) iconEl.textContent = 'expand_more';
          }
        });

        card.classList.add('is-dragging');
        card.style.opacity = '0.45';
        card.style.border = '2px dashed #2563EB';
        card.style.boxShadow = '0 8px 20px rgba(37, 99, 235, 0.18)';
      }, 0);
    });

    card.addEventListener('dragend', () => {
      card.draggable = false;
      card.classList.remove('is-dragging');
      card.style.opacity = '1';
      card.style.border = '1px solid #2563EB';
      card.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.25)';
      setTimeout(() => {
        card.style.border = '1px solid #CBD5E1';
        card.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
      }, 650);

      if (dropIndicator.parentElement) {
        dropIndicator.remove();
      }

      // กางหมวดที่เคยเปิดอยู่กลับมาเหมือนเดิม
      expandedSectionsBeforeDrag.forEach((sId) => {
        const bodyEl = document.getElementById(`section-body-${sId}`);
        const iconEl = document.getElementById(`icon-collapse-${sId}`);
        if (bodyEl) bodyEl.style.display = 'block';
        if (iconEl) iconEl.textContent = 'expand_less';
      });
      expandedSectionsBeforeDrag = [];
      activeDragType = null;
      draggedEl = null;
    });
  });

  // Container รับการลากวางของ Section
  container.ondragover = (e) => {
    if (activeDragType !== 'section' || !draggedEl) return;
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';

    const afterElement = getChecklistDragAfterElement(container, e.clientY, '.checklist-section-card');
    if (afterElement == null) {
      container.appendChild(dropIndicator);
    } else {
      container.insertBefore(dropIndicator, afterElement);
    }
  };

  container.ondrop = async (e) => {
    if (activeDragType !== 'section' || !draggedEl) return;
    e.preventDefault();

    if (dropIndicator.parentElement === container) {
      container.insertBefore(draggedEl, dropIndicator);
      dropIndicator.remove();

      // รันเลข "ส่วนที่ 1, 2, 3..." ใหม่ตามลำดับทันที
      const allCards = [...container.querySelectorAll<HTMLElement>('.checklist-section-card')];
      const orderedIds = allCards.map((c) => Number(c.dataset.sectionId));

      allCards.forEach((c, idx) => {
        const newOrder = idx + 1;
        const sId = Number(c.dataset.sectionId);
        const titleEl = c.querySelector<HTMLElement>('.checklist-section-title');
        if (titleEl) {
          const curTitle = (titleEl.textContent || '').trim();
          if (/^ส่วนที่\s*\d+/.test(curTitle)) {
            titleEl.textContent = curTitle.replace(/^ส่วนที่\s*\d+/, `ส่วนที่ ${newOrder}`);
          }
        }
        const secObj = (currentChecklistVersion?.sections || []).find((s: any) => s.id === sId);
        if (secObj) {
          secObj.order = newOrder;
          if (titleEl) secObj.title = titleEl.textContent;
        }
      });

      if (currentChecklistVersion?.sections) {
        currentChecklistVersion.sections.sort((a: any, b: any) => a.order - b.order);
      }

      markChecklistDraftDirty();
    }
  };

  // ----------------------------------------
  // 2. ตั้งค่าการลากระดับ "ข้อย่อย (Item)"
  // ----------------------------------------
  const itemRows = container.querySelectorAll<HTMLElement>('.checklist-item-row');
  itemRows.forEach((row) => {
    row.addEventListener('mousedown', (e) => {
      const target = e.target as HTMLElement;
      if (target.closest('.checklist-no-drag, button')) {
        row.draggable = false;
      } else {
        row.draggable = true;
      }
    });

    row.addEventListener('mouseup', () => {
      row.draggable = false;
    });

    row.addEventListener('dragstart', (e) => {
      e.stopPropagation();
      activeDragType = 'item';
      draggedEl = row;
      activeSectionId = Number(row.dataset.sectionId);

      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', String(row.dataset.itemId || ''));
      }

      setTimeout(() => {
        row.classList.add('is-dragging');
        row.style.opacity = '0.4';
        row.style.border = '1.5px dashed #2563EB';
        row.style.background = '#EFF6FF';
      }, 0);
    });

    row.addEventListener('dragend', () => {
      row.draggable = false;
      row.classList.remove('is-dragging');
      row.style.opacity = '1';
      row.style.border = '1px solid #3B82F6';
      row.style.background = '#DBEAFE';
      row.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.25)';

      setTimeout(() => {
        row.style.border = '1px solid #E2E8F0';
        row.style.background = '#FFFFFF';
        row.style.boxShadow = 'none';
      }, 650);

      if (dropIndicator.parentElement) {
        dropIndicator.remove();
      }

      activeDragType = null;
      draggedEl = null;
      activeSectionId = null;
    });
  });

  // แต่ละหมวดรับการลากวางข้อย่อยภายในหมวดนั้น
  const sectionBodies = container.querySelectorAll<HTMLElement>('.checklist-section-body');
  sectionBodies.forEach((bodyEl) => {
    const secId = Number(bodyEl.dataset.sectionId);
    const listEl = bodyEl.querySelector<HTMLElement>('.checklist-items-list');
    if (!listEl) return;

    bodyEl.addEventListener('dragover', (e) => {
      if (activeDragType !== 'item' || !draggedEl || activeSectionId !== secId) return;
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';

      const afterElement = getChecklistDragAfterElement(listEl, e.clientY, '.checklist-item-row');
      if (afterElement == null) {
        listEl.appendChild(dropIndicator);
      } else {
        listEl.insertBefore(dropIndicator, afterElement);
      }
    });

    bodyEl.addEventListener('drop', async (e) => {
      if (activeDragType !== 'item' || !draggedEl || activeSectionId !== secId) return;
      e.preventDefault();
      e.stopPropagation();

      if (dropIndicator.parentElement === listEl) {
        listEl.insertBefore(draggedEl, dropIndicator);
        dropIndicator.remove();

        // รันเลขข้อ 1., 2., 3... ใหม่ตามตำแหน่งทันที
        const allRows = [...listEl.querySelectorAll<HTMLElement>('.checklist-item-row')];
        const orderedIds = allRows.map((r) => Number(r.dataset.itemId));
        const secObj = (currentChecklistVersion?.sections || []).find((s: any) => s.id === secId);

        allRows.forEach((r, idx) => {
          const newOrder = idx + 1;
          const itId = Number(r.dataset.itemId);
          const numEl = r.querySelector<HTMLElement>('.checklist-item-num');
          const descEl = r.querySelector<HTMLElement>('.checklist-item-desc');
          if (numEl) numEl.textContent = `${newOrder}.`;

          if (secObj && Array.isArray(secObj.items)) {
            const itObj = secObj.items.find((it: any) => it.id === itId);
            if (itObj) {
              itObj.order = newOrder;
              const cleanDesc = descEl
                ? (descEl.textContent || '').trim()
                : String(itObj.description || '').replace(/^(?:\d+[\.\)]\s*)+/, '').trim();
              itObj.description = `${newOrder}. ${cleanDesc}`;
            }
          }
        });

        if (secObj && Array.isArray(secObj.items)) {
          secObj.items.sort((a: any, b: any) => a.order - b.order);
        }

        markChecklistDraftDirty();
      }
    });
  });
}

// ----------------------------------------------------
// Handlers: เวอร์ชัน (Version CRUD)
// ----------------------------------------------------

window.openCreateVersionModal = function(isClone: boolean) {
  const modal = document.getElementById('checklist-version-modal');
  const titleEl = document.getElementById('cv-modal-title');
  const modeEl = document.getElementById('cv-mode') as HTMLInputElement | null;
  const nameEl = document.getElementById('cv-version-name') as HTMLInputElement | null;
  const descEl = document.getElementById('cv-description') as HTMLInputElement | null;
  const cloneWrap = document.getElementById('cv-clone-wrap');
  const cloneSelect = document.getElementById('cv-clone-select') as HTMLSelectElement | null;

  if (titleEl) titleEl.textContent = isClone ? 'คัดลอกสร้างเวอร์ชันใหม่' : 'สร้างเวอร์ชันเปล่า';
  if (modeEl) modeEl.value = 'create';
  if (nameEl) nameEl.value = '';
  if (descEl) descEl.value = '';

  if (cloneWrap && cloneSelect) {
    if (isClone && allChecklistVersions.length > 0) {
      cloneWrap.style.display = 'block';
      cloneSelect.innerHTML = allChecklistVersions.map(v => `<option value="${v.id}">${v.versionName} (${(v.sections || []).length} หมวด)</option>`).join('');
      if (currentChecklistVersion) cloneSelect.value = String(currentChecklistVersion.id);
    } else {
      cloneWrap.style.display = 'none';
      cloneSelect.innerHTML = '';
    }
  }

  if (modal) modal.style.display = 'flex';
};

window.openEditVersionModal = function() {
  if (!currentChecklistVersion) return;
  const modal = document.getElementById('checklist-version-modal');
  const titleEl = document.getElementById('cv-modal-title');
  const modeEl = document.getElementById('cv-mode') as HTMLInputElement | null;
  const idEl = document.getElementById('cv-version-id') as HTMLInputElement | null;
  const nameEl = document.getElementById('cv-version-name') as HTMLInputElement | null;
  const descEl = document.getElementById('cv-description') as HTMLInputElement | null;
  const cloneWrap = document.getElementById('cv-clone-wrap');

  if (titleEl) titleEl.textContent = 'แก้ไขข้อมูลเวอร์ชัน';
  if (modeEl) modeEl.value = 'edit';
  if (idEl) idEl.value = String(currentChecklistVersion.id);
  if (nameEl) nameEl.value = currentChecklistVersion.versionName || '';
  if (descEl) descEl.value = currentChecklistVersion.description || '';
  if (cloneWrap) cloneWrap.style.display = 'none';

  if (modal) modal.style.display = 'flex';
};

window.saveChecklistVersion = async function() {
  const modeEl = document.getElementById('cv-mode') as HTMLInputElement | null;
  const idEl = document.getElementById('cv-version-id') as HTMLInputElement | null;
  const nameEl = document.getElementById('cv-version-name') as HTMLInputElement | null;
  const descEl = document.getElementById('cv-description') as HTMLInputElement | null;
  const cloneSelect = document.getElementById('cv-clone-select') as HTMLSelectElement | null;

  const mode = modeEl?.value || 'create';
  const versionName = nameEl?.value?.trim();
  const description = descEl?.value?.trim();

  if (!versionName) {
    alert('กรุณากรอกชื่อเวอร์ชัน เช่น v2.0 (ปีการศึกษา 2568)');
    return;
  }

  try {
    if (mode === 'create') {
      const cloneFromVersionId = cloneSelect && cloneSelect.parentElement?.style.display !== 'none' ? cloneSelect.value : undefined;
      const res = await fetch('/api/admin/checklist-versions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ versionName, description, cloneFromVersionId }),
      });
      const data = await res.json();
      if (!data.success) {
        alert(data.message || 'สร้างเวอร์ชันไม่สำเร็จ');
        return;
      }
      alert('สร้างเวอร์ชันเรียบร้อยแล้ว');
      document.getElementById('checklist-version-modal')!.style.display = 'none';
      await window.loadChecklistSettings(data.version.id);
    } else {
      const vId = parseInt(idEl?.value || '0', 10);
      const res = await fetch(`/api/admin/checklist-versions/${vId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ versionName, description }),
      });
      const data = await res.json();
      if (!data.success) {
        alert(data.message || 'แก้ไขเวอร์ชันไม่สำเร็จ');
        return;
      }
      alert('แก้ไขข้อมูลเวอร์ชันเรียบร้อยแล้ว');
      document.getElementById('checklist-version-modal')!.style.display = 'none';
      await window.loadChecklistSettings(vId);
    }
  } catch (err) {
    console.error('saveChecklistVersion error:', err);
    alert('เกิดข้อผิดพลาดในการบันทึก');
  }
};

window.activateChecklistVersion = async function(versionId: number) {
  if (!confirm('ยืนยันเปิดใช้งานเวอร์ชันนี้เป็นเกณฑ์หลักของคณะ ICT?\n(นิสิตที่เริ่มทำ Checklist ใหม่จะใช้เกณฑ์ชุดนี้ทันที)')) return;

  try {
    const res = await fetch(`/api/admin/checklist-versions/${versionId}/activate`, {
      method: 'PUT',
    });
    const data = await res.json();
    if (!data.success) {
      alert(data.message || 'เปิดใช้งานไม่สำเร็จ');
      return;
    }
    alert(data.message);
    await window.loadChecklistSettings(versionId);
  } catch (err) {
    console.error('activateChecklistVersion error:', err);
    alert('เกิดข้อผิดพลาด');
  }
};

window.deleteChecklistVersion = async function(versionId: number) {
  if (!confirm('ยืนยันลบเวอร์ชันนี้หรือไม่? ข้อมูลหมวดและเกณฑ์ในเวอร์ชันนี้จะถูกลบทั้งหมด')) return;

  try {
    const res = await fetch(`/api/admin/checklist-versions/${versionId}`, {
      method: 'DELETE',
    });
    const data = await res.json();
    if (!data.success) {
      alert(data.message || 'ลบไม่สำเร็จ');
      return;
    }
    alert(data.message);
    await window.loadChecklistSettings();
  } catch (err) {
    console.error('deleteChecklistVersion error:', err);
    alert('เกิดข้อผิดพลาด');
  }
};

// ----------------------------------------------------
// Handlers: หมวดหลัก (Section CRUD)
// ----------------------------------------------------

window.openAddSectionModal = function() {
  const modal = document.getElementById('checklist-section-modal');
  const titleEl = document.getElementById('cs-modal-title');
  const idEl = document.getElementById('cs-section-id') as HTMLInputElement | null;
  const inputEl = document.getElementById('cs-title') as HTMLInputElement | null;

  if (titleEl) titleEl.textContent = 'เพิ่มหมวดหลักใหม่';
  if (idEl) idEl.value = '';
  if (inputEl) inputEl.value = '';
  if (modal) modal.style.display = 'flex';
};

window.openEditSectionModal = function(sectionId: number, currentTitle: string) {
  const modal = document.getElementById('checklist-section-modal');
  const titleEl = document.getElementById('cs-modal-title');
  const idEl = document.getElementById('cs-section-id') as HTMLInputElement | null;
  const inputEl = document.getElementById('cs-title') as HTMLInputElement | null;

  const secObj = (currentChecklistVersion?.sections || []).find((s: any) => s.id === sectionId);
  const latestTitle = secObj?.title || currentTitle;

  if (titleEl) titleEl.textContent = 'แก้ไขชื่อหมวดหลัก';
  if (idEl) idEl.value = String(sectionId);
  if (inputEl) inputEl.value = latestTitle;
  if (modal) modal.style.display = 'flex';
};

window.saveChecklistSection = async function() {
  if (!currentChecklistVersion) return;
  const idEl = document.getElementById('cs-section-id') as HTMLInputElement | null;
  const inputEl = document.getElementById('cs-title') as HTMLInputElement | null;
  const title = inputEl?.value?.trim();

  if (!title) {
    alert('กรุณากรอกชื่อหมวดหลัก');
    return;
  }

  const sectionId = idEl?.value ? parseInt(idEl.value, 10) : null;
  if (!Array.isArray(currentChecklistVersion.sections)) {
    currentChecklistVersion.sections = [];
  }

  if (!sectionId) {
    const newOrder = currentChecklistVersion.sections.length + 1;
    currentChecklistVersion.sections.push({
      id: tempChecklistDraftIdCounter--,
      versionId: currentChecklistVersion.id,
      title,
      order: newOrder,
      items: [],
    });
  } else {
    const secObj = currentChecklistVersion.sections.find((s: any) => s.id === sectionId);
    if (secObj) {
      secObj.title = title;
    }
  }

  renumberChecklistDraftInMemory();
  document.getElementById('checklist-section-modal')!.style.display = 'none';
  markChecklistDraftDirty();
  renderChecklistSections();
};

window.deleteChecklistSection = async function(sectionId: number) {
  if (!currentChecklistVersion || !Array.isArray(currentChecklistVersion.sections)) return;

  const targetSec = currentChecklistVersion.sections.find((s: any) => s.id === sectionId);
  if (!targetSec) return;

  const totalAnswers = (targetSec.items || []).reduce(
    (sum: number, it: any) => sum + Number(it._count?.answers || 0),
    0
  );
  if (totalAnswers > 0) {
    alert(`ไม่สามารถลบหมวดนี้ได้เนื่องจากมีคำตอบของนิสิต ${totalAnswers} รายการผูกอยู่ แนะนำให้กดปุ่ม "เปิดอยู่/ปิดอยู่" เพื่อซ่อนข้อในหมวดแทน`);
    return;
  }

  currentChecklistVersion.sections = currentChecklistVersion.sections.filter(
    (s: any) => s.id !== sectionId
  );
  collapsedChecklistSections.delete(sectionId);
  renumberChecklistDraftInMemory();
  markChecklistDraftDirty();
  renderChecklistSections();
};

// ----------------------------------------------------
// Handlers: ข้อย่อย (Item CRUD)
// ----------------------------------------------------

window.openAddItemModal = function(sectionId: number) {
  const modal = document.getElementById('checklist-item-modal');
  const titleEl = document.getElementById('ci-modal-title');
  const idEl = document.getElementById('ci-item-id') as HTMLInputElement | null;
  const secIdEl = document.getElementById('ci-section-id') as HTMLInputElement | null;
  const descEl = document.getElementById('ci-description') as HTMLTextAreaElement | null;
  const placeEl = document.getElementById('ci-placeholder') as HTMLInputElement | null;
  const reqEl = document.getElementById('ci-required') as HTMLInputElement | null;
  const actEl = document.getElementById('ci-active') as HTMLInputElement | null;

  if (titleEl) titleEl.textContent = 'เพิ่มเกณฑ์คำถามใหม่';
  if (idEl) idEl.value = '';
  if (secIdEl) secIdEl.value = String(sectionId);
  if (descEl) descEl.value = '';
  if (placeEl) placeEl.value = '';
  if (reqEl) reqEl.checked = false;
  if (actEl) actEl.checked = true;

  if (modal) modal.style.display = 'flex';
};

window.openEditItemModal = function(itemId: number) {
  if (!currentChecklistVersion) return;
  let targetItem: any = null;
  for (const s of currentChecklistVersion.sections || []) {
    const found = (s.items || []).find((it: any) => it.id === itemId);
    if (found) { targetItem = found; break; }
  }
  if (!targetItem) return;

  const modal = document.getElementById('checklist-item-modal');
  const titleEl = document.getElementById('ci-modal-title');
  const idEl = document.getElementById('ci-item-id') as HTMLInputElement | null;
  const secIdEl = document.getElementById('ci-section-id') as HTMLInputElement | null;
  const descEl = document.getElementById('ci-description') as HTMLTextAreaElement | null;
  const placeEl = document.getElementById('ci-placeholder') as HTMLInputElement | null;
  const reqEl = document.getElementById('ci-required') as HTMLInputElement | null;
  const actEl = document.getElementById('ci-active') as HTMLInputElement | null;

  if (titleEl) titleEl.textContent = 'แก้ไขเกณฑ์คำถาม';
  if (idEl) idEl.value = String(targetItem.id);
  if (secIdEl) secIdEl.value = String(targetItem.sectionId);
  if (descEl) descEl.value = String(targetItem.description || '').replace(/^(?:\d+[\.\)]\s*)+/, '').trim();
  if (placeEl) placeEl.value = targetItem.placeholder || '';
  if (reqEl) reqEl.checked = Boolean(targetItem.isRequired);
  if (actEl) actEl.checked = Boolean(targetItem.isActive);

  if (modal) modal.style.display = 'flex';
};

window.saveChecklistItem = async function() {
  if (!currentChecklistVersion) return;
  const idEl = document.getElementById('ci-item-id') as HTMLInputElement | null;
  const secIdEl = document.getElementById('ci-section-id') as HTMLInputElement | null;
  const descEl = document.getElementById('ci-description') as HTMLTextAreaElement | null;
  const placeEl = document.getElementById('ci-placeholder') as HTMLInputElement | null;
  const reqEl = document.getElementById('ci-required') as HTMLInputElement | null;
  const actEl = document.getElementById('ci-active') as HTMLInputElement | null;

  const description = descEl?.value?.trim();
  const placeholder = placeEl?.value?.trim();
  const isRequired = Boolean(reqEl?.checked);
  const isActive = Boolean(actEl?.checked);
  const itemId = idEl?.value ? parseInt(idEl.value, 10) : null;
  const sectionId = secIdEl?.value ? parseInt(secIdEl.value, 10) : null;

  if (!description) {
    alert('กรุณากรอกข้อความเกณฑ์การพิจารณา');
    return;
  }

  const cleanDesc = description.replace(/^(?:\d+[\.\)]\s*)+/, '').trim();

  if (!itemId) {
    const secObj = (currentChecklistVersion.sections || []).find((s: any) => s.id === sectionId);
    if (!secObj) return;
    if (!Array.isArray(secObj.items)) secObj.items = [];
    const newOrder = secObj.items.length + 1;
    secObj.items.push({
      id: tempChecklistDraftIdCounter--,
      sectionId: secObj.id,
      order: newOrder,
      description: `${newOrder}. ${cleanDesc}`,
      placeholder: placeholder || null,
      isRequired,
      isActive: true,
      _count: { answers: 0 },
    });
  } else {
    for (const s of currentChecklistVersion.sections || []) {
      const found = (s.items || []).find((it: any) => it.id === itemId);
      if (found) {
        found.description = `${found.order}. ${cleanDesc}`;
        found.placeholder = placeholder || null;
        found.isRequired = isRequired;
        found.isActive = isActive;
        break;
      }
    }
  }

  renumberChecklistDraftInMemory();
  document.getElementById('checklist-item-modal')!.style.display = 'none';
  markChecklistDraftDirty();
  renderChecklistSections();
};

window.toggleChecklistItemActive = async function(itemId: number, currentActive: boolean) {
  if (!currentChecklistVersion) return;
  for (const s of currentChecklistVersion.sections || []) {
    const found = (s.items || []).find((it: any) => it.id === itemId);
    if (found) {
      found.isActive = !currentActive;
      break;
    }
  }
  markChecklistDraftDirty();
  renderChecklistSections();
};

window.deleteChecklistItem = async function(itemId: number) {
  if (!currentChecklistVersion) return;

  for (const s of currentChecklistVersion.sections || []) {
    const idx = (s.items || []).findIndex((it: any) => it.id === itemId);
    if (idx !== -1) {
      const targetItem = s.items[idx];
      const ansCount = Number(targetItem._count?.answers || 0);
      if (ansCount > 0) {
        alert(`ไม่สามารถลบข้อนี้ได้เนื่องจากมีนิสิตเคยตอบแล้ว ${ansCount} รายการ กรุณากดปุ่ม "เปิดอยู่/ปิดอยู่" เพื่อซ่อนข้อนี้แทน`);
        return;
      }
      s.items.splice(idx, 1);
      break;
    }
  }

  renumberChecklistDraftInMemory();
  markChecklistDraftDirty();
  renderChecklistSections();
};

// สลับลำดับ Move Up / Down
window.moveChecklist = async function(type: 'section' | 'item', id: number, direction: 'up' | 'down') {
  try {
    const res = await fetch('/api/admin/checklist-reorder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, id, direction }),
    });
    const data = await res.json();
    if (!data.success) {
      alert(data.message || 'จัดลำดับไม่สำเร็จ');
      return;
    }
    await window.loadChecklistSettings(currentChecklistVersion.id);
  } catch (err) {
    console.error('moveChecklist error:', err);
  }
};


// เปิด/ปิด การแสดงข้อย่อยในหมวด (Accordion Collapse / Expand)
window.toggleSectionCollapse = function(secId: number) {
  const bodyEl = document.getElementById(`section-body-${secId}`);
  const iconEl = document.getElementById(`icon-collapse-${secId}`);
  if (bodyEl) {
    const isHidden = bodyEl.style.display === 'none';
    bodyEl.style.display = isHidden ? 'block' : 'none';
    if (isHidden) {
      collapsedChecklistSections.delete(secId);
    } else {
      collapsedChecklistSections.add(secId);
    }
    if (iconEl) {
      iconEl.textContent = isHidden ? 'expand_less' : 'expand_more';
    }
  }
};