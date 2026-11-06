"use client";

import React from "react";
import PageShell from "./PageShell";

const PAGE_TITLE = "สถานะการยื่น และ ข้อมูลบริษัทที่เข้าฝึกงาน";
const PAGE_STYLES: string[] = [];
const PAGE_SCRIPTS: string[] = [
  "../components/header.js"
];
const PAGE_BODY_HTML = "<!-- Header -->\r\n  <div id=\"header-placeholder\"></div>\r\n\r\n  <!-- Main Content -->\r\n  <main class=\"main-content\">\r\n\r\n    <!-- Section: สถานะการยื่น -->\r\n    <section class=\"card\">\r\n      <div class=\"card-header\">\r\n\r\n        <span class=\"material-icons header-icon\">how_to_reg</span>\r\n        <h2 class=\"card-title\">สถานะการยื่น</h2>\r\n      </div>\r\n      <div class=\"card-body\">\r\n        <div class=\"form-group status-group\">\r\n          <label class=\"form-label\">สถานะการยื่นฝึกงาน</label>\r\n          <select class=\"input-field\">\r\n            <option>สัมภาษณ์ผ่านแล้ว</option>\r\n            <option>ยังไม่ได้ยื่น</option>\r\n            <option>ยื่นแล้ว รอสัมภาษณ์</option>\r\n            <option>สัมภาษณ์แล้ว รอผล</option>\r\n            <option>สัมภาษณ์ไม่ผ่าน ยื่นเพิ่มแล้ว</option>\r\n          </select>\r\n        </div>\r\n      </div>\r\n    </section>\r\n\r\n    <!-- Section: ข้อมูลบริษัท ที่เข้าฝึกงาน -->\r\n    <section class=\"card\">\r\n      <div class=\"card-header\">\r\n        <span class=\"material-icons header-icon\">how_to_reg</span>\r\n        <h2 class=\"card-title\">ข้อมูลบริษัท ที่เข้าฝึกงาน</h2>\r\n      </div>\r\n      <div class=\"card-body\">\r\n        <div class=\"form-grid\">\r\n          <div class=\"form-group\">\r\n            <label class=\"form-label\">ตำแหน่งที่ฝึก</label>\r\n            <input type=\"text\" class=\"input-field\" value=\"Software Developer\">\r\n          </div>\r\n          <div class=\"form-group\">\r\n            <label class=\"form-label\">ชื่อแหล่งฝึกงาน (ภาษาไทย)</label>\r\n            <input type=\"text\" class=\"input-field\" placeholder=\"...\">\r\n          </div>\r\n          <div class=\"form-group\">\r\n            <label class=\"form-label\">ชื่อบุคคลที่ให้ทำหนังสือขอความอนุเคราะห์</label>\r\n            <input type=\"text\" class=\"input-field\" placeholder=\"...\">\r\n          </div>\r\n          <div class=\"form-group\">\r\n            <label class=\"form-label\">ตำแหน่งบุคคลที่ให้ทำหนังสือขอความอนุเคราะห์</label>\r\n            <input type=\"text\" class=\"input-field\" placeholder=\"...\">\r\n          </div>\r\n          <div class=\"form-group\">\r\n            <label class=\"form-label\">ที่อยู่บริษัท</label>\r\n            <input type=\"text\" class=\"input-field\" placeholder=\"...\">\r\n          </div>\r\n          <div class=\"form-group\">\r\n            <label class=\"form-label\">เบอร์โทรติดต่อสถานประกอบการ / แหล่งฝึก</label>\r\n            <input type=\"text\" class=\"input-field\" value=\"098-xxx-xxxx\">\r\n          </div>\r\n          <div class=\"form-group\">\r\n            <label class=\"form-label\">เบอร์โทรติดต่อสถานประกอบการ / แหล่งฝึก</label>\r\n            <select class=\"input-field\">\r\n              <option>044-xxx-xxx</option>\r\n            </select>\r\n          </div>\r\n          <div class=\"form-group\">\r\n            <label class=\"form-label\">Email สถานประกอบการ / แหล่งฝึก</label>\r\n            <input type=\"email\" class=\"input-field\" value=\"...@gmail.com\">\r\n          </div>\r\n          <div class=\"form-group\">\r\n            <label class=\"form-label\">จังหวัด</label>\r\n            <input type=\"text\" class=\"input-field\" placeholder=\"...\">\r\n          </div>\r\n        </div>\r\n\r\n        <div class=\"btn-submit-wrap\">\r\n          <button class=\"btn btn-primary btn-lg\">ยืนยันและบันทึกข้อมูล</button>\r\n        </div>\r\n      </div>\r\n    </section>\r\n\r\n  </main>";

export default function SubmissionStatusPage() {
  return (
    <PageShell
      pageKey="submission_status"
      title={PAGE_TITLE}
      styles={PAGE_STYLES}
      scripts={PAGE_SCRIPTS}
      bodyHtml={PAGE_BODY_HTML}
    />
  );
}
