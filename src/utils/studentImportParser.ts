import * as xlsx from "xlsx";

export interface ExtractedRowData {
  studentCode: string;
  nameTh: string;
  admissionYear: string;
  major: string;
  curriculum: string;
  gpa: number | null;
  studentStatus: string;
}

export interface MatchedStudent {
  studentCode: string;
  nameTh: string;
  nameEn: string;
  year: number;
  major: string;
  gpa: number | null;
  email: string;
  studentStatus: string;
}

export interface SkippedStudent {
  rowNumber: number;
  studentCode: string;
  nameTh: string;
  major: string;
  reason: string;
}

export interface ParseSpreadsheetResult {
  summary: {
    totalRows: number;
    matchedCount: number;
    skippedCount: number;
    academicYear: number;
  };
  matchedStudents: MatchedStudent[];
  skippedStudents: SkippedStudent[];
}

/**
 * คำนวณปีการศึกษาปัจจุบัน (Academic Year) โดยยึดจุดตัดเดือนมิถุนายน (เดือน 6)
 * - เดือน ม.ค. - พ.ค. (1 - 5): ยังอยู่ในปีการศึกษาก่อนหน้า (พ.ศ. ปัจจุบัน - 1)
 * - เดือน มิ.ย. - ธ.ค. (6 - 12): ขึ้นปีการศึกษาใหม่แล้ว (พ.ศ. ปัจจุบัน)
 * @param {Date} date 
 * @returns {number} ปีการศึกษา พ.ศ.
 */
export function calculateCurrentAcademicYear(date: Date = new Date()): number {
  const month = date.getMonth() + 1; // 1 = Jan, 6 = Jun
  const beYear = date.getFullYear() + 543;
  return month < 6 ? beYear - 1 : beYear;
}

/**
 * คำนวณชั้นปีของนิสิต (1, 2, 3, 4, ...) จากปีที่เข้าศึกษา หรือจากรหัสนิสิต
 * @param {number|string|null|undefined} admissionYear 
 * @param {string} studentCode 
 * @param {number} academicYear 
 * @returns {number}
 */
export function calculateStudentYear(
  admissionYear: number | string | null | undefined,
  studentCode: string,
  academicYear: number
): number {
  let admYear: number | undefined = admissionYear ? parseInt(String(admissionYear), 10) : undefined;
  
  if (!admYear || isNaN(admYear)) {
    if (studentCode && studentCode.length >= 2) {
      const prefix = studentCode.substring(0, 2);
      const parsedPrefix = parseInt(prefix, 10);
      if (!isNaN(parsedPrefix)) {
        admYear = 2500 + parsedPrefix;
      }
    }
  }

  if (admYear && !isNaN(admYear)) {
    const yr = (academicYear - admYear) + 1;
    return Math.min(Math.max(yr, 1), 5); // จำกัด 1 - 5
  }

  return 1;
}

/**
 * ตรวจสอบว่าสาขาวิชาหรือหลักสูตรเข้าข่ายสาขาวิศวกรรมซอฟต์แวร์หรือไม่
 * @param {string} major 
 * @param {string} curriculum 
 * @returns {boolean}
 */
export function isSoftwareEngineering(major: string = "", curriculum: string = ""): boolean {
  const combined = `${major || ""} ${curriculum || ""}`.toLowerCase();
  return (
    combined.includes("วิศวกรรมซอฟต์แวร์") ||
    combined.includes("ซอฟต์แวร์") ||
    combined.includes("software engineering") ||
    combined.includes("software")
  );
}

/**
 * ทำความสะอาด String และลบช่องว่างส่วนเกิน
 */
export function cleanStr(val: any): string {
  if (val === null || val === undefined) return "";
  return String(val).trim();
}

/**
 * แยกคอลัมน์จากแถวข้อมูลใน Spreadsheet แบบยืดหยุ่น (รองรับชื่อหัวคอลัมน์หลากหลาย)
 */
export function extractRowData(row: Record<string, any>): ExtractedRowData {
  const keys = Object.keys(row);

  const findVal = (regex: RegExp): string => {
    const key = keys.find(k => regex.test(k.replace(/\s+/g, "")));
    return key ? cleanStr(row[key]) : "";
  };

  const studentCodeRaw = findVal(/รหัส.*นิสิต|student.*code|^รหัส$/i);
  // ลบตัวอักษรพิเศษที่ไม่ใช่ตัวเลขออก เผื่อมี space หรือขีด
  const studentCode = studentCodeRaw.replace(/\D/g, "");

  const nameTh = findVal(/ชื่อ.*สกุล|name.*th|^ชื่อ$|^นิสิต$/i);
  const admissionYear = findVal(/ปี.*เข้า.*ศึกษา|ปี.*เข้า|admission.*year/i);
  const major = findVal(/สาขา.*วิชา|^สาขา$|major/i);
  const curriculum = findVal(/หลักสูตร|curriculum/i);
  const gpaRaw = findVal(/เกรด.*เฉลี่ย|^gpa$/i);
  const studentStatus = findVal(/สถานะ.*นิสิต|^สถานะ$/i);

  let gpa: number | null = null;
  if (gpaRaw) {
    const parsed = parseFloat(gpaRaw);
    if (!isNaN(parsed) && parsed >= 0 && parsed <= 4.0) {
      gpa = Math.round(parsed * 100) / 100;
    }
  }

  return {
    studentCode,
    nameTh,
    admissionYear,
    major,
    curriculum,
    gpa,
    studentStatus
  };
}

/**
 * วิเคราะห์ไฟล์ Excel / CSV Buffer ที่อัปโหลดมาจาก REG
 * @param {Buffer} buffer 
 * @param {number|null} [customAcademicYear] ถ้าไม่ได้ระบุจะคำนวณอัตโนมัติตามเดือนมิถุนายน
 * @returns {ParseSpreadsheetResult}
 */
export function parseStudentSpreadsheet(
  buffer: Buffer,
  customAcademicYear: number | null = null
): ParseSpreadsheetResult {
  const academicYear = customAcademicYear || calculateCurrentAcademicYear();
  
  // อ่านไฟล์ Workbook
  const workbook = xlsx.read(buffer, { type: "buffer" });
  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new Error("ไม่พบแผ่นงาน (Sheet) ในไฟล์ที่อัปโหลด");
  }

  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rawRows = xlsx.utils.sheet_to_json<Record<string, any>>(sheet, { defval: "" });

  if (!rawRows || rawRows.length === 0) {
    throw new Error("ไม่พบข้อมูลในไฟล์ หรือไฟล์ว่างเปล่า");
  }

  const matchedStudents: MatchedStudent[] = [];
  const skippedStudents: SkippedStudent[] = [];
  const seenStudentCodes = new Set<string>();

  for (let i = 0; i < rawRows.length; i++) {
    const row = rawRows[i];
    const data = extractRowData(row);

    // ถ้าไม่มีรหัสนิสิตหรือความยาวรหัสผิดปกติ ให้ข้าม
    if (!data.studentCode || data.studentCode.length < 5) {
      continue;
    }

    // ป้องกันรหัสนิสิตซ้ำกันในไฟล์เดียวกัน
    if (seenStudentCodes.has(data.studentCode)) {
      continue;
    }
    seenStudentCodes.add(data.studentCode);

    // ตรวจสอบเงื่อนไขสาขาวิศวกรรมซอฟต์แวร์
    const isSE = isSoftwareEngineering(data.major, data.curriculum);
    if (!isSE) {
      skippedStudents.push({
        rowNumber: i + 1,
        studentCode: data.studentCode,
        nameTh: data.nameTh || "-",
        major: data.major || data.curriculum || "ไม่ระบุ",
        reason: "ไม่ใช่สาขาวิศวกรรมซอฟต์แวร์"
      });
      continue;
    }

    // คำนวณชั้นปี
    const year = calculateStudentYear(data.admissionYear, data.studentCode, academicYear);

    // สร้างอีเมลมหาวิทยาลัยสำหรับ Login
    const email = `${data.studentCode.toLowerCase()}@up.ac.th`;

    matchedStudents.push({
      studentCode: data.studentCode,
      nameTh: data.nameTh,
      nameEn: "-",
      year,
      major: data.major || "วิศวกรรมซอฟต์แวร์",
      gpa: data.gpa,
      email,
      studentStatus: data.studentStatus || "กำลังศึกษา"
    });
  }

  return {
    summary: {
      totalRows: matchedStudents.length + skippedStudents.length,
      matchedCount: matchedStudents.length,
      skippedCount: skippedStudents.length,
      academicYear
    },
    matchedStudents,
    skippedStudents
  };
}

