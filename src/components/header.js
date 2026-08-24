fetch('../components/header.html')
    .then(response => response.text())
    .then(html => {
        document.getElementById('header-placeholder').innerHTML = html;

        const menuToggle = document.getElementById('menu-toggle');   // ตรงกับ id ใน HTML ปัจจุบัน (toggle)
        const headerNav = document.getElementById('header-nav');     // แก้จาก querySelector('header-nav')

        menuToggle.addEventListener('click', () => {
            headerNav.classList.toggle('open');
        });
    })
    .catch(error => {
        console.error('โหลดheader ไม่สำเร็จ', error);
    });