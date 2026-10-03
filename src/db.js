require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const { PrismaNeon } = require("@prisma/adapter-neon");

// adapter-neon ใช้ HTTP/WebSocket driver ของ Neon แทน pg.Pool ที่ค้าง connection ไว้
// เหมาะกับ serverless (Vercel) เพราะไม่เสี่ยงใช้ connection limit ของ Neon หมด
const adapter = new PrismaNeon({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({
  adapter,
});

module.exports = prisma;