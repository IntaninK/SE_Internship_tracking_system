// @ts-nocheck
// dashboard.js - ดึงข้อมูลสรุปนิสิตแสดงใน Dashboard
function loadDashboardData() {
  fetch('/api/student/dashboard-summary')
    .then(res => res.json())
    .then(data => {
    if (!data.success) return;

    const actionBtn = document.getElementById('dashboard-action-btn');
    const actionBtnText = document.getElementById('action-btn-text');

    if (!data.hasProfile) {
      // ภาพ 1: ยังไม่มีข้อมูล
      actionBtn.href = '/personal-info';
      actionBtnText.textContent = 'เพิ่มข้อมูล';
      document.getElementById('display-name').textContent = data.user.username || data.user.email;
      document.getElementById('display-email').textContent = data.user.email || '-';
      return;
    }

    // ภาพ 5: มีข้อมูลแล้ว -> เปลี่ยนปุ่มเป็น "ดู/แก้ไขข้อมูล"
    actionBtn.href = '/status-all';
    actionBtnText.textContent = 'ดู/แก้ไขข้อมูล';

    const s = data.student;

    // ตรวจสอบสถานะการดรอป
    const dropBanner = document.getElementById('dropped-student-banner');
    if (dropBanner) {
      if (s.isDropped) {
        dropBanner.style.display = 'block';
        const reasonEl = document.getElementById('dropped-banner-reason');
        const dateEl = document.getElementById('dropped-banner-date');
        if (reasonEl) reasonEl.textContent = s.dropReason || 'ดรอปจากระบบ';
        if (dateEl) {
          dateEl.textContent = s.droppedAt
            ? new Date(s.droppedAt).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })
            : '-';
        }
      } else {
        dropBanner.style.display = 'none';
      }
    }

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

// Stage Indicators — 3 ขั้นตอนใหม่: เตรียมเอกสาร → รออนุมัติที่ฝึกงาน → อนุมัติแล้ว
const stageCards = [
  { cardId: 'stage-prepare',          tagLabel: 'เตรียมเอกสาร',         nextLabel: 'รออนุมัติที่ฝึกงาน' },
  { cardId: 'stage-waiting-approve',  tagLabel: 'รออนุมัติที่ฝึกงาน',   nextLabel: 'อนุมัติแล้ว' },
  { cardId: 'stage-approved',         tagLabel: 'อนุมัติแล้ว',          nextLabel: null },
];

function computeCurrentStep(cvData, trainingsData, placementData, companiesData) {
  // ขั้น 3 สำเร็จ: placement ถูกอนุมัติแล้ว → ทุกการ์ดเขียวหมด
  if (placementData && placementData.status === 'APPROVED') {
    return 3; // เลย index สุดท้าย → ทุกขั้นเสร็จสมบูรณ์
  }

  // ขั้น 2: มี placement แล้ว (PENDING/REJECTED) หรือมีบริษัทที่มีสถานะการยื่น
  if (placementData && placementData.companyNameTh) {
    return 1; // มีข้อมูลบริษัทที่เข้าฝึกงานแล้ว แต่ยังไม่ได้อนุมัติ
  }
  // เช็คว่ามีบริษัทที่มี submission (สถานะการยื่น) หรือไม่
  const hasSubmission = companiesData && companiesData.some(c => c.submission && c.submission.status);
  if (hasSubmission) {
    return 1; // มีสถานะการยื่นแล้ว
  }

  // ขั้น 1: ยังอยู่ในขั้นเตรียมเอกสาร
  return 0;
}

function updateStageIndicator(currentIdx) {
  // 1. รีเซ็ตทุกการ์ดก่อน
  stageCards.forEach(cfg => {
    const card = document.getElementById(cfg.cardId);
    if (!card) return;
    card.classList.remove('step-card--active', 'step-card--done');
    card.querySelector('.step-num')?.classList.remove('step-num--active', 'step-num--done');
    card.querySelector('.step-card-title')?.classList.remove('step-card-title--active', 'step-card-title--done');
    card.querySelector('.step-card-sub')?.classList.remove('step-card-sub--active', 'step-card-sub--done');
  });

  // ถ้าครบทุกขั้นตอนแล้ว (currentIdx >= จำนวนขั้น) → ทุกการ์ดเขียวหมด
  const allDone = currentIdx >= stageCards.length;

  // 2. ขั้นที่ผ่านไปแล้ว → done (สีเขียว)
  const doneUpTo = allDone ? stageCards.length : currentIdx;
  for (let i = 0; i < doneUpTo; i++) {
    const card = document.getElementById(stageCards[i].cardId);
    if (!card) continue;
    card.classList.add('step-card--done');
    card.querySelector('.step-num')?.classList.add('step-num--done');
    card.querySelector('.step-card-title')?.classList.add('step-card-title--done');
    card.querySelector('.step-card-sub')?.classList.add('step-card-sub--done');
    // เปลี่ยน icon เป็น check
    const icon = card.querySelector('.material-icons');
    if (icon) { icon.textContent = 'check_circle'; icon.className = 'material-icons text-green-500'; icon.style.fontSize = '16px'; }
  }

  // 3. ขั้นปัจจุบัน → active (สีเหลือง) — เฉพาะกรณียังไม่ครบ
  if (!allDone) {
    const activeCfg = stageCards[currentIdx];
    const activeCard = document.getElementById(activeCfg.cardId);
    if (activeCard) {
      activeCard.classList.add('step-card--active');
      activeCard.querySelector('.step-num')?.classList.add('step-num--active');
      activeCard.querySelector('.step-card-title')?.classList.add('step-card-title--active');
      activeCard.querySelector('.step-card-sub')?.classList.add('step-card-sub--active');
    }
  }

  // 4-5 อัปเดตด้านนอก (ใน updateStageWithDetails)
}

// คำนวณ sub-task ย่อยที่ต้องทำ/เสร็จแล้ว ในขั้นที่ 1 (เตรียมเอกสาร)
function computeSubTasks(cvData, trainingsData, companiesData) {
  const tasks = [
    { name: 'ชม.อบรม', done: trainingsData && trainingsData.status === 'APPROVED' },
    { name: 'CV', done: cvData && cvData.status === 'APPROVED' },
    { name: 'Checklist', done: companiesData && companiesData.some(c => c.checklistStatus === 'APPROVED') },
  ];
  return tasks;
}

function getSubTaskLabels(subTasks, currentIdx, allDone, placementData) {
  if (allDone) {
    return { current: 'อนุมัติแล้ว ✓', next: '✓ ครบทุกขั้นตอน' };
  }

  if (currentIdx === 0) {
    // ขั้น 1: หา sub-task ที่ยังไม่เสร็จ
    const pending = subTasks.filter(t => !t.done);
    const done = subTasks.filter(t => t.done);
    if (pending.length > 0) {
      const currentTask = pending[0].name;
      const nextTask = pending.length > 1 ? pending[1].name : 'รออนุมัติที่ฝึกงาน';
      return { current: currentTask, next: nextTask };
    }
    return { current: 'เตรียมเอกสาร', next: 'รออนุมัติที่ฝึกงาน' };
  }

  if (currentIdx === 1) {
    return { current: 'รออนุมัติที่ฝึกงาน', next: 'อนุมัติแล้ว' };
  }

  return { current: 'อนุมัติแล้ว', next: '✓ ครบทุกขั้นตอน' };
}

function updateStageWithDetails(currentIdx, cvData, trainingsData, companiesData, placementData) {
  updateStageIndicator(currentIdx);

  const allDone = currentIdx >= stageCards.length;
  const subTasks = computeSubTasks(cvData, trainingsData, companiesData);
  const labels = getSubTaskLabels(subTasks, currentIdx, allDone, placementData);

  const currentLabel = document.getElementById('current-step-label');
  if (currentLabel) currentLabel.textContent = `ขั้นตอนปัจจุบัน: ${labels.current}`;

  const nextTag = document.getElementById('next-step-tag');
  const nextLabelEl = document.getElementById('next-step-label');
  if (nextTag && nextLabelEl) {
    nextLabelEl.textContent = labels.next.startsWith('✓') ? labels.next : `ถัดไป: ${labels.next}`;
    nextTag.style.display = '';
  }
}

const currentStepIdx = computeCurrentStep(data.cv, data.trainings, data.placement, data.companies);
updateStageWithDetails(currentStepIdx, data.cv, data.trainings, data.companies, data.placement);

    // CV
    if (data.cv && data.cv.fileUrl) {
      window.currentCvUrl = data.cv.fileUrl;
      document.getElementById('cv-placeholder-text').style.display = 'none';

      // เรียกฟังก์ชันกลาง (ใช้ตัวเดียวกับหน้า admin)
      const displayUrl = getCvDisplayUrl(data.cv);

      const cvImg = document.getElementById('cv-preview-image');
      cvImg.src = displayUrl;
      cvImg.style.display = 'block';
      cvImg.style.cursor = 'pointer';
      cvImg.onclick = () => window.open(data.cv.fileUrl, '_blank');

      const pdfPreview = document.getElementById('cv-pdf-preview');
      if (pdfPreview) pdfPreview.style.display = 'none';

      // ⬇️ ย้าย cvStatusEl เข้ามาไว้ข้างในนี้ด้วย ปิด { ตรงนี้แทน
      const cvStatusEl = document.getElementById('display-cv-status');
      if (data.cv.status === 'APPROVED') {
        cvStatusEl.innerHTML = '<span class="text-xs font-semibold text-green-700 bg-green-100 border border-green-300 px-2 py-0.5 rounded-md inline-block">CVตรวจแล้ว / ผ่าน</span>';
      } else if (data.cv.status === 'REJECTED') {
        cvStatusEl.innerHTML = `
          <span class="text-xs font-semibold text-red-700 bg-red-100 border border-red-300 px-2 py-0.5 rounded-md inline-block">CVไม่ผ่าน / ทำใหม่</span>
          ${data.cv.note ? `<div class="text-xs text-red-600 mt-1 font-normal" style="word-break: break-all;">(${data.cv.note})</div>` : ''}
        `;
      } else {
        cvStatusEl.innerHTML = '<span class="text-xs font-semibold text-amber-700 bg-yellow-100 border border-yellow-400 px-2 py-0.5 rounded-md inline-block">รอผล (รออาจารย์ตรวจ)</span>';
      }
    } // ← ปิด if ตรงนี้เท่านั้น ไม่ปิดก่อนหน้านี้

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

    // คำนวณและแสดงชั่วโมงที่ผ่านการอนุมัติแล้ว (APPROVED)
    const records = (data.trainings && data.trainings.records) ? data.trainings.records : [];
    const approvedSoft = data.trainings?.approvedSoft !== undefined
      ? data.trainings.approvedSoft
      : records.filter(r => r.status === 'APPROVED' && r.skillType === 'SOFT').reduce((sum, r) => sum + (Number(r.hours) || 0), 0);

    const approvedHard = data.trainings?.approvedHard !== undefined
      ? data.trainings.approvedHard
      : records.filter(r => r.status === 'APPROVED' && r.skillType === 'HARD').reduce((sum, r) => sum + (Number(r.hours) || 0), 0);

    // อัปเดต Soft skill progress bar (เกณฑ์ 12 ชม.)
    const softTextEl = document.getElementById('training-progress-text-soft');
    const softBarEl = document.getElementById('training-progress-bar-soft');
    if (softTextEl) softTextEl.textContent = `${approvedSoft} / 12 ชม.`;
    if (softBarEl) softBarEl.style.width = `${Math.min(100, Math.round((approvedSoft / 12) * 100))}%`;

    // อัปเดต Hard skill progress bar (เกณฑ์ 18 ชม.)
    const hardTextEl = document.getElementById('training-progress-text-hard');
    const hardBarEl = document.getElementById('training-progress-bar-hard');
    if (hardTextEl) hardTextEl.textContent = `${approvedHard} / 18 ชม.`;
    if (hardBarEl) hardBarEl.style.width = `${Math.min(100, Math.round((approvedHard / 18) * 100))}%`;

    // แสดงสถานะชั่วโมงอบรมและหมายเหตุจากอาจารย์
    const trainingStatusEl = document.getElementById('display-training-status');
    if (trainingStatusEl) {
      let tStatus = data.trainings?.status;
      let tNote = data.trainings?.note;

      // Fallback: คำนวณจาก records ทันที (ทำงานได้ทันทีแม้ยังไม่ได้รีสตาร์ทเซิร์ฟเวอร์ node)
      if (!tStatus && records && records.length > 0) {
        const hasRejected = records.some(r => r.status === 'REJECTED');
        const rejectedWithNote = records.find(r => r.status === 'REJECTED' && r.note);
        if (rejectedWithNote) tNote = rejectedWithNote.note;

        if (approvedSoft >= 12 && approvedHard >= 18 && !hasRejected) {
          tStatus = 'APPROVED';
        } else if (hasRejected) {
          tStatus = 'REJECTED';
        } else if (records.some(r => r.status === 'PENDING')) {
          tStatus = 'PENDING';
        }
      }

      if (tStatus === 'APPROVED') {
        trainingStatusEl.innerHTML = '<span class="text-xs font-semibold text-green-700 bg-green-100 border border-green-300 px-2.5 py-1 rounded-md inline-block">✓ ผ่าน / ชั่วโมงอบรมครบ</span>';
      } else if (tStatus === 'REJECTED') {
        trainingStatusEl.innerHTML = `
          <span class="text-xs font-semibold text-red-700 bg-red-100 border border-red-300 px-2.5 py-1 rounded-md inline-block">✗ ไม่ผ่าน / ชั่วโมงยังไม่ครบ</span>
          ${tNote ? `<div class="text-xs text-red-600 mt-1.5 font-medium" style="word-break: break-all;">(หมายเหตุ: ${tNote})</div>` : ''}
        `;
      } else {
        trainingStatusEl.innerHTML = '<span class="text-xs font-semibold text-amber-700 bg-yellow-100 border border-yellow-400 px-2.5 py-1 rounded-md inline-block">⏳ รอผล (รออาจารย์ตรวจ)</span>';
      }
    }


    // Checklist Status
    if (data.approvedCompaniesCount > 0) {
      document.getElementById('display-checklist-header').textContent = `Checklist : ${data.companies.length} บริษัท`;
      document.getElementById('display-checklist-status').innerHTML = `<span class="text-green-600 font-semibold">อาจารย์รีวิวแล้ว / ผ่าน (${data.approvedCompaniesCount} ที่)</span>`;
    } else if (data.companies && data.companies.length > 0) {
      document.getElementById('display-checklist-header').textContent = `Checklist : ${data.companies.length} บริษัท`;
      document.getElementById('display-checklist-status').textContent = 'สถานะ: รอผล';
    }

    // Placement / Passed Company
    if (data.placement && data.placement.companyNameTh) {
      document.getElementById('display-position').textContent = `${data.placement.position || '-'}`;
      // ซ่อน empty state ทั้งหมด (icon + placeholder + hint)
      const emptyIcon = document.getElementById('company-empty-icon');
      const placeholderText = document.getElementById('company-placeholder-text');
      const hintText = document.getElementById('company-hint-text');
      if (emptyIcon) emptyIcon.style.display = 'none';
      if (placeholderText) placeholderText.style.display = 'none';
      if (hintText) hintText.style.display = 'none';
      // เปลี่ยน company-box ให้ไม่เป็น empty state style
      const companyBox = document.getElementById('company-box');
      if (companyBox) { companyBox.style.borderStyle = 'solid'; companyBox.style.background = '#fff'; companyBox.style.cursor = 'default'; }
      document.getElementById('company-details').style.display = 'flex';
      document.getElementById('comp-name').textContent = data.placement.companyNameTh || '-';
      document.getElementById('comp-addr').textContent = data.placement.companyAddress || '-';
      document.getElementById('comp-prov').textContent = data.placement.province || '-';
      document.getElementById('comp-phone').textContent = data.placement.companyPhone1 || '-';
      document.getElementById('comp-email').textContent = data.placement.companyEmail || '-';
    }

    // ==========================================
    // Multi-Round Internship Tracking (SCRUM-73)
    // ==========================================
    const roundInfo = data.roundInfo;
    if (roundInfo) {
      // 1. อัปเดตข้อมูลบน Dev Test Toolbar
      const devStatusBadge = document.getElementById('dev-round-status-badge');
      if (devStatusBadge) {
        devStatusBadge.textContent = `รอบที่ ${roundInfo.currentRound} (${roundInfo.currentTerm || '-'}) ${roundInfo.isRound1Completed ? '• จบรอบ 1 แล้ว' : '• กำลังฝึกรอบ 1'}`;
        if (roundInfo.currentRound >= 2) {
          devStatusBadge.className = 'font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300';
        } else {
          devStatusBadge.className = 'font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded border border-purple-300';
        }
      }

      // 2. แสดง/ซ่อนการ์ดตัวเลือกรอบที่ 2 (Transition Card)
      // เงื่อนไข: อยู่ในรอบ 1 และผ่านเกณฑ์จบรอบ 1 แล้ว (canCompleteRound1 หรือ isRound1Completed)
      const transitionCard = document.getElementById('round-transition-card');
      if (transitionCard) {
        if (roundInfo.currentRound === 1 && (roundInfo.canCompleteRound1 || roundInfo.isRound1Completed)) {
          transitionCard.style.display = 'block';
        } else {
          transitionCard.style.display = 'none';
        }
      }

      // 3. แสดง/ซ่อนการ์ด Accordion พับเก็บประวัติรอบที่ 1
      // เงื่อนไข: อยู่ในรอบที่ 2 ขึ้นไป หรือมีข้อมูลประวัติใน historyRounds
      const accordionCard = document.getElementById('round1-accordion-card');
      if (accordionCard) {
        if (roundInfo.currentRound >= 2 || (roundInfo.historyRounds && roundInfo.historyRounds.length > 0)) {
          accordionCard.style.display = 'block';

          const r1 = roundInfo.historyRounds && roundInfo.historyRounds[0];
          if (r1) {
            const termBadge = document.getElementById('accordion-term-badge');
            const r1Name = document.getElementById('r1-comp-name');
            const r1Pos = document.getElementById('r1-comp-pos');
            const r1Addr = document.getElementById('r1-comp-addr');
            const r1Contact = document.getElementById('r1-comp-contact');
            const r1Checklist = document.getElementById('r1-checklist-badge');
            const r1Acceptance = document.getElementById('r1-acceptance-info');
            const r1DocsList = document.getElementById('r1-docs-list');

            if (termBadge) termBadge.textContent = r1.term || 'รอบ 1';
            if (r1Name) r1Name.textContent = r1.companyName || '-';
            if (r1Pos) r1Pos.textContent = r1.position || '-';
            if (r1Addr) r1Addr.textContent = `${r1.companyAddress || '-'} ${r1.province && r1.province !== '-' ? '(' + r1.province + ')' : ''}`;
            if (r1Contact) r1Contact.textContent = `${r1.phone || '-'} / ${r1.email || '-'}`;
            if (r1Checklist) {
              r1Checklist.textContent = r1.checklistStatus === 'APPROVED' ? 'ผ่านครบทุกขั้นตอน' : (r1.checklistStatus || 'ผ่าน');
            }
            if (r1Acceptance) {
              r1Acceptance.textContent = r1.companyResponseStatus === 'ACCEPTED' ? 'ตอบรับเข้าฝึกงานเรียบร้อย' : (r1.companyResponseStatus || 'ตอบรับแล้ว');
            }

            if (r1DocsList) {
              const docs = [];
              if (r1.requestLetterIssued) {
                docs.push(`📄 หนังสือขอความอนุเคราะห์ (${r1.requestLetterDocNo ? 'เลขที่: ' + r1.requestLetterDocNo : 'ออกหนังสือแล้ว'})`);
              }
              if (r1.companyResponseFileUrl) {
                docs.push(`📄 แบบตอบรับ: <a href="${r1.companyResponseFileUrl}" target="_blank" class="text-blue-600 underline font-semibold">${r1.companyResponseFileName || 'เปิดดูแบบตอบรับ'}</a>`);
              }
              if (r1.dispatchLetterIssued) {
                docs.push(`📄 หนังสือส่งตัว (${r1.dispatchLetterDocNo ? 'เลขที่: ' + r1.dispatchLetterDocNo : 'ออกหนังสือแล้ว'})`);
              }

              if (docs.length > 0) {
                r1DocsList.innerHTML = docs.map(d => `<div class="text-xs text-gray-700 bg-gray-50 px-2 py-1 rounded border border-gray-200">${d}</div>`).join('');
              } else {
                r1DocsList.innerHTML = '<span class="text-gray-400 italic">ไม่มีไฟล์แนบประวัติ</span>';
              }
            }
          }
        } else {
          accordionCard.style.display = 'none';
        }
      }
    }
  })
  .catch(err => console.error('Error fetching dashboard summary:', err));
}

// โหลดข้อมูลครั้งแรก
loadDashboardData();

// ⚡ เมื่อมีสัญญาณ Real-time จาก Socket.io ให้อัปเดต Dashboard ทันที
window.addEventListener('app:data-updated', () => {
  loadDashboardData();
});


// ==========================================
// Handlers สำหรับ Multi-Round (SCRUM-73)
// ==========================================
window.toggleRound1Accordion = function() {
  const body = document.getElementById('round1-accordion-body');
  const arrow = document.getElementById('accordion-arrow');
  const toggleText = document.getElementById('accordion-toggle-text');
  if (!body) return;
  const isHidden = body.style.display === 'none';
  body.style.display = isHidden ? 'block' : 'none';
  if (arrow) arrow.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';
  if (toggleText) toggleText.textContent = isHidden ? 'พับเก็บ' : 'คลี่ดูรายละเอียด';
};

window.submitRoundChoice = async function(action) {
  const termSelect = document.getElementById('round2-term-select');
  const term = termSelect ? termSelect.value : 'Summer 3/2569';
  
  const actionLabel = action === 'SAME_COMPANY' 
    ? 'ยืนยันฝึกงานที่เดิมต่อสำหรับรอบที่ 2' 
    : 'ยืนยันเปลี่ยนสถานที่ฝึกงานใหม่สำหรับรอบที่ 2';
    
  if (!confirm(`${actionLabel}\nรอบเทอม: ${term}\n\nคุณแน่ใจหรือไม่ที่จะดำเนินการต่อ?`)) {
    return;
  }

  try {
    const res = await fetch('/api/student/round/complete-round-1', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, term }),
    });
    const data = await res.json();
    if (data.success) {
      alert(data.message);
      loadDashboardData();
    } else {
      alert(data.message || 'เกิดข้อผิดพลาดในการบันทึกรอบที่ 2');
    }
  } catch (err) {
    console.error('Error submitting round choice:', err);
    alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
  }
};

window.devToggleRound = async function(mode) {
  try {
    const res = await fetch('/api/student/round/dev-toggle-round', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode }),
    });
    const data = await res.json();
    if (data.success) {
      alert(data.message);
      loadDashboardData();
    } else {
      alert(data.message || 'เกิดข้อผิดพลาด');
    }
  } catch (err) {
    console.error('Error in devToggleRound:', err);
    alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
  }
};
