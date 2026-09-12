// profile_view.js - แสดงข้อมูลโปรไฟล์นิสิต (Proflie.html)

fetch('/api/student/profile')
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            if (data.user) document.getElementById('p-email').value = data.user.email || '-';
            if (data.student) {
                const s = data.student;
                document.getElementById('p-advisor').value = s.advisor?.name || '-';
                document.getElementById('p-nameTh').value = s.nameTh || '-';
                document.getElementById('p-nameEn').value = s.nameEn || '-';
                document.getElementById('p-studentCode').value = s.studentCode || '-';
                document.getElementById('p-year').value = s.year || '-';
                document.getElementById('p-gpa').value = s.gpa ? Number(s.gpa).toFixed(2) : '-';
                document.getElementById('p-major').value = s.major || 'วิศวกรรมซอฟต์แวร์';
                document.getElementById('p-phone').value = s.phone || '-';
                document.getElementById('p-lineId').value = s.lineId || '-';
                document.getElementById('p-facebook').value = s.facebook || '-';

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
