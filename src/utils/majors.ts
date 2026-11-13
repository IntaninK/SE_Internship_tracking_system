// =====================================================================
// รายชื่อสาขาวิชาของคณะ ICT ม.พะเยา (แหล่งข้อมูลกลางที่เดียว)
// - ฝั่ง Server / หน้า TSX import ไฟล์นี้ได้โดยตรง
// - ฝั่ง client script (src/client/*) ถูก compile แยกไฟล์ import ไม่ได้
//   จึงอ่านจาก <script type="application/json" id="ict-majors-data"> ที่หน้าเพจฝังไว้ (ดู ictMajorsDataScript)
// =====================================================================

export interface IctMajor {
  code: string;
  name: string;       // ชื่อมาตรฐานที่ใช้เก็บใน DB เช่น "วิศวกรรมซอฟต์แวร์"
  keywords: string[]; // คำที่ใช้จับคู่ค่าดิบ เช่น "221 วิศวกรรมซอฟต์แวร์", "สาขาวิชาภูมิสารสนเทศ"
  prepSchedule: string;   // ช่วงเรียนเตรียมความพร้อม (ตามหลักสูตร)
  internSchedule: string; // ช่วงออกฝึกงาน (ตามหลักสูตร)
}

// ลำดับตามที่แสดงใน dropdown ของระบบ / โครงสร้างรอบเป็นข้อมูลจริงตามหลักสูตรคณะ ICT
export const ICT_MAJORS: IctMajor[] = [
  { code: "SE", name: "วิศวกรรมซอฟต์แวร์", keywords: ["วิศวกรรมซอฟต์แวร์", "software engineering"],
    prepSchedule: "ปี 3 เทอม 1", internSchedule: "ปี 3 เทอม 2 (ออกฝึกเทอมถัดไปทันที)" },
  { code: "DB", name: "ธุรกิจดิจิทัล", keywords: ["ธุรกิจดิจิทัล", "digital business"],
    prepSchedule: "ปี 3 เทอม 2", internSchedule: "ปี 4 เทอม 1" },
  { code: "CS", name: "วิทยาการคอมพิวเตอร์", keywords: ["วิทยาการคอมพิวเตอร์", "computer science"],
    prepSchedule: "ปี 3 เทอม 1-2", internSchedule: "ปี 4 เทอม 1 หรือ เทอม 2" },
  { code: "IT", name: "เทคโนโลยีสารสนเทศ", keywords: ["เทคโนโลยีสารสนเทศ", "information technology"],
    prepSchedule: "ปี 3 เทอม 2", internSchedule: "ปี 4 เทอม 1" },
  { code: "CPE", name: "วิศวกรรมคอมพิวเตอร์", keywords: ["วิศวกรรมคอมพิวเตอร์", "computer engineering"],
    prepSchedule: "ปี 3 เทอม 1-2", internSchedule: "ปี 4 เทอม 1 หรือ เทอม 2" },
  { code: "CGM", name: "คอมพิวเตอร์กราฟิกและมัลติมีเดีย", keywords: ["คอมพิวเตอร์กราฟิก", "computer graphic"],
    prepSchedule: "ปี 3 เทอม 2", internSchedule: "ปี 4 เทอม 1" },
  { code: "GIS", name: "ภูมิสารสนเทศศาสตร์", keywords: ["ภูมิสารสนเทศ", "geographic information"],
    prepSchedule: "ปี 3 เทอม 2", internSchedule: "ปี 4 เทอม 1" },
  { code: "DSA", name: "วิทยาการข้อมูลและการประยุกต์", keywords: ["วิทยาการข้อมูล", "data science"],
    prepSchedule: "ปี 3 เทอม 1-2", internSchedule: "ปี 4 เทอม 1" },
];

/** หาสาขาจากค่าดิบ (รองรับเลขนำหน้า เช่น "221 วิศวกรรมซอฟต์แวร์", คำนำหน้า "สาขาวิชา", ชื่ออังกฤษ, หรือรหัสย่อ) */
export function findMajor(raw?: string | null): IctMajor | null {
  const v = String(raw || "").trim().toLowerCase();
  if (!v) return null;
  const byCode = ICT_MAJORS.find((m) => m.code.toLowerCase() === v);
  if (byCode) return byCode;
  return ICT_MAJORS.find((m) => m.keywords.some((k) => v.includes(k.toLowerCase()))) || null;
}

/** คืนชื่อสาขามาตรฐาน ถ้าจับคู่ไม่ได้จะคืนค่าเดิมที่ตัดเลขนำหน้า/คำว่า "สาขา" ออกแล้ว */
export function normalizeMajor(raw?: string | null): string {
  const found = findMajor(raw);
  if (found) return found.name;
  return String(raw || "")
    .trim()
    .replace(/^\d+\s*/, "")
    .replace(/^(สาขาวิชา|สาขา)\s*/, "")
    .trim();
}

/** ป้ายแสดงผล เช่น "สาขาคอมพิวเตอร์กราฟิกและมัลติมีเดีย (CGM)" */
export function majorLabel(m: IctMajor): string {
  return `สาขา${m.name} (${m.code})`;
}

/** <option> ของทุกสาขา (value = ชื่อมาตรฐาน) สำหรับฝังใน HTML string */
export function majorOptionsHtml(indent = ""): string {
  return ICT_MAJORS.map((m) => `${indent}<option value="${m.name}">${majorLabel(m)}</option>`).join("\n");
}

/** ข้อมูลสาขาแบบ JSON ให้ client script อ่าน (type="application/json" ไม่ถูก execute) */
export function ictMajorsDataScript(): string {
  return `<script type="application/json" id="ict-majors-data">${JSON.stringify(ICT_MAJORS)}</script>`;
}
