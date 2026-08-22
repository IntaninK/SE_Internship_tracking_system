fetch('header.html')
    .then(response => response.text())
    .then(html => {
        document.getElementById('header-placeholder').innerHTML = html;
    })
    .catch(error => {
        console.error('โหลดheader ไม่สำเร็จ', error);
    });