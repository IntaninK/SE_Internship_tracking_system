// ผูก "รอบออกฝึก" (Student.internshipWindowId) ย้อนหลังให้นิสิตที่ยื่น Checklist ไปแล้วก่อนมีระบบรุ่น/รอบ
// กติกา (ไม่เดา ถ้าไม่ชัดจะข้าม):
//   - เฉพาะนิสิตที่ยังไม่ผูกรอบ และมี Checklist (บริษัท) อย่างน้อย 1 รายการ
//   - หารอบจาก "รุ่นของตัวเอง + สาขาตัวเอง" เท่านั้น
//   - ถ้ามีรอบที่เทอมตรงกับเทอมปัจจุบันของนิสิต (round state / semester+academicYear) -> ผูกรอบนั้น
//   - ถ้าไม่ตรง แต่สาขานั้นในรุ่นมีรอบเดียว -> ผูกรอบนั้น
//   - นอกนั้นข้าม (ให้พี่จอม/นิสิตเลือกเองตอนแก้ Checklist)
// ใช้งาน:
//   npx tsx scripts/backfill-student-windows.ts           (dry-run: แสดงผล ไม่แก้ข้อมูล)
//   npx tsx scripts/backfill-student-windows.ts --apply   (บันทึกจริง)
import prisma from "../src/db";
import { getStudentRoundState } from "../src/utils/superAdminStore";
import { findMajor } from "../src/utils/majors";
import { cohortCodeOf, termSortKey } from "../src/utils/internshipWindowRules";

const MOCK_CODES = new Set(["67000000", "67000001", "67099999", "67024999"]);

function termOf(student: { id: number; semester: string | null; academicYear: string | null }): string {
  const defaultTerm = `${student.semester || "2"}/${student.academicYear || "2568"}`;
  const current = getStudentRoundState(student.id, defaultTerm).currentTerm || defaultTerm;
  const m = String(current).match(/[123]\/\d{4}/);
  if (m) return m[0];
  // semester = "SUMMER" -> 3/ปี
  if (String(student.semester).toUpperCase() === "SUMMER" && student.academicYear) return `3/${student.academicYear}`;
  return "";
}

async function main() {
  const apply = process.argv.includes("--apply");

  const students = await prisma.student.findMany({
    where: { internshipWindowId: null, companies: { some: {} } },
    select: {
      id: true,
      studentCode: true,
      nameTh: true,
      major: true,
      semester: true,
      academicYear: true,
    },
    orderBy: { studentCode: "asc" },
  });

  const windows = await prisma.internshipWindow.findMany({ include: { cohort: true } });

  const assign: { id: number; windowId: number; line: string }[] = [];
  const skipped: string[] = [];

  for (const s of students) {
    const tag = `${s.studentCode}${MOCK_CODES.has(s.studentCode) ? " (mock)" : ""} ${s.nameTh ?? ""}`.trim();
    const major = findMajor(s.major);
    const cohort = cohortCodeOf(s.studentCode);
    if (!major || !cohort) {
      skipped.push(`${tag} — ไม่รู้สาขา/รุ่น (major="${s.major ?? ""}")`);
      continue;
    }
    const own = windows
      .filter((w) => w.cohort.code === cohort && w.majorCode === major.code)
      .sort((a, b) => termSortKey(a.term) - termSortKey(b.term));
    if (own.length === 0) {
      skipped.push(`${tag} — รุ่น ${cohort} สาขา ${major.code} ยังไม่มีรอบออกฝึก`);
      continue;
    }
    const term = termOf(s);
    const byTerm = own.find((w) => w.term === term);
    const chosen = byTerm || (own.length === 1 ? own[0] : null);
    if (!chosen) {
      skipped.push(`${tag} — สาขา ${major.code} รุ่น ${cohort} มี ${own.length} รอบ และเทอม "${term}" ไม่ตรงรอบไหน`);
      continue;
    }
    assign.push({
      id: s.id,
      windowId: chosen.id,
      line: `${tag} → รุ่น ${cohort} ${major.code} รอบ ${chosen.term}${byTerm ? " (เทอมตรง)" : " (รอบเดียวของสาขา)"}`,
    });
  }

  console.log(`นิสิตที่มี Checklist แต่ยังไม่ผูกรอบ: ${students.length} คน\n`);
  console.log(`จะผูกรอบ ${assign.length} คน:`);
  assign.forEach((a) => console.log("  " + a.line));
  console.log(`\nข้าม ${skipped.length} คน:`);
  skipped.forEach((l) => console.log("  " + l));

  if (!apply) {
    console.log("\n(dry-run) ยังไม่ได้บันทึก — เพิ่ม --apply เพื่อบันทึกจริง");
    return;
  }

  // ผูกเฉพาะคนที่ยังว่างอยู่ (กันทับกรณีนิสิตเพิ่งยื่น Checklist ระหว่างรันสคริปต์)
  let updated = 0;
  for (const a of assign) {
    const r = await prisma.student.updateMany({
      where: { id: a.id, internshipWindowId: null },
      data: { internshipWindowId: a.windowId },
    });
    updated += r.count;
  }
  console.log(`\nบันทึกแล้ว ${updated} คน`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
