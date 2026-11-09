# OCR Service — ตรวจแบบตอบรับ/ปฏิเสธ การรับนิสิตฝึกงาน (PaddleOCR)

Microservice (Python + FastAPI + PaddleOCR + OpenCV) แยกจากระบบหลัก เพราะ Vercel รัน Python/PaddleOCR ไม่ได้
ระบบหลัก (Node/Next.js) จะเรียก `POST /analyze` ทุกครั้งที่นิสิตอัปโหลดใบตอบรับ

> ถ้ายังไม่ได้ตั้งค่า `OCR_SERVICE_URL` หรือ service ล่ม ระบบหลัก **ยังใช้งานได้ปกติ**
> พี่จอมจะเห็นป้าย "OCR ไม่พร้อมใช้งาน — กรุณาตรวจไฟล์ด้วยตา" และกดยืนยันผลเองได้

## วิธีตรวจ (2 ชั้น)

| ชั้น | สิ่งที่ตรวจ | ผล |
|---|---|---|
| 1 | หมึกในกรอบ ☐ หน้า "สามารถรับ..." / "ไม่สามารถรับ..." | ติ๊กช่องเดียว → ACCEPTED / REJECTED |
| 2 | (เมื่อไม่ติ๊กช่องใดเลย) ลายมือ/ข้อความบนเส้นประหลังข้อความ | เขียนฝั่งตอบรับ (จำนวนคน/วันที่/ที่พัก) → ACCEPTED, เขียนหลัง "เนื่องจาก" → REJECTED |
| - | ไม่ติ๊ก+ไม่เขียน, ติ๊ก/เขียนทั้งสองฝั่ง, อ่านไม่ออก | UNCLEAR → แจ้งเตือนพี่จอม |

## รันในเครื่อง

```bash
cd ocr-service
python -m venv .venv
# Windows: .venv\Scripts\activate   |  macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
python main.py          # http://localhost:8000/health
```

ทดสอบ:
```bash
curl -F "file=@ใบตอบรับ.pdf" http://localhost:8000/analyze
```

จากนั้นใส่ใน `.env` ของระบบหลัก:
```
OCR_SERVICE_URL=http://localhost:8000
OCR_API_KEY=            # (ถ้าตั้งไว้ฝั่ง service ต้องตรงกัน)
```

## Deploy (ฟรี)

ใช้ `Dockerfile` ในโฟลเดอร์นี้ได้เลย
- **Hugging Face Spaces** (แนะนำ, RAM 16GB): สร้าง Space แบบ Docker → อัปโหลดไฟล์ในโฟลเดอร์นี้ → ตั้ง `PORT=7860`
- **Render / Railway**: New Web Service → Root directory = `ocr-service` → Docker
  (แพ็กเกจฟรีของ Render RAM 512MB อาจไม่พอสำหรับ PaddleOCR และมี cold start ~1 นาที)

ตั้ง Environment Variable `OCR_API_KEY` ที่ service และใส่ค่าเดียวกันใน Vercel พร้อม `OCR_SERVICE_URL`

## ปรับเกณฑ์ (ENV)

| ตัวแปร | ค่าเริ่มต้น | ความหมาย |
|---|---|---|
| `CHECKBOX_TICK_RATIO` | `0.10` | สัดส่วนหมึกในกรอบ ☐ ที่ถือว่า "ติ๊ก" |
| `HANDWRITING_INK_RATIO` | `0.012` | สัดส่วนหมึกบนเส้นประที่ถือว่า "มีการเขียน" |

ดูค่าที่วัดได้จริงใน field `signals` ของผลลัพธ์ แล้วปรับให้เข้ากับใบตอบรับจริง

