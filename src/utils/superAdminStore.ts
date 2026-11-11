import fs from "fs";
import path from "path";
import type { AcceptanceOcrResult } from "./acceptanceOcr";

export interface MajorUnlockRule {
  code: string;
  majorName: string;
  prepSchedule: string;
  internSchedule: string;
  targetTerm: string;
  isUnlocked: boolean;
  openDate: string;
  closeDate: string;
  note: string;
  updatedAt: string;
}

export interface EventSessionItem {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  hours: number;
}

export interface EventCheckInItem {
  studentCode: string;
  nameTh: string;
  major: string;
  checkedInAt: string;
  trainingRecordId?: number;
  sessionId?: string;
  sessionTitle?: string;
  creditedHours?: number;
}

export interface InternalTrainingEvent {
  id: string;
  title: string;
  skillType: "SOFT" | "HARD";
  eventDate: string;
  startTime: string;
  endTime: string;
  rawHours: number;
  creditedHours: number; // ผลรวมชั่วโมงที่ได้รับ
  targetMajor: string;
  targetYear?: string;
  location: string;
  academicYear: string;
  createdBy: string;
  createdAt: string;
  sessions?: EventSessionItem[];
  checkIns: EventCheckInItem[];
}

export interface MasterCompanyRecord {
  id: string;
  nameTh: string;
  nameEn: string;
  province: string;
  address: string;
  hrContactName: string;
  hrPhone: string;
  hrEmail: string;
  recommendedPositions: string;
  status: "VERIFIED" | "PARTNER" | "PENDING_REVIEW" | "BLACKLIST";
  submittedByStudentCode?: string;
  submittedByStudentName?: string;
  createdAt: string;
  verifiedAt?: string;
}

export interface StudentDocWorkflowRecord {
  studentId: number;
  studentCode: string;
  companyName: string;
  interviewDate?: string;
  requestLetterIssued: boolean;
  requestLetterDocNo?: string;
  requestLetterDate?: string;
  requestLetterBatchId?: string;
  requestLetterSignatureSnapshot?: string;
  companyResponseStatus: "NOT_SENT" | "WAITING_RESPONSE" | "WAITING_ADVISOR_APPROVAL" | "ADVISOR_APPROVED" | "ACCEPTED" | "REJECTED";
  companyResponseFileName?: string;
  companyResponseFileUrl?: string;
  companyResponseUploadedAt?: string;
  companyResponseNote?: string;
  /** นิสิตอัปโหลดไฟล์ใบตอบรับเองแล้ว (รออาจารย์ที่ปรึกษาตรวจ หรือพี่จอมยืนยัน) */
  companyResponseSubmittedByStudent?: boolean;
  /** ผลตรวจ OCR (PaddleOCR) ของไฟล์ใบตอบรับล่าสุด — เป็นข้อเสนอแนะ */
  companyResponseOcr?: AcceptanceOcrResult;
  /** การตรวจและอนุมัติแบบตอบรับโดยอาจารย์ที่ปรึกษา (Advisor Review) ก่อนส่งให้ Super Admin */
  advisorAcceptanceStatus?: "NONE" | "PENDING" | "APPROVED" | "REJECTED";
  advisorAcceptanceNote?: string;
  advisorAcceptanceReviewedAt?: string;
  advisorAcceptanceReviewedBy?: string;
  /** ผู้ยืนยันผลใบตอบรับ และผลยืนยันตรง/ไม่ตรงกับ OCR */
  companyResponseConfirmedAt?: string;
  companyResponseConfirmedBy?: string;
  dispatchLetterIssued: boolean;
  dispatchLetterDocNo?: string;
  dispatchLetterDate?: string;
  dispatchLetterSignatureSnapshot?: string;
  isLocked: boolean;
  unlockedByAdmin?: boolean;
}

export interface ArchivedCompanyAttempt {
  id: string;
  studentId: number;
  studentCode: string;
  studentName: string;
  major: string;
  companyName: string;
  position: string;
  companyAddress?: string;
  province?: string;
  contactPersonName?: string;
  phone?: string;
  email?: string;
  reason: "ADVISOR_REJECTED" | "COMPANY_REJECTED";
  note: string;
  fileName?: string;
  fileUrl?: string;
  ocr?: AcceptanceOcrResult;
  answers?: Array<{ itemId: number; description: string; checked: boolean; detail?: string }>;
  archivedAt: string;
}

export interface SuperAdminState {
  academicConfig: {
    currentAcademicYear: string;
    currentSemester: string;
    defaultDocPrefix: string;
    deanSignatory: string;
    deanPosition: string;
    signatureDataUrl: string;
    updatedAt: string;
  };
  majorUnlockRules: MajorUnlockRule[];
  trainingEvents: InternalTrainingEvent[];
  companyMasterData: MasterCompanyRecord[];
  dismissedCompanyNames?: string[];
  docWorkflowMap: Record<string, StudentDocWorkflowRecord>;
  archivedApplications: ArchivedCompanyAttempt[];
}

const DATA_DIR = path.join(process.cwd(), "data");
const STATE_FILE = path.join(DATA_DIR, "super_admin_state.json");

const DEFAULT_STATE: SuperAdminState = {
  academicConfig: {
    currentAcademicYear: "2568",
    currentSemester: "2",
    defaultDocPrefix: "อว 7316/",
    deanSignatory: "ผู้ช่วยศาสตราจารย์ ดร.พรเทพ โรจนวสุ",
    deanPosition: "คณบดีคณะเทคโนโลยีสารสนเทศและการสื่อสาร",
    signatureDataUrl: "",
    updatedAt: new Date().toISOString(),
  },
  majorUnlockRules: [
    {
      code: "SE",
      majorName: "วิศวกรรมซอฟต์แวร์",
      prepSchedule: "ปี 3 เทอม 1",
      internSchedule: "ปี 3 เทอม 2 (ออกฝึกงานเทอมถัดไปทันที)",
      targetTerm: "2/2568",
      isUnlocked: true,
      openDate: "2026-01-01",
      closeDate: "2026-04-30",
      note: "เรียนเตรียมความพร้อมเทอมนี้ และออกฝึกงานในเทอมถัดไปทันที",
      updatedAt: new Date().toISOString(),
    },
    {
      code: "CS",
      majorName: "วิทยาการคอมพิวเตอร์",
      prepSchedule: "ปี 3 เทอม 1-2",
      internSchedule: "ปี 4 เทอม 1 หรือ เทอม 2 (เว้นช่วง 1 ปี)",
      targetTerm: "1/2569",
      isUnlocked: false,
      openDate: "2026-06-01",
      closeDate: "2026-08-31",
      note: "เรียนเตรียมความพร้อมตอนปี 3 รอปลดล็อกยื่นขอฝึกงานตอนขึ้นปี 4",
      updatedAt: new Date().toISOString(),
    },
    {
      code: "CPE",
      majorName: "วิศวกรรมคอมพิวเตอร์",
      prepSchedule: "ปี 3 เทอม 1-2",
      internSchedule: "ปี 4 เทอม 1 หรือ เทอม 2 (เว้นช่วง 1 ปี)",
      targetTerm: "1/2569",
      isUnlocked: false,
      openDate: "2026-06-01",
      closeDate: "2026-08-31",
      note: "เรียนเตรียมความพร้อมตอนปี 3 รอปลดล็อกยื่นขอฝึกงานตอนขึ้นปี 4",
      updatedAt: new Date().toISOString(),
    },
    {
      code: "IT",
      majorName: "เทคโนโลยีสารสนเทศ",
      prepSchedule: "ปี 3 เทอม 2",
      internSchedule: "ปี 4 เทอม 1",
      targetTerm: "1/2569",
      isUnlocked: true,
      openDate: "2026-01-15",
      closeDate: "2026-05-15",
      note: "เปิดให้ยื่น Checklist และขอหนังสือขอความอนุเคราะห์รอบ 1/2569",
      updatedAt: new Date().toISOString(),
    },
    {
      code: "DB",
      majorName: "ธุรกิจดิจิทัล",
      prepSchedule: "ปี 3 เทอม 2",
      internSchedule: "ปี 4 เทอม 1",
      targetTerm: "1/2569",
      isUnlocked: true,
      openDate: "2026-01-15",
      closeDate: "2026-05-15",
      note: "เปิดให้ยื่น Checklist และขอหนังสือขอความอนุเคราะห์รอบ 1/2569",
      updatedAt: new Date().toISOString(),
    },
    {
      code: "CGM",
      majorName: "คอมพิวเตอร์กราฟิกและมัลติมีเดีย",
      prepSchedule: "ปี 3 เทอม 2",
      internSchedule: "ปี 4 เทอม 1",
      targetTerm: "1/2569",
      isUnlocked: false,
      openDate: "2026-06-01",
      closeDate: "2026-08-31",
      note: "อยู่ระหว่างสะสมชั่วโมงเตรียมความพร้อม รอปลดล็อกระบบยื่นบริษัท",
      updatedAt: new Date().toISOString(),
    },
    {
      code: "GIS",
      majorName: "ภูมิสารสนเทศศาสตร์",
      prepSchedule: "ปี 3 เทอม 2",
      internSchedule: "ปี 4 เทอม 1",
      targetTerm: "1/2569",
      isUnlocked: true,
      openDate: "2026-01-15",
      closeDate: "2026-05-15",
      note: "เปิดให้ยื่น Checklist สถานประกอบการตามกำหนดการหลักสูตร",
      updatedAt: new Date().toISOString(),
    },
    {
      code: "DSA",
      majorName: "วิทยาการข้อมูลและการประยุกต์",
      prepSchedule: "ปี 3 เทอม 1-2",
      internSchedule: "ปี 4 เทอม 1",
      targetTerm: "1/2569",
      isUnlocked: false,
      openDate: "2026-06-01",
      closeDate: "2026-08-31",
      note: "เรียนเตรียมความพร้อมปี 3 รอปลดล็อกยื่นสถานประกอบการตอนปี 4",
      updatedAt: new Date().toISOString(),
    },
  ],
  trainingEvents: [
    {
      id: "EVT-2568-01",
      title: "อบรมเตรียมความพร้อมสหกิจศึกษา: เทคนิคการเขียน Resume และการสัมภาษณ์งาน",
      skillType: "SOFT",
      eventDate: "2026-01-18",
      startTime: "09:00",
      endTime: "16:00",
      rawHours: 7,
      creditedHours: 6,
      targetMajor: "ALL",
      location: "ห้องประชุม ICT อาคารคณะเทคโนโลยีสารสนเทศและการสื่อสาร",
      academicYear: "2568",
      createdBy: "พี่จอม (เจ้าหน้าที่คณะ / Super Admin)",
      createdAt: "2026-01-10T09:00:00.000Z",
      checkIns: [],
    },
    {
      id: "EVT-2568-02",
      title: "ICT Project Day & Hackathon เตรียมความพร้อมสายพัฒนาซอฟต์แวร์",
      skillType: "HARD",
      eventDate: "2026-01-25",
      startTime: "08:30",
      endTime: "16:30",
      rawHours: 8,
      creditedHours: 6,
      targetMajor: "ALL",
      location: "ลานกิจกรรมชั้น 1 คณะ ICT มหาวิทยาลัยพะเยา",
      academicYear: "2568",
      createdBy: "พี่จอม (เจ้าหน้าที่คณะ / Super Admin)",
      createdAt: "2026-01-12T10:30:00.000Z",
      checkIns: [],
    },
  ],
  companyMasterData: [
    {
      id: "COMP-M01",
      nameTh: "บริษัท เมกัส ซอฟต์แวร์ จำกัด",
      nameEn: "Magus Software Co., Ltd.",
      province: "เชียงใหม่",
      address: "199/8 ถนนห้วยแก้ว ต.สุเทพ อ.เมือง จ.เชียงใหม่ 50200",
      hrContactName: "คุณสิริพร ฝ่ายทรัพยากรบุคคล",
      hrPhone: "053-218-555",
      hrEmail: "hr@magussoftware.com",
      recommendedPositions: "Full-stack Developer, Frontend Developer, QA Tester",
      status: "PARTNER",
      createdAt: "2025-11-01T08:00:00.000Z",
      verifiedAt: "2025-11-01T08:00:00.000Z",
    },
    {
      id: "COMP-M02",
      nameTh: "บริษัท บานาน่า โค้ดดิ้ง จำกัด",
      nameEn: "Banana Coding Co., Ltd.",
      province: "เชียงใหม่",
      address: "34/5 ถ.นิมมานเหมินท์ ต.สุเทพ อ.เมือง จ.เชียงใหม่ 50200",
      hrContactName: "คุณณัฐพล ฝ่ายบุคคล (HR)",
      hrPhone: "053-221-988",
      hrEmail: "career@bananacoding.com",
      recommendedPositions: "Software Engineer, Ruby on Rails / React Developer, Mobile Dev",
      status: "PARTNER",
      createdAt: "2025-11-05T08:00:00.000Z",
      verifiedAt: "2025-11-05T08:00:00.000Z",
    },
    {
      id: "COMP-M03",
      nameTh: "บริษัท กสิกร บิซิเนส-เทคโนโลยี กรุ๊ป (KBTG)",
      nameEn: "KASIKORN Business-Technology Group",
      province: "นนทบุรี",
      address: "อาคาร KBTG เมืองทองธานี อ.ปากเกร็ด จ.นนทบุรี 11120",
      hrContactName: "ทีม People & Internship Recruitment",
      hrPhone: "02-008-8888",
      hrEmail: "recruitment@kbtg.tech",
      recommendedPositions: "Software Engineer, Data Scientist, Cybersecurity, UX/UI",
      status: "PARTNER",
      createdAt: "2025-11-10T08:00:00.000Z",
      verifiedAt: "2025-11-10T08:00:00.000Z",
    },
    {
      id: "COMP-M04",
      nameTh: "บริษัท อาร์ตติซาน ดิจิทัล เอเชีย จำกัด",
      nameEn: "Artisan Digital Asia Co., Ltd.",
      province: "เชียงใหม่",
      address: "ต.ช้างเผือก อ.เมืองเชียงใหม่ จ.เชียงใหม่ 50300",
      hrContactName: "ฝ่ายทรัพยากรบุคคล (HR Department)",
      hrPhone: "052-001-234",
      hrEmail: "people@artisandigital.xyz",
      recommendedPositions: "Frontend / Backend Developer, Business Analyst, Digital Marketing",
      status: "VERIFIED",
      createdAt: "2025-11-15T08:00:00.000Z",
      verifiedAt: "2025-11-15T08:00:00.000Z",
    },
    {
      id: "COMP-M05",
      nameTh: "สำนักงานพัฒนาเทคโนโลยีอวกาศและภูมิสารสนเทศ (GISTDA)",
      nameEn: "Geo-Informatics and Space Technology Development Agency",
      province: "กรุงเทพมหานคร",
      address: "120 อาคารรวมหน่วยราชการ ศูนย์ราชการเฉลิมพระเกียรติฯ ถ.แจ้งวัฒนะ กรุงเทพฯ 10210",
      hrContactName: "ฝ่ายบริหารทรัพยากรบุคคลและฝึกงาน",
      hrPhone: "02-141-4444",
      hrEmail: "hr@gistda.or.th",
      recommendedPositions: "GIS Analyst, Remote Sensing, Spatial Data Engineer",
      status: "PARTNER",
      createdAt: "2025-11-18T08:00:00.000Z",
      verifiedAt: "2025-11-18T08:00:00.000Z",
    },
  ],
  docWorkflowMap: {},
  archivedApplications: [
    {
      id: "ARCH-001",
      studentId: 0,
      studentCode: "67023115",
      studentName: "นายธีรภัทร วงศ์สวัสดิ์",
      major: "วิศวกรรมซอฟต์แวร์",
      companyName: "บริษัท เทคสตาร์ทอัพ ทดลอง จำกัด",
      position: "Web Developer Intern",
      reason: "COMPANY_REJECTED",
      note: "สถานประกอบการแจ้งเต็มอัตราในรอบเทอมนี้ (ปลดล็อกให้ยื่นบริษัทใหม่แล้ว)",
      archivedAt: "2026-01-08T14:20:00.000Z",
    },
  ],
};

export function loadSuperAdminState(): SuperAdminState {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(STATE_FILE)) {
      fs.writeFileSync(STATE_FILE, JSON.stringify(DEFAULT_STATE, null, 2), "utf8");
      return JSON.parse(JSON.stringify(DEFAULT_STATE));
    }
    const raw = fs.readFileSync(STATE_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return {
      academicConfig: { ...DEFAULT_STATE.academicConfig, ...(parsed.academicConfig || {}) },
      majorUnlockRules: Array.isArray(parsed.majorUnlockRules) && parsed.majorUnlockRules.length > 0
        ? parsed.majorUnlockRules
        : DEFAULT_STATE.majorUnlockRules,
      trainingEvents: Array.isArray(parsed.trainingEvents)
        ? parsed.trainingEvents
        : DEFAULT_STATE.trainingEvents,
      companyMasterData: Array.isArray(parsed.companyMasterData) && parsed.companyMasterData.length > 0
        ? parsed.companyMasterData
        : DEFAULT_STATE.companyMasterData,
      dismissedCompanyNames: Array.isArray(parsed.dismissedCompanyNames)
        ? parsed.dismissedCompanyNames
        : [],
      docWorkflowMap: parsed.docWorkflowMap || {},
      archivedApplications: Array.isArray(parsed.archivedApplications)
        ? parsed.archivedApplications
        : DEFAULT_STATE.archivedApplications,
    };
  } catch (err) {
    console.error("Failed to load super_admin_state.json, using default:", err);
    return JSON.parse(JSON.stringify(DEFAULT_STATE));
  }
}

export function saveSuperAdminState(state: SuperAdminState): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), "utf8");
  } catch (err) {
    console.error("Failed to save super_admin_state.json:", err);
  }
}

export function saveSuperAdminStateOrThrow(state: SuperAdminState): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), "utf8");
}

export function calculateEventHours(startTime: string, endTime: string): {
  rawHours: number;
  creditedHours: number;
} {
  const [sh, sm] = (startTime || "09:00").split(":").map((n) => parseInt(n, 10) || 0);
  const [eh, em] = (endTime || "16:00").split(":").map((n) => parseInt(n, 10) || 0);
  const startMinutes = sh * 60 + sm;
  const endMinutes = eh * 60 + em;
  const diffHours = Math.max(1, Math.round(((endMinutes - startMinutes) / 60) * 10) / 10);
  const rawHours = Math.max(1, Math.round(diffHours));
  const creditedHours = Math.min(6, rawHours); // สูงสุดไม่เกิน 6 ชั่วโมง/วัน ตามข้อกำหนดพี่จอม
  return { rawHours, creditedHours };
}
