/**
 * prisma/seed.js
 *
 * Seed ข้อมูล template กลางของ ChecklistSection / ChecklistItem
 * (5 หมวด ตามภาพ Checklist บริษัทที่นิสิตกรอกก่อนยื่นสมัครฝึกงาน)
 *
 * ⚠️ คำเตือน: สคริปต์นี้ "ลบของเดิมทั้งหมดแล้วสร้างใหม่" ทุกครั้งที่รัน
 *    - ถ้ามี CompanyChecklistAnswer ผูกกับ ChecklistItem เดิมอยู่แล้ว (นิสิตติ๊ก checklist ไปแล้ว)
 *      คำตอบเหล่านั้นจะถูกลบไปด้วย เพราะ checklistItemId อ้างอิงถึง item ที่ถูกลบ
 *    - เหมาะสำหรับรันครั้งแรกตอน setup หรือตอน dev/reset DB เท่านั้น
 *    - ถ้าจะรันซ้ำตอนมีข้อมูลจริงแล้ว ให้แก้เป็น upsert ตาม title แทน (ต้องเพิ่ม
 *      @@unique([title]) ใน ChecklistSection ก่อน) — บอกได้ถ้าต้องการให้ปรับ
 *
 * รัน:
 *   node prisma/seed.js
 * หรือถ้าตั้งค่า migrations.seed ใน prisma.config.ts แล้ว:
 *   npx prisma db seed
 */

const prisma = require('../src/db');

const CHECKLIST_TEMPLATE = [
  {
    order: 1,
    title: 'ส่วนที่ 1 ความน่าเชื่อถือของบริษัท',
    items: [
      '1. ตรวจสอบกับกรมพัฒนาธุรกิจการค้า (DBD) นำชื่อบริษัทไปค้นในเว็บ DBD DataWarehouse สถานะ: ต้องขึ้นว่า "ยังดำเนินกิจการอยู่" (Active) ต้องสอดคล้องกับงบซอฟต์แวร์/ไอที',
      '2. บริษัทที่เปิดมานานกว่า 3-5 ปี',
      '3. บริษัทได้ "ต้องมีเว็บไซต์" หรือช่องทางออนไลน์ที่น่าเชื่อถือ',
      '4. ต้องใช้งานได้จริง หน้าตาเป็นมืออาชีพ (ไม่ใช่มีแต่หน้าเปล่าๆ หรือขึ้น Error)',
      '5. มีข้อมูลสินค้า/บริการ (Product/Service) ชัดเจน ว่าทำอะไร ขายให้ใคร',
      '6. Social Media (Facebook/LinkedIn)',
      '7. Email Domain: ควรใช้อีเมลบริษัท เช่น hr@companyname.com',
      '8. ฝ่ายบุคคล (HR) หรือผู้ประสานงาน มีการออกหนังสือตอบรับเข้าฝึกงาน (Offer Letter)',
    ],
  },
  {
    order: 2,
    title: 'ส่วนที่ 2 สถานที่ตั้งและสภาพแวดล้อม',
    items: [
      '1. Google Maps: ปักหมุดแล้วจอสถานที่จริงไหม?',
      '2. ดู Street View แล้วเป็นตึกออฟฟิศ หรือเป็นบ้าน คน/ทาวน์เฮาส์ ?',
      '3. ไม่แนะนำ Remote 100% หรือ Work from Home 100%',
      '4. สลับวันเข้า Office (Hybrid) ได้',
      '5. มีโต๊ะทำงานให้ทำงานเป็นสัดส่วน',
      '6. ที่ตั้งชัดเจน + จดทะเบียนถูกต้อง + มีทีมงานเกิน 10 คน',
    ],
  },
  {
    order: 3,
    title: 'ส่วนที่ 3 ความทันสมัยของ Tech Stack',
    items: [
      '1. ใช้เครื่องมือ/ภาษาที่เป็นนิยมในตลาดแรงงาน',
      '2. เครื่องมือมีความเป็น Professional (Jira, Git, Cloud, Docker)',
    ],
  },
  {
    order: 4,
    title: 'ส่วนที่ 4 คุณภาพพี่เลี้ยง (Mentorship)',
    items: [
      '1. มี Senior Dev ดูแลประกบ (อัตราส่วนพี่เลี้ยงต่อน้องไม่ควรเกิน 1:3)',
      '2. มีเวลาสอนงาน ไม่ยุ่งจนทิ้งน้อง',
      '3. มีแผนการสอนงานชัดเจน เช่น มี Time Sheet',
    ],
  },
  {
    order: 5,
    title: 'ส่วนที่ 5 เนื้องาน (Scope of Work)',
    items: [
      '1. ได้ทำงานจริงเกี่ยวข้องกับการพัฒนาซอฟต์แวร์',
      '2. งานมีความท้าทาย ไม่ใช่งาน Admin/Data Entry/ คีย์ข้อมูล',
      '3. เป็นงานที่มี Impact ต่อบริษัท',
    ],
  },
];

async function main() {
  console.log('🌱 เริ่ม seed ChecklistSection / ChecklistItem...');

  // ลบของเดิมทั้งหมดก่อน (ดูคำเตือนด้านบนของไฟล์)
  // ลบ answer ก่อน เพราะมี FK ผูกกับ ChecklistItem
  await prisma.companyChecklistAnswer.deleteMany({});
  await prisma.checklistItem.deleteMany({});
  await prisma.checklistSection.deleteMany({});

  for (const section of CHECKLIST_TEMPLATE) {
    const created = await prisma.checklistSection.create({
      data: {
        title: section.title,
        order: section.order,
        items: {
          create: section.items.map((description, idx) => ({
            order: idx + 1,
            description,
          })),
        },
      },
      include: { items: true },
    });

    console.log(`  ✅ ${created.title} (${created.items.length} ข้อ)`);
  }

  console.log('🌱 Seed เสร็จสมบูรณ์');
}

main()
  .catch((e) => {
    console.error('❌ Seed ล้มเหลว:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
