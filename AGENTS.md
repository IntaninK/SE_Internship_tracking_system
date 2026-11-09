<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Git Workflow Rules (ข้อบังคับการทำงานกับ Git)

- **ห้าม AI สั่ง `git commit` หรือ `git push` โดยเด็ดขาด:**
  - AI ต้องไม่รันคำสั่ง `git commit`, `git commit -m`, `git commit -a`, `git commit --amend` หรือ `git push` ในทุกกรณี
  - บทบาทของ AI มีเพียงการเขียนโค้ด ปรับปรุงไฟล์ ตรวจสอบประเภทข้อมูล (Type Check) และรันคำสั่งทดสอบ (Test/Build) เท่านั้น
  - ผู้ใช้งานจะเป็นผู้ตรวจสอบความเปลี่ยนแปลง (Review Diff), ตั้งชื่อข้อความ Commit, และกด Commit / Push ขึ้น GitHub ด้วยตนเองเสมอ
