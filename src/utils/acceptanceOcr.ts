import "dotenv/config";
import fs from "fs";
import path from "path";
import zlib from "zlib";

/**
 * ผลการตรวจแบบตอบรับ/ปฏิเสธ (รองรับทั้ง External Python PaddleOCR Service และ Built-in Node Analyzer)
 * ผลลัพธ์เป็นข้อเสนอแนะเบื้องต้นให้เจ้าหน้าที่ (Super Admin) ตรวจสอบและกดยืนยันอีกครั้งเสมอ
 */
export interface AcceptanceOcrResult {
  status: "DONE" | "UNAVAILABLE" | "ERROR";
  result: "ACCEPTED" | "REJECTED" | "UNCLEAR";
  confidence: number;
  reasons: string[];
  warnings: string[];
  extracted?: {
    acceptedCount?: number;
    acceptDetailText?: string;
    rejectReasonText?: string;
  };
  signals?: Record<string, unknown>;
  engine: string;
  analyzedAt: string;
}

const OCR_TIMEOUT_MS = Number(process.env.OCR_TIMEOUT_MS || 20000);

// ---------------------------------------------------------------------------
// Pure-Node PNG Decoder (ใช้ zlib มาตรฐานของ Node.js ไม่พึ่งพา Native Addon)
// ---------------------------------------------------------------------------
interface GrayImage {
  width: number;
  height: number;
  /** ค่าความสว่าง 0 (ดำ/หมึก) .. 255 (ขาว/กระดาษ) */
  gray: Uint8Array;
}

function paethPredictor(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

function decodePngToGrayscale(pngBuffer: Buffer): GrayImage | null {
  if (pngBuffer.length < 32 || pngBuffer.readUInt32BE(0) !== 0x89504e47) {
    return null;
  }

  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  let interlace = 0;
  let palette: Buffer | null = null;
  const idatChunks: Buffer[] = [];

  while (offset + 8 <= pngBuffer.length) {
    const length = pngBuffer.readUInt32BE(offset);
    const type = pngBuffer.subarray(offset + 4, offset + 8).toString("ascii");
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    if (dataEnd > pngBuffer.length) break;
    const chunk = pngBuffer.subarray(dataStart, dataEnd);

    if (type === "IHDR") {
      width = chunk.readUInt32BE(0);
      height = chunk.readUInt32BE(4);
      bitDepth = chunk[8];
      colorType = chunk[9];
      interlace = chunk[12];
    } else if (type === "PLTE") {
      palette = Buffer.from(chunk);
    } else if (type === "IDAT") {
      idatChunks.push(chunk);
    } else if (type === "IEND") {
      break;
    }
    offset = dataEnd + 4;
  }

  if (!width || !height || bitDepth !== 8 || interlace !== 0 || idatChunks.length === 0) {
    return null;
  }

  const channels =
    colorType === 0 ? 1 : colorType === 2 ? 3 : colorType === 3 ? 1 : colorType === 4 ? 2 : colorType === 6 ? 4 : 0;
  if (!channels) return null;

  const raw = zlib.inflateSync(Buffer.concat(idatChunks));
  const bpp = channels;
  const stride = width * bpp;
  if (raw.length < height * (stride + 1)) return null;

  const prevRow = new Uint8Array(stride);
  const currRow = new Uint8Array(stride);
  const gray = new Uint8Array(width * height);

  for (let y = 0; y < height; y++) {
    const rowStart = y * (stride + 1);
    const filterType = raw[rowStart];
    for (let i = 0; i < stride; i++) {
      const xByte = raw[rowStart + 1 + i];
      const a = i >= bpp ? currRow[i - bpp] : 0;
      const b = prevRow[i];
      const c = i >= bpp ? prevRow[i - bpp] : 0;
      let val = xByte;
      if (filterType === 1) val = (xByte + a) & 0xff;
      else if (filterType === 2) val = (xByte + b) & 0xff;
      else if (filterType === 3) val = (xByte + ((a + b) >> 1)) & 0xff;
      else if (filterType === 4) val = (xByte + paethPredictor(a, b, c)) & 0xff;
      currRow[i] = val;
    }

    for (let x = 0; x < width; x++) {
      const idx = x * bpp;
      let lum = 255;
      if (colorType === 0) {
        lum = currRow[idx];
      } else if (colorType === 4) {
        const alpha = currRow[idx + 1] / 255;
        lum = Math.round(currRow[idx] * alpha + 255 * (1 - alpha));
      } else if (colorType === 2) {
        lum = Math.round(0.299 * currRow[idx] + 0.587 * currRow[idx + 1] + 0.114 * currRow[idx + 2]);
      } else if (colorType === 6) {
        const alpha = currRow[idx + 3] / 255;
        const rgbLum = 0.299 * currRow[idx] + 0.587 * currRow[idx + 1] + 0.114 * currRow[idx + 2];
        lum = Math.round(rgbLum * alpha + 255 * (1 - alpha));
      } else if (colorType === 3 && palette) {
        const pIdx = currRow[idx] * 3;
        if (pIdx + 2 < palette.length) {
          lum = Math.round(0.299 * palette[pIdx] + 0.587 * palette[pIdx + 1] + 0.114 * palette[pIdx + 2]);
        }
      }
      gray[y * width + x] = lum;
    }
    prevRow.set(currRow);
  }

  return { width, height, gray };
}

/**
 * วัดสัดส่วนพิกเซลหมึก (ความมืด < threshold) ในกรอบพิกัดสัมพัทธ์ (0.0 .. 1.0)
 */
function measureInkRatio(
  img: GrayImage,
  x0Pct: number,
  y0Pct: number,
  x1Pct: number,
  y1Pct: number,
  darkThreshold = 185
): number {
  const x0 = Math.max(0, Math.floor(img.width * x0Pct));
  const x1 = Math.min(img.width - 1, Math.ceil(img.width * x1Pct));
  const y0 = Math.max(0, Math.floor(img.height * y0Pct));
  const y1 = Math.min(img.height - 1, Math.ceil(img.height * y1Pct));
  if (x1 <= x0 || y1 <= y0) return 0;

  let darkCount = 0;
  let total = 0;
  for (let y = y0; y <= y1; y++) {
    const rowOff = y * img.width;
    for (let x = x0; x <= x1; x++) {
      total++;
      if (img.gray[rowOff + x] < darkThreshold) {
        darkCount++;
      }
    }
  }
  return total > 0 ? darkCount / total : 0;
}

/**
 * ค้นหาตำแหน่งกรอบสี่เหลี่ยม ☐ รอบพิกัดอ้างอิง แล้ววัดสัดส่วนหมึก "ด้านในกรอบ"
 * (เพื่อรองรับกรณีสแกนหรือถ่ายรูปเอียง/เลื่อนเล็กน้อย)
 */
function measureCheckboxInnerInk(
  img: GrayImage,
  centerXPct: number,
  centerYPct: number
): number {
  // กรอบ ☐ ในฟอร์มจริงมีขนาด ~ 1.96% x 1.89% ของหน้า A4/Letter
  // วัดเฉพาะพื้นที่ด้านในกรอบ (0.95% x 0.95%) เพื่อไม่ให้เส้นขอบสี่เหลี่ยมถูกนับเป็นรอยติ๊ก
  const halfInnerW = 0.0046;
  const halfInnerH = 0.0046;

  // สแกนหาจุดที่เป็นกึ่งกลางของกรอบ ☐ (จุดที่เส้นขอบซ้าย-ขวา-บน-ล่างเข้ม แต่ตรงกลางเป็นพื้นที่ภายในกรอบ)
  let bestCenterX = centerXPct;
  let bestCenterY = centerYPct;
  let bestFrameScore = -1;

  const halfOuterW = 0.0098;
  const halfOuterH = 0.0095;

  for (let dy = -0.008; dy <= 0.008; dy += 0.0015) {
    for (let dx = -0.008; dx <= 0.008; dx += 0.0015) {
      const cx = centerXPct + dx;
      const cy = centerYPct + dy;
      const leftEdge = measureInkRatio(img, cx - halfOuterW - 0.0015, cy - halfInnerH, cx - halfInnerW, cy + halfInnerH, 180);
      const rightEdge = measureInkRatio(img, cx + halfInnerW, cy - halfInnerH, cx + halfOuterW + 0.0015, cy + halfInnerH, 180);
      const topEdge = measureInkRatio(img, cx - halfInnerW, cy - halfOuterH - 0.0015, cx + halfInnerW, cy - halfInnerH, 180);
      const botEdge = measureInkRatio(img, cx - halfInnerW, cy + halfInnerH, cx + halfInnerW, cy + halfOuterH + 0.0015, 180);
      const score = Math.min(leftEdge, rightEdge) + Math.min(topEdge, botEdge);
      if (score > bestFrameScore) {
        bestFrameScore = score;
        bestCenterX = cx;
        bestCenterY = cy;
      }
    }
  }

  return measureInkRatio(
    img,
    bestCenterX - halfInnerW,
    bestCenterY - halfInnerH,
    bestCenterX + halfInnerW,
    bestCenterY + halfInnerH,
    185
  );
}

/**
 * แปลง Cloudinary URL (ไม่ว่าจะเป็น .pdf, .jpg, .png) ให้เป็น URL ภาพ PNG ความกว้าง 1224px ของหน้าที่ 1
 */
function toCloudinaryPngUrl(fileUrl: string): string | null {
  if (!fileUrl || !fileUrl.includes("res.cloudinary.com")) return null;
  return fileUrl
    .replace("/image/upload/", "/image/upload/w_1224,pg_1,f_png/")
    .replace(/\.(pdf|jpe?g|webp)$/i, ".png");
}

/**
 * ตรวจสอบว่าเป็นไฟล์ PDF ต้นฉบับเปล่า (ที่ยังไม่ได้แก้ไขเลย) หรือไม่
 */
function isExactBlankTemplate(fileBuffer: Buffer): boolean {
  try {
    const blankPath = path.join(process.cwd(), "public", "documents", "acceptance_form_se.pdf");
    if (fs.existsSync(blankPath)) {
      const blankBuf = fs.readFileSync(blankPath);
      if (blankBuf.length === fileBuffer.length && blankBuf.equals(fileBuffer)) {
        return true;
      }
    }
  } catch {
    // ignore
  }
  return false;
}

/**
 * Built-in Node.js Analyzer: วิเคราะห์ช่อง ☐ และรอยเขียนบนเส้นประจากภาพ PNG
 * โดยไม่ต้องพึ่งพาเซิร์ฟเวอร์ Python ภายนอก
 */
async function analyzeWithBuiltinDetector(
  fileBuffer: Buffer,
  fileName: string,
  cloudinaryUrl?: string
): Promise<AcceptanceOcrResult> {
  const nowIso = new Date().toISOString();

  // 1) เช็คทันทีว่าเป็นไฟล์ PDF ต้นฉบับเปล่า 100% หรือไม่
  if (isExactBlankTemplate(fileBuffer)) {
    return {
      status: "DONE",
      result: "UNCLEAR",
      confidence: 0,
      reasons: [
        "ไม่พบการติ๊กช่อง ☐ ใดๆ และไม่พบการเขียนข้อความหลังช่องตอบรับหรือช่องปฏิเสธเลย (เป็นไฟล์แบบฟอร์มเปล่า)",
      ],
      warnings: [],
      engine: "builtin-template-analyzer",
      analyzedAt: nowIso,
    };
  }

  // 2) ดึงภาพ PNG (จากไฟล์ PNG ที่อัปโหลดโดยตรง หรือแปลงผ่าน Cloudinary สำหรับ PDF/JPG)
  let pngBuf: Buffer | null = null;
  if (fileBuffer.length > 8 && fileBuffer.readUInt32BE(0) === 0x89504e47) {
    pngBuf = fileBuffer;
  } else if (cloudinaryUrl) {
    const pngUrl = toCloudinaryPngUrl(cloudinaryUrl);
    if (pngUrl) {
      try {
        const res = await fetch(pngUrl);
        if (res.ok) {
          pngBuf = Buffer.from(await res.arrayBuffer());
        }
      } catch {
        // ignore network error
      }
    }
  }

  const img = pngBuf ? decodePngToGrayscale(pngBuf) : null;
  if (!img) {
    return {
      status: "UNAVAILABLE",
      result: "UNCLEAR",
      confidence: 0,
      reasons: [
        `ไม่สามารถแปลงไฟล์ "${fileName || "ใบตอบรับ"}" เป็นภาพเพื่อตรวจอัตโนมัติได้ — กรุณาเปิดไฟล์ตรวจด้วยตา`,
      ],
      warnings: [],
      engine: "builtin-template-analyzer",
      analyzedAt: nowIso,
    };
  }

  // -------------------------------------------------------------------------
  // พิกัดอ้างอิงจากฟอร์มจริง "แบบตอบรับ/ปฏิเสธ การรับนิสิตฝึกงาน" (MediaBox 612 x 792)
  //   - ช่อง ☐ สามารถรับนิสิตเข้าฝึกงานได้ : centerX = 24.56%, centerY = 43.51%
  //   - ช่อง ☐ มี ที่พักอาศัย             : centerX = 52.99%, centerY = 45.82%
  //   - ช่อง ☐ ไม่มี ที่พักอาศัย           : centerX = 57.84%, centerY = 45.83%
  //   - ช่อง ☐ ไม่สามารถรับนิสิตเข้าฝึกงานได้: centerX = 24.56%, centerY = 48.11%
  // -------------------------------------------------------------------------
  const acceptCheckboxInk = measureCheckboxInnerInk(img, 0.2456, 0.4351);
  const rejectCheckboxInk = measureCheckboxInnerInk(img, 0.2456, 0.4811);
  const hasDormCheckboxInk = measureCheckboxInnerInk(img, 0.5299, 0.4582);
  const noDormCheckboxInk = measureCheckboxInnerInk(img, 0.5784, 0.4583);

  // โซนเขียนข้อความเหนือเส้นประฝั่ง "สามารถรับนิสิตเข้าฝึกงานได้"
  //   - ช่อง "จำนวน ....... คน"        : x = 51.0%..59.0%, y = 42.1%..43.5%
  //   - ช่อง "ระหว่างวันที่ ............" : x = 70.0%..89.5%, y = 42.1%..43.5%
  //   - ช่อง "ถึงวันที่ ................." : x = 34.0%..47.5%, y = 44.5%..45.9%
  //   - ช่อง "รายชื่อนิสิตที่รับเข้าฝึกงาน 1.": x = 16.5%..48.0%, y = 65.5%..67.0%
  const acceptCountLineInk = measureInkRatio(img, 0.51, 0.421, 0.59, 0.435);
  const acceptStartDateInk = measureInkRatio(img, 0.70, 0.421, 0.895, 0.435);
  const acceptEndDateInk = measureInkRatio(img, 0.34, 0.445, 0.475, 0.459);
  const acceptStudentSlotInk = measureInkRatio(img, 0.165, 0.655, 0.48, 0.670);
  const acceptZoneInk = Math.max(
    acceptCountLineInk,
    acceptStartDateInk,
    acceptEndDateInk,
    acceptStudentSlotInk
  );

  // โซนเขียนข้อความเหนือเส้นประฝั่ง "ไม่สามารถรับนิสิตเข้าฝึกงานได้ เนื่องจาก..."
  //   - บรรทัดที่ 1 หลังคำว่า "เนื่องจาก" : x = 52.0%..89.5%, y = 46.8%..48.2%
  //   - บรรทัดที่ 2 เส้นประเต็มบรรทัด    : x = 28.5%..89.5%, y = 49.2%..50.6%
  const rejectReasonLine1Ink = measureInkRatio(img, 0.52, 0.468, 0.895, 0.482);
  const rejectReasonLine2Ink = measureInkRatio(img, 0.285, 0.492, 0.895, 0.506);
  const rejectZoneInk = Math.max(rejectReasonLine1Ink, rejectReasonLine2Ink);

  const CHECKBOX_THRESHOLD = 0.065; // > 6.5% ของพื้นที่ภายในกรอบ ☐ มีหมึก = มีการติ๊ก
  const WRITING_THRESHOLD = 0.015;  // > 1.5% ของพื้นที่เหนือเส้นประมีหมึก = มีการเขียนข้อความ

  const acceptChecked = acceptCheckboxInk >= CHECKBOX_THRESHOLD;
  const rejectChecked = rejectCheckboxInk >= CHECKBOX_THRESHOLD;
  const dormChecked = hasDormCheckboxInk >= CHECKBOX_THRESHOLD || noDormCheckboxInk >= CHECKBOX_THRESHOLD;

  const acceptDetailsWritten = acceptZoneInk >= WRITING_THRESHOLD || dormChecked;
  const rejectDetailsWritten = rejectZoneInk >= WRITING_THRESHOLD;

  const signals = {
    acceptCheckboxInk: Number(acceptCheckboxInk.toFixed(4)),
    rejectCheckboxInk: Number(rejectCheckboxInk.toFixed(4)),
    acceptZoneInk: Number(acceptZoneInk.toFixed(4)),
    rejectZoneInk: Number(rejectZoneInk.toFixed(4)),
    acceptChecked,
    rejectChecked,
    acceptDetailsWritten,
    rejectDetailsWritten,
  };

  const warnings: string[] = [];

  // กรณีที่ 1: ติ๊กช่อง ☐ สามารถรับนิสิตเข้าฝึกงานได้
  if (acceptChecked && !rejectChecked) {
    if (rejectDetailsWritten) {
      warnings.push("พบรอยเขียนในบรรทัด \"เนื่องจาก...\" ของฝั่งปฏิเสธด้วย กรุณาเปิดไฟล์ตรวจซ้ำ");
    }
    return {
      status: "DONE",
      result: "ACCEPTED",
      confidence: rejectDetailsWritten ? 0.72 : 0.92,
      reasons: ["ตรวจพบรอยติ๊กในช่อง ☐ \"สามารถรับนิสิตเข้าฝึกงานได้\""],
      warnings,
      signals,
      engine: "builtin-template-analyzer",
      analyzedAt: nowIso,
    };
  }

  // กรณีที่ 2: ติ๊กช่อง ☐ ไม่สามารถรับนิสิตเข้าฝึกงานได้
  if (rejectChecked && !acceptChecked) {
    if (acceptDetailsWritten) {
      warnings.push("พบรอยเขียนในช่องจำนวนคน/วันที่ของฝั่งตอบรับด้วย กรุณาเปิดไฟล์ตรวจซ้ำ");
    }
    return {
      status: "DONE",
      result: "REJECTED",
      confidence: acceptDetailsWritten ? 0.72 : 0.92,
      reasons: ["ตรวจพบรอยติ๊กในช่อง ☐ \"ไม่สามารถรับนิสิตเข้าฝึกงานได้\""],
      warnings,
      signals,
      engine: "builtin-template-analyzer",
      analyzedAt: nowIso,
    };
  }

  // กรณีที่ 3: ติ๊กทั้ง 2 ช่อง
  if (acceptChecked && rejectChecked) {
    return {
      status: "DONE",
      result: "UNCLEAR",
      confidence: 0.2,
      reasons: ["ตรวจพบรอยติ๊กทั้งช่อง \"สามารถรับ\" และ \"ไม่สามารถรับ\" (อาจมีการขีดฆ่าแก้ไข)"],
      warnings,
      signals,
      engine: "builtin-template-analyzer",
      analyzedAt: nowIso,
    };
  }

  // กรณีที่ 4: ไม่ติ๊กช่อง ☐ เลย -> เช็คการเขียนรายละเอียดหลังบรรทัด (Fallback Layer 2)
  if (acceptDetailsWritten && !rejectDetailsWritten) {
    return {
      status: "DONE",
      result: "ACCEPTED",
      confidence: 0.78,
      reasons: [
        "ไม่พบการติ๊กช่อง ☐ แต่พบรอยเขียนรายละเอียดหลังช่องตอบรับ (จำนวนคน / วันที่ฝึกงาน / ที่พักอาศัย / รายชื่อนิสิต)",
      ],
      warnings,
      signals,
      engine: "builtin-template-analyzer",
      analyzedAt: nowIso,
    };
  }

  if (rejectDetailsWritten && !acceptDetailsWritten) {
    return {
      status: "DONE",
      result: "REJECTED",
      confidence: 0.78,
      reasons: ["ไม่พบการติ๊กช่อง ☐ แต่พบรอยเขียนรายละเอียดหลังคำว่า \"เนื่องจาก...\" ในช่องปฏิเสธ"],
      warnings,
      signals,
      engine: "builtin-template-analyzer",
      analyzedAt: nowIso,
    };
  }

  if (acceptDetailsWritten && rejectDetailsWritten) {
    return {
      status: "DONE",
      result: "UNCLEAR",
      confidence: 0.2,
      reasons: ["ไม่พบการติ๊กช่อง ☐ และพบรอยเขียนทั้งฝั่งตอบรับและฝั่งปฏิเสธ"],
      warnings,
      signals,
      engine: "builtin-template-analyzer",
      analyzedAt: nowIso,
    };
  }

  // กรณีที่ 5: ไม่ติ๊กช่อง ☐ และไม่เขียนข้อความใดๆ หลังช่องเลย
  return {
    status: "DONE",
    result: "UNCLEAR",
    confidence: 0,
    reasons: ["ไม่พบการติ๊กช่อง ☐ ใดๆ และไม่พบการเขียนข้อความหลังช่องตอบรับหรือช่องปฏิเสธเลย"],
    warnings,
    signals,
    engine: "builtin-template-analyzer",
    analyzedAt: nowIso,
  };
}

export async function analyzeAcceptanceForm(
  fileBuffer: Buffer,
  fileName: string,
  mimeType = "application/octet-stream",
  cloudinaryUrl?: string
): Promise<AcceptanceOcrResult> {
  const baseUrl = (process.env.OCR_SERVICE_URL || "").trim().replace(/\/+$/, "");

  // หากตั้งค่า OCR_SERVICE_URL (Python PaddleOCR service) ไว้ ให้เรียกใช้ก่อน
  if (baseUrl) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), OCR_TIMEOUT_MS);
    try {
      const form = new FormData();
      form.append("file", new Blob([new Uint8Array(fileBuffer)], { type: mimeType }), fileName || "acceptance.pdf");

      const headers: Record<string, string> = {};
      if (process.env.OCR_API_KEY) headers["x-api-key"] = process.env.OCR_API_KEY;

      const res = await fetch(`${baseUrl}/analyze`, {
        method: "POST",
        body: form,
        headers,
        signal: controller.signal,
      });
      if (res.ok) {
        const data: any = await res.json();
        const result = ["ACCEPTED", "REJECTED", "UNCLEAR"].includes(data?.result) ? data.result : "UNCLEAR";
        return {
          status: "DONE",
          result,
          confidence: Number(data?.confidence) || 0,
          reasons: Array.isArray(data?.reasons) ? data.reasons.map(String) : [],
          warnings: Array.isArray(data?.warnings) ? data.warnings.map(String) : [],
          extracted: data?.extracted || {},
          signals: data?.signals || {},
          engine: String(data?.engine || "paddleocr"),
          analyzedAt: new Date().toISOString(),
        };
      }
    } catch {
      // หากเชื่อมต่อ External OCR ไม่ได้ ให้สลับมาใช้ Built-in Detector อัตโนมัติ
    } finally {
      clearTimeout(timer);
    }
  }

  // ใช้ Built-in Detector ทำงานทันทีโดยไม่ต้องตั้งค่าเซิร์ฟเวอร์แยก
  return analyzeWithBuiltinDetector(fileBuffer, fileName, cloudinaryUrl);
}

/** ดาวน์โหลดไฟล์จาก URL (Cloudinary) เพื่อสแกนซ้ำ */
export async function fetchFileBuffer(url: string): Promise<{ buffer: Buffer; mimeType: string }> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`ดาวน์โหลดไฟล์ไม่สำเร็จ (HTTP ${res.status})`);
  const arr = await res.arrayBuffer();
  return { buffer: Buffer.from(arr), mimeType: res.headers.get("content-type") || "application/octet-stream" };
}
