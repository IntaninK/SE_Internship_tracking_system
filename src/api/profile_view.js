// profile_view.js - แสดงข้อมูลโปรไฟล์นิสิต (Proflie.html)

fetch('/api/student/profile')
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            if (data.user) document.getElementById('p-email').textContent = data.user.email || '-';
            if (data.student) {
                const s = data.student;
                document.getElementById('p-nameTh').textContent = s.nameTh || '-';
                document.getElementById('p-nameEn').textContent = s.nameEn || '-';
                document.getElementById('p-studentCode').textContent = s.studentCode || '-';
                document.getElementById('p-year').textContent = s.year || '-';
                document.getElementById('p-gpa').textContent = s.gpa ? Number(s.gpa).toFixed(2) : '-';
                document.getElementById('p-major').textContent = s.major || 'วิศวกรรมซอฟต์แวร์';
                document.getElementById('p-phone').textContent = s.phone || '-';
                document.getElementById('p-lineId').textContent = s.lineId || '-';
                document.getElementById('p-facebook').textContent = s.facebook || '-';

                if (s.profileImageUrl) {
                    const photo = document.getElementById('p-photo');
                    photo.src = s.profileImageUrl;
                    photo.style.display = 'block';
                    document.getElementById('p-icon').style.display = 'none';
                }
            }
        }
    })
    .catch(err => console.error('Error fetching profile:', err));
