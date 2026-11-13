// ปรับชื่อสาขาของนิสิตในฐานข้อมูลให้เป็นชื่อมาตรฐาน (เช่น "221 วิศวกรรมซอฟต์แวร์" -> "วิศวกรรมซอฟต์แวร์")
// ใช้งาน:
//   npx tsx scripts/normalize-student-majors.ts          (dry-run: แสดงรายการที่จะเปลี่ยน ไม่แก้ข้อมูล)
//   npx tsx scripts/normalize-student-majors.ts --apply  (แก้ข้อมูลจริง)
import prisma from "../src/db";
import { normalizeMajor } from "../src/utils/majors";

async function main() {
  const apply = process.argv.includes("--apply");
  const students = await prisma.student.findMany({
    select: { id: true, studentCode: true, major: true },
  });

  const changes = students
    .filter((s) => s.major)
    .map((s) => ({ ...s, next: normalizeMajor(s.major) }))
    .filter((s) => s.next && s.next !== s.major);

  const summary: Record<string, number> = {};
  for (const c of changes) {
    const key = `"${c.major}" -> "${c.next}"`;
    summary[key] = (summary[key] || 0) + 1;
  }

  console.log(`นิสิตทั้งหมด ${students.length} คน, ต้องปรับ ${changes.length} คน`);
  for (const [k, n] of Object.entries(summary)) console.log(`  ${k}: ${n} คน`);

  if (!apply) {
    console.log("\n(dry-run) ยังไม่ได้แก้ข้อมูล — เพิ่ม --apply เพื่อบันทึกจริง");
    return;
  }

  // จัดกลุ่มตามค่าเดิม -> ค่าใหม่ แล้ว updateMany ทีละกลุ่ม
  const groups = new Map<string, { from: string; to: string }>();
  for (const c of changes) groups.set(`${c.major}|${c.next}`, { from: c.major as string, to: c.next });
  let updated = 0;
  for (const { from, to } of groups.values()) {
    const r = await prisma.student.updateMany({ where: { major: from }, data: { major: to } });
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
