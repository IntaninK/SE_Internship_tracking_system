// ย้ายการตั้งค่า "รอบฝึกงาน & ปลดล็อก" เดิม (majorUnlockRules ใน data/super_admin_state.json)
// เข้าตารางใหม่ InternshipCohort / InternshipWindow เป็นรุ่นที่กำหนด (ค่าเริ่มต้น: รุ่น 67)
// ใช้งาน:
//   npx tsx scripts/seed-cohorts-from-json.ts            (dry-run: แสดงสิ่งที่จะสร้าง ไม่แก้ข้อมูล)
//   npx tsx scripts/seed-cohorts-from-json.ts --apply    (บันทึกจริง)
//   npx tsx scripts/seed-cohorts-from-json.ts --cohort=67 --apply
import prisma from "../src/db";
import { loadSuperAdminState } from "../src/utils/superAdminStore";
import { isValidTerm, parseYmd, todayYmdBangkok } from "../src/utils/internshipWindowRules";

async function main() {
  const apply = process.argv.includes("--apply");
  const cohortArg = process.argv.find((a) => a.startsWith("--cohort="));
  const cohortCode = cohortArg ? cohortArg.split("=")[1] : "67";

  const state = loadSuperAdminState();
  const rules = state.majorUnlockRules || [];

  const existing = await prisma.internshipCohort.findUnique({
    where: { code: cohortCode },
    include: { windows: true },
  });
  if (existing && existing.windows.length > 0) {
    console.log(`รุ่น ${cohortCode} มีรอบออกฝึกในฐานข้อมูลแล้ว ${existing.windows.length} รอบ — ไม่ทำซ้ำ`);
    return;
  }

  const today = todayYmdBangkok();
  const plan = rules.map((r) => {
    const term = String(r.targetTerm || "").trim();
    const closeYmd = String(r.closeDate || "");
    return {
      majorCode: r.code,
      term,
      termType: term.startsWith("3/") ? ("SUMMER" as const) : ("REGULAR" as const),
      openDate: parseYmd(r.openDate),
      closeDate: parseYmd(r.closeDate),
      isUnlocked: Boolean(r.isUnlocked),
      // ระบบเดิมไม่มี Auto-lock: สาขาที่ปลดล็อกอยู่แต่พ้นวันปิดแล้ว ให้ "เปิดต่อพิเศษ" ไว้ก่อน
      // เพื่อไม่ให้พฤติกรรมเปลี่ยนทันทีหลังย้ายข้อมูล (พี่จอมปิดเองได้ภายหลัง)
      extendedOpen: Boolean(r.isUnlocked) && Boolean(closeYmd) && today > closeYmd,
      note: r.note || null,
      valid: isValidTerm(term),
    };
  });

  console.log(`จะสร้างรุ่น ${cohortCode} พร้อมรอบออกฝึก ${plan.length} รอบ:`);
  for (const p of plan) {
    console.log(
      `  ${p.majorCode.padEnd(4)} ${p.term.padEnd(7)} ${p.termType.padEnd(7)} ` +
        `${p.openDate?.toISOString().slice(0, 10) || "-"} → ${p.closeDate?.toISOString().slice(0, 10) || "-"} ` +
        `${p.isUnlocked ? "ปลดล็อก" : "ล็อก"}${p.extendedOpen ? " + เปิดต่อพิเศษ" : ""}${p.valid ? "" : "  ⚠ รูปแบบเทอมไม่ถูกต้อง (ข้าม)"}`
    );
  }

  if (!apply) {
    console.log("\n(dry-run) ยังไม่ได้บันทึก — เพิ่ม --apply เพื่อบันทึกจริง");
    return;
  }

  const cohort =
    existing ||
    (await prisma.internshipCohort.create({
      data: { code: cohortCode, note: "ย้ายจากการตั้งค่าเดิม (majorUnlockRules)" },
    }));

  let created = 0;
  for (const p of plan.filter((x) => x.valid)) {
    await prisma.internshipWindow.create({
      data: {
        cohortId: cohort.id,
        majorCode: p.majorCode,
        term: p.term,
        termType: p.termType,
        isOptional: p.termType === "SUMMER",
        openDate: p.openDate,
        closeDate: p.closeDate,
        isUnlocked: p.isUnlocked,
        extendedOpen: p.extendedOpen,
        note: p.note,
      },
    });
    created++;
  }
  console.log(`\nบันทึกแล้ว: รุ่น ${cohortCode}, รอบออกฝึก ${created} รอบ`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
