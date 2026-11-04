// @ts-nocheck
// header.js — โหลด header.html พร้อม [REQ-01] Persistent Top Bar & Multi-Role Switcher
function initPersistentHeader(templateUrl) {
    fetch(templateUrl)
        .then(response => response.text())
        .then(html => {
            const placeholder = document.getElementById('header-placeholder');
            if (!placeholder) return;
            placeholder.innerHTML = html;

            const menuToggle = document.getElementById('menu-toggle');
            const headerNav = document.getElementById('header-nav');

            if (menuToggle && headerNav) {
                menuToggle.addEventListener('click', () => {
                    headerNav.classList.toggle('open');
                });
            }

            fetch('/auth/me')
                .then(r => r.json())
                .then(async (data) => {
                    if (!data.authenticated || !data.user) return;

                    const user = data.user;
                    const role = user.role;
                    const isCourseAdmin = Boolean(user.isCourseAdmin || role === 'ADMIN');
                    const isStaff = Boolean(user.isStaff || role === 'STAFF' || role === 'ADMIN');
                    const isAdvisor = Boolean(user.isAdvisor || role === 'ADVISOR');
                    const isSupervisor = Boolean(user.isSupervisor);
                    const isCourseAdminOrStaff = isCourseAdmin || isStaff;
                    const isAdvOrSup = isAdvisor || isSupervisor;

                    const currentPath = decodeURIComponent(window.location.pathname);
                    const urlParams = new URLSearchParams(window.location.search);
                    const urlRoleMode = urlParams.get('roleMode');

                    // Determine effective active mode for topbar display
                    let activeMode = user.activeRoleMode || '';
                    if (!activeMode) {
                        if (role === 'STUDENT') activeMode = 'STUDENT';
                        else if (currentPath.includes('dashboard_ที่ปรึกษา') || currentPath.includes('advisor_checklist_review')) {
                            activeMode = urlRoleMode === 'SUPERVISOR' ? 'SUPERVISOR' : 'ADVISOR';
                        } else if (role === 'STAFF' || (isStaff && !isCourseAdmin)) {
                            activeMode = 'FACULTY_STAFF';
                        } else if (isCourseAdmin) {
                            activeMode = 'COURSE_INSTRUCTOR';
                        } else if (isAdvisor) {
                            activeMode = 'ADVISOR';
                        } else if (isSupervisor) {
                            activeMode = 'SUPERVISOR';
                        } else {
                            activeMode = role;
                        }
                    }
                    if (urlRoleMode === 'SUPERVISOR') activeMode = 'SUPERVISOR';
                    if (urlRoleMode === 'ADVISOR') activeMode = 'ADVISOR';

                    // Update Topbar Identity Elements
                    const avatarEl = document.getElementById('ict-topbar-avatar');
                    const avatarIconEl = document.getElementById('ict-topbar-avatar-icon');
                    const rolePillEl = document.getElementById('ict-topbar-role-pill');
                    const deptBadgeEl = document.getElementById('ict-topbar-dept-badge');
                    const nameEl = document.getElementById('ict-topbar-user-name');
                    const subEl = document.getElementById('ict-topbar-user-sub');

                    if (role === 'STUDENT') {
                        if (avatarEl) avatarEl.className = 'ict-role-avatar role-student';
                        if (avatarIconEl) avatarIconEl.textContent = 'school';
                        if (rolePillEl) {
                            rolePillEl.className = 'ict-role-pill role-student';
                            rolePillEl.textContent = 'นิสิต (Student)';
                        }
                        try {
                            const profRes = await fetch('/api/student/profile');
                            const profData = await profRes.json();
                            if (profData.success && profData.student) {
                                const s = profData.student;
                                if (nameEl) nameEl.textContent = s.nameTh || user.name || user.email;
                                if (subEl) subEl.textContent = `(รหัส ${s.studentCode || '-'} • ${s.major || 'วิศวกรรมซอฟต์แวร์'})`;
                                if (deptBadgeEl && s.major) {
                                    deptBadgeEl.style.display = 'inline-flex';
                                    deptBadgeEl.textContent = `สาขา${s.major}`;
                                }
                            } else {
                                if (nameEl) nameEl.textContent = user.name || user.email;
                                if (subEl) subEl.textContent = `(${user.email})`;
                            }
                        } catch (_) {
                            if (nameEl) nameEl.textContent = user.name || user.email;
                            if (subEl) subEl.textContent = `(${user.email})`;
                        }
                    } else {
                        // Professor / Staff / Admin
                        if (nameEl) nameEl.textContent = user.name || user.email;
                        const deptLabel = user.department ? `สาขา${user.department}` : 'ส่วนกลางทั้งคณะ ICT (8 สาขา)';
                        if (subEl) subEl.textContent = `(${user.email} • ${deptLabel})`;
                        if (deptBadgeEl) {
                            deptBadgeEl.style.display = 'inline-flex';
                            deptBadgeEl.textContent = deptLabel;
                        }

                        if (activeMode === 'ADVISOR') {
                            if (avatarEl) avatarEl.className = 'ict-role-avatar role-advisor';
                            if (avatarIconEl) avatarIconEl.textContent = 'supervisor_account';
                            if (rolePillEl) {
                                rolePillEl.className = 'ict-role-pill role-advisor';
                                rolePillEl.textContent = 'อาจารย์ที่ปรึกษา (Advisor)';
                            }
                        } else if (activeMode === 'SUPERVISOR') {
                            if (avatarEl) avatarEl.className = 'ict-role-avatar role-advisor';
                            if (avatarIconEl) avatarIconEl.textContent = 'explore';
                            if (rolePillEl) {
                                rolePillEl.className = 'ict-role-pill role-advisor';
                                rolePillEl.textContent = 'อาจารย์นิเทศก์ (Supervisor)';
                            }
                        } else if (activeMode === 'FACULTY_STAFF') {
                            if (avatarEl) avatarEl.className = 'ict-role-avatar role-staff';
                            if (avatarIconEl) avatarIconEl.textContent = 'account_balance';
                            if (rolePillEl) {
                                rolePillEl.className = 'ict-role-pill role-staff';
                                rolePillEl.textContent = role === 'ADMIN' ? 'ผู้ดูแลระบบสูงสุด (Central Admin)' : 'เจ้าหน้าที่คณะ (Staff)';
                            }
                        } else {
                            if (avatarEl) avatarEl.className = 'ict-role-avatar role-course';
                            if (avatarIconEl) avatarIconEl.textContent = 'menu_book';
                            if (rolePillEl) {
                                rolePillEl.className = 'ict-role-pill role-course';
                                rolePillEl.textContent = role === 'ADMIN' ? 'ผู้ดูแลระบบ / อาจารย์ประจำวิชา' : 'อาจารย์ประจำวิชา (Course Instructor)';
                            }
                        }

                        // Hide Student-only nav links when logged in as Staff/Advisor/Admin
                        ['nav-student-profile', 'nav-student-status-all', 'nav-student-checklist'].forEach(id => {
                            const el = document.getElementById(id);
                            if (el) el.style.display = 'none';
                        });
                    }

                    // Adjust Dashboard nav links
                    const navDashboard = headerNav ? headerNav.querySelector('a[href*="dashboard"]') : null;
                    if (isCourseAdminOrStaff) {
                        if (navDashboard) {
                            navDashboard.href = '../pages/dashboard_รายวิชา.html';
                            navDashboard.innerHTML = '<span class="material-icons" style="font-size:16px;">analytics</span><span>Dashboard รายวิชา/คณะ</span>';
                        }
                        if (isAdvOrSup && headerNav && !headerNav.querySelector('#multi-role-advisor-link')) {
                            const advLink = document.createElement('a');
                            advLink.id = 'multi-role-advisor-link';
                            advLink.href = '../pages/dashboard_ที่ปรึกษา.html';
                            advLink.className = 'nav-link';
                            advLink.innerHTML = '<span class="material-icons" style="font-size:16px;">people</span><span>Dashboard ที่ปรึกษา</span>';
                            if (navDashboard && navDashboard.parentElement) {
                                navDashboard.parentElement.insertBefore(advLink, navDashboard.nextSibling);
                            }
                        }
                    } else if (isAdvOrSup) {
                        if (navDashboard) {
                            navDashboard.href = '../pages/dashboard_ที่ปรึกษา.html';
                            navDashboard.innerHTML = '<span class="material-icons" style="font-size:16px;">people</span><span>Dashboard ที่ปรึกษา</span>';
                        }
                    }

                    // Render [REQ-01] Role Switcher Pills ("สลับสิทธิ์:")
                    const switcherContainer = document.getElementById('ict-role-switcher-container');
                    const switcherPills = document.getElementById('ict-switcher-pills');
                    if (switcherContainer && switcherPills && role !== 'STUDENT') {
                        const availableModes = [];
                        if (isAdvisor) {
                            availableModes.push({
                                mode: 'ADVISOR',
                                label: 'อาจารย์ที่ปรึกษา',
                                icon: 'supervisor_account',
                                url: '/pages/dashboard_ที่ปรึกษา.html?roleMode=ADVISOR'
                            });
                        }
                        if (isSupervisor) {
                            availableModes.push({
                                mode: 'SUPERVISOR',
                                label: 'อาจารย์นิเทศก์',
                                icon: 'explore',
                                url: '/pages/dashboard_ที่ปรึกษา.html?roleMode=SUPERVISOR'
                            });
                        }
                        if (isCourseAdmin) {
                            availableModes.push({
                                mode: 'COURSE_INSTRUCTOR',
                                label: 'อาจารย์ประจำวิชา',
                                icon: 'menu_book',
                                url: '/pages/dashboard_รายวิชา.html'
                            });
                        }
                        if (isStaff) {
                            availableModes.push({
                                mode: 'FACULTY_STAFF',
                                label: role === 'ADMIN' ? 'ผู้ดูแลทั้งคณะ' : 'เจ้าหน้าที่คณะ',
                                icon: 'account_balance',
                                url: '/pages/dashboard_รายวิชา.html'
                            });
                        }

                        if (availableModes.length > 0) {
                            switcherContainer.style.display = 'inline-flex';
                            switcherPills.innerHTML = availableModes.map(m => {
                                const isActive = activeMode === m.mode;
                                return `
                                    <button type="button"
                                        class="ict-role-switch-btn ${isActive ? 'active' : ''}"
                                        onclick="window.switchIctRole('${m.mode}', '${m.url}')">
                                        <span class="material-icons" style="font-size:15px;">${m.icon}</span>
                                        <span>${m.label}</span>
                                    </button>
                                `;
                            }).join('');
                        }
                    }

                    // Highlight active nav link
                    if (headerNav) {
                        headerNav.querySelectorAll('a').forEach(a => {
                            a.classList.remove('active');
                            const rawHref = (a.getAttribute('href') || '').split('?')[0];
                            const targetHref = decodeURIComponent(rawHref.replace('../pages/', '/pages/'));
                            if (targetHref && currentPath.includes(targetHref)) {
                                a.classList.add('active');
                            }
                        });
                    }
                })
                .catch(() => {});
        })
        .catch(error => {
            console.error('โหลด header ไม่สำเร็จ', error);
        });
}

window.switchIctRole = async function(roleMode, targetUrl) {
    try {
        await fetch('/auth/switch-role', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ roleMode })
        });
    } catch (_) {}
    window.location.href = targetUrl;
};

initPersistentHeader('../components/header.html');

// ==========================================
// Real-time refresh (polling) — แทน Socket.io เดิม
// ==========================================
(function setupRealtime() {
  const POLL_INTERVAL_MS = 15000;

  if (window.__appRealtimePolling) return;
  window.__appRealtimePolling = true;

  setInterval(() => {
    window.dispatchEvent(new CustomEvent('app:data-updated', { detail: { polled: true } }));
  }, POLL_INTERVAL_MS);
})();
