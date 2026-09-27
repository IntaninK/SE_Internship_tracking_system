// personal_info.js - กรอกข้อมูลส่วนตัวนิสิต (ภาพที่ 2)
let isDroppedStudent = false;

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

                if (s.isDropped) {
                    isDroppedStudent = true;
                    const inputIds = ['nameTh', 'nameEn', 'studentCode', 'year', 'gpa', 'phone', 'facebook', 'lineId', 'email'];
                    inputIds.forEach(id => {
                        const el = document.getElementById(id);
                        if (el) {
                            el.disabled = true;
                            el.style.backgroundColor = '#f1f5f9';
                            el.style.cursor = 'not-allowed';
                        }
                    });

                    const submitBtn = document.getElementById('submit-btn');
                    if (submitBtn) {
                        submitBtn.disabled = true;
                        submitBtn.style.opacity = '0.55';
                        submitBtn.style.cursor = 'not-allowed';
                        submitBtn.innerHTML = '<span class="material-icons" style="font-size:18px;">lock</span> บัญชีถูกดรอป (ปิดการแก้ไขข้อมูล)';
                    }

                    // แสดง banner แจ้งเตือน
                    const dropBanner = document.createElement('div');
                    dropBanner.className = 'mb-4 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl shadow-sm';
                    dropBanner.innerHTML = `
                      <div class="flex items-center gap-3">
                        <span class="material-icons text-red-500 text-2xl">lock</span>
                        <div>
                          <h4 class="text-sm font-bold text-red-800">บัญชีอยู่ในสถานะดรอปการฝึกงาน (โหมดดูข้อมูล)</h4>
                          <p class="text-xs text-red-700 mt-0.5">ข้อมูลส่วนตัวเดิมยังคงแสดงอยู่ครบถ้วน แต่ไม่สามารถแก้ไขข้อมูลได้</p>
                        </div>
                      </div>
                    `;
                    const form = document.getElementById('student-form');
                    if (form && form.parentElement) {
                        form.parentElement.insertBefore(dropBanner, form);
                    }
                }
            }
        }
    })
    .catch(err => console.error('Load profile error:', err));

// Submit Form
document.getElementById('student-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (isDroppedStudent) {
        alert('บัญชีของคุณอยู่ในสถานะดรอปการฝึกงาน ไม่สามารถแก้ไขข้อมูลได้');
        return;
    }
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
