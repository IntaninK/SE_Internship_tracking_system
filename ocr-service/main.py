"""
OCR Microservice: ตรวจ "แบบตอบรับ/ปฏิเสธ การรับนิสิตฝึกงาน" (คณะ ICT ม.พะเยา)
=========================================================================

รับไฟล์ PDF / JPG / PNG ที่นิสิตสแกนอัปโหลด แล้ววิเคราะห์ว่าบริษัท
  - ACCEPTED  : ตอบรับนิสิตเข้าฝึกงาน
  - REJECTED  : ปฏิเสธ
  - UNCLEAR   : ระบบตัดสินไม่ได้ (ไม่ติ๊ก/ไม่เขียนอะไรเลย, ติ๊กทั้ง 2 ช่อง, ภาพเบลอ ฯลฯ)

ตรวจ 2 ชั้น (2-Layer Detection)
  ชั้นที่ 1: วัดปริมาณหมึกในกรอบ ☐ หน้าข้อความ "สามารถรับ..." และ "ไม่สามารถรับ..."
  ชั้นที่ 2: (ใช้เมื่อช่อง ☐ ตัดสินไม่ได้) ดูว่ามีการเขียนรายละเอียดบนเส้นประหลังข้อความหรือไม่
            - ฝั่งตอบรับ : ช่อง "จำนวน ... คน", "ระหว่างวันที่ ... ถึงวันที่ ...", ช่องติ๊ก มี/ไม่มี ที่พัก
            - ฝั่งปฏิเสธ : บรรทัด "เนื่องจาก ......" (2 บรรทัด)

ผลลัพธ์เป็นเพียง "ข้อเสนอแนะ" ให้เจ้าหน้าที่ (Super Admin) ตรวจและกดยืนยันอีกครั้งเสมอ
"""

from __future__ import annotations

import os
import re
from dataclasses import dataclass, field
from difflib import SequenceMatcher
from typing import Any, Optional

import cv2
import numpy as np
from fastapi import FastAPI, File, Header, HTTPException, UploadFile

try:
    import fitz  # PyMuPDF
except ImportError:  # pragma: no cover
    fitz = None

from paddleocr import PaddleOCR

API_KEY = os.getenv("OCR_API_KEY", "").strip()
MAX_FILE_BYTES = 10 * 1024 * 1024

# เกณฑ์ปรับได้ผ่าน ENV (ค่าเริ่มต้นจูนสำหรับสแกน 200 dpi / ภาพถ่ายมือถือ)
CHECKBOX_TICK_RATIO = float(os.getenv("CHECKBOX_TICK_RATIO", "0.10"))  # สัดส่วนพิกเซลหมึกในกรอบ ☐ ที่ถือว่าติ๊ก
HANDWRITING_INK_RATIO = float(os.getenv("HANDWRITING_INK_RATIO", "0.012"))  # สัดส่วนหมึกบนเส้นประที่ถือว่ามีการเขียน

app = FastAPI(title="UP ICT Acceptance Form OCR", version="1.0.0")

_ocr: Optional[PaddleOCR] = None


def get_ocr() -> PaddleOCR:
    global _ocr
    if _ocr is None:
        # lang="th" = โมเดลภาษาไทย (อ่านตัวเลข/อังกฤษได้ด้วย)
        _ocr = PaddleOCR(use_angle_cls=True, lang="th", show_log=False)
    return _ocr


# --------------------------------------------------------------------------
# โครงสร้างข้อมูล
# --------------------------------------------------------------------------
@dataclass
class TextLine:
    text: str
    box: np.ndarray  # 4x2 (x,y)
    score: float

    @property
    def x0(self) -> int:
        return int(self.box[:, 0].min())

    @property
    def x1(self) -> int:
        return int(self.box[:, 0].max())

    @property
    def y0(self) -> int:
        return int(self.box[:, 1].min())

    @property
    def y1(self) -> int:
        return int(self.box[:, 1].max())

    @property
    def h(self) -> int:
        return max(1, self.y1 - self.y0)


@dataclass
class Analysis:
    result: str = "UNCLEAR"
    confidence: float = 0.0
    reasons: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    signals: dict[str, Any] = field(default_factory=dict)
    extracted: dict[str, Any] = field(default_factory=dict)


# --------------------------------------------------------------------------
# โหลดไฟล์ -> ภาพ
# --------------------------------------------------------------------------
def load_image(data: bytes, filename: str) -> np.ndarray:
    name = (filename or "").lower()
    if name.endswith(".pdf") or data[:4] == b"%PDF":
        if fitz is None:
            raise HTTPException(500, "เซิร์ฟเวอร์ยังไม่ได้ติดตั้ง PyMuPDF สำหรับอ่าน PDF")
        doc = fitz.open(stream=data, filetype="pdf")
        if doc.page_count == 0:
            raise HTTPException(400, "ไฟล์ PDF ไม่มีหน้าเอกสาร")
        # หาหน้าที่เป็นแบบตอบรับ (ปกติเป็นหน้าสุดท้าย หรือหน้าเดียว) -> เลือกหน้าที่มีคำว่า "แบบตอบรับ"
        page_index = doc.page_count - 1
        for i in range(doc.page_count):
            txt = doc.load_page(i).get_text() or ""
            if "แบบตอบรับ" in txt or "ไม่สามารถรับ" in txt:
                page_index = i
                break
        pix = doc.load_page(page_index).get_pixmap(dpi=200)
        img = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, pix.n)
        if pix.n == 4:
            img = cv2.cvtColor(img, cv2.COLOR_RGBA2BGR)
        else:
            img = cv2.cvtColor(img, cv2.COLOR_RGB2BGR)
        return img

    arr = np.frombuffer(data, dtype=np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        raise HTTPException(400, "ไม่สามารถอ่านไฟล์ภาพได้ (รองรับ PDF, JPG, PNG, WebP)")
    return img


def normalize_size(img: np.ndarray) -> np.ndarray:
    """ย่อ/ขยายให้ความกว้างประมาณ 1650px (≈ A4 200dpi) เพื่อให้เกณฑ์คงที่"""
    h, w = img.shape[:2]
    target_w = 1650
    if abs(w - target_w) / target_w < 0.1:
        return img
    scale = target_w / float(w)
    return cv2.resize(img, (target_w, int(h * scale)), interpolation=cv2.INTER_CUBIC if scale > 1 else cv2.INTER_AREA)


def binarize(img: np.ndarray) -> np.ndarray:
    """คืนภาพขาวดำ: หมึก = 255, พื้น = 0 (ทนเงา/แสงไม่สม่ำเสมอจากภาพถ่ายมือถือ)"""
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    gray = cv2.GaussianBlur(gray, (3, 3), 0)
    return cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 31, 15)


def remove_printed_lines(bin_img: np.ndarray) -> np.ndarray:
    """ลบเส้นประ/เส้นตรงแนวนอนที่พิมพ์มากับฟอร์ม เหลือเฉพาะลายมือ"""
    horiz = cv2.morphologyEx(bin_img, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_RECT, (25, 1)))
    cleaned = cv2.subtract(bin_img, horiz)
    # เส้นประ (จุดเล็กๆ เรียงกัน) -> เปิดด้วย kernel เล็กเพื่อลบจุด
    cleaned = cv2.morphologyEx(cleaned, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2, 2)))
    return cleaned


# --------------------------------------------------------------------------
# OCR
# --------------------------------------------------------------------------
def run_ocr(img: np.ndarray) -> list[TextLine]:
    raw = get_ocr().ocr(img, cls=True)
    lines: list[TextLine] = []
    for page in raw or []:
        for item in page or []:
            box, (text, score) = item
            lines.append(TextLine(text=str(text), box=np.array(box, dtype=np.float32), score=float(score)))
    return lines


def compact(text: str) -> str:
    return re.sub(r"\s+", "", text or "")


def find_line(lines: list[TextLine], pattern: str, exclude_prefix: Optional[str] = None) -> Optional[TextLine]:
    """หาบรรทัดที่มีคำตาม pattern (เทียบแบบตัดช่องว่าง + ยอมให้ OCR ผิดเล็กน้อย)"""
    best: Optional[TextLine] = None
    best_score = 0.0
    for ln in lines:
        t = compact(ln.text)
        idx = t.find(pattern)
        if idx < 0:
            ratio = fuzzy_contains(t, pattern)
            if ratio < 0.8:
                continue
            idx = 0
            score = ratio
        else:
            score = 1.0
        if exclude_prefix:
            # "ไม่สามารถรับ" มีคำว่า "สามารถรับ" อยู่ข้างใน -> ต้องตรวจว่าไม่มี "ไม่" นำหน้า
            before = t[max(0, idx - len(exclude_prefix) - 1): idx]
            if exclude_prefix in before or t.startswith(exclude_prefix):
                continue
        if score > best_score:
            best, best_score = ln, score
    return best


def fuzzy_contains(text: str, pattern: str) -> float:
    """สัดส่วนความเหมือนสูงสุดของ substring ใน text เทียบกับ pattern (กัน OCR อ่านสระ/วรรณยุกต์เพี้ยน)"""
    if not text or not pattern or len(text) < len(pattern) * 0.6:
        return 0.0
    n = len(pattern)
    best = 0.0
    for i in range(0, max(1, len(text) - n + 1)):
        best = max(best, SequenceMatcher(None, text[i: i + n], pattern).ratio())
        if best >= 0.95:
            break
    return best


# --------------------------------------------------------------------------
# ชั้นที่ 1: ตรวจกรอบ ☐
# --------------------------------------------------------------------------
def checkbox_fill_ratio(bin_img: np.ndarray, anchor: TextLine) -> tuple[float, Optional[tuple[int, int, int, int]]]:
    """
    หากรอบสี่เหลี่ยมทางซ้ายของข้อความ anchor แล้ววัดสัดส่วนหมึก "ภายใน" กรอบ
    (ไม่นับเส้นขอบ) -> ถ้ามีรอย ✓ ✗ / จะได้ค่าสูง
    """
    h_img, w_img = bin_img.shape[:2]
    size = int(anchor.h * 1.6)
    x1 = max(0, anchor.x0 + int(anchor.h * 0.6))  # เผื่อกรณี OCR รวม ☐ เข้ามาในกล่องข้อความ
    x0 = max(0, anchor.x0 - size * 3)
    y0 = max(0, anchor.y0 - int(anchor.h * 0.5))
    y1 = min(h_img, anchor.y1 + int(anchor.h * 0.5))
    roi = bin_img[y0:y1, x0:x1]
    if roi.size == 0:
        return 0.0, None

    contours, _ = cv2.findContours(roi, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
    best_box = None
    best_dist = 1e9
    for c in contours:
        x, y, w, h = cv2.boundingRect(c)
        if w < anchor.h * 0.5 or h < anchor.h * 0.5 or w > anchor.h * 2.2 or h > anchor.h * 2.2:
            continue
        if not (0.7 < w / float(h) < 1.4):
            continue
        dist = (x1 - x0) - (x + w)  # ใกล้ข้อความที่สุด
        if dist < best_dist:
            best_dist, best_box = dist, (x, y, w, h)

    if best_box is None:
        # ไม่เจอกรอบ (เช่นถูกติ๊กทับจนกรอบเพี้ยน) -> วัดหมึกในพื้นที่ทางซ้ายแทน
        sub = roi[:, max(0, roi.shape[1] - size * 2):]
        ratio = float(np.count_nonzero(sub)) / float(sub.size or 1)
        return ratio * 0.6, None

    x, y, w, h = best_box
    pad = max(2, int(min(w, h) * 0.18))
    inner = roi[y + pad: y + h - pad, x + pad: x + w - pad]
    ratio = float(np.count_nonzero(inner)) / float(inner.size or 1)

    # รอยติ๊กมักล้นออกนอกกรอบ -> ตรวจรอบนอกกรอบด้านบน/ขวาเพิ่ม
    ext = roi[max(0, y - h // 2): y + h, x: min(roi.shape[1], x + int(w * 1.6))]
    overflow = float(np.count_nonzero(ext)) / float(ext.size or 1)
    return max(ratio, overflow * 0.7), (x0 + x, y0 + y, w, h)


# --------------------------------------------------------------------------
# ชั้นที่ 2: ตรวจลายมือบนเส้นประ
# --------------------------------------------------------------------------
def handwriting_ratio(clean_img: np.ndarray, x0: int, y0: int, x1: int, y1: int) -> float:
    h_img, w_img = clean_img.shape[:2]
    x0, x1 = max(0, x0), min(w_img, x1)
    y0, y1 = max(0, y0), min(h_img, y1)
    if x1 <= x0 or y1 <= y0:
        return 0.0
    roi = clean_img[y0:y1, x0:x1]
    return float(np.count_nonzero(roi)) / float(roi.size or 1)


TEMPLATE_WORDS = [
    "ไม่สามารถรับนิสิตเข้าฝึกงานได้", "สามารถรับนิสิตเข้าฝึกงานได้", "ที่พักอาศัยให้กับนิสิตในระหว่างฝึกงาน",
    "ที่พักอาศัย", "ให้กับนิสิต", "ในระหว่างฝึกงาน", "ระหว่างวันที่", "ถึงวันที่", "เนื่องจาก",
    "จำนวน", "ไม่มี", "โดย", "คน", "มี",
]


def strip_template(text: str) -> str:
    """ตัดข้อความพิมพ์ของฟอร์ม + เส้นประ ออก เหลือเฉพาะสิ่งที่บริษัทเขียน/พิมพ์เติม
    (ยอมให้ OCR อ่านคำในฟอร์มเพี้ยนได้เล็กน้อยด้วย fuzzy match)"""
    t = text or ""
    for w in TEMPLATE_WORDS:  # เรียงคำยาวก่อนอยู่แล้ว
        t = t.replace(w, " ")
    t = re.sub(r"[.\u2026_\-·•☐□■▢✓✔✗✘:|]+", " ", t)
    kept: list[str] = []
    for tok in t.split():
        if re.search(r"[0-9๐-๙]", tok):
            kept.append(tok)
            continue
        if len(tok) <= 1:
            continue
        if any(SequenceMatcher(None, tok, w).ratio() >= 0.75 for w in TEMPLATE_WORDS if abs(len(w) - len(tok)) <= 4):
            continue
        kept.append(tok)
    return " ".join(kept).strip()


def mask_printed_text(clean_img: np.ndarray, lines: list[TextLine]) -> np.ndarray:
    """ลบกล่องข้อความที่เป็น "ข้อความพิมพ์ของฟอร์มล้วนๆ" ออก เพื่อไม่ให้นับหมึกเป็นลายมือ
    กล่องที่มีข้อความเติมเข้ามา (ลายมือ/ตัวเลข) จะยังอยู่ และลายมือที่ OCR อ่านไม่ออกก็ยังถูกนับเป็นหมึก"""
    out = clean_img.copy()
    for ln in lines:
        if len(strip_template(ln.text)) < 2:
            cv2.rectangle(out, (ln.x0 - 3, ln.y0 - 3), (ln.x1 + 3, ln.y1 + 3), 0, -1)
    return out


def text_between(lines: list[TextLine], y0: int, y1: int, x_min: int) -> str:
    parts = [ln for ln in lines if ln.y0 >= y0 - 4 and ln.y1 <= y1 + 4 and ln.x1 > x_min]
    parts.sort(key=lambda l: (l.y0 // 20, l.x0))
    return " ".join(p.text for p in parts)


# --------------------------------------------------------------------------
# วิเคราะห์หลัก
# --------------------------------------------------------------------------
def analyze(img: np.ndarray) -> Analysis:
    a = Analysis()
    img = normalize_size(img)
    h_img, w_img = img.shape[:2]

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    blur_score = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    a.signals["blurScore"] = round(blur_score, 1)
    if blur_score < 40:
        a.warnings.append("ภาพค่อนข้างเบลอหรือความละเอียดต่ำ ผลการตรวจอาจคลาดเคลื่อน")

    lines = run_ocr(img)
    a.signals["ocrLineCount"] = len(lines)
    if not lines:
        a.reasons.append("อ่านข้อความในเอกสารไม่ได้เลย (ภาพอาจมืด/เบลอ/ไม่ใช่แบบตอบรับ)")
        return a

    bin_img = binarize(img)
    clean = remove_printed_lines(bin_img)

    accept_ln = find_line(lines, "สามารถรับนิสิต", exclude_prefix="ไม่")
    reject_ln = find_line(lines, "ไม่สามารถรับนิสิต")
    a.signals["foundAcceptLine"] = accept_ln is not None
    a.signals["foundRejectLine"] = reject_ln is not None

    if accept_ln is None and reject_ln is None:
        a.reasons.append("ไม่พบข้อความ \"สามารถรับ/ไม่สามารถรับนิสิตเข้าฝึกงานได้\" ในเอกสาร อาจไม่ใช่แบบตอบรับของคณะ")
        return a

    # ---------------- ชั้นที่ 1: กรอบ ☐ ----------------
    acc_tick, rej_tick = 0.0, 0.0
    if accept_ln is not None:
        acc_tick, _ = checkbox_fill_ratio(bin_img, accept_ln)
    if reject_ln is not None:
        rej_tick, _ = checkbox_fill_ratio(bin_img, reject_ln)
    a.signals["acceptCheckboxInk"] = round(acc_tick, 3)
    a.signals["rejectCheckboxInk"] = round(rej_tick, 3)
    acc_checked = acc_tick >= CHECKBOX_TICK_RATIO
    rej_checked = rej_tick >= CHECKBOX_TICK_RATIO
    a.signals["acceptChecked"] = acc_checked
    a.signals["rejectChecked"] = rej_checked

    # ---------------- ชั้นที่ 2: ลายมือหลังข้อความ ----------------
    masked = mask_printed_text(clean, lines)

    acc_ink, rej_ink = 0.0, 0.0
    acc_text, rej_text = "", ""
    if accept_ln is not None:
        # โซนตอบรับ = ตั้งแต่บรรทัด "สามารถรับ..." ลงไปจนถึงก่อนบรรทัด "ไม่สามารถรับ..." (จำนวน/วันที่/ที่พัก)
        ay0 = accept_ln.y0 - int(accept_ln.h * 0.4)
        ay1 = (reject_ln.y0 - int(reject_ln.h * 0.3)) if (reject_ln is not None and reject_ln.y0 > accept_ln.y1) \
            else accept_ln.y1 + accept_ln.h * 3
        acc_ink = handwriting_ratio(masked, accept_ln.x1, ay0, w_img - 20, accept_ln.y1 + int(accept_ln.h * 0.4))
        acc_ink = max(acc_ink, handwriting_ratio(masked, accept_ln.x0, accept_ln.y1 + int(accept_ln.h * 0.4), w_img - 20, ay1))
        acc_text = strip_template(text_between(lines, ay0, ay1, accept_ln.x0))
    if reject_ln is not None:
        # โซนปฏิเสธ = หลังคำว่า "เนื่องจาก" ในบรรทัดเดียวกัน + บรรทัดถัดไปอีก 2 บรรทัด
        ry0 = reject_ln.y0 - int(reject_ln.h * 0.4)
        ry1 = reject_ln.y1 + reject_ln.h * 3
        # หยุดก่อนกรอบ "ลักษณะงานที่หน่วยงานต้องการ" ถ้าเจอ
        job_ln = find_line(lines, "ลักษณะงาน")
        if job_ln is not None and job_ln.y0 > reject_ln.y1:
            ry1 = min(ry1, job_ln.y0 - 4)
        rej_ink = max(
            handwriting_ratio(masked, reject_ln.x1, ry0, w_img - 20, reject_ln.y1 + int(reject_ln.h * 0.4)),
            handwriting_ratio(masked, reject_ln.x0, reject_ln.y1 + int(reject_ln.h * 0.4), w_img - 20, ry1),
        )
        rej_text = strip_template(text_between(lines, ry0, ry1, reject_ln.x0))

    a.signals["acceptZoneInk"] = round(acc_ink, 4)
    a.signals["rejectZoneInk"] = round(rej_ink, 4)
    acc_written = acc_ink >= HANDWRITING_INK_RATIO or bool(re.search(r"[0-9๐-๙]", acc_text)) or len(acc_text) >= 3
    rej_written = rej_ink >= HANDWRITING_INK_RATIO or len(rej_text) >= 3
    a.signals["acceptDetailsWritten"] = acc_written
    a.signals["rejectDetailsWritten"] = rej_written

    if acc_text:
        a.extracted["acceptDetailText"] = acc_text[:300]
        m = re.search(r"([0-9]{1,3})\s*คน", acc_text) or re.search(r"([0-9]{1,3})", acc_text)
        if m:
            a.extracted["acceptedCount"] = int(m.group(1))
    if rej_text:
        a.extracted["rejectReasonText"] = rej_text[:300]

    # ---------------- ตัดสินผล ----------------
    if acc_checked and not rej_checked:
        a.result = "ACCEPTED"
        a.confidence = 0.9 if not rej_written else 0.7
        a.reasons.append("ตรวจพบรอยติ๊กในช่อง ☐ \"สามารถรับนิสิตเข้าฝึกงานได้\"")
        if rej_written:
            a.warnings.append("พบรอยเขียนในบรรทัด \"เนื่องจาก...\" ของฝั่งปฏิเสธด้วย กรุณาตรวจไฟล์จริง")
    elif rej_checked and not acc_checked:
        a.result = "REJECTED"
        a.confidence = 0.9 if not acc_written else 0.7
        a.reasons.append("ตรวจพบรอยติ๊กในช่อง ☐ \"ไม่สามารถรับนิสิตเข้าฝึกงานได้\"")
        if acc_written:
            a.warnings.append("พบรอยเขียนในช่องจำนวนคน/วันที่ของฝั่งตอบรับด้วย กรุณาตรวจไฟล์จริง")
    elif acc_checked and rej_checked:
        a.result = "UNCLEAR"
        a.confidence = 0.2
        a.reasons.append("ตรวจพบรอยติ๊กทั้งช่อง \"สามารถรับ\" และ \"ไม่สามารถรับ\" (อาจติ๊กผิดแล้วขีดฆ่า)")
    else:
        # ไม่มีการติ๊กช่องใดเลย -> ใช้ชั้นที่ 2
        a.signals["usedFallbackLayer"] = True
        if acc_written and not rej_written:
            a.result = "ACCEPTED"
            a.confidence = 0.65
            a.reasons.append("ไม่พบการติ๊กช่อง ☐ แต่พบการเขียนรายละเอียดฝั่งตอบรับ (จำนวนคน/วันที่ฝึกงาน/ที่พัก)")
        elif rej_written and not acc_written:
            a.result = "REJECTED"
            a.confidence = 0.65
            a.reasons.append("ไม่พบการติ๊กช่อง ☐ แต่พบการเขียนเหตุผลหลังคำว่า \"เนื่องจาก...\" ฝั่งปฏิเสธ")
        elif acc_written and rej_written:
            a.result = "UNCLEAR"
            a.confidence = 0.2
            a.reasons.append("ไม่พบการติ๊กช่อง ☐ และพบการเขียนข้อความทั้งฝั่งตอบรับและฝั่งปฏิเสธ")
        else:
            a.result = "UNCLEAR"
            a.confidence = 0.0
            a.reasons.append("ไม่พบการติ๊กช่อง ☐ ใดๆ และไม่พบการเขียนข้อความหลังช่องตอบรับหรือช่องปฏิเสธเลย")

    if blur_score < 40 and a.result != "UNCLEAR":
        a.confidence = round(a.confidence * 0.7, 2)
    return a


# --------------------------------------------------------------------------
# HTTP API
# --------------------------------------------------------------------------
@app.get("/health")
def health() -> dict[str, Any]:
    return {"ok": True, "engine": "paddleocr", "pdf": fitz is not None}


@app.post("/analyze")
async def analyze_endpoint(
    file: UploadFile = File(...),
    x_api_key: Optional[str] = Header(default=None),
) -> dict[str, Any]:
    if API_KEY and x_api_key != API_KEY:
        raise HTTPException(401, "invalid api key")

    data = await file.read()
    if not data:
        raise HTTPException(400, "ไฟล์ว่างเปล่า")
    if len(data) > MAX_FILE_BYTES:
        raise HTTPException(413, "ไฟล์ใหญ่เกิน 10MB")

    img = load_image(data, file.filename or "")
    result = analyze(img)
    return {
        "success": True,
        "engine": "paddleocr",
        "result": result.result,
        "confidence": round(result.confidence, 2),
        "reasons": result.reasons,
        "warnings": result.warnings,
        "signals": result.signals,
        "extracted": result.extracted,
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", "8000")))
