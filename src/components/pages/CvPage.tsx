"use client";

import React from "react";
import PageShell from "./PageShell";

const PAGE_TITLE = "Dashboard - นิสิต";
const PAGE_STYLES: string[] = [];
const PAGE_SCRIPTS: string[] = [
  "../components/header.js"
];
const PAGE_BODY_HTML = "<!-- Header Bar -->\r\n  <div id=\"header-placeholder\"></div>\r\n\r\n  <!-- Main Content -->\r\n  <main class=\"main-content\">\r\n\r\n    <!-- Student Info Section -->\r\n    <section class=\"student-info-section\">\r\n      <div class=\"card-header\">\r\n        <span class=\"material-icons header-icon\">how_to_reg</span>\r\n        <h2 class=\"card-title\">ข้อมูลและสถานะของนิสิต</h2>\r\n      </div>\r\n      <div class=\"student-info-body\">\r\n      </div>\r\n    </section>\r\n\r\n  </main>";

export default function CvPage() {
  return (
    <PageShell
      pageKey="CV"
      title={PAGE_TITLE}
      styles={PAGE_STYLES}
      scripts={PAGE_SCRIPTS}
      bodyHtml={PAGE_BODY_HTML}
    />
  );
}
