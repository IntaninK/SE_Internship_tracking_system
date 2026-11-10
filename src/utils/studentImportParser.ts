import * as xlsx from "xlsx";

export interface ExtractedRowData {
  studentCode: string;
  nameTh: string;
  admissionYear: string;
  major: string;
  curriculum: string;
  gpa: number | null;
  studentStatus: string;
  softSkillHours?: number | null;
  hardSkillHours?: number | null;
}

export interface MatchedStudent {
  studentCode: string;
  nameTh: string;
  nameEn: string;
  year: number;
  major: string;
  curriculum?: string;
  gpa: number | null;
  email: string;
  studentStatus: string;
  softSkillHours?: number | null;
  hardSkillHours?: number | null;
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
  const softRaw = findVal(/soft.*skill|ชั่วโมง.*soft/i);
  const hardRaw = findVal(/hard.*skill|ชั่วโมง.*hard/i);

  let gpa: number | null = null;
  if (gpaRaw) {
    const parsed = parseFloat(gpaRaw);
    if (!isNaN(parsed) && parsed >= 0 && parsed <= 4.0) {
      gpa = Math.round(parsed * 100) / 100;
    }
  }

  let softSkillHours: number | null = null;
  if (softRaw) {
    const parsedSoft = parseInt(softRaw, 10);
    if (!isNaN(parsedSoft) && parsedSoft >= 0) softSkillHours = parsedSoft;
  }

  let hardSkillHours: number | null = null;
  if (hardRaw) {
    const parsedHard = parseInt(hardRaw, 10);
    if (!isNaN(parsedHard) && parsedHard >= 0) hardSkillHours = parsedHard;
  }

  return {
    studentCode,
    nameTh,
    admissionYear,
    major,
    curriculum,
    gpa,
    studentStatus,
    softSkillHours,
    hardSkillHours,
  };
}

/**
 * วิเคราะห์ไฟล์ Excel / CSV Buffer ที่อัปโหลดมาจาก REG
 * @param {Buffer} buffer 
 * @param {number|null} [customAcademicYear] ถ้าไม่ได้ระบุจะคำนวณอัตโนมัติตามเดือนมิถุนายน
 * @param {{ targetDepartment?: string | null; allowAllMajors?: boolean }} [options]
 * @returns {ParseSpreadsheetResult}
 */
export function parseStudentSpreadsheet(
  buffer: Buffer,
  customAcademicYear: number | null = null,
  options?: { targetDepartment?: string | null; allowAllMajors?: boolean }
): ParseSpreadsheetResult {
  const academicYear = customAcademicYear || calculateCurrentAcademicYear();
  const allowAllMajors = Boolean(options?.allowAllMajors);
  const targetDepartment = options?.targetDepartment || null;
  
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

    // ตรวจสอบเงื่อนไขสาขาวิชา (ถ้าไม่ได้เปิด allowAllMajors สำหรับเจ้าหน้าที่คณะ/Admin กลาง)
    if (!allowAllMajors) {
      if (targetDepartment) {
        const combined = `${data.major || ""} ${data.curriculum || ""}`.toLowerCase();
        if (!combined.includes(targetDepartment.toLowerCase())) {
          skippedStudents.push({
            rowNumber: i + 1,
            studentCode: data.studentCode,
            nameTh: data.nameTh || "-",
            major: data.major || data.curriculum || "ไม่ระบุ",
            reason: `ไม่ใช่สาขา${targetDepartment}`,
          });
          continue;
        }
      } else {
        const isSE = isSoftwareEngineering(data.major, data.curriculum);
        if (!isSE) {
          skippedStudents.push({
            rowNumber: i + 1,
            studentCode: data.studentCode,
            nameTh: data.nameTh || "-",
            major: data.major || data.curriculum || "ไม่ระบุ",
            reason: "ไม่ใช่สาขาวิศวกรรมซอฟต์แวร์",
          });
          continue;
        }
      }
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
      major: data.major || targetDepartment || "วิศวกรรมซอฟต์แวร์",
      curriculum: data.curriculum || undefined,
      gpa: data.gpa,
      email,
      studentStatus: data.studentStatus || "กำลังศึกษา",
      softSkillHours: data.softSkillHours ?? null,
      hardSkillHours: data.hardSkillHours ?? null,
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

export interface ExtractedCheckInRow {
  studentCode: string;
  hintName: string;
  hintMajor: string;
  rowNumber: number;
}

/**
 * สแกนหารหัสนิสิตจากไฟล์ใบลงชื่อหน้างาน (.xlsx, .xls, .csv)
 * รองรับทั้งไฟล์ที่มีหัวตารางและไม่มีหัวตาราง รวมถึงกรณีพิมพ์มือหรือก๊อปวางจาก Google Sheets
 */
export function parseCheckInSpreadsheet(buffer: Buffer): ExtractedCheckInRow[] {
  const workbook = xlsx.read(buffer, { type: "buffer" });
  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new Error("ไม่พบแผ่นงาน (Sheet) ในไฟล์ที่อัปโหลด");
  }

  const results: ExtractedCheckInRow[] = [];
  const seenCodes = new Set<string>();

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;

    const rows = xlsx.utils.sheet_to_json<any[]>(sheet, { header: 1, defval: "" });
    if (!rows || rows.length === 0) continue;

    let codeColIdx = -1;
    let nameColIdx = -1;
    let majorColIdx = -1;

    // ตรวจหาหัวคอลัมน์จาก 5 แถวแรก (ถ้ามี)
    for (let r = 0; r < Math.min(rows.length, 5); r++) {
      const row = rows[r];
      if (!Array.isArray(row)) continue;
      for (let c = 0; c < row.length; c++) {
        const cellText = cleanStr(row[c]).replace(/\s+/g, "");
        if (!cellText) continue;
        if (codeColIdx === -1 && /รหัส.*นิสิต|student.*id|student.*code|^รหัส$/i.test(cellText)) {
          codeColIdx = c;
        } else if (nameColIdx === -1 && /ชื่อ.*สกุล|ชื่อ.*นิสิต|fullname|name|^ชื่อ$/i.test(cellText)) {
          nameColIdx = c;
        } else if (majorColIdx === -1 && /สาขา|หลักสูตร|major|department/i.test(cellText)) {
          majorColIdx = c;
        }
      }
      if (codeColIdx !== -1) break;
    }

    for (let r = 0; r < rows.length; r++) {
      const row = rows[r];
      if (!Array.isArray(row) || row.length === 0) continue;

      let detectedCode = "";
      let codeCellIndex = -1;

      // 1. ถ้าทราบคอลัมน์รหัสนิสิตชัดเจน ให้ดึงจากคอลัมน์นั้นก่อน
      if (codeColIdx !== -1 && row[codeColIdx] !== undefined) {
        const rawCodeCell = cleanStr(row[codeColIdx]).replace(/[-\s]/g, "");
        const match8 = rawCodeCell.match(/\b(\d{8})\b/);
        if (match8) {
          detectedCode = match8[1];
          codeCellIndex = codeColIdx;
        } else if (/^\d{6,10}$/.test(rawCodeCell)) {
          // กรณีพิมพ์รหัสตกหล่นหรือเกินหลักในคอลัมน์รหัสนิสิต (เช่น 7 หรือ 9 หลัก) ให้ดึงมาแจ้งเตือนใน Preview
          detectedCode = rawCodeCell;
          codeCellIndex = codeColIdx;
        }
      }

      // 2. ถ้ายังไม่เจอ ให้สแกนทุกช่องในแถวเพื่อหาเลข 8 หลัก (เช่น 64xxxxxx - 69xxxxxx)
      if (!detectedCode) {
        for (let c = 0; c < row.length; c++) {
          const cellStr = cleanStr(row[c]).replace(/[-\s]/g, "");
          if (!cellStr) continue;
          const match = cellStr.match(/\b([567]\d{7})\b/);
          if (match) {
            detectedCode = match[1];
            codeCellIndex = c;
            break;
          }
        }
      }

      if (!detectedCode) continue;
      if (seenCodes.has(detectedCode)) continue;
      seenCodes.add(detectedCode);

      // ดึงชื่อและสาขาจากแถวเดียวกัน (ถ้ามีในไฟล์) เพื่อใช้แสดงผลเสริมใน Preview
      let hintName = "";
      let hintMajor = "";

      if (nameColIdx !== -1 && nameColIdx !== codeCellIndex && row[nameColIdx] !== undefined) {
        hintName = cleanStr(row[nameColIdx]);
      }
      if (majorColIdx !== -1 && majorColIdx !== codeCellIndex && row[majorColIdx] !== undefined) {
        hintMajor = cleanStr(row[majorColIdx]);
      }

      if (!hintName) {
        for (let c = 0; c < row.length; c++) {
          if (c === codeCellIndex || c === majorColIdx) continue;
          const val = cleanStr(row[c]);
          if (!val || /^\d+$/.test(val)) continue;
          if (/[ก-๙a-zA-Z]{2,}/.test(val) && !/วิศวกรรม|วิทยาการ|เทคโนโลยี|คอมพิวเตอร์|สารสนเทศ|ภูมิสารสนเทศ|ธุรกิจ/i.test(val)) {
            hintName = val;
            break;
          }
        }
      }

      results.push({
        studentCode: detectedCode,
        hintName,
        hintMajor,
        rowNumber: r + 1,
      });
    }
  }

  return results;
}

