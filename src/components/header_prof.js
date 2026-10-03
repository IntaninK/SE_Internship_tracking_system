// header.js — โหลด header.html และตั้งค่า nav ตาม role
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

        // ดึง role แล้วปรับ nav link ตาม role
        fetch('/auth/me')
            .then(r => r.json())
            .then(data => {
                if (!data.authenticated) return;

                const role = data.user.role;
                const navDashboard = headerNav ? headerNav.querySelector('a[href*="dashboard"]') : null;

                if (role === 'STAFF' || role === 'ADMIN') {
                    if (navDashboard) {
                        navDashboard.href = '../pages/dashboard_รายวิชา.html';
                        navDashboard.textContent = 'Dashboard (Admin)';
                    }
                } else if (role === 'ADVISOR') {
                    if (navDashboard) {
                        navDashboard.href = '../pages/dashboard_ที่ปรึกษา.html';
                        navDashboard.textContent = 'Dashboard (ที่ปรึกษา)';
                    }
                }

                // Highlight active nav link
                const currentPath = window.location.pathname;
                if (headerNav) {
                    headerNav.querySelectorAll('a').forEach(a => {
                        a.classList.remove('active');
                        if (currentPath.includes(a.getAttribute('href').replace('../pages/', '/pages/'))) {
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
// เพราะ serverless function บน Vercel ไม่เก็บ connection ค้างไว้
// Consumer เดิม (admin_dashboard.js ฯลฯ) แค่ฟัง event นี้แล้ว refetch data
// เราจึงยิง event เดิมซ้ำทุก ๆ POLL_INTERVAL_MS แทนการ push จาก server
// ==========================================
(function setupRealtime() {
  const POLL_INTERVAL_MS = 15000; // 15 วินาที ปรับได้ตามความเหมาะสม

  if (window.__appRealtimePolling) return; // กันไม่ให้ตั้ง interval ซ้ำ
  window.__appRealtimePolling = true;

  setInterval(() => {
    window.dispatchEvent(new CustomEvent('app:data-updated', { detail: { polled: true } }));
  }, POLL_INTERVAL_MS);
})();