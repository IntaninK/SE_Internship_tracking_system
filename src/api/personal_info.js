// personal_info.js - กรอกข้อมูลส่วนตัวนิสิต (ภาพที่ 2)

// ดึงข้อมูลเดิม / ข้อมูลจาก Session มา Prefill
fetch('/api/student/profile')
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            if (data.user) {
                document.getElementById('email').value = data.user.email || '';
                
                // ถ้านิสิตยังไม่เคยกรอกข้อมูล ลองเดารหัสจากอีเมล
                if (!data.student && data.user.email) {
                    const emailPrefix = data.user.email.split('@')[0];
                    if (/^\d+$/.test(emailPrefix)) {
                        document.getElementById('studentCode').value = emailPrefix;
                    }
                }
            }
            if (data.student) {
                const s = data.student;
                if (s.nameTh) document.getElementById('nameTh').value = s.nameTh;
                if (s.nameEn) document.getElementById('nameEn').value = s.nameEn;
                if (s.studentCode) document.getElementById('studentCode').value = s.studentCode;
                if (s.year) document.getElementById('year').value = s.year;
                if (s.gpa) document.getElementById('gpa').value = s.gpa;
                if (s.phone) document.getElementById('phone').value = s.phone;
                if (s.facebook) document.getElementById('facebook').value = s.facebook;
                if (s.lineId) document.getElementById('lineId').value = s.lineId;
            }
        }
    })
    .catch(err => console.error('Load profile error:', err));

// Submit Form
document.getElementById('student-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = document.getElementById('submit-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'กำลังบันทึก...';

    const payload = {
        nameTh: document.getElementById('nameTh').value,
        nameEn: document.getElementById('nameEn').value,
        studentCode: document.getElementById('studentCode').value,
        year: document.getElementById('year').value,
        gpa: document.getElementById('gpa').value,
        phone: document.getElementById('phone').value,
        facebook: document.getElementById('facebook').value,
        lineId: document.getElementById('lineId').value,
    };

    try {
        const res = await fetch('/api/student/profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();

        if (data.success) {
            // ไปยังขั้นตอนถัดไป (ภาพที่ 3: Certificate.html)
            window.location.href = '/pages/Certificate.html';
        } else {
            alert('เกิดข้อผิดพลาด: ' + (data.message || 'บันทึกไม่สำเร็จ'));
            submitBtn.disabled = false;
            submitBtn.textContent = 'ยืนยันและไปขั้นตอนถัดไป';
        }
    } catch (err) {
        console.error(err);
        alert('เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์');
        submitBtn.disabled = false;
        submitBtn.textContent = 'ยืนยันและไปขั้นตอนถัดไป';
    }
});
