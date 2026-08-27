// dashboard.js - ดึงข้อมูลสรุปนิสิตแสดงใน Dashboard
fetch('/api/student/dashboard-summary')
  .then(res => res.json())
  .then(data => {
    if (!data.success) return;

    const actionBtn = document.getElementById('dashboard-action-btn');
    const actionBtnText = document.getElementById('action-btn-text');

    if (!data.hasProfile) {
      // ภาพ 1: ยังไม่มีข้อมูล
      actionBtn.href = '/pages/Personal_Information.html';
      actionBtnText.textContent = 'เพิ่มข้อมูล';
      document.getElementById('display-name').textContent = data.user.username || data.user.email;
      document.getElementById('display-email').textContent = data.user.email || '-';
      return;
    }

    // ภาพ 5: มีข้อมูลแล้ว -> เปลี่ยนปุ่มเป็น "ดู/แก้ไขข้อมูล"
    actionBtn.href = '/pages/status_all.html';
    actionBtnText.textContent = 'ดู/แก้ไขข้อมูล';

    const s = data.student;
    document.getElementById('display-name').textContent = `${s.studentCode || ''} ${s.nameTh || data.user.username}`.trim();
    document.getElementById('display-phone').textContent = s.phone || '-';
    document.getElementById('display-email').textContent = data.user.email || '-';
    document.getElementById('display-advisor').textContent = `อาจารย์ที่ปรึกษา: ${s.advisor || '-'}`;
    document.getElementById('display-gpa').textContent = `GPA : ${s.gpa ? Number(s.gpa).toFixed(2) : '-.--'}`;

    if (s.profileImageUrl) {
      const img = document.getElementById('profile-img');
      img.src = s.profileImageUrl;
      img.style.display = 'block';
      document.getElementById('profile-icon').style.display = 'none';
    }

    // Stage Indicators
    const stage = s.stage;
    const pDocs = document.getElementById('stage-pending-docs');
    const pAppr = document.getElementById('stage-pending-appr');
    const pReady = document.getElementById('stage-ready');

    pDocs.className = 'text-[#757575]';
    pAppr.className = 'text-[#757575]';
    pReady.className = 'text-[#757575]';

    if (stage === 'PENDING_DOCUMENTS') {
      pDocs.className = 'text-[#E7E54D] font-bold';
    } else if (stage === 'PENDING_APPROVAL') {
      pAppr.className = 'text-[#53DDFF] font-bold';
    } else if (stage === 'READY') {
      pReady.className = 'text-[#51FF51] font-bold';
    }

    // CV
    if (data.cv && data.cv.fileUrl) {
      window.currentCvUrl = data.cv.fileUrl;
      document.getElementById('cv-placeholder-text').style.display = 'none';
      
      if (data.cv.fileUrl.endsWith('.pdf')) {
        document.getElementById('cv-pdf-preview').style.display = 'flex';
      } else {
        const cvImg = document.getElementById('cv-preview-image');
        cvImg.src = data.cv.fileUrl;
        cvImg.style.display = 'block';
      }

      const cvStatusEl = document.getElementById('display-cv-status');
      if (data.cv.status === 'APPROVED') {
        cvStatusEl.textContent = 'ผ่านการตรวจจากอาจารย์แล้ว';
        cvStatusEl.className = 'text-lg text-green-600 font-medium';
      } else if (data.cv.status === 'REJECTED') {
        cvStatusEl.textContent = 'ไม่ผ่าน: ' + (data.cv.note || 'กรุณาแก้ไข');
        cvStatusEl.className = 'text-lg text-red-600 font-medium';
      } else {
        cvStatusEl.textContent = 'รออาจารย์ตรวจ';
        cvStatusEl.className = 'text-lg text-amber-600 font-medium';
      }
    }

    // Training Table
    if (data.trainings && data.trainings.records && data.trainings.records.length > 0) {
      const tbody = document.getElementById('training-tbody');
      tbody.innerHTML = '';
      data.trainings.records.forEach((rec, idx) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td class="bg-white py-2 px-3 border border-[#777] text-center font-medium">${idx + 1}</td>
          <td class="bg-white py-2 px-3 border border-[#777]">${rec.title}</td>
          <td class="bg-white py-2 px-3 border border-[#777] text-center">${rec.skillType === 'SOFT' ? rec.hours : '-'}</td>
          <td class="bg-white py-2 px-3 border border-[#777] text-center">${rec.skillType === 'HARD' ? rec.hours : '-'}</td>
        `;
        tbody.appendChild(tr);
      });

      document.getElementById('total-soft').textContent = data.trainings.totalSoft || 0;
      document.getElementById('total-hard').textContent = data.trainings.totalHard || 0;
    }

    // Checklist Status
    if (data.approvedCompaniesCount > 0) {
      document.getElementById('display-checklist-header').textContent = `Checklist : ${data.companies.length} บริษัท`;
      document.getElementById('display-checklist-status').innerHTML = `<span class="text-green-600 font-semibold">ดูบริษัทที่ผ่าน (${data.approvedCompaniesCount} ที่)</span>`;
    } else if (data.companies && data.companies.length > 0) {
      document.getElementById('display-checklist-header').textContent = `Checklist : ${data.companies.length} บริษัท`;
      document.getElementById('display-checklist-status').textContent = 'สถานะ: รอผลตรวจ';
    }

    // Placement / Passed Company
    if (data.placement && data.placement.companyNameTh) {
      document.getElementById('display-position').textContent = `ตำแหน่งเข้าสมัครงาน : ${data.placement.position || '-'}`;
      document.getElementById('company-placeholder-text').style.display = 'none';
      document.getElementById('company-details').style.display = 'flex';
      document.getElementById('comp-name').textContent = data.placement.companyNameTh || '-';
      document.getElementById('comp-addr').textContent = data.placement.companyAddress || '-';
      document.getElementById('comp-prov').textContent = data.placement.province || '-';
      document.getElementById('comp-phone').textContent = data.placement.companyPhone1 || '-';
      document.getElementById('comp-email').textContent = data.placement.companyEmail || '-';
    }
  })
  .catch(err => console.error('Error fetching dashboard summary:', err));
