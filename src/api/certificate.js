// certificate.js - อัปโหลด Certificate / ชั่วโมงอบรม (ภาพที่ 3, 4)

const fileInput = document.getElementById('cert-file');
const uploadPrompt = document.getElementById('upload-prompt');
const previewBox = document.getElementById('cert-preview-box');
const previewImg = document.getElementById('cert-preview-img');
const previewPdf = document.getElementById('cert-preview-pdf');
const pdfName = document.getElementById('cert-pdf-name');

let selectedFile = null;

fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        selectedFile = file;
        uploadPrompt.style.display = 'none';
        previewBox.style.display = 'flex';

        if (file.type.startsWith('image/')) {
            previewImg.src = URL.createObjectURL(file);
            previewImg.style.display = 'block';
            previewPdf.style.display = 'none';
        } else if (file.type === 'application/pdf') {
            pdfName.textContent = file.name;
            previewImg.style.display = 'none';
            previewPdf.style.display = 'flex';
        }
    }
});

// Drag & Drop
const dropZone = document.getElementById('dropZone');
['dragenter', 'dragover'].forEach(name => {
    dropZone.addEventListener(name, (e) => {
        e.preventDefault();
        dropZone.style.borderColor = '#138DFF';
    });
});
['dragleave', 'drop'].forEach(name => {
    dropZone.addEventListener(name, (e) => {
        e.preventDefault();
        dropZone.style.borderColor = '#999';
    });
});
dropZone.addEventListener('drop', (e) => {
    const file = e.dataTransfer.files[0];
    if (file) {
        fileInput.files = e.dataTransfer.files;
        fileInput.dispatchEvent(new Event('change'));
    }
});

async function saveTrainingRecord() {
    const hours = document.getElementById('cert-hours').value;
    const skillType = document.getElementById('cert-skill-type').value;
    let title = document.getElementById('cert-title').value;

    if (!hours || hours <= 0) {
        alert('กรุณากรอกจำนวนชั่วโมงให้ถูกต้อง');
        return false;
    }

    if (!title || !title.trim()) {
        title = skillType === 'hard' ? 'อบรม Hard skill' : 'อบรม Soft skill';
    }

    const formData = new FormData();
    formData.append('hours', hours);
    formData.append('skillType', skillType);
    formData.append('title', title);
    if (selectedFile) {
        formData.append('certificate', selectedFile);
    }

    const res = await fetch('/api/student/trainings', {
        method: 'POST',
        body: formData
    });
    const data = await res.json();
    return data;
}

// ปุ่มเพิ่มข้อมูล (บันทึกและเคลียร์ฟอร์มให้เพิ่มใบถัดไป)
document.getElementById('add-cert-btn').addEventListener('click', async () => {
    const btn = document.getElementById('add-cert-btn');
    btn.disabled = true;
    btn.textContent = 'กำลังบันทึก...';

    try {
        const data = await saveTrainingRecord();
        if (data && data.success) {
            alert('✅ เพิ่มข้อมูลการอบรมเรียบร้อยแล้ว (สามารถเพิ่มใบอื่นต่อได้ หรือกดยืนยันด้านล่างเพื่อกลับหน้าหลัก)');
            // Reset form
            selectedFile = null;
            fileInput.value = '';
            document.getElementById('cert-title').value = '';
            previewBox.style.display = 'none';
            uploadPrompt.style.display = 'flex';
        } else if (data) {
            alert('เกิดข้อผิดพลาด: ' + (data.message || 'เพิ่มข้อมูลไม่สำเร็จ'));
        }
    } catch (err) {
        console.error(err);
        alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<span class="material-icons">add_circle</span> เพิ่มข้อมูล';
    }
});

// ปุ่มยืนยันและกลับหน้าหลัก (บันทึกข้อมูลที่กรอกอยู่ แล้วกลับ Dashboard ทันที)
document.getElementById('submit-and-return-btn').addEventListener('click', async () => {
    const btn = document.getElementById('submit-and-return-btn');
    btn.disabled = true;
    btn.textContent = 'กำลังบันทึกข้อมูล...';

    try {
        // ถ้ามีไฟล์หรือระบุชั่วโมงไว้ ให้บันทึกก่อน
        if (selectedFile || document.getElementById('cert-title').value.trim()) {
            const data = await saveTrainingRecord();
            if (!data || !data.success) {
                alert('เกิดข้อผิดพลาด: ' + (data ? data.message : 'บันทึกไม่สำเร็จ'));
                btn.disabled = false;
                btn.textContent = 'ยืนยันและกลับหน้าหลัก';
                return;
            }
        }
        window.location.href = '/pages/dashboard.html';
    } catch (err) {
        console.error(err);
        window.location.href = '/pages/dashboard.html';
    }
});
