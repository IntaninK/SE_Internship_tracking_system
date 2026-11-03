// @ts-nocheck
// header_prof.js — โหลด header_prof.html และตั้งค่า nav ตาม role
fetch('../components/header_prof.html')
    .then(response => response.text())
    .then(html => {
        document.getElementById('header-placeholder').innerHTML = html;

        const menuToggle = document.getElementById('menu-toggle');
        const headerNav = document.getElementById('header-nav');

        if (menuToggle && headerNav) {
            menuToggle.addEventListener('click', () => {
                headerNav.classList.toggle('open');
            });
        }

        // ดึง role แล้วปรับ nav link ตาม role (รองรับ Multi-Role ของอาจารย์)
        fetch('/auth/me')
            .then(r => r.json())
            .then(data => {
                if (!data.authenticated) return;

                const role = data.user.role;
                const isCourseAdminOrStaff = Boolean(
                    data.user.isCourseAdmin || data.user.isStaff || role === 'STAFF' || role === 'ADMIN'
                );
                const isAdvOrSup = Boolean(
                    data.user.isAdvisor || data.user.isSupervisor || role === 'ADVISOR'
                );
                const navDashboard = headerNav ? headerNav.querySelector('a[href*="dashboard"]') : null;

                if (isCourseAdminOrStaff) {
                    if (navDashboard) {
                        navDashboard.href = '../pages/dashboard_รายวิชา.html';
                        navDashboard.textContent = 'Dashboard (Admin)';
                    }
                    if (isAdvOrSup && headerNav && !headerNav.querySelector('#multi-role-advisor-link')) {
                        const advLink = document.createElement('a');
                        advLink.id = 'multi-role-advisor-link';
                        advLink.href = '../pages/dashboard_ที่ปรึกษา.html';
                        advLink.className = navDashboard ? navDashboard.className : '';
                        advLink.textContent = 'Dashboard (ที่ปรึกษา)';
                        if (navDashboard && navDashboard.parentElement) {
                            navDashboard.parentElement.insertBefore(advLink, navDashboard.nextSibling);
                        }
                    }
                } else if (isAdvOrSup) {
                    if (navDashboard) {
                        navDashboard.href = '../pages/dashboard_ที่ปรึกษา.html';
                        navDashboard.textContent = 'Dashboard (ที่ปรึกษา)';
                    }
                }

                // Highlight active nav link
                const currentPath = decodeURIComponent(window.location.pathname);
                if (headerNav) {
                    headerNav.querySelectorAll('a').forEach(a => {
                        a.classList.remove('active');
                        const targetHref = decodeURIComponent((a.getAttribute('href') || '').replace('../pages/', '/pages/'));
                        if (targetHref && currentPath.includes(targetHref)) {
                            a.classList.add('active');
                        }
                    });
                }
            })
            .catch(() => {});
    })
    .catch(error => {
        console.error('โหลดheader ไม่สำเร็จ', error);
    });

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
