"use client";

import React from "react";
import PageShell from "./PageShell";
import FloatingNotification from "../FloatingNotification";

const PAGE_TITLE = "Super Admin (พี่จอม) & อาจารย์ประจำวิชา - คณะ ICT ม.พะเยา";
const PAGE_STYLES: string[] = [`
  #admin-dashboard {
    --admin-ink: #0F172A;
    --admin-muted: #64748B;
    --admin-border: #E2E8F0;
    --admin-primary: #3730A3;
    width: 100%;
    min-height: calc(100vh - 70px);
    background: #F4F6FB;
    color: var(--admin-ink);
    font-size: 16px;
    line-height: 1.6;
  }

  #admin-dashboard .admin-layout {
    display: grid;
    width: 100%;
    grid-template-columns: 280px minmax(0, 1fr);
    min-height: calc(100vh - 70px);
    margin: 0;
  }

  #admin-dashboard .admin-layout.no-sidebar {
    grid-template-columns: 1fr !important;
  }

  #admin-dashboard .admin-layout.no-sidebar .admin-sidebar {
    display: none !important;
  }

  #admin-dashboard .admin-sidebar {
    position: sticky;
    top: 70px;
    display: flex;
    width: 280px;
    height: calc(125vh - 70px);
    min-height: 540px;
    flex-direction: column;
    overflow-y: auto;
    border-right: 1px solid var(--admin-border);
    background: #FFFFFF;
    box-sizing: border-box;
  }

  #admin-dashboard .admin-brand {
    display: flex;
    min-height: 76px;
    align-items: center;
    gap: 12px;
    padding: 14px 22px;
    border-bottom: 1px solid var(--admin-border);
  }

  #admin-dashboard .admin-brand-mark {
    display: grid;
    width: 40px;
    height: 40px;
    flex: 0 0 auto;
    place-items: center;
    border-radius: 10px;
    background: var(--admin-primary);
    color: #FFFFFF;
    font-size: 13px;
    font-weight: 800;
  }

  #admin-dashboard .admin-brand-title {
    overflow: hidden;
    color: var(--admin-ink);
    font-size: 18px;
    font-weight: 700;
    line-height: 1.4;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  #admin-dashboard .admin-brand-subtitle {
    margin-top: 2px;
    color: var(--admin-muted);
    font-size: 15px;
  }

  #admin-dashboard .admin-nav-label {
    padding: 22px 26px 10px;
    color: #94A3B8;
    font-size: 14px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  #admin-dashboard .admin-workspace-nav {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 0 14px 18px;
  }

  #admin-dashboard .admin-workspace-nav button {
    display: flex !important;
    width: 100%;
    min-height: 50px;
    align-items: center;
    justify-content: flex-start;
    gap: 12px !important;
    padding: 11px 13px !important;
    border: 1px solid transparent !important;
    border-radius: 8px !important;
    background: transparent !important;
    color: #64748B !important;
    cursor: pointer;
    font-family: inherit;
    font-size: 16px !important;
    font-weight: 500 !important;
    text-align: left;
    transition: background 0.15s ease, color 0.15s ease;
  }

  #admin-dashboard .admin-workspace-nav button:hover {
    background: #F8FAFC !important;
    color: var(--admin-ink) !important;
  }

  #admin-dashboard .admin-workspace-nav button[aria-current="page"] {
    border-left: 3px solid var(--admin-primary) !important;
    background: #EEF2FF !important;
    color: var(--admin-primary) !important;
    font-weight: 700 !important;
  }

  #admin-dashboard .admin-workspace-nav button > .material-icons {
    flex: 0 0 auto;
    font-size: 21px !important;
  }

  #admin-dashboard .admin-workspace-nav button > span:nth-child(2) {
    flex: 1;
  }

  #admin-dashboard .admin-nav-badge {
    flex: 0 0 auto;
    margin-left: auto;
    padding: 3px 8px;
    border: 1px solid var(--admin-border);
    border-radius: 6px;
    background: #F1F5F9;
    color: #475569;
    font-size: 13px;
    font-weight: 700;
    white-space: nowrap;
  }

  #admin-dashboard #badge-pending-companies,
  #admin-dashboard #badge-doc-queue {
    border-color: #FDE68A;
    background: #FEF3C7;
    color: #B45309;
  }

  #admin-dashboard .admin-sidebar-note {
    margin: auto 16px 16px;
    padding: 15px;
    border: 1px solid var(--admin-border);
    border-radius: 10px;
    background: #F8FAFC;
    color: var(--admin-muted);
    font-size: 15px;
    line-height: 1.6;
  }

  #admin-dashboard .admin-sidebar-note strong {
    display: block;
    margin-bottom: 3px;
    color: var(--admin-primary);
    font-size: 15px;
  }

  #admin-dashboard .admin-main {
    display: block;
    width: 100%;
    max-width: none !important;
    min-width: 0;
    margin: 0 !important;
    padding: 32px clamp(22px, 3vw, 44px) 52px;
    box-sizing: border-box;
  }

  #admin-dashboard .admin-role-button {
    display: inline-flex;
    min-height: 44px;
    flex: 0 0 auto;
    align-items: center;
    justify-content: center;
    gap: 7px;
    padding: 9px 15px;
    border: 1px solid var(--admin-border);
    border-radius: 9px;
    background: #FFFFFF;
    color: #334155;
    cursor: pointer;
    font-family: inherit;
    font-size: 16px;
    font-weight: 600;
    transition: background 0.15s ease;
  }

  #admin-dashboard .admin-role-button:hover {
    background: #F8FAFC;
  }

  #admin-dashboard .admin-student-tabs {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px;
    margin-bottom: 20px;
    padding-bottom: 16px;
    border-bottom: 1px solid #E2E8F0;
  }

  #admin-dashboard .admin-student-tabs #btn-manage-staff-roles {
    margin-left: auto;
  }

  #admin-dashboard .admin-student-tabs .tab-pill {
    min-height: 44px;
    padding: 9px 14px !important;
    font-size: 15px !important;
  }

  #admin-dashboard .admin-student-tabs .tab-pill .material-icons {
    font-size: 20px !important;
  }

  #admin-dashboard .admin-student-tabs .tab-pill span[class*="text-["] {
    font-size: 13px !important;
  }

  #admin-dashboard .admin-main .card {
    margin-top: 0 !important;
    margin-bottom: 18px !important;
    border: 1px solid var(--admin-border) !important;
    border-radius: 12px !important;
    background: #FFFFFF !important;
    box-shadow: 0 2px 8px rgba(15, 23, 42, 0.035) !important;
  }

  #admin-dashboard .admin-main .card-header {
    min-height: 68px;
    padding: 18px 24px !important;
    border-bottom-color: rgba(255, 255, 255, 0.1) !important;
    background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 50%, #2563eb 100%) !important;
  }

  #admin-dashboard .admin-main .card-header .card-title,
  #admin-dashboard .admin-main .card-header p {
    color: #FFFFFF !important;
  }

  #admin-dashboard .admin-main .card-header .header-icon {
    background: rgba(255, 255, 255, 0.14);
    color: #FFFFFF !important;
  }

  #admin-dashboard .admin-main .card-header .card-title {
    font-size: 20px !important;
  }

  #admin-dashboard .admin-main .card-header .header-icon {
    padding: 6px;
    border-radius: 8px;
  }

  #admin-dashboard .admin-main .card-body {
    padding: 24px !important;
  }

  #admin-dashboard .admin-summary-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 18px;
    margin-bottom: 24px;
  }

  #admin-dashboard .admin-summary-card {
    min-width: 0;
    padding: 19px 21px 16px;
    border: 1px solid var(--admin-border);
    border-radius: 10px;
    background: #FFFFFF;
    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.025);
  }

  #admin-dashboard .admin-summary-label {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    color: var(--admin-muted);
    font-size: 15px;
    font-weight: 500;
  }

  #admin-dashboard .admin-summary-icon {
    font-size: 18px;
  }

  #admin-dashboard .admin-summary-value {
    margin-top: 8px;
    color: var(--admin-ink);
    font-size: 36px;
    font-weight: 700;
    line-height: 1.2;
    font-variant-numeric: tabular-nums;
  }

  #admin-dashboard .admin-summary-footnote {
    margin-top: 12px;
    padding-top: 10px;
    border-top: 1px solid #F1F5F9;
    color: #94A3B8;
    font-size: 14px;
    line-height: 1.5;
  }

  #admin-dashboard .admin-summary-error {
    margin: -8px 0 18px;
    padding: 10px 13px;
    border: 1px solid #FECACA;
    border-radius: 8px;
    background: #FEF2F2;
    color: #B91C1C;
    font-size: 15px;
    line-height: 1.5;
  }

  #admin-dashboard .admin-summary-card--primary .admin-summary-icon {
    color: #4F46E5;
  }

  #admin-dashboard .admin-summary-card--success .admin-summary-icon {
    color: #059669;
  }

  #admin-dashboard .admin-summary-card--warning .admin-summary-icon {
    color: #D97706;
  }

  #admin-dashboard .admin-summary-card--danger .admin-summary-icon {
    color: #E11D48;
  }

  #admin-dashboard .admin-student-table-scroll {
    overflow-x: auto;
    border: 1px solid #F1F5F9;
    border-radius: 8px;
  }

  #admin-dashboard .admin-student-table {
    min-width: 980px;
    font-size: 16px;
  }

  #admin-dashboard .admin-student-table thead th {
    background: #F8FAFC !important;
    color: #64748B !important;
    font-size: 15px;
    font-weight: 600 !important;
    white-space: nowrap;
    border-bottom: 1px solid var(--admin-border) !important;
  }

  #admin-dashboard .admin-student-table tbody td {
    font-size: 16px;
    padding: 16px 14px !important;
    border-bottom-color: #F1F5F9 !important;
  }

  #admin-dashboard .admin-student-table tbody td .text-xs {
    font-size: 14px !important;
  }

  #admin-dashboard .admin-student-table tbody td [class*="text-[11px]"] {
    font-size: 14px !important;
    line-height: 1.45;
  }

  #admin-dashboard .admin-student-table tbody tr:hover {
    background: #F8FAFC !important;
  }

  #admin-dashboard .admin-main .input-field {
    min-height: 46px;
    border-radius: 8px !important;
    border-color: #CBD5E1 !important;
    background-color: #FFFFFF;
    font-size: 16px !important;
  }

  #admin-dashboard .admin-main .filter-bar {
    gap: 10px !important;
  }

  #admin-dashboard .admin-main #active-action-buttons,
  #admin-dashboard .admin-main #dropped-action-buttons {
    gap: 9px !important;
  }

  #admin-dashboard .admin-main #active-action-buttons > button,
  #admin-dashboard .admin-main #dropped-action-buttons > button {
    min-height: 44px;
    padding: 9px 15px !important;
    border-radius: 8px !important;
    font-size: 14px !important;
  }

  #admin-dashboard .admin-main .data-table th {
    font-size: 15px;
  }

  #admin-dashboard .admin-main .data-table td {
    font-size: 16px;
    padding-top: 15px;
    padding-bottom: 15px;
  }

  #admin-dashboard :is(#workspace-unlock, #workspace-events, #workspace-companies, #workspace-documents, #workspace-coop) {
    font-size: 16px;
    line-height: 1.6;
  }

  #admin-dashboard :is(#workspace-unlock, #workspace-events, #workspace-companies, #workspace-documents, #workspace-coop) .card-title {
    font-size: 20px !important;
  }

  #admin-dashboard :is(#workspace-unlock, #workspace-events, #workspace-companies, #workspace-documents, #workspace-coop) .data-table th {
    font-size: 15px !important;
  }

  #admin-dashboard :is(#workspace-unlock, #workspace-events, #workspace-companies, #workspace-documents, #workspace-coop) .data-table td {
    font-size: 16px !important;
    line-height: 1.55;
  }

  #admin-dashboard :is(#workspace-unlock, #workspace-events, #workspace-companies, #workspace-documents, #workspace-coop) .input-field {
    font-size: 16px !important;
  }

  #admin-dashboard :is(#workspace-unlock, #workspace-events, #workspace-companies, #workspace-documents, #workspace-coop) button {
    font-size: 15px !important;
  }

  #admin-dashboard :is(#workspace-unlock, #workspace-events, #workspace-companies, #workspace-documents, #workspace-coop)
    :is(.text-xs, .text-sm, [class*="text-[10px]"], [class*="text-[11px]"], [class*="text-[12px]"]) {
    font-size: 14px !important;
    line-height: 1.5;
  }

  #admin-dashboard :is(#workspace-unlock, #workspace-events, #workspace-companies, #workspace-documents, #workspace-coop)
    :is(
      [style*="font-size:10px"]:not(.material-icons),
      [style*="font-size:11px"]:not(.material-icons),
      [style*="font-size:11.5px"]:not(.material-icons),
      [style*="font-size:12px"]:not(.material-icons),
      [style*="font-size:12.5px"]:not(.material-icons),
      [style*="font-size:13px"]:not(.material-icons),
      [style*="font-size:13.5px"]:not(.material-icons),
      [style*="font-size:14px"]:not(.material-icons)
    ) {
    font-size: 15px !important;
    line-height: 1.5;
  }

  @media (max-width: 1000px) {
    #admin-dashboard .admin-layout {
      grid-template-columns: 250px minmax(0, 1fr);
    }

    #admin-dashboard .admin-summary-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    #admin-dashboard .admin-sidebar {
      width: 250px;
    }

    #admin-dashboard .admin-sidebar-note {
      margin-right: 12px;
      margin-left: 12px;
      padding: 10px;
    }
  }

  @media (max-width: 760px) {
    #admin-dashboard .admin-layout {
      display: block;
      min-height: 0;
    }

    #admin-dashboard .admin-sidebar {
      position: static;
      width: 100%;
      height: auto;
      min-height: 0;
      overflow: visible;
      border-right: 0;
      border-bottom: 1px solid var(--admin-border);
    }

    #admin-dashboard .admin-brand {
      min-height: 62px;
      padding: 8px 16px;
    }

    #admin-dashboard .admin-brand-mark {
      width: 36px;
      height: 36px;
    }

    #admin-dashboard .admin-nav-label,
    #admin-dashboard .admin-sidebar-note {
      display: none;
    }

    #admin-dashboard .admin-workspace-nav {
      flex-direction: row;
      overflow-x: auto;
      padding: 8px 12px;
      scrollbar-width: thin;
    }

    #admin-dashboard .admin-workspace-nav button {
      width: auto;
      min-width: max-content;
      min-height: 46px;
    }

    #admin-dashboard .admin-main {
      padding: 20px 14px 32px;
    }
  }

  @media (max-width: 520px) {
    #admin-dashboard .admin-summary-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
    }

    #admin-dashboard .admin-summary-card {
      padding: 14px;
    }

    #admin-dashboard .admin-summary-value {
      font-size: 26px;
    }

    #admin-dashboard .admin-role-button {
      width: 100%;
    }

    #admin-dashboard .admin-student-tabs #btn-manage-staff-roles {
      width: auto;
      margin-left: auto;
    }

    #admin-dashboard .admin-main .card-header {
      padding: 15px 16px !important;
    }

    #admin-dashboard .admin-main .card-body {
      padding: 18px !important;
    }

    #admin-dashboard .admin-main .card-body {
      padding: 15px !important;
    }
  }
  .status-option {
    padding: 6px 12px;
    font-size: 13px;
    font-weight: 400;
    color: #1E1B4B;
    border-radius: 4px;
    cursor: pointer;
    transition: background-color 0.1s ease, color 0.1s ease;
    white-space: nowrap;
    line-height: 1.4;
  }
  .status-option:hover {
    background-color: #F1F5F9;
  }
  .status-option.selected {
    background-color: #2563EB !important;
    color: #FFFFFF !important;
    font-weight: 400 !important;
  }
`];
const PAGE_SCRIPTS: string[] = [
  "../components/header.js",
  "../api/admin_dashboard.js"
];
const PAGE_BODY_HTML = `
  <div id="header-placeholder"></div>
  <div id="admin-dashboard">
    <div class="admin-layout" id="admin-layout">
      <aside class="admin-sidebar" id="admin-sidebar" aria-label="เมนูผู้ดูแลระบบ">
        <div class="admin-brand">
          <div class="admin-brand-mark" aria-hidden="true">ICT</div>
          <div>
            <div class="admin-brand-title">ระบบเตรียมฝึกงาน</div>
            <div class="admin-brand-subtitle">Super Admin · ICT UP</div>
          </div>
        </div>
        <div class="admin-nav-label">เมนูจัดการ</div>
        <nav class="admin-workspace-nav" aria-label="ส่วนงานผู้ดูแล">
          <button type="button" id="ws-tab-overview" aria-current="page" onclick="switchAdminWorkspace('overview')">
            <span class="material-icons" aria-hidden="true">grid_view</span>
            <span>ภาพรวม &amp; รายชื่อนิสิต</span>
          </button>
          <button type="button" id="ws-tab-unlock" aria-current="false" onclick="switchAdminWorkspace('unlock')">
            <span class="material-icons" aria-hidden="true">lock_open</span>
            <span>รอบฝึกงาน &amp; ปลดล็อก</span>
            <span id="badge-unlocked-majors" class="admin-nav-badge">4/8 เปิด</span>
          </button>
          <button type="button" id="ws-tab-events" aria-current="false" onclick="switchAdminWorkspace('events')">
            <span class="material-icons" aria-hidden="true">event_available</span>
            <span>กิจกรรมอบรม &amp; Check-in</span>
            <span id="badge-events-count" class="admin-nav-badge">2 กิจกรรม</span>
          </button>
          <button type="button" id="ws-tab-checklist" aria-current="false" onclick="switchAdminWorkspace('checklist')">
            <span class="material-icons" aria-hidden="true">fact_check</span>
            <span>ตั้งค่า Checklist บริษัท</span>
            <span id="badge-checklist-version" class="admin-nav-badge">v1.0</span>
          </button>
          <button type="button" id="ws-tab-companies" aria-current="false" onclick="switchAdminWorkspace('companies')">
            <span class="material-icons" aria-hidden="true">business</span>
            <span>ฐานข้อมูลบริษัท</span>
            <span id="badge-pending-companies" class="admin-nav-badge">0 รอยืนยัน</span>
          </button>
          <button type="button" id="ws-tab-documents" aria-current="false" onclick="switchAdminWorkspace('documents')">
            <span class="material-icons" aria-hidden="true">description</span>
            <span>ออกหนังสือ &amp; ใบตอบรับ</span>
            <span id="badge-doc-queue" class="admin-nav-badge">0 รายการ</span>
          </button>
          <button type="button" id="ws-tab-coop" aria-current="false" onclick="switchAdminWorkspace('coop')">
            <span class="material-icons" aria-hidden="true">cloud_upload</span>
            <span>ส่งต่อระบบ Co-op</span>
          </button>
          
        </nav>
        <div class="admin-sidebar-note">
          <strong>ศูนย์กลางคณะ ICT</strong>
          จัดการข้อมูลการฝึกงานและสหกิจศึกษาครบทั้ง 8 สาขาวิชา
        </div>
      </aside>
      <main class="main-content admin-main">
    <!-- =====================================================================
         WORKSPACE 1: ภาพรวม & รายชื่อนิสิต (Overview, REG Import & Student Management)
         ===================================================================== -->
    <div id="workspace-overview">
      <section class="admin-summary-grid" aria-label="สรุปภาพรวมนิสิต">
        <article class="admin-summary-card admin-summary-card--primary">
          <div class="admin-summary-label">
            <span>นิสิตทั้งหมด</span>
            <span class="material-icons admin-summary-icon" aria-hidden="true">school</span>
          </div>
          <div class="admin-summary-value" id="kpi-total-students">—</div>
          <div class="admin-summary-footnote">นิสิตที่กำลังศึกษาและฝึกงาน</div>
        </article>
        <article class="admin-summary-card admin-summary-card--success">
          <div class="admin-summary-label">
            <span>อนุมัติที่ฝึกงานแล้ว</span>
            <span class="material-icons admin-summary-icon" aria-hidden="true">task_alt</span>
          </div>
          <div class="admin-summary-value" id="kpi-placement-approved">—</div>
          <div class="admin-summary-footnote">นิสิตที่ผ่านการอนุมัติสถานที่ฝึกงาน</div>
        </article>
        <article class="admin-summary-card admin-summary-card--warning">
          <div class="admin-summary-label">
            <span>รอพิจารณาสถานที่</span>
            <span class="material-icons admin-summary-icon" aria-hidden="true">schedule</span>
          </div>
          <div class="admin-summary-value" id="kpi-placement-pending">—</div>
          <div class="admin-summary-footnote">รายการที่รออาจารย์ตรวจสอบ</div>
        </article>
        <article class="admin-summary-card admin-summary-card--danger">
          <div class="admin-summary-label">
            <span>ยังไม่มีอาจารย์ที่ปรึกษา</span>
            <span class="material-icons admin-summary-icon" aria-hidden="true">person_off</span>
          </div>
          <div class="admin-summary-value" id="kpi-students-without-advisor">—</div>
          <div class="admin-summary-footnote">นิสิตที่ยังไม่ได้รับมอบหมายอาจารย์</div>
        </article>
      </section>
      <p id="admin-summary-error" class="admin-summary-error" role="status" hidden></p>

      <!-- Student registry -->
      <section class="card">
        <div class="card-header" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
          <div style="display:flex; align-items:center; gap:8px;">
            <span class="material-icons header-icon">people</span>
            <h2 class="card-title">รายชื่อนิสิตและสถานะการฝึกงาน</h2>
            <span id="active-filter-badge" style="display:none; background:#FEF3C7; color:#B45309; font-size:12px; padding:2px 10px; border-radius:999px; font-weight:600;"></span>
          </div>
          <div id="active-action-buttons" style="display:flex; gap:6px; flex-wrap:wrap;">
            <button id="btn-import-student" class="btn btn-sm" onclick="openImportModal()" style="background:#10B981; color:white; border:1px solid #10B981; font-size:12px; padding:7px 13px; border-radius:8px; cursor:pointer; display:inline-flex; align-items:center; gap:4px; font-weight:600;">
              <span class="material-icons" style="font-size:15px;">upload_file</span> นำเข้ารายชื่อ (Excel)
            </button>
            <button id="btn-set-advisor" class="btn btn-sm" onclick="openSetAdvisorModal()" style="background:#FFFFFF; color:#1E40AF; border:1px solid #BFDBFE; font-size:12px; padding:7px 12px; border-radius:8px; cursor:pointer; display:inline-flex; align-items:center; gap:4px; font-weight:600;">
              <span class="material-icons" style="font-size:15px;">person_add</span> ตั้งอาจารย์ที่ปรึกษา
            </button>
            <button id="btn-set-status" class="btn btn-sm" onclick="openSetStatusModal()" style="background:#FFFFFF; color:#334155; border:1px solid #CBD5E1; font-size:12px; padding:7px 12px; border-radius:8px; cursor:pointer; display:inline-flex; align-items:center; gap:4px;">
              <span class="material-icons" style="font-size:15px;">edit_note</span> ตั้งสถานะนิสิต
            </button>
            <button id="btn-set-supervisor" class="btn btn-sm" onclick="openSetSupervisorModal()" style="background:#FFFFFF; color:#334155; border:1px solid #CBD5E1; font-size:12px; padding:7px 12px; border-radius:8px; cursor:pointer; display:inline-flex; align-items:center; gap:4px;">
              <span class="material-icons" style="font-size:14px;">explore</span> ตั้งอาจารย์นิเทศก์
            </button>
            <button id="btn-drop-student" class="btn btn-sm" onclick="openDropStudentModal()" style="background:#FFFFFF; color:#BE123C; border:1px solid #FDA4AF; font-size:12px; padding:7px 12px; border-radius:8px; cursor:pointer; display:inline-flex; align-items:center; gap:4px;">
              <span class="material-icons" style="font-size:14px;">person_remove</span> ดรอปนิสิต
            </button>
            <button id="btn-export-student" class="btn btn-sm" onclick="exportStudents()" style="background:#FFFFFF; color:#334155; border:1px solid #CBD5E1; font-size:12px; padding:7px 12px; border-radius:8px; cursor:pointer;">
              ส่งออกข้อมูล
            </button>
          </div>
          <div id="dropped-action-buttons" style="display:none; gap:8px; flex-wrap:wrap;">
            <button id="btn-restore-student" class="btn btn-sm" onclick="openRestoreStudentModal()" style="background:#047857; color:white; border:1px solid #047857; font-size:12px; padding:7px 14px; border-radius:8px; cursor:pointer; display:inline-flex; align-items:center; gap:4px;">
              <span class="material-icons" style="font-size:14px;">restore</span> กู้คืนสถานะนิสิต
            </button>
            <button class="btn btn-sm" onclick="exportStudents()" style="background:#FFFFFF; color:#334155; border:1px solid #CBD5E1; font-size:12px; padding:7px 14px; border-radius:8px; cursor:pointer;">
              ส่งออกรายชื่อ
            </button>
          </div>
        </div>
        <div class="card-body">

          <!-- Tab สลับมุมมอง: นิสิตปกติ vs นิสิตที่ดรอป -->
          <div class="admin-student-tabs">
            <button id="tab-active" onclick="switchStudentTab('active')" class="tab-pill px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 bg-white text-blue-700 shadow-sm cursor-pointer border border-blue-200">
              <span class="material-icons" style="font-size:16px;">check_circle</span>
              นิสิตกำลังศึกษา / ฝึกงาน
              <span id="tab-badge-active" class="px-2 py-0.5 text-[11px] rounded-full bg-blue-100 text-blue-800 font-bold">0</span>
            </button>
            <button id="tab-dropped" onclick="switchStudentTab('dropped')" class="tab-pill px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 text-gray-500 hover:text-gray-800 cursor-pointer border border-transparent bg-transparent">
              <span class="material-icons" style="font-size:16px;">remove_circle_outline</span>
              นิสิตที่ดรอป / ถอนรายวิชา
              <span id="tab-badge-dropped" class="px-2 py-0.5 text-[11px] rounded-full bg-red-100 text-red-700 font-bold">0</span>
            </button>
            <button id="btn-manage-staff-roles" class="admin-role-button" type="button" onclick="openStaffRolesModal()">
              <span class="material-icons" aria-hidden="true">manage_accounts</span>
              <span>จัดการสิทธิ์บุคลากร</span>
            </button>
          </div>

          <!-- Filter & Search Bar (รองรับ 8 สาขาวิชาของคณะ ICT) -->
          <div class="filter-bar" style="display:flex; flex-wrap:wrap; gap:10px; align-items:center; margin-bottom:16px;">
            <div style="position:relative; flex:1; min-width:190px; max-width:250px;">
              <span class="material-icons" style="position:absolute; left:10px; top:50%; transform:translateY(-50%); color:#94A3B8; font-size:18px;">search</span>
              <input type="text" class="input-field" id="student-search" placeholder="ค้นหารหัสนิสิต หรือ ชื่อ..." style="padding-left:34px !important; width:100%; font-size:13px;" />
            </div>

            <select id="major-filter" class="input-field" style="width:auto; min-width:170px; font-size:13px; padding:7px 12px; cursor:pointer;">
              <option value="ALL">ทุกสาขาวิชา (คณะ ICT)</option>
              <option value="วิศวกรรมซอฟต์แวร์">สาขาวิศวกรรมซอฟต์แวร์ (SE)</option>
              <option value="ธุรกิจดิจิทัล">สาขาธุรกิจดิจิทัล (DB)</option>
              <option value="วิทยาการคอมพิวเตอร์">สาขาวิทยาการคอมพิวเตอร์ (CS)</option>
              <option value="เทคโนโลยีสารสนเทศ">สาขาเทคโนโลยีสารสนเทศ (IT)</option>
              <option value="วิศวกรรมคอมพิวเตอร์">สาขาวิศวกรรมคอมพิวเตอร์ (CPE)</option>
              <option value="คอมพิวเตอร์กราฟิกและมัลติมีเดีย">สาขาคอมพิวเตอร์กราฟิกฯ (CGM)</option>
              <option value="ภูมิสารสนเทศศาสตร์">สาขาภูมิสารสนเทศศาสตร์ (GIS)</option>
              <option value="วิทยาการข้อมูลและการประยุกต์">สาขาวิทยาการข้อมูลฯ (DSA)</option>
            </select>

            <select id="year-filter" class="input-field" style="width:auto; min-width:115px; font-size:13px; padding:7px 12px; cursor:pointer;">
              <option value="">ทุกชั้นปี</option>
            </select>

            <!-- Custom Status Filter Dropdown (กางลงด้านล่างเสมอ ขนาด/ฟอนต์ตรงตามมาตรฐานภาพที่ 2) -->
            <div id="status-dropdown-container" style="position:relative; display:inline-block; width:195px; min-width:195px;">
              <input type="hidden" id="status-filter" value="" data-label="ทุกสถานะ" />
              <button type="button" id="status-filter-btn" onclick="window.toggleStatusDropdown ? window.toggleStatusDropdown() : (function(){ var m=document.getElementById('status-dropdown-menu'); if(m) m.style.display=m.style.display==='none'||!m.style.display?'block':'none'; })()" class="input-field" style="width:100%; min-width:195px; height:auto; min-height:36px; display:inline-flex; align-items:center; justify-content:space-between; gap:6px; font-size:13px; font-weight:400; color:#1E1B4B; padding:7px 12px; cursor:pointer; background:#FFFFFF; border:1px solid #CBD5E1; border-radius:8px; box-sizing:border-box;">
                <span id="status-filter-label" style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-weight:400;">ทุกสถานะ</span>
                <span id="status-arrow-icon" class="material-icons" style="font-size:18px; color:#64748B; pointer-events:none;">keyboard_arrow_down</span>
              </button>
              <div id="status-dropdown-menu" style="display:none; position:absolute; top:calc(100% + 4px); left:0; width:100%; min-width:195px; box-sizing:border-box; z-index:1050; background:#FFFFFF; border:1px solid #CBD5E1; border-radius:8px; box-shadow:0 8px 24px -4px rgba(15,23,42,0.12), 0 2px 6px -1px rgba(15,23,42,0.06); padding:4px 0; max-height:260px; overflow-y:auto;">
                <div class="status-option selected" data-val="" onclick="window.selectStatusFilter('', 'ทุกสถานะ')">ทุกสถานะ</div>
                <div class="status-option" data-val="training_passed" onclick="window.selectStatusFilter('training_passed', '✓ ผ่านการตรวจชม.ครบ')">✓ ผ่านการตรวจชม.ครบ</div>
                <div class="status-option" data-val="training_not_checked" onclick="window.selectStatusFilter('training_not_checked', '⏳ ชม.ครบ ยังไม่ตรวจ')">⏳ ชม.ครบ ยังไม่ตรวจ</div>
                <div class="status-option" data-val="training_failed" onclick="window.selectStatusFilter('training_failed', '✗ ตรวจแล้ว ยังไม่ผ่าน')">✗ ตรวจแล้ว ยังไม่ผ่าน</div>
                <div class="status-option" data-val="training_incomplete" onclick="window.selectStatusFilter('training_incomplete', '⏳ ชั่วโมงยังไม่ครบ')">⏳ ชั่วโมงยังไม่ครบ</div>
                <div class="status-option" data-val="cv_approved" onclick="window.selectStatusFilter('cv_approved', '✓ ตรวจ CV ผ่าน')">✓ ตรวจ CV ผ่าน</div>
                <div class="status-option" data-val="cv_pending" onclick="window.selectStatusFilter('cv_pending', '⏳ ยังไม่ได้รีวิว CV')">⏳ ยังไม่ได้รีวิว CV</div>
                <div class="status-option" data-val="cv_rejected" onclick="window.selectStatusFilter('cv_rejected', '✗ ไม่ผ่าน CV')">✗ ไม่ผ่าน CV</div>
                <div class="status-option" data-val="cv_none" onclick="window.selectStatusFilter('cv_none', '— ยังไม่ทำ CV')">— ยังไม่ทำ CV</div>
                <div class="status-option" data-val="checklist_approved" onclick="window.selectStatusFilter('checklist_approved', '✓ Checklist ผ่าน')">✓ Checklist ผ่าน</div>
                <div class="status-option" data-val="checklist_pending" onclick="window.selectStatusFilter('checklist_pending', '⏳ รอตรวจ Checklist')">⏳ รอตรวจ Checklist</div>
                <div class="status-option" data-val="interview_passed" onclick="window.selectStatusFilter('interview_passed', '✓ สัมภาษณ์ผ่านแล้ว')">✓ สัมภาษณ์ผ่านแล้ว</div>
                <div class="status-option" data-val="placement_approved" onclick="window.selectStatusFilter('placement_approved', '✓ อนุมัติที่ฝึกงานแล้ว')">✓ อนุมัติที่ฝึกงานแล้ว</div>
                <div class="status-option" data-val="placement_pending" onclick="window.selectStatusFilter('placement_pending', '⏳ รออนุมัติที่ฝึกงาน')">⏳ รออนุมัติที่ฝึกงาน</div>
                <div class="status-option" data-val="placement_rejected" onclick="window.selectStatusFilter('placement_rejected', '✗ ไม่อนุมัติที่ฝึกงาน')">✗ ไม่อนุมัติที่ฝึกงาน</div>
              </div>
            </div>

            <select id="advisor-filter" class="input-field" style="width:auto; min-width:145px; font-size:13px; padding:7px 12px; cursor:pointer;">
              <option value="">ทุกอาจารย์ที่ปรึกษา</option>
            </select>

            <select id="skill-filter" class="input-field" style="width:auto; min-width:155px; font-size:13px; padding:7px 12px; cursor:pointer;">
              <option value="">ทุกสถานะชั่วโมง</option>
              <option value="pass_all">✓ ผ่านเกณฑ์ครบ (Soft+Hard)</option>
              <option value="lack_soft">⚠️ ขาด Soft Skill (&lt; 12 ชม.)</option>
              <option value="lack_hard">⚠️ ขาด Hard Skill (&lt; 18 ชม.)</option>
              <option value="lack_both">⚠️ ขาดทั้ง Soft &amp; Hard</option>
            </select>

            <button id="btn-clear-filter" onclick="clearAllFilters()" style="display:none; background:#EF4444; color:white; border:none; font-size:12px; padding:7px 12px; border-radius:10px; cursor:pointer; align-items:center; gap:4px; font-weight:600;">
              <span class="material-icons" style="font-size:14px;">close</span> ล้างตัวกรอง
            </button>
          </div>

          <div class="admin-student-table-scroll">
            <table class="data-table admin-student-table">
              <thead id="students-thead">
                <tr>
                  <th style="width: 14%;">รหัสนิสิต</th>
                  <th style="width: 22%;">ชื่อ-นามสกุล</th>
                  <th style="width: 20%;">อาจารย์ที่ปรึกษา</th>
                  <th style="width: 34%;">สถานะความพร้อม &amp; การตรวจสอบ</th>
                  <th style="width: 10%; min-width: 90px;" class="text-center">
                    <label style="display:inline-flex;align-items:center;gap:4px;cursor:pointer;white-space:nowrap;" title="เลือกนักศึกษาทั้งหมดในหน้านี้">
                      <span style="font-size:12px;">เลือกทั้งหมด</span>
                      <input type="checkbox" id="select-all-students" style="width:16px;height:16px;cursor:pointer;" />
                    </label>
                  </th>
                </tr>
              </thead>
              <tbody id="students-tbody">
                <tr><td colspan="5" class="text-center py-8 text-gray-400">กำลังโหลดข้อมูล...</td></tr>
              </tbody>
            </table>
          </div>

          <!-- Pagination -->
          <div class="flex justify-between items-center mt-4 text-xs text-gray-500">
            <span id="pagination-info">Showing 1-12 from 0 data</span>
            <div class="flex gap-1" id="pagination-controls"></div>
          </div>

        </div>
      </section>

      <!-- 3. รายชื่ออาจารย์ที่ปรึกษา + จำนวนนิสิต -->
      <div style="display:grid; grid-template-columns:1fr 320px; gap:24px;" class="max-md:!grid-cols-1">
        <section class="card" style="margin-bottom:0;">
          <div class="card-header">
            <span class="material-icons header-icon">supervisor_account</span>
            <h2 class="card-title">รายชื่ออาจารย์ที่ปรึกษาและภาระงานตรวจ Checklist</h2>
          </div>
          <div class="card-body">
            <table class="data-table">
              <thead>
                <tr>
                  <th>ชื่ออาจารย์ที่ปรึกษา</th>
                  <th>จำนวนที่ปรึกษา</th>
                  <th>ตรวจ Checklist แล้ว</th>
                  <th>ยังไม่ได้ตรวจ</th>
                </tr>
              </thead>
              <tbody id="advisor-tbody">
                <tr><td colspan="4" class="text-center py-4 text-gray-400">กำลังโหลด...</td></tr>
              </tbody>
            </table>
          </div>
        </section>

        <section class="card" style="margin-bottom:0;">
          <div class="card-header">
            <span class="material-icons header-icon">groups</span>
            <h2 class="card-title">สรุปจำนวนนิสิต</h2>
          </div>
          <div class="card-body">
            <table class="data-table">
              <thead>
                <tr><th>รายการ</th><th class="text-right">จำนวน</th></tr>
              </thead>
              <tbody>
                <tr><td>นิสิตทั้งหมด</td><td class="text-right font-bold" id="summary-total">0</td></tr>
                <tr><td>มีอาจารย์ที่ปรึกษาแล้ว</td><td class="text-right text-green-600 font-semibold" id="summary-with-advisor">0</td></tr>
                <tr><td>ยังไม่มีอาจารย์ที่ปรึกษา</td><td class="text-right text-red-500 font-semibold" id="summary-without-advisor">0</td></tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>

    <!-- =====================================================================
         WORKSPACE 2: จัดการรอบปีการศึกษา & ปลดล็อก (Unlock) ระบบยื่นฝึกงานตาม 8 สาขาวิชา
         ===================================================================== -->
    <div id="workspace-unlock" style="display:none;">
      <section class="card">
        <div class="card-header" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
          <div style="display:flex; align-items:center; gap:10px;">
            <span class="material-icons header-icon">calendar_month</span>
            <div>
              <h2 class="card-title" style="margin:0;">ตั้งค่าภาคการศึกษา/ปีการศึกษา และค่าเริ่มต้นเอกสารราชการ</h2>
              <p style="margin:2px 0 0 0; font-size:12px; color:#E0E7FF;">กำหนดปีการศึกษาปัจจุบันและเลขที่หนังสือ อว สำหรับใช้ในการออกหนังสือขอความอนุเคราะห์และหนังสือส่งตัว</p>
            </div>
          </div>
          <button type="button" onclick="saveAcademicConfig()" style="background:#10B981; color:white; border:none; padding:8px 16px; border-radius:10px; font-size:12.5px; font-weight:700; cursor:pointer; display:inline-flex; align-items:center; gap:6px;">
            <span class="material-icons" style="font-size:16px;">save</span> บันทึกการตั้งค่าระบบ
          </button>
        </div>
        <div class="card-body">
          <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:14px;">
            <div>
              <label style="font-size:12.5px; font-weight:700; color:#334155;">ปีการศึกษาปัจจุบัน (พ.ศ.)</label>
              <input type="text" id="cfg-academic-year" class="input-field" value="2568" style="margin-top:4px; font-weight:700;" />
            </div>
            <div>
              <label style="font-size:12.5px; font-weight:700; color:#334155;">ภาคการศึกษาปัจจุบัน</label>
              <select id="cfg-semester" class="input-field" style="margin-top:4px;">
                <option value="1">ภาคการศึกษาต้น (เทอม 1)</option>
                <option value="2">ภาคการศึกษาปลาย (เทอม 2)</option>
                <option value="3">ภาคฤดูร้อน (Summer)</option>
              </select>
            </div>
            <div>
              <label style="font-size:12.5px; font-weight:700; color:#334155;">เลขที่หนังสือราชการเริ่มต้น (อว)</label>
              <input type="text" id="cfg-doc-prefix" class="input-field" value="อว 7316/" style="margin-top:4px;" />
            </div>
            <div>
              <label style="font-size:12.5px; font-weight:700; color:#334155;">ชื่อผู้ลงนามหนังสือราชการ</label>
              <input type="text" id="cfg-dean-name" class="input-field" value="ผู้ช่วยศาสตราจารย์ ดร.พรเทพ โรจนวสุ" style="margin-top:4px;" />
            </div>
          </div>
        </div>
      </section>

      <section class="card">
        <div class="card-header" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
          <div style="display:flex; align-items:center; gap:10px;">
            <span class="material-icons header-icon">lock_open</span>
            <div>
              <h2 class="card-title" style="margin:0;">ปลดล็อก (Unlock) ระบบยื่นขอฝึกงานแยกตามหลักสูตร / 8 สาขาวิชา</h2>
              <p style="margin:2px 0 0 0; font-size:12px; color:#E0E7FF;">
                แก้ปัญหารอบการออกฝึกงานไม่พร้อมกัน (เช่น SE ออกฝึกงานเทอมถัดไปทันที ส่วน CS / CPE เรียนเตรียมความพร้อมปี 3 และออกฝึกงานจริงตอนปี 4)
              </p>
            </div>
          </div>
          <div style="display:flex; gap:8px;">
            <button type="button" onclick="bulkToggleMajors('UNLOCK_ALL')" style="background:#10B981; color:white; border:none; padding:7px 14px; border-radius:10px; font-size:12px; font-weight:700; cursor:pointer; display:inline-flex; align-items:center; gap:4px;">
              <span class="material-icons" style="font-size:15px;">lock_open</span> ปลดล็อกทั้ง 8 สาขา
            </button>
            <button type="button" onclick="bulkToggleMajors('LOCK_ALL')" style="background:red; color:white; border:1px solid rgba(255,255,255,0.3); padding:7px 14px; border-radius:10px; font-size:12px; font-weight:600; cursor:pointer; display:inline-flex; align-items:center; gap:4px;">
              <span class="material-icons" style="font-size:15px;">lock</span> ล็อกทั้งหมดชั่วคราว
            </button>
          </div>
        </div>
        <div class="card-body">
          <div style="margin-bottom:14px; padding:12px 16px; background:#EEF2FF; border:1px solid #C7D2FE; border-radius:12px; display:flex; align-items:center; gap:10px;">
            <span class="material-icons" style="color:#4338CA; font-size:20px;">info</span>
            <div style="font-size:12.5px; color:#1E1B4B;">
              <strong>หลักการทำงานของระบบ Unlock รายสาขา:</strong> สาขาที่สถานะเป็น <strong>🔒 ล็อก (Locked)</strong> นิสิตจะยังสามารถเข้าสะสมชั่วโมงอบรมและอัปโหลด CV ในวิชาเตรียมความพร้อมได้ตามปกติ แต่ระบบจะยังไม่เปิดให้กดยื่น Checklist ขอหนังสือไปสถานประกอบการจนกว่า Super Admin (พี่จอม) จะกด <strong>🔓 ปลดล็อก (Unlock)</strong> ตามรอบปีการศึกษาที่พร้อมออกฝึกงานจริง
            </div>
          </div>

          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th style="width:22%;">สาขาวิชา (คณะ ICT)</th>
                  <th style="width:20%;">โครงสร้างรอบเรียน / ออกฝึกงานจริง</th>
                  <th style="width:12%;">รอบเทอมที่ออกฝึก</th>
                  <th style="width:18%;">ช่วงเวลาเปิดยื่นบริษัท</th>
                  <th style="width:16%;">สถานะระบบยื่นฝึกงาน</th>
                  <th style="width:12%;" class="text-center">จัดการ</th>
                </tr>
              </thead>
              <tbody id="major-unlock-tbody">
                <tr><td colspan="6" class="text-center py-6 text-gray-400">กำลังโหลดข้อมูลสาขาวิชา...</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>

    <!-- =====================================================================
         WORKSPACE 3: จัดกิจกรรมอบรมภายในคณะ & ระบบ Check-in หน้างานด้วยรหัสนิสิต
         ===================================================================== -->
    <div id="workspace-events" style="display:none;">
      <div style="display:grid; grid-template-columns:390px 1fr; gap:20px;" class="max-lg:!grid-cols-1">
        <!-- ซ้าย: ฟอร์มสร้างกิจกรรมอบรมโดย พี่จอม (Super Admin) -->
        <section class="card" style="margin-bottom:0; overflow:visible !important;">
          <div class="card-header" style="border-top-left-radius:15px; border-top-right-radius:15px;">
            <span class="material-icons header-icon">add_task</span>
            <div>
              <h2 class="card-title" style="margin:0;">สร้างกิจกรรมอบรมภายในคณะ</h2>
              <p style="margin:2px 0 0 0; font-size:11.5px; color:#E0E7FF;">คำนวณชั่วโมงอัตโนมัติ (สูงสุดไม่เกิน 6 ชม./วัน)</p>
            </div>
          </div>
          <div class="card-body" style="overflow:visible !important;">
            <div style="display:flex; flex-direction:column; gap:12px;">
              <div>
                <label style="font-size:12.5px; font-weight:700; color:#334155;">ชื่อกิจกรรมอบรม / สัมมนา <span style="color:#EF4444;">*</span></label>
                <input type="text" id="evt-title" class="input-field" placeholder="เช่น อบรมเตรียมความพร้อม: การเขียน Resume &amp; บุคลิกภาพ" style="margin-top:4px;" />
              </div>

              <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                <div>
                  <label style="font-size:12.5px; font-weight:700; color:#334155;">ประเภทชั่วโมงทักษะ</label>
                  <select id="evt-skill-type" class="input-field" style="margin-top:4px;">
                    <option value="SOFT">Soft Skill (เกณฑ์ 12 ชม.)</option>
                    <option value="HARD">Hard Skill (เกณฑ์ 18 ชม.)</option>
                  </select>
                </div>
                <div>
                  <label style="font-size:12.5px; font-weight:700; color:#334155;">วันที่จัดกิจกรรม</label>
                  <input type="date" id="evt-date" class="input-field" style="margin-top:4px;" />
                </div>
              </div>

              <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                <div>
                  <label style="font-size:12.5px; font-weight:700; color:#334155;">เวลาเริ่ม</label>
                  <input type="time" id="evt-start-time" class="input-field" value="09:00" onchange="previewEventHours()" style="margin-top:4px;" />
                </div>
                <div>
                  <label style="font-size:12.5px; font-weight:700; color:#334155;">เวลาสิ้นสุด</label>
                  <input type="time" id="evt-end-time" class="input-field" value="16:00" onchange="previewEventHours()" style="margin-top:4px;" />
                </div>
              </div>

              <!-- กล่องแสดงผลการคำนวณชั่วโมงอัตโนมัติ (เพดานสูงสุด 6 ชม./วัน) -->
              <div style="padding:12px 14px; background:#ECFDF5; border:1px solid #A7F3D0; border-radius:12px; display:flex; align-items:center; justify-content:space-between;">
                <div>
                  <div style="font-size:12px; font-weight:700; color:#065F46;">ชั่วโมงที่ระบบคำนวณให้อัตโนมัติ:</div>
                  <div id="evt-hours-note" style="font-size:11px; color:#047857;">ระยะเวลาจริง 7 ชม. (จำกัดเพดานสูงสุดไม่เกิน 6 ชม./วัน)</div>
                </div>
                <div style="text-align:right;">
                  <span id="evt-credited-hours-badge" style="font-size:20px; font-weight:800; color:#059669;">6</span>
                  <span style="font-size:12px; font-weight:700; color:#065F46;"> ชม.</span>
                </div>
              </div>

              <div>
                <label style="font-size:12.5px; font-weight:700; color:#334155; display:flex; justify-content:space-between; align-items:center;">
                  <span>สาขาวิชาเป้าหมาย (เลือกได้หลายสาขา)</span>
                  <span id="evt-target-major-count" style="font-size:11px; font-weight:600; color:#4338CA;">(เลือก 8 สาขา)</span>
                </label>
                <input type="hidden" id="evt-target-major" value="ALL" />
                <div id="evt-major-dropdown-container" style="position:relative; margin-top:4px;">
                  <button type="button" id="evt-major-dropdown-btn" onclick="window.toggleMajorDropdown()" class="input-field" style="width:100%; display:flex; align-items:center; justify-content:space-between; cursor:pointer; background:#FFFFFF; text-align:left; font-weight:600; color:#1E1B4B; padding:8px 12px; border:1px solid #CBD5E1; border-radius:10px;">
                    <span id="evt-major-selected-label" style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:13px;">ทุกสาขาวิชา (ทั้งคณะ ICT)</span>
                    <span id="evt-major-arrow-icon" class="material-icons" style="font-size:18px; color:#64748B;">arrow_drop_down</span>
                  </button>
                  <div id="evt-major-dropdown-menu" style="display:none; position:absolute; top:calc(100% + 4px); left:0; right:0; z-index:1000; background:#FFFFFF; border:1px solid #CBD5E1; border-radius:12px; box-shadow:0 12px 28px -4px rgba(15,23,42,0.18), 0 4px 10px -2px rgba(15,23,42,0.08); padding:10px; max-height:290px; overflow-y:auto;">
                    <div style="display:flex; justify-content:space-between; align-items:center; padding:4px 6px 8px 6px; border-bottom:1px solid #E2E8F0; margin-bottom:6px;">
                      <label style="display:flex; align-items:center; gap:8px; cursor:pointer; font-weight:700; font-size:12.5px; color:#1E1B4B;">
                        <input type="checkbox" id="evt-major-all" onchange="window.toggleSelectAllMajors(this.checked)" checked style="width:16px; height:16px; accent-color:#4338CA; cursor:pointer;" />
                        <span>ทุกสาขาวิชา (ทั้งคณะ ICT)</span>
                      </label>
                      <button type="button" onclick="window.toggleMajorDropdown()" style="background:none; border:none; color:#64748B; font-size:11.5px; cursor:pointer; padding:2px 8px; border-radius:6px; font-weight:600; display:flex; align-items:center; gap:2px;" class="hover:bg-slate-200">
                        <span>ปิด</span>
                        <span class="material-icons" style="font-size:14px;">close</span>
                      </button>
                    </div>
                    <div id="evt-major-checkbox-list" style="display:flex; flex-direction:column; gap:2px;">
                      <label style="display:flex; align-items:center; gap:8px; padding:5px 8px; border-radius:8px; cursor:pointer; font-size:12.5px;" class="hover:bg-slate-100">
                        <input type="checkbox" class="evt-major-item" value="วิศวกรรมซอฟต์แวร์" onchange="window.updateSelectedMajors()" checked style="width:15px; height:15px; accent-color:#4338CA; cursor:pointer;" />
                        <span>สาขาวิศวกรรมซอฟต์แวร์ (SE)</span>
                      </label>
                      <label style="display:flex; align-items:center; gap:8px; padding:5px 8px; border-radius:8px; cursor:pointer; font-size:12.5px;" class="hover:bg-slate-100">
                        <input type="checkbox" class="evt-major-item" value="วิทยาการคอมพิวเตอร์" onchange="window.updateSelectedMajors()" checked style="width:15px; height:15px; accent-color:#4338CA; cursor:pointer;" />
                        <span>สาขาวิทยาการคอมพิวเตอร์ (CS)</span>
                      </label>
                      <label style="display:flex; align-items:center; gap:8px; padding:5px 8px; border-radius:8px; cursor:pointer; font-size:12.5px;" class="hover:bg-slate-100">
                        <input type="checkbox" class="evt-major-item" value="วิศวกรรมคอมพิวเตอร์" onchange="window.updateSelectedMajors()" checked style="width:15px; height:15px; accent-color:#4338CA; cursor:pointer;" />
                        <span>สาขาวิศวกรรมคอมพิวเตอร์ (CPE)</span>
                      </label>
                      <label style="display:flex; align-items:center; gap:8px; padding:5px 8px; border-radius:8px; cursor:pointer; font-size:12.5px;" class="hover:bg-slate-100">
                        <input type="checkbox" class="evt-major-item" value="เทคโนโลยีสารสนเทศ" onchange="window.updateSelectedMajors()" checked style="width:15px; height:15px; accent-color:#4338CA; cursor:pointer;" />
                        <span>สาขาเทคโนโลยีสารสนเทศ (IT)</span>
                      </label>
                      <label style="display:flex; align-items:center; gap:8px; padding:5px 8px; border-radius:8px; cursor:pointer; font-size:12.5px;" class="hover:bg-slate-100">
                        <input type="checkbox" class="evt-major-item" value="ธุรกิจดิจิทัล" onchange="window.updateSelectedMajors()" checked style="width:15px; height:15px; accent-color:#4338CA; cursor:pointer;" />
                        <span>สาขาธุรกิจดิจิทัล (DB)</span>
                      </label>
                      <label style="display:flex; align-items:center; gap:8px; padding:5px 8px; border-radius:8px; cursor:pointer; font-size:12.5px;" class="hover:bg-slate-100">
                        <input type="checkbox" class="evt-major-item" value="คอมพิวเตอร์กราฟิกและมัลติมีเดีย" onchange="window.updateSelectedMajors()" checked style="width:15px; height:15px; accent-color:#4338CA; cursor:pointer;" />
                        <span>สาขาคอมพิวเตอร์กราฟิกฯ (CGM)</span>
                      </label>
                      <label style="display:flex; align-items:center; gap:8px; padding:5px 8px; border-radius:8px; cursor:pointer; font-size:12.5px;" class="hover:bg-slate-100">
                        <input type="checkbox" class="evt-major-item" value="ภูมิสารสนเทศศาสตร์" onchange="window.updateSelectedMajors()" checked style="width:15px; height:15px; accent-color:#4338CA; cursor:pointer;" />
                        <span>สาขาภูมิสารสนเทศศาสตร์ (GIS)</span>
                      </label>
                      <label style="display:flex; align-items:center; gap:8px; padding:5px 8px; border-radius:8px; cursor:pointer; font-size:12.5px;" class="hover:bg-slate-100">
                        <input type="checkbox" class="evt-major-item" value="วิทยาการข้อมูลและการประยุกต์" onchange="window.updateSelectedMajors()" checked style="width:15px; height:15px; accent-color:#4338CA; cursor:pointer;" />
                        <span>สาขาวิทยาการข้อมูลฯ (DSA)</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label style="font-size:12.5px; font-weight:700; color:#334155; display:flex; justify-content:space-between; align-items:center;">
                  <span>ชั้นปีเป้าหมาย (เลือกได้หลายชั้นปี)</span>
                  <span id="evt-target-year-count" style="font-size:11px; font-weight:600; color:#4338CA;">(เลือกทุกชั้นปี)</span>
                </label>
                <input type="hidden" id="evt-target-year" value="ALL" />
                <div id="evt-year-dropdown-container" style="position:relative; margin-top:4px;">
                  <button type="button" id="evt-year-dropdown-btn" onclick="window.toggleYearDropdown()" class="input-field" style="width:100%; display:flex; align-items:center; justify-content:space-between; cursor:pointer; background:#FFFFFF; text-align:left; font-weight:600; color:#1E1B4B; padding:8px 12px; border:1px solid #CBD5E1; border-radius:10px;">
                    <span id="evt-year-selected-label" style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:13px;">ทุกชั้นปี (ทุกรหัสนิสิต)</span>
                    <span id="evt-year-arrow-icon" class="material-icons" style="font-size:18px; color:#64748B;">arrow_drop_down</span>
                  </button>
                  <div id="evt-year-dropdown-menu" style="display:none; position:absolute; top:calc(100% + 4px); left:0; right:0; z-index:1000; background:#FFFFFF; border:1px solid #CBD5E1; border-radius:12px; box-shadow:0 12px 28px -4px rgba(15,23,42,0.18), 0 4px 10px -2px rgba(15,23,42,0.08); padding:10px; max-height:260px; overflow-y:auto;">
                    <div style="display:flex; justify-content:space-between; align-items:center; padding:4px 6px 8px 6px; border-bottom:1px solid #E2E8F0; margin-bottom:6px;">
                      <label style="display:flex; align-items:center; gap:8px; cursor:pointer; font-weight:700; font-size:12.5px; color:#1E1B4B;">
                        <input type="checkbox" id="evt-year-all" onchange="window.toggleSelectAllYears(this.checked)" checked style="width:16px; height:16px; accent-color:#4338CA; cursor:pointer;" />
                        <span>ทุกชั้นปี (ทุกรหัสนิสิต)</span>
                      </label>
                      <button type="button" onclick="window.toggleYearDropdown()" style="background:none; border:none; color:#64748B; font-size:11.5px; cursor:pointer; padding:2px 8px; border-radius:6px; font-weight:600; display:flex; align-items:center; gap:2px;" class="hover:bg-slate-200">
                        <span>ปิด</span>
                        <span class="material-icons" style="font-size:14px;">close</span>
                      </button>
                    </div>
                    <div id="evt-year-checkbox-list" style="display:flex; flex-direction:column; gap:2px;">
                      <label style="display:flex; align-items:center; gap:8px; padding:5px 8px; border-radius:8px; cursor:pointer; font-size:12.5px;" class="hover:bg-slate-100">
                        <input type="checkbox" class="evt-year-item" value="67" onchange="window.updateSelectedYears()" checked style="width:15px; height:15px; accent-color:#4338CA; cursor:pointer;" />
                        <span>ชั้นปี 67 (ปี 3)</span>
                      </label>
                      <label style="display:flex; align-items:center; gap:8px; padding:5px 8px; border-radius:8px; cursor:pointer; font-size:12.5px;" class="hover:bg-slate-100">
                        <input type="checkbox" class="evt-year-item" value="68" onchange="window.updateSelectedYears()" checked style="width:15px; height:15px; accent-color:#4338CA; cursor:pointer;" />
                        <span>ชั้นปี 68 (ปี 2)</span>
                      </label>
                      <label style="display:flex; align-items:center; gap:8px; padding:5px 8px; border-radius:8px; cursor:pointer; font-size:12.5px;" class="hover:bg-slate-100">
                        <input type="checkbox" class="evt-year-item" value="66" onchange="window.updateSelectedYears()" checked style="width:15px; height:15px; accent-color:#4338CA; cursor:pointer;" />
                        <span>ชั้นปี 66 (ปี 4)</span>
                      </label>
                      <label style="display:flex; align-items:center; gap:8px; padding:5px 8px; border-radius:8px; cursor:pointer; font-size:12.5px;" class="hover:bg-slate-100">
                        <input type="checkbox" class="evt-year-item" value="65" onchange="window.updateSelectedYears()" checked style="width:15px; height:15px; accent-color:#4338CA; cursor:pointer;" />
                        <span>ชั้นปี 65 (ปี 5 / ตกค้าง)</span>
                      </label>
                      <label style="display:flex; align-items:center; gap:8px; padding:5px 8px; border-radius:8px; cursor:pointer; font-size:12.5px;" class="hover:bg-slate-100">
                        <input type="checkbox" class="evt-year-item" value="64" onchange="window.updateSelectedYears()" checked style="width:15px; height:15px; accent-color:#4338CA; cursor:pointer;" />
                        <span>ชั้นปี 64 (ตกค้าง)</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label style="font-size:12.5px; font-weight:700; color:#334155;">สถานที่จัดงาน</label>
                <input type="text" id="evt-location" class="input-field" value="ห้องประชุมคณะ ICT มหาวิทยาลัยพะเยา" style="margin-top:4px;" />
              </div>

              <button type="button" onclick="createTrainingEvent()" style="background:linear-gradient(135deg, #1E1B4B 0%, #4338CA 100%); color:white; border:none; padding:11px 16px; border-radius:12px; font-size:13px; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px; margin-top:4px;">
                <span class="material-icons" style="font-size:18px;">add_circle</span>
                <span>สร้างกิจกรรมอบรมใหม่</span>
              </button>
            </div>
          </div>
        </section>

        <!-- ขวา: ระบบบันทึก Check-in ด้วยรหัสนิสิต (จากใบลงทะเบียนหน้างาน -> เข้าระบบ) -->
        <section class="card" style="margin-bottom:0;">
          <div class="card-header" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
            <div style="display:flex; align-items:center; gap:10px;">
              <span class="material-icons header-icon">fact_check</span>
              <div>
                <h2 class="card-title" style="margin:0;">บันทึก Check-in หน้างานด้วยรหัสนิสิต (ไม่ต้องอัปโหลดใบเซอร์เอง)</h2>
                <p style="margin:2px 0 0 0; font-size:11.5px; color:#E0E7FF;">นำรหัสนิสิตจากใบลงชื่อหน้างานมากรอก/วาง ระบบจะ Map รหัสนิสิตและบวกชั่วโมงเข้าแดชบอร์ดทันที</p>
              </div>
            </div>
          </div>
          <div class="card-body">
            <!-- เลือกกิจกรรมที่จะ Check-in -->
            <div style="margin-bottom:16px; padding:14px 16px; background:#F8FAFC; border:1px solid #E2E8F0; border-radius:14px;">
              <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:8px;">
                <label style="font-size:12.5px; font-weight:700; color:#1E293B;">
                  1. เลือกกิจกรรมอบรมที่ต้องการบันทึก Check-in รหัสนิสิต:
                </label>
                <span id="filter-event-count-badge" style="font-size:11.5px; font-weight:600; color:#64748B;"></span>
              </div>

              <!-- แถบค้นหาและกรองกิจกรรม (Compact Filter Toolbar) -->
              <div style="display:flex; align-items:center; gap:8px; margin-bottom:10px; flex-wrap:wrap;">
                <!-- 1. ค้นหาชื่อกิจกรรม -->
                <div style="flex:1; min-width:180px; position:relative;">
                  <span class="material-icons" style="position:absolute; left:10px; top:50%; transform:translateY(-50%); font-size:18px; color:#94A3B8; pointer-events:none; z-index:1;">search</span>
                  <input type="text" id="filter-event-keyword" placeholder="ค้นหาชื่อกิจกรรม..." oninput="window.applyEventFilters()" class="input-field" style="padding-left:36px !important; height:34px !important; min-height:34px !important; font-size:12px; border-radius:8px; margin:0;" />
                </div>

                <!-- 2. กรองสาขาวิชาเป้าหมาย -->
                <div style="width:160px;">
                  <select id="filter-event-major" onchange="window.applyEventFilters()" class="input-field" style="height:34px; font-size:12px; padding:4px 8px; border-radius:8px; margin:0; font-weight:600; cursor:pointer;">
                    <option value="ALL">🎯 ทุกสาขาวิชา</option>
                    <option value="วิศวกรรมซอฟต์แวร์">วิศวกรรมซอฟต์แวร์ (SE)</option>
                    <option value="วิทยาการคอมพิวเตอร์">วิทยาการคอมพิวเตอร์ (CS)</option>
                    <option value="วิศวกรรมคอมพิวเตอร์">วิศวกรรมคอมพิวเตอร์ (CPE)</option>
                    <option value="เทคโนโลยีสารสนเทศ">เทคโนโลยีสารสนเทศ (IT)</option>
                    <option value="ธุรกิจดิจิทัล">ธุรกิจดิจิทัล (DB)</option>
                    <option value="คอมพิวเตอร์กราฟิกและมัลติมีเดีย">คอมพิวเตอร์กราฟิกฯ (CGM)</option>
                    <option value="ภูมิสารสนเทศศาสตร์">ภูมิสารสนเทศศาสตร์ (GIS)</option>
                    <option value="วิทยาการข้อมูลและการประยุกต์">วิทยาการข้อมูลฯ (DSA)</option>
                  </select>
                </div>

                <!-- 2.1 กรองชั้นปีเป้าหมาย -->
                <div style="width:130px;">
                  <select id="filter-event-year" onchange="window.applyEventFilters()" class="input-field" style="height:34px; font-size:12px; padding:4px 8px; border-radius:8px; margin:0; font-weight:600; cursor:pointer;">
                    <option value="ALL">🎓 ทุกชั้นปี</option>
                    <option value="67">ปี 67 (ปี 3)</option>
                    <option value="68">ปี 68 (ปี 2)</option>
                    <option value="66">ปี 66 (ปี 4)</option>
                    <option value="65">ปี 65 (ปี 5+)</option>
                  </select>
                </div>

                <!-- 3. กรองวันที่ -->
                <div style="width:130px;">
                  <select id="filter-event-date-preset" onchange="window.handleEventDatePresetChange()" class="input-field" style="height:34px; font-size:12px; padding:4px 8px; border-radius:8px; margin:0; font-weight:600; cursor:pointer;">
                    <option value="ALL">📅 ทุกวันที่</option>
                    <option value="TODAY">🔥 วันนี้</option>
                    <option value="THIS_MONTH">📆 เดือนนี้</option>
                    <option value="CUSTOM">🗓️ ระบุวันที่...</option>
                  </select>
                </div>

                <!-- ช่องระบุวันที่แบบกำหนดเอง (แสดงเมื่อเลือก CUSTOM) -->
                <input type="date" id="filter-event-custom-date" onchange="window.applyEventFilters()" class="input-field" style="display:none; width:130px; height:34px; font-size:12px; padding:4px 8px; border-radius:8px; margin:0;" />

                <!-- 4. ปุ่มล้างค่าตัวกรอง -->
                <button type="button" onclick="window.resetEventFilters()" title="ล้างตัวกรองทั้งหมด" style="height:34px; padding:0 10px; background:#F1F5F9; border:1px solid #CBD5E1; border-radius:8px; font-size:12px; font-weight:600; color:#475569; cursor:pointer; display:inline-flex; align-items:center; gap:4px; transition:all 0.15s;" class="hover:bg-slate-200">
                  <span class="material-icons" style="font-size:15px;">refresh</span>
                  <span>ล้างค่า</span>
                </button>
              </div>

              <select id="checkin-event-select" class="input-field" onchange="renderSelectedEventCheckins()" style="font-weight:700; color:#1E1B4B;"></select>
              <div id="checkin-selected-event-meta" style="margin-top:8px; font-size:12px; color:#475569;"></div>
            </div>

            <!-- กล่องกรอก/วางรหัสนิสิตจากใบเซ็นชื่อหน้างาน -->
            <div style="margin-bottom:18px; padding:16px; background:#EEF2FF; border:1px solid #C7D2FE; border-radius:14px;">
              <label style="font-size:12.5px; font-weight:700; color:#1E1B4B; display:block; margin-bottom:4px;">
                2. กรอกหรือวางรหัสนิสิตจากใบลงชื่อหน้างาน (รองรับทั้งพิมพ์ทีละรหัส หรือก๊อปวางหลายรหัสพร้อมกัน):
              </label>
              <p style="font-size:11.5px; color:#4338CA; margin:0 0 8px 0;">
                * สามารถพิมพ์รหัสนิสิตคั่นด้วยเครื่องหมายจุลภาค (,), เว้นวรรค หรือขึ้นบรรทัดใหม่ได้ทันที ระบบจะตรวจสอบชื่อนิสิตและอนุมัติชั่วโมงให้อัตโนมัติ
              </p>
              <div style="display:flex; gap:10px; align-items:stretch;" class="max-md:flex-col">
                <textarea id="checkin-student-codes" class="input-field" rows="3" placeholder="ตัวอย่าง: 67023110, 67023111 หรือวางคอลัมน์รหัสนิสิตจาก Excel..." style="flex:1; font-family:monospace; font-size:13px;"></textarea>
                <div style="display:flex; flex-direction:column; gap:6px; justify-content:center;">
                  <button type="button" onclick="submitEventCheckIn()" style="background:#10B981; color:white; border:none; padding:12px 18px; border-radius:12px; font-size:13px; font-weight:700; cursor:pointer; display:inline-flex; align-items:center; gap:6px; white-space:nowrap; height:100%;">
                    <span class="material-icons" style="font-size:18px;">how_to_reg</span>
                    <span>บันทึก Check-in &amp; นับชั่วโมงทันที</span>
                  </button>
                </div>
              </div>
              <div id="checkin-result-banner" style="display:none; margin-top:10px; padding:10px 14px; border-radius:10px; font-size:12.5px; font-weight:600;"></div>
            </div>

            <!-- ตารางรายชื่อนิสิตที่ Check-in ในกิจกรรมนี้แล้ว -->
            <div>
              <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:10px;">
                <h4 style="font-size:13.5px; font-weight:700; color:#1E293B; margin:0;">
                  รายชื่อนิสิตที่บันทึก Check-in ในกิจกรรมนี้แล้ว (<span id="checkin-list-count">0</span> คน)
                </h4>
                <div style="display:flex; align-items:center; gap:12px; flex-wrap:wrap;">
                  <div style="display:flex; align-items:center; gap:6px;">
                    <label for="checkin-filter-major" style="font-size:12px; font-weight:700; color:#475569;">กรองสาขาวิชา:</label>
                    <select id="checkin-filter-major" class="input-field" onchange="window.filterCheckInList()" style="padding:4px 10px; font-size:12px; width:auto; min-width:145px; height:32px; font-weight:600; cursor:pointer;">
                      <option value="ALL">ทุกสาขาวิชา (ทั้งหมด)</option>
                    </select>
                  </div>
                  <div style="display:flex; align-items:center; gap:6px;">
                    <label for="checkin-filter-year" style="font-size:12px; font-weight:700; color:#475569;">กรองชั้นปี:</label>
                    <select id="checkin-filter-year" class="input-field" onchange="window.filterCheckInList()" style="padding:4px 10px; font-size:12px; width:auto; min-width:130px; height:32px; font-weight:600; cursor:pointer;">
                      <option value="ALL">ทุกชั้นปี (ทั้งหมด)</option>
                    </select>
                  </div>
                </div>
              </div>
              <div style="max-height:280px; overflow-y:auto; border:1px solid #E2E8F0; border-radius:12px;">
                <table class="data-table" style="margin:0;">
                  <thead>
                    <tr>
                      <th>รหัสนิสิต</th>
                      <th>ชื่อ - นามสกุล</th>
                      <th>สาขาวิชา</th>
                      <th class="text-center">ชั่วโมงที่ได้รับ</th>
                      <th>เวลาที่บันทึก</th>
                      <th class="text-center" style="width:140px; white-space:nowrap;">
                        <div style="display:inline-flex; align-items:center; gap:6px; justify-content:center;">
                          <span>จัดการ</span>
                          <button type="button" id="btn-delete-all-checkin" onclick="window.deleteAllEventCheckIns()" title="ลบทั้งหมดตามที่กำลังแสดง" style="background:#FEE2E2; border:1px solid #FECACA; color:#DC2626; border-radius:6px; padding:3px 8px; font-size:11px; font-weight:700; cursor:pointer; display:inline-flex; align-items:center; gap:4px; transition:all 0.15s ease;">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                              <polyline points="3 6 5 6 21 6"></polyline>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                              <line x1="10" y1="11" x2="10" y2="17"></line>
                              <line x1="14" y1="11" x2="14" y2="17"></line>
                            </svg>
                            <span id="btn-delete-all-text">ลบทั้งหมด</span>
                          </button>
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody id="checkin-history-tbody">
                    <tr><td colspan="6" class="text-center py-6 text-gray-400">ยังไม่มีรายการ Check-in ในกิจกรรมนี้</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>

    <!-- =====================================================================
         WORKSPACE 4: ระบบฐานข้อมูลสถานประกอบการกลาง (Company Master Data)
         ===================================================================== -->
    <div id="workspace-companies" style="display:none;">
      <!-- ส่วนที่ 1: ตารางฐานข้อมูลสถานประกอบการกลาง (Verified Master Data) -->
      <section class="card">
        <div class="card-header" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
          <div style="display:flex; align-items:center; gap:10px;">
            <span class="material-icons header-icon">domain_verification</span>
            <div>
              <h2 class="card-title" style="margin:0;">ฐานข้อมูลสถานประกอบการกลาง (Company Master Data)</h2>
              <p style="margin:2px 0 0 0; font-size:12px; color:#E0E7FF;">รายชื่อบริษัทในตารางนี้จะไปแสดงเป็น Auto-suggest / Dropdown ให้นิสิตเลือกอัตโนมัติตอนทำ Checklist</p>
            </div>
          </div>
          <div style="display:flex; align-items:center; gap:8px; flex-shrink:0;">
            <button type="button" onclick="openAddMasterCompanyModal()" style="background:#10B981; color:white; border:none; padding:8px 16px; border-radius:10px; font-size:12.5px; font-weight:700; cursor:pointer; display:inline-flex; align-items:center; gap:6px;">
              <span class="material-icons" style="font-size:16px;">add_business</span> เพิ่มสถานประกอบการเข้า Master Data
            </button>
            <button type="button" id="master-companies-toggle"
              onclick="window.toggleMasterCompanies(event)"
              aria-expanded="true" aria-controls="master-companies-tbody"
              aria-label="ย่อรายการบริษัท"
              title="ย่อรายการบริษัท"
              style="width:36px; height:36px; display:inline-flex; align-items:center; justify-content:center; border:1px solid rgba(255,255,255,.55); border-radius:8px; color:#1E3A8A; background:#FFFFFF; cursor:pointer; padding:0;">
              <span id="master-companies-toggle-icon" class="material-icons" style="transition:transform 180ms ease; transform:rotate(180deg);">expand_more</span>
            </button>
          </div>
        </div>
        <div class="card-body">
          <div style="display:flex; gap:10px; margin-bottom:14px; flex-wrap:wrap;">
            <input type="text" id="master-company-search" class="input-field" placeholder="ค้นหาชื่อบริษัท (ไทย/อังกฤษ), จังหวัด หรือตำแหน่งงาน..." oninput="window.searchMasterCompanies()" style="max-width:360px;" />
          </div>
          <table class="data-table">
            <thead>
              <tr>
                <th style="width:26%;">ชื่อสถานประกอบการ (มาตรฐาน)</th>
                <th style="width:14%;">จังหวัด</th>
                <th style="width:24%;">ผู้ติดต่อ (HR) / เบอร์โทร</th>
                <th style="width:22%;">ตำแหน่งงานที่เปิดรับ</th>
                <th style="width:14%;" class="text-center">สถานะ</th>
              </tr>
            </thead>
            <tbody id="master-companies-tbody">
              <tr><td colspan="5" class="text-center py-6 text-gray-400">กำลังโหลดฐานข้อมูลบริษัท...</td></tr>
            </tbody>
          </table>
          <div id="master-companies-pagination" style="display:flex; align-items:center; justify-content:flex-end; gap:12px; margin-top:12px; color:#475569; font-size:12px;"></div>
        </div>
      </section>

      <!-- ส่วนที่ 2: แจ้งเตือนบริษัทใหม่ที่นิสิตกรอกเข้ามา (Pending Super Admin Confirm) -->
      <section class="card" id="pending-companies-section">
        <div class="card-header" style="background:linear-gradient(135deg, #92400E 0%, #D97706 100%); display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
          <div style="display:flex; align-items:center; gap:10px; min-width:0; flex:1;">
            <span class="material-icons header-icon">notification_important</span>
            <div>
              <h2 class="card-title" style="margin:0;">แจ้งเตือน: รายชื่อบริษัทใหม่ที่นิสิตกรอกเพิ่มเข้ามา (รอพี่จอมตรวจสอบและกดยืนยันเข้า Master Data)</h2>
              <p style="margin:2px 0 0 0; font-size:12px; color:#FEF3C7;">
                ป้องกันปัญหาชื่อบริษัทซ้ำซ้อน พิมพ์ตัวเล็ก/ใหญ่ หรือชื่อไทย-อังกฤษไม่ตรงกัน สามารถแก้ชื่อให้เป็นมาตรฐานหรือกดยุบรวมกับบริษัทเดิมได้ทันที
              </p>
            </div>
          </div>
          <div style="display:flex; align-items:center; gap:8px; flex-shrink:0;" onclick="event.stopPropagation()">
            <div style="position:relative;">
              <input type="search" id="pending-companies-search" class="input-field"
                placeholder="ค้นหาชื่อบริษัท / รหัสอ้างอิง / นิสิต..."
                aria-label="ค้นหาบริษัท"
                oninput="window.setPendingCompanySearch(event)"
                onclick="event.stopPropagation()"
                onkeydown="event.stopPropagation()"
                style="width:min(360px, 42vw); min-width:180px; padding:8px 34px 8px 12px !important; color:#0F172A; background:#FFFFFF; border:1px solid #CBD5E1; border-radius:8px; font-size:13px; box-sizing:border-box;" />
              <button type="button" id="pending-companies-search-clear"
                onclick="window.clearPendingCompanySearch(event)"
                aria-label="ล้างคำค้นหา"
                style="display:none; position:absolute; right:6px; top:50%; transform:translateY(-50%); border:0; background:transparent; color:#64748B; font-size:18px; line-height:1; cursor:pointer; padding:4px;">×</button>
            </div>
            <button type="button" id="pending-companies-toggle"
              onclick="window.togglePendingCompanies(event)"
              aria-expanded="true" aria-controls="pending-companies-content"
              aria-label="ย่อหรือขยายรายการบริษัท"
              style="width:36px; height:36px; display:inline-flex; align-items:center; justify-content:center; border:1px solid rgba(255,255,255,.55); border-radius:8px; color:#92400E; background:#FFFFFF; cursor:pointer; padding:0;">
              <span id="pending-companies-toggle-icon" class="material-icons" style="transition:transform 180ms ease; transform:rotate(180deg);">expand_more</span>
            </button>
          </div>
        </div>
        <div id="pending-companies-content" style="overflow:hidden; opacity:1; max-height:5000px; transition:max-height 220ms ease, opacity 180ms ease;">
          <div class="card-body">
            <table class="data-table">
              <thead>
                <tr>
                  <th style="width:26%;">ชื่อบริษัทที่นิสิตกรอกเข้ามา</th>
                  <th style="width:20%;">นิสิตที่ยื่นเพิ่ม</th>
                  <th style="width:28%;">ปรับชื่อมาตรฐาน / ยุบรวมกับบริษัทเดิม</th>
                  <th style="width:26%;" class="text-center">การอนุมัติเข้า Master Data</th>
                </tr>
              </thead>
              <tbody id="pending-companies-tbody">
                <tr><td colspan="4" class="text-center py-6 text-gray-400">ไม่มีรายการบริษัทใหม่รออนุมัติ</td></tr>
              </tbody>
            </table>
            <div id="pending-companies-pagination" style="display:flex; align-items:center; justify-content:flex-end; gap:12px; margin-top:12px; color:#475569; font-size:12px;"></div>
          </div>
        </div>
      </section>
    </div>

    <!-- =====================================================================
         WORKSPACE 5: ระบบออกเอกสารราชการอัตโนมัติ (หนังสือขอความอนุเคราะห์ + แบบฟอร์มใบตอบรับ & หนังสือส่งตัว)
         ===================================================================== -->
    <div id="workspace-documents" style="display:none;">
      <!-- แผงอธิบายขั้นตอนการออกเอกสารราชการตามข้อตกลงล่าสุด -->
      <div style="margin-bottom:16px; padding:14px 18px; background:linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%); border:1px solid #C7D2FE; border-radius:16px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px;">
        <div style="display:flex; align-items:center; gap:12px;">
          <span class="material-icons" style="color:#4338CA; font-size:28px;">verified</span>
          <div>
            <div style="font-size:13.5px; font-weight:800; color:#1E1B4B;">
              ลำดับการออกเอกสารราชการ (นโยบายยื่นขอฝึกงานทีละ 1 บริษัท)
            </div>
            <div style="font-size:12px; color:#3730A3; margin-top:2px;">
              <strong>ขั้นที่ 1:</strong> ที่ปรึกษาอนุมัติ Checklist ➔ <strong>ขั้นที่ 2:</strong> พี่จอมออก <strong>"หนังสือขอความอนุเคราะห์ (+ แนบแบบฟอร์มใบตอบรับ)"</strong> ไปยื่น/สัมภาษณ์ (รวมกลุ่มบริษัทเดียวกันได้) ➔ <strong>ขั้นที่ 3:</strong> บริษัทส่งใบตอบรับ ➔ <strong>ถ้ารับ:</strong> ออก <strong>"หนังสือส่งตัว"</strong> | <strong>ถ้าปฏิเสธ:</strong> เก็บเข้า <strong>Archive</strong> และปลดล็อกให้ยื่นบริษัทใหม่
            </div>
          </div>
        </div>
      </div>

      <!-- ส่วนที่ 1: การจัดกลุ่มนิสิตที่ไปบริษัทเดียวกัน (Group Request Letter) -->
      <section class="card">
        <div class="card-header" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
          <div style="display:flex; align-items:center; gap:10px;">
            <span class="material-icons header-icon">folder_shared</span>
            <div>
              <h2 class="card-title" style="margin:0;">ออกหนังสือขอความอนุเคราะห์แบบรวมกลุ่มสถานประกอบการเดียวกัน (Group Letter + ตารางแนบท้าย)</h2>
              <p style="margin:2px 0 0 0; font-size:12px; color:#E0E7FF;">หากมีนิสิตไปบริษัทเดียวกันรอบเดียวกัน สามารถกดออกหนังสือฉบับเดียวพร้อมตารางรายชื่อแนบท้ายและแบบฟอร์มใบตอบรับได้ทันที</p>
            </div>
          </div>
        </div>
        <div class="card-body">
          <div id="company-groups-container" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(320px, 1fr)); gap:12px;"></div>
        </div>
      </section>

      <!-- ส่วนที่ 2: ตารางจัดการเอกสารรายบุคคล (หนังสือขอความอนุเคราะห์ -> ตรวจใบตอบรับ -> หนังสือส่งตัว) -->
      <section class="card">
        <div class="card-header" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
          <div style="display:flex; align-items:center; gap:10px;">
            <span class="material-icons header-icon">assignment_turned_in</span>
            <div>
              <h2 class="card-title" style="margin:0;">คิวออกหนังสือขอความอนุเคราะห์ (+ใบตอบรับ), ตรวจผลตอบรับจากบริษัท และออกหนังสือส่งตัว</h2>
              <p style="margin:2px 0 0 0; font-size:12px; color:#E0E7FF;">ตรวจสอบสถานะรายคน พรีวิวเอกสารราชการ PDF และจัดการกรณีบริษัทตอบรับหรือปฏิเสธ</p>
            </div>
          </div>
          <div style="display:flex; gap:8px;">
            <select id="doc-queue-filter" class="input-field" onchange="renderDocumentQueueTable()" style="width:auto; font-size:12px; padding:6px 12px; background:white; color:#1E293B;">
              <option value="ALL">แสดงนิสิตทั้งหมด</option>
              <option value="READY_FOR_REQ">รอออกหนังสือขอความอนุเคราะห์</option>
              <option value="WAITING_RESPONSE">ออกหนังสือแล้ว / รอผลใบตอบรับบริษัท</option>
              <option value="ACCEPTED">บริษัทตอบรับแล้ว / พร้อมออกหนังสือส่งตัว</option>
              <option value="DISPATCHED">ออกหนังสือส่งตัวเสร็จสิ้นแล้ว</option>
            </select>
          </div>
        </div>
        <div class="card-body">
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th style="width:18%;">รหัสนิสิต / ชื่อ-สกุล</th>
                  <th style="width:20%;">สถานประกอบการ (ยื่นทีละ 1 แห่ง)</th>
                  <th style="width:12%;">สถานะ Checklist</th>
                  <th style="width:18%;">1. หนังสือขอความอนุเคราะห์ (+ใบตอบรับ)</th>
                  <th style="width:16%;">2. ผลใบตอบรับจากบริษัท</th>
                  <th style="width:16%;">3. หนังสือส่งตัวเข้าฝึกงาน</th>
                </tr>
              </thead>
              <tbody id="doc-workflow-tbody">
                <tr><td colspan="6" class="text-center py-6 text-gray-400">กำลังโหลดคิวงานเอกสารราชการ...</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <!-- ส่วนที่ 3: ประวัติบริษัทเดิมที่ถูกปฏิเสธ / ไม่ผ่าน (Archive แบบย่อ) -->
      <section class="card">
        <div class="card-header">
          <span class="material-icons header-icon">inventory_2</span>
          <div>
            <h2 class="card-title" style="margin:0;">ประวัติการยื่นบริษัทเดิมที่ไม่ผ่าน / บริษัทปฏิเสธ (Archive แบบย่อ)</h2>
            <p style="margin:2px 0 0 0; font-size:12px; color:#E0E7FF;">เก็บประวัติการยื่นเดิมไว้เป็นหลักฐานเมื่อระบบปลดล็อกให้นิสิตยื่นบริษัทแห่งใหม่</p>
          </div>
        </div>
        <div class="card-body">
          <table class="data-table">
            <thead>
              <tr>
                <th>รหัสนิสิต</th>
                <th>ชื่อ-นามสกุล</th>
                <th>สาขาวิชา</th>
                <th>บริษัทเดิมที่ยื่น</th>
                <th>สาเหตุที่เข้า Archive</th>
                <th>หมายเหตุ</th>
                <th>วันที่บันทึก</th>
              </tr>
            </thead>
            <tbody id="archive-history-tbody">
              <tr><td colspan="7" class="text-center py-6 text-gray-400">ยังไม่มีประวัติใน Archive</td></tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>

    <!-- =====================================================================
         WORKSPACE 6: การเชื่อมโยงกับระบบ Co-op ICT ของพี่แดง (Export สำหรับ Co-op 01)
         ===================================================================== -->
    <div id="workspace-coop" style="display:none;">
      <section class="card">
        <div class="card-header" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
          <div style="display:flex; align-items:center; gap:10px;">
            <span class="material-icons header-icon">sync_alt</span>
            <div>
              <h2 class="card-title" style="margin:0;">ส่งออกข้อมูลเชื่อมโยงระบบ Co-op ICT ของพี่แดง (ข้อมูลตั้งต้นแบบฟอร์ม Co-op 01)</h2>
              <p style="margin:2px 0 0 0; font-size:12px; color:#E0E7FF;">
                Export ข้อมูลนิสิตและสถานประกอบการที่ได้รับการตอบรับออกเป็นไฟล์ CSV / Excel มาตรฐาน เพื่อนำไป Import เข้าสู่ระบบ Co-op ICT โดยที่นิสิตไม่ต้องกรอกข้อมูลซ้ำ
              </p>
            </div>
          </div>
          <div style="display:flex; gap:8px; flex-wrap:wrap;">
            <button type="button" onclick="downloadCoop01Csv('APPROVED_ONLY')" style="background:#10B981; color:white; border:none; padding:9px 16px; border-radius:10px; font-size:12.5px; font-weight:700; cursor:pointer; display:inline-flex; align-items:center; gap:6px;">
              <span class="material-icons" style="font-size:17px;">download</span> Export เฉพาะนิสิตที่บริษัทตอบรับแล้ว (CSV สำหรับ Co-op 01)
            </button>
            <button type="button" onclick="downloadCoop01Csv('ALL')" style="background:#0D6EFD; color:white; border:1px solid rgba(255,255,255,0.3); padding:9px 16px; border-radius:10px; font-size:12.5px; font-weight:600; cursor:pointer; display:inline-flex; align-items:center; gap:6px;">
              <span class="material-icons" style="font-size:17px;">table_view</span> Export ข้อมูลทั้งรุ่น (CSV)
            </button>
          </div>
        </div>
        <div class="card-body">
          <div style="margin-bottom:14px; padding:12px 16px; background:#F0FDF4; border:1px solid #BBF7D0; border-radius:12px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px;">
            <div style="display:flex; align-items:center; gap:10px; font-size:12.5px; color:#166534;">
              <span class="material-icons" style="color:#16A34A;">check_circle</span>
              <span><strong>โครงสร้างคอลัมน์มาตรฐาน Co-op 01:</strong> รหัสนิสิต, ชื่อ-สกุล, สาขาวิชา, ชั้นปี, GPAX, เบอร์โทร, อีเมล, ชื่อสถานประกอบการ, ตำแหน่งงาน, ที่อยู่บริษัท, จังหวัด, ชื่อผู้ประสานงาน HR, เบอร์โทรบริษัท, อาจารย์ที่ปรึกษา, อาจารย์นิเทศก์, เลขที่หนังสือส่งตัว</span>
            </div>
          </div>

          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>รหัสนิสิต</th>
                  <th>ชื่อ - นามสกุล</th>
                  <th>สาขาวิชา</th>
                  <th>GPAX</th>
                  <th>สถานประกอบการ (Co-op 01)</th>
                  <th>ตำแหน่งงาน</th>
                  <th>อาจารย์ที่ปรึกษา / นิเทศก์</th>
                  <th>สถานะส่งตัว</th>
                </tr>
              </thead>
              <tbody id="coop-preview-tbody">
                <tr><td colspan="8" class="text-center py-6 text-gray-400">กำลังโหลดข้อมูลสำหรับส่งออก Co-op 01...</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>

    <!-- =====================================================================
         WORKSPACE 7: ตั้งค่า Checklist บริษัท (สำหรับ Super Admin / Staff)
         ===================================================================== -->
    <div id="workspace-checklist" style="display:none;">
      <section class="card" style="margin-bottom:20px;">
        <div class="card-header" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
          <div style="display:flex; align-items:center; gap:10px;">
            <span class="material-icons header-icon">fact_check</span>
            <div>
              <h2 class="card-title" style="margin:0;">ตั้งค่า Checklist บริษัท (สำหรับนิสิตประเมินก่อนยื่นฝึกงาน)</h2>
              <p style="margin:2px 0 0 0; font-size:12px; color:#E0E7FF;">
                จัดการเวอร์ชัน หัวข้อหลัก และเกณฑ์คำถามที่นิสิตต้องตรวจสอบความน่าเชื่อถือของบริษัทก่อนยื่นสมัครฝึกงาน
              </p>
            </div>
          </div>
          <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
            <button type="button" onclick="window.openCreateVersionModal ? window.openCreateVersionModal(true) : null" style="background:#0D6EFD; color:white; border:none; padding:8px 14px; border-radius:8px; font-size:12.5px; font-weight:600; cursor:pointer; display:inline-flex; align-items:center; gap:6px;">
              <span class="material-icons" style="font-size:17px;">content_copy</span> คัดลอกสร้างเวอร์ชันใหม่
            </button>
            <button type="button" onclick="window.openCreateVersionModal ? window.openCreateVersionModal(false) : null" style="background:#475569; color:white; border:none; padding:8px 14px; border-radius:8px; font-size:12.5px; font-weight:600; cursor:pointer; display:inline-flex; align-items:center; gap:6px;">
              <span class="material-icons" style="font-size:17px;">add</span> สร้างเวอร์ชันเปล่า
            </button>
          </div>
        </div>

        <div class="card-body">
          <!-- แถบเลือกเวอร์ชัน & สถานะ -->
          <div style="background:#F8FAFC; border:1px solid #E2E8F0; border-radius:12px; padding:14px 18px; margin-bottom:18px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px;">
            <div style="display:flex; align-items:center; gap:12px; flex-wrap:wrap;">
              <label style="font-size:13px; font-weight:700; color:#334155;">เลือกเวอร์ชัน:</label>
              <select id="checklist-version-select" onchange="window.switchChecklistVersion ? window.switchChecklistVersion(this.value) : null" class="input-field" style="width:auto; min-width:260px; height:44px; min-height:44px; line-height:1.6; font-size:13.5px; padding:6px 36px 6px 14px; background:#FFFFFF; border:1px solid #CBD5E1; border-radius:8px; cursor:pointer; box-sizing:border-box; overflow:visible;">
                <!-- dynamic options -->
              </select>
              <div id="checklist-version-badge-wrap">
                <!-- dynamic status badge -->
              </div>
            </div>

            <div id="checklist-version-actions" style="display:flex; align-items:center; gap:8px;">
              <!-- dynamic action buttons: Activate, Edit Info, Delete -->
            </div>
          </div>

          <!-- กล่องคำอธิบายเวอร์ชัน -->
          <div id="checklist-version-desc-box" style="margin-bottom:16px; font-size:12.5px; color:#475569; padding:10px 14px; background:#F1F5F9; border-radius:8px; border-left:4px solid #3B82F6; display:none;"></div>

          <!-- แถบหัวข้อรายการคำถาม -->
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; flex-wrap:wrap; gap:10px;">
            <div style="font-size:14px; font-weight:700; color:#1E293B;">
              📋 หัวข้อและเกณฑ์การประเมิน <span id="checklist-sections-summary" style="font-size:12.5px; font-weight:500; color:#64748B;"></span>
            </div>
            <button type="button" onclick="window.openAddSectionModal ? window.openAddSectionModal() : null" style="background:#2563EB; color:white; border:none; padding:7px 14px; border-radius:8px; font-size:12.5px; font-weight:600; cursor:pointer; display:inline-flex; align-items:center; gap:6px;">
              <span class="material-icons" style="font-size:17px;">add_circle_outline</span> เพิ่มหมวดหลักใหม่
            </button>
          </div>

          <!-- รายการหมวดหมู่และคำถาม (Dynamic Accordion / Cards) -->
          <div id="checklist-sections-container">
            <div style="text-align:center; padding:30px; color:#94A3B8;">กำลังโหลดข้อมูล Checklist...</div>
          </div>
        </div>
      </section>
    </div>

    <!-- Modal: สร้าง/แก้ไขเวอร์ชัน Checklist -->
    <div id="checklist-version-modal" style="display:none; position:fixed; inset:0; background:rgba(15,23,42,0.55); z-index:1000; justify-content:center; align-items:center; backdrop-filter:blur(4px);">
      <div style="background:white; border-radius:20px; padding:24px 28px; width:500px; max-width:94%; box-shadow:0 20px 50px rgba(15,23,42,0.25);">
        <h3 style="font-size:17px; font-weight:700; margin-bottom:14px; color:#1E293B;" id="cv-modal-title">สร้างเวอร์ชันใหม่</h3>
        <input type="hidden" id="cv-mode" value="create" />
        <input type="hidden" id="cv-version-id" value="" />
        <div style="margin-bottom:12px;">
          <label style="font-size:12.5px; font-weight:700; color:#475569;">ชื่อเวอร์ชัน *</label>
          <input type="text" id="cv-version-name" class="input-field" placeholder="เช่น v2.0 (ปีการศึกษา 2568)" style="margin-top:4px;" />
        </div>
        <div style="margin-bottom:12px;">
          <label style="font-size:12.5px; font-weight:700; color:#475569;">คำอธิบายเวอร์ชัน</label>
          <input type="text" id="cv-description" class="input-field" placeholder="เช่น ปรับเกณฑ์ความน่าเชื่อถือและ Tech Stack สำหรับปี 68" style="margin-top:4px;" />
        </div>
        <div id="cv-clone-wrap" style="margin-bottom:16px;">
          <label style="font-size:12.5px; font-weight:700; color:#475569;">คัดลอกหมวดและคำถามจาก</label>
          <select id="cv-clone-select" class="input-field" style="margin-top:4px; cursor:pointer;">
            <!-- dynamic clone options -->
          </select>
          <span style="font-size:11.5px; color:#64748B;">* ระบบจะคัดลอกทุกหมวดและคำถามมาให้แก้ไขต่อทันที สะดวกโดยไม่ต้องพิมพ์ใหม่</span>
        </div>
        <div style="display:flex; justify-content:flex-end; gap:8px;">
          <button type="button" onclick="document.getElementById('checklist-version-modal').style.display='none'" style="background:#F1F5F9; color:#475569; border:none; padding:8px 16px; border-radius:8px; font-size:13px; font-weight:600; cursor:pointer;">ยกเลิก</button>
          <button type="button" onclick="window.saveChecklistVersion ? window.saveChecklistVersion() : null" style="background:#2563EB; color:white; border:none; padding:8px 18px; border-radius:8px; font-size:13px; font-weight:600; cursor:pointer;">บันทึก</button>
        </div>
      </div>
    </div>

    <!-- Modal: เพิ่ม/แก้ไขหมวดหลัก (Section) -->
    <div id="checklist-section-modal" style="display:none; position:fixed; inset:0; background:rgba(15,23,42,0.55); z-index:1000; justify-content:center; align-items:center; backdrop-filter:blur(4px);">
      <div style="background:white; border-radius:20px; padding:24px 28px; width:480px; max-width:94%; box-shadow:0 20px 50px rgba(15,23,42,0.25);">
        <h3 style="font-size:17px; font-weight:700; margin-bottom:14px; color:#1E293B;" id="cs-modal-title">เพิ่มหมวดหลัก</h3>
        <input type="hidden" id="cs-section-id" value="" />
        <div style="margin-bottom:16px;">
          <label style="font-size:12.5px; font-weight:700; color:#475569;">ชื่อหมวดหลัก *</label>
          <input type="text" id="cs-title" class="input-field" placeholder="เช่น ส่วนที่ 6 สวัสดิการและค่าตอบแทน" style="margin-top:4px;" />
        </div>
        <div style="display:flex; justify-content:flex-end; gap:8px;">
          <button type="button" onclick="document.getElementById('checklist-section-modal').style.display='none'" style="background:#F1F5F9; color:#475569; border:none; padding:8px 16px; border-radius:8px; font-size:13px; font-weight:600; cursor:pointer;">ยกเลิก</button>
          <button type="button" onclick="window.saveChecklistSection ? window.saveChecklistSection() : null" style="background:#2563EB; color:white; border:none; padding:8px 18px; border-radius:8px; font-size:13px; font-weight:600; cursor:pointer;">บันทึก</button>
        </div>
      </div>
    </div>

    <!-- Modal: เพิ่ม/แก้ไขข้อย่อย (Item) -->
    <div id="checklist-item-modal" style="display:none; position:fixed; inset:0; background:rgba(15,23,42,0.55); z-index:1000; justify-content:center; align-items:center; backdrop-filter:blur(4px);">
      <div style="background:white; border-radius:20px; padding:24px 28px; width:520px; max-width:94%; box-shadow:0 20px 50px rgba(15,23,42,0.25);">
        <h3 style="font-size:17px; font-weight:700; margin-bottom:14px; color:#1E293B;" id="ci-modal-title">เพิ่มเกณฑ์คำถาม</h3>
        <input type="hidden" id="ci-item-id" value="" />
        <input type="hidden" id="ci-section-id" value="" />
        <div style="margin-bottom:12px;">
          <label style="font-size:12.5px; font-weight:700; color:#475569;">รายละเอียดเกณฑ์ที่ต้องพิจารณา *</label>
          <textarea id="ci-description" class="input-field" rows="3" placeholder="เช่น ตรวจสอบกับกรมพัฒนาธุรกิจการค้า (DBD) นำชื่อบริษัทไปค้นในเว็บ DBD..." style="margin-top:4px; height:auto; padding:8px 12px; resize:vertical;"></textarea>
        </div>
        <div style="margin-bottom:12px;">
          <label style="font-size:12.5px; font-weight:700; color:#475569;">คำใบ้ / ตัวอย่างคำตอบ (Placeholder สำหรับช่องรายละเอียดเพิ่ม)</label>
          <input type="text" id="ci-placeholder" class="input-field" placeholder="เช่น ระบุทุนจดทะเบียน หรือสถานะ Active ในระบบ" style="margin-top:4px;" />
          <span style="font-size:11.5px; color:#64748B;">* แสดงเป็นตัวอย่างจางๆ ในช่องกรอกของนิสิต ช่วยให้นิสิตรู้ว่าควรพิมพ์อะไร</span>
        </div>
        <div style="margin-bottom:16px; display:flex; gap:16px; align-items:center;">
          <label style="display:flex; align-items:center; gap:6px; font-size:13px; font-weight:600; color:#334155; cursor:pointer;">
            <input type="checkbox" id="ci-required" style="width:16px; height:16px; cursor:pointer;" />
            <span>เป็นข้อบังคับ (Required)</span>
          </label>
          <label style="display:flex; align-items:center; gap:6px; font-size:13px; font-weight:600; color:#334155; cursor:pointer;">
            <input type="checkbox" id="ci-active" checked style="width:16px; height:16px; cursor:pointer;" />
            <span>เปิดใช้งานในแบบฟอร์ม (Active)</span>
          </label>
        </div>
        <div style="display:flex; justify-content:flex-end; gap:8px;">
          <button type="button" onclick="document.getElementById('checklist-item-modal').style.display='none'" style="background:#F1F5F9; color:#475569; border:none; padding:8px 16px; border-radius:8px; font-size:13px; font-weight:600; cursor:pointer;">ยกเลิก</button>
          <button type="button" onclick="window.saveChecklistItem ? window.saveChecklistItem() : null" style="background:#2563EB; color:white; border:none; padding:8px 18px; border-radius:8px; font-size:13px; font-weight:600; cursor:pointer;">บันทึก</button>
        </div>
      </div>
    </div>

    <!-- Modal: เพิ่มสถานประกอบการเข้า Master Data -->
    <div id="add-master-company-modal" style="display:none; position:fixed; inset:0; background:rgba(15,23,42,0.55); z-index:1000; justify-content:center; align-items:center; backdrop-filter:blur(4px);">
      <div style="background:white; border-radius:20px; padding:24px 28px; width:540px; max-width:94%; box-shadow:0 20px 50px rgba(15,23,42,0.25);">
        <h3 style="font-size:17px; font-weight:700; margin-bottom:14px; color:#1E293B;">เพิ่มสถานประกอบการเข้าฐานข้อมูลกลาง (Master Data)</h3>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:10px;">
          <div style="grid-column:span 2;">
            <label style="font-size:12.5px; font-weight:700; color:#475569;">ชื่อสถานประกอบการ (ภาษาไทย / ชื่อทางการ) *</label>
            <input type="text" id="mc-name-th" class="input-field" placeholder="เช่น บริษัท เมกัส ซอฟต์แวร์ จำกัด" style="margin-top:4px;" />
          </div>
          <div>
            <label style="font-size:12.5px; font-weight:700; color:#475569;">ชื่อภาษาอังกฤษ</label>
            <input type="text" id="mc-name-en" class="input-field" placeholder="Magus Software Co., Ltd." style="margin-top:4px;" />
          </div>
          <div>
            <label style="font-size:12.5px; font-weight:700; color:#475569;">จังหวัด</label>
            <input type="text" id="mc-province" class="input-field" placeholder="เช่น เชียงใหม่, กรุงเทพมหานคร" style="margin-top:4px;" />
          </div>
          <div style="grid-column:span 2;">
            <label style="font-size:12.5px; font-weight:700; color:#475569;">ที่อยู่บริษัท</label>
            <input type="text" id="mc-address" class="input-field" placeholder="เลขที่ ถนน ตำบล อำเภอ จังหวัด รหัสไปรษณีย์" style="margin-top:4px;" />
          </div>
          <div>
            <label style="font-size:12.5px; font-weight:700; color:#475569;">ชื่อผู้ติดต่อ / ฝ่าย HR</label>
            <input type="text" id="mc-hr-name" class="input-field" placeholder="ฝ่ายทรัพยากรบุคคล" style="margin-top:4px;" />
          </div>
          <div>
            <label style="font-size:12.5px; font-weight:700; color:#475569;">เบอร์โทรศัพท์ HR</label>
            <input type="text" id="mc-hr-phone" class="input-field" placeholder="02-xxx-xxxx" style="margin-top:4px;" />
          </div>
          <div style="grid-column:span 2;">
            <label style="font-size:12.5px; font-weight:700; color:#475569;">ตำแหน่งงานที่แนะนำ</label>
            <input type="text" id="mc-positions" class="input-field" placeholder="เช่น Software Developer, QA, Data Analyst" style="margin-top:4px;" />
          </div>
        </div>
        <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:16px;">
          <button class="btn btn-outline btn-sm" onclick="closeAddMasterCompanyModal()">ยกเลิก</button>
          <button class="btn btn-primary btn-sm" onclick="submitNewMasterCompany()">บันทึกเข้า Master Data</button>
        </div>
      </div>
    </div>

    <!-- Modal: พรีวิวและพิมพ์หนังสือราชการ PDF (หนังสือขอความอนุเคราะห์ + แบบฟอร์มใบตอบรับ / หนังสือส่งตัว) -->
    <div id="official-letter-modal" style="display:none; position:fixed; inset:0; background:rgba(15,23,42,0.65); z-index:1100; justify-content:center; align-items:center; backdrop-filter:blur(4px);">
      <div style="background:white; border-radius:20px; width:820px; max-width:95%; max-height:92vh; display:flex; flex-direction:column; box-shadow:0 25px 60px rgba(15,23,42,0.35); overflow:hidden;">
        <div style="background:linear-gradient(135deg, #1E1B4B 0%, #4338CA 100%); padding:16px 24px; color:white; display:flex; align-items:center; justify-content:space-between;">
          <div style="display:flex; align-items:center; gap:10px;">
            <span class="material-icons" style="font-size:22px;">picture_as_pdf</span>
            <div>
              <h3 id="official-letter-modal-title" style="font-size:16px; font-weight:700; margin:0;">พรีวิวหนังสือราชการ คณะ ICT มหาวิทยาลัยพะเยา</h3>
              <p style="font-size:11.5px; color:#E0E7FF; margin:2px 0 0 0;">พร้อมพิมพ์หรือบันทึกเป็นไฟล์ PDF เพื่อส่งให้สถานประกอบการ</p>
            </div>
          </div>
          <div style="display:flex; align-items:center; gap:8px;">
            <button type="button" onclick="printOfficialLetter()" style="background:#10B981; color:white; border:none; padding:7px 14px; border-radius:10px; font-size:12px; font-weight:700; cursor:pointer; display:inline-flex; align-items:center; gap:5px;">
              <span class="material-icons" style="font-size:16px;">print</span> พิมพ์ / ดาวน์โหลด PDF
            </button>
            <button onclick="closeOfficialLetterModal()" style="background:none; border:none; color:white; cursor:pointer;">
              <span class="material-icons">close</span>
            </button>
          </div>
        </div>
        <div id="official-letter-print-area" style="padding:32px 40px; overflow-y:auto; flex:1; background:#FFFFFF; color:#0F172A; font-family:'Sarabun', sans-serif; line-height:1.7;"></div>
      </div>
    </div>

    <!-- Modal: ตั้งสถานะนิสิต -->
    <div id="status-modal" style="display:none; position:fixed; inset:0; background:rgba(15,23,42,0.55); z-index:1000; justify-content:center; align-items:center; backdrop-filter:blur(4px);">
      <div style="background:white; border-radius:20px; padding:24px 28px; width:440px; max-width:92%; box-shadow:0 20px 50px rgba(15,23,42,0.25);">
        <h3 style="font-size:17px; font-weight:700; margin-bottom:16px; color:#1E293B;">ตั้งสถานะนิสิต (Batch Update)</h3>
        <div style="margin-bottom:12px;">
          <label style="font-size:13px; font-weight:600; color:#475569;">ประเภทสถานะ</label>
          <select id="batch-status-type" class="input-field" style="margin-top:4px;">
            <option value="cv">สถานะ CV</option>
            <option value="training">สถานะชั่วโมงอบรม</option>
            <option value="placement">สถานะอนุมัติที่ฝึกงาน</option>
          </select>
        </div>
        <div style="margin-bottom:12px;">
          <label style="font-size:13px; font-weight:600; color:#475569;">ค่าสถานะ</label>
          <select id="batch-status-value" class="input-field" style="margin-top:4px;">
            <option value="APPROVED">ผ่าน / อนุมัติ (APPROVED)</option>
            <option value="PENDING">รอผล (PENDING)</option>
            <option value="REJECTED">ไม่ผ่าน / แก้ไข (REJECTED)</option>
          </select>
        </div>
        <div style="margin-bottom:16px;">
          <label style="font-size:13px; font-weight:600; color:#475569;">หมายเหตุ (ถ้ามี)</label>
          <input type="text" id="batch-status-note" class="input-field" placeholder="หมายเหตุ..." style="margin-top:4px;" />
        </div>
        <div style="display:flex; justify-content:flex-end; gap:8px;">
          <button class="btn btn-outline btn-sm" onclick="closeSetStatusModal()">ยกเลิก</button>
          <button class="btn btn-primary btn-sm" onclick="submitBatchStatus()">ยืนยัน</button>
        </div>
      </div>
    </div>

    <!-- Modal: ตั้งอาจารย์ที่ปรึกษา -->
    <div id="advisor-modal" style="display:none; position:fixed; inset:0; background:rgba(15,23,42,0.55); z-index:1000; justify-content:center; align-items:center; backdrop-filter:blur(4px);">
      <div style="background:white; border-radius:20px; padding:24px 28px; width:440px; max-width:92%; box-shadow:0 20px 50px rgba(15,23,42,0.25);">
        <h3 style="font-size:17px; font-weight:700; margin-bottom:16px; color:#1E293B;">กำหนดอาจารย์ที่ปรึกษา (Advisor)</h3>
        <div style="margin-bottom:16px;">
          <label style="font-size:13px; font-weight:600; color:#475569;">เลือกอาจารย์ที่ปรึกษา</label>
          <select id="advisor-select" class="input-field" style="margin-top:4px;">
            <option value="">กำลังโหลด...</option>
          </select>
        </div>
        <div style="display:flex; justify-content:flex-end; gap:8px;">
          <button class="btn btn-outline btn-sm" onclick="closeSetAdvisorModal()">ยกเลิก</button>
          <button class="btn btn-primary btn-sm" onclick="submitBatchAdvisor()">ยืนยัน</button>
        </div>
      </div>
    </div>

    <!-- Modal: ตั้งอาจารย์นิเทศก์ (Supervisor) -->
    <div id="supervisor-modal" style="display:none; position:fixed; inset:0; background:rgba(15,23,42,0.55); z-index:1000; justify-content:center; align-items:center; backdrop-filter:blur(4px);">
      <div style="background:white; border-radius:20px; padding:24px 28px; width:440px; max-width:92%; box-shadow:0 20px 50px rgba(15,23,42,0.25);">
        <h3 style="font-size:17px; font-weight:700; margin-bottom:6px; color:#1E293B;">กำหนดอาจารย์นิเทศก์ (Supervisor)</h3>
        <p style="font-size:12px; color:#64748B; margin:0 0 14px 0;">มอบหมายอาจารย์นิเทศก์ให้นิสิตที่ติ๊กเลือกในตาราง</p>
        <div style="margin-bottom:16px;">
          <label style="font-size:13px; font-weight:600; color:#475569;">เลือกอาจารย์นิเทศก์</label>
          <select id="supervisor-select" class="input-field" style="margin-top:4px;">
            <option value="">กำลังโหลด...</option>
          </select>
        </div>
        <div style="display:flex; justify-content:flex-end; gap:8px;">
          <button class="btn btn-outline btn-sm" onclick="closeSetSupervisorModal()">ยกเลิก</button>
          <button class="btn btn-primary btn-sm" onclick="submitBatchSupervisor()">ยืนยัน</button>
        </div>
      </div>
    </div>

    <!-- Modal: จัดการสิทธิ์อาจารย์ / บุคลากร (Multi-Role Staff Management) -->
    <div id="staff-roles-modal" style="display:none; position:fixed; inset:0; background:rgba(15,23,42,0.6); z-index:1000; justify-content:center; align-items:center; backdrop-filter:blur(4px);">
      <div style="background:white; border-radius:20px; width:1000px; max-width:96%; max-height:90vh; display:flex; flex-direction:column; box-shadow:0 25px 60px rgba(15,23,42,0.3); overflow:hidden;">
        <!-- Modal Header -->
        <div style="background:linear-gradient(135deg, #1E1B4B 0%, #4338CA 100%); padding:18px 24px; color:white; display:flex; align-items:center; justify-content:space-between;">
          <div style="display:flex; align-items:center; gap:10px;">
            <span class="material-icons" style="font-size:22px;">admin_panel_settings</span>
            <div>
              <h3 style="font-size:16px; font-weight:700; margin:0;">จัดการสิทธิ์อาจารย์และเจ้าหน้าที่คณะ (Multi-Role Permission Matrix)</h3>
              <p style="font-size:11.5px; color:#E0E7FF; margin:2px 0 0 0;">อาจารย์ 1 ท่านสามารถถือครองได้หลายบทบาทพร้อมกัน (อาจารย์ประจำวิชา / ที่ปรึกษา / นิเทศก์ / เจ้าหน้าที่คณะ)</p>
            </div>
          </div>
          <button onclick="closeStaffRolesModal()" style="background:none; border:none; color:white; cursor:pointer;" title="ปิดหน้าต่าง">
            <span class="material-icons">close</span>
          </button>
        </div>

        <!-- Filter & Search Toolbar -->
        <div style="padding:12px 24px; background:#F8FAFC; border-bottom:1px solid #E2E8F0; display:flex; flex-wrap:wrap; gap:10px; align-items:center; justify-content:space-between;">
          <div style="display:flex; flex-wrap:wrap; gap:8px; align-items:center; flex:1; min-width:320px;">
            <!-- กล่องค้นหา (ชื่อ-นามสกุล หรือ อีเมล / Gmail) -->
            <div style="position:relative; flex:1; min-width:210px; max-width:280px;">
              <span class="material-icons" style="position:absolute; left:10px; top:50%; transform:translateY(-50%); color:#94A3B8; font-size:18px; pointer-events:none;">search</span>
              <input
                type="text"
                id="staff-search-input"
                class="input-field"
                placeholder="ค้นหาชื่อ หรือ อีเมล/Gmail..."
                oninput="filterStaffRolesTable()"
                style="padding-left:34px !important; padding-right:28px !important; width:100%; font-size:12.5px; height:36px; border-radius:8px; border:1px solid #CBD5E1; background:#FFFFFF;"
              />
              <button
                id="staff-search-clear-btn"
                type="button"
                onclick="clearStaffSearchInput()"
                title="ล้างคำค้นหา"
                style="display:none; position:absolute; right:6px; top:50%; transform:translateY(-50%); background:none; border:none; color:#94A3B8; cursor:pointer; padding:2px;"
              >
                <span class="material-icons" style="font-size:16px;">cancel</span>
              </button>
            </div>

            <!-- ตัวกรองสาขา / สังกัด -->
            <select
              id="staff-dept-filter"
              class="input-field"
              onchange="filterStaffRolesTable()"
              style="width:auto; min-width:180px; font-size:12px; height:36px; padding:4px 10px; border-radius:8px; border:1px solid #CBD5E1; cursor:pointer; background:#FFFFFF;"
            >
              <option value="ALL">ทุกสาขาวิชา / สังกัด</option>
              <option value="__FACULTY__">ส่วนกลางทั้งคณะ ICT (8 สาขา)</option>
              <option value="วิศวกรรมซอฟต์แวร์">สาขาวิศวกรรมซอฟต์แวร์ (SE)</option>
              <option value="ธุรกิจดิจิทัล">สาขาธุรกิจดิจิทัล (DB)</option>
              <option value="วิทยาการคอมพิวเตอร์">สาขาวิทยาการคอมพิวเตอร์ (CS)</option>
              <option value="เทคโนโลยีสารสนเทศ">สาขาเทคโนโลยีสารสนเทศ (IT)</option>
              <option value="วิศวกรรมคอมพิวเตอร์">สาขาวิศวกรรมคอมพิวเตอร์ (CPE)</option>
              <option value="คอมพิวเตอร์กราฟิกและมัลติมีเดีย">สาขาคอมพิวเตอร์กราฟิกและมัลติมีเดีย (CG)</option>
              <option value="ภูมิสารสนเทศศาสตร์">สาขาภูมิสารสนเทศศาสตร์ (GIS)</option>
              <option value="วิทยาการข้อมูลและการประยุกต์">สาขาวิทยาการข้อมูลและการประยุกต์ (DSA)</option>
            </select>

            <!-- ตัวกรองบทบาท (Role) -->
            <select
              id="staff-role-filter"
              class="input-field"
              onchange="filterStaffRolesTable()"
              style="width:auto; min-width:145px; font-size:12px; height:36px; padding:4px 10px; border-radius:8px; border:1px solid #CBD5E1; cursor:pointer; background:#FFFFFF;"
            >
              <option value="ALL">ทุกบทบาทหน้าที่</option>
              <option value="ADVISOR">อาจารย์ที่ปรึกษา</option>
              <option value="SUPERVISOR">อาจารย์นิเทศก์</option>
              <option value="COURSE_ADMIN">อาจารย์ประจำวิชา</option>
              <option value="STAFF">เจ้าหน้าที่คณะ</option>
              <option value="NONE">ยังไม่มีบทบาทใดๆ</option>
            </select>

            <!-- ปุ่มล้างตัวกรอง -->
            <button
              type="button"
              class="btn btn-outline btn-sm"
              onclick="clearStaffRolesFilters()"
              title="ล้างตัวกรองทั้งหมด"
              style="height:36px; padding:0 10px; border-radius:8px; font-size:12px; display:inline-flex; align-items:center; gap:4px; color:#64748B; border-color:#CBD5E1; background:#FFFFFF;"
            >
              <span class="material-icons" style="font-size:15px;">filter_alt_off</span>
              <span>ล้างตัวกรอง</span>
            </button>
          </div>

          <!-- Counter & บันทึกทั้งหมด -->
          <div style="display:flex; align-items:center; gap:12px;">
            <span id="staff-filtered-count" style="font-size:12px; color:#475569; font-weight:600; white-space:nowrap;">
              กำลังโหลด...
            </span>
            <button
              type="button"
              id="btn-save-all-staff"
              class="btn btn-primary btn-sm"
              onclick="saveAllStaffRoles()"
              style="height:36px; padding:0 14px; border-radius:8px; font-size:12.5px; font-weight:600; display:inline-flex; align-items:center; gap:6px; background:#4338CA; border:none; box-shadow:0 2px 6px rgba(67,56,202,0.25); cursor:pointer;"
            >
              <span class="material-icons" style="font-size:16px;">save</span>
              <span>บันทึกทั้งหมด</span>
            </button>
          </div>
        </div>

        <!-- Table Container -->
        <div style="padding:16px 24px; overflow-y:auto; flex:1;">
          <table class="data-table">
            <thead>
              <tr>
                <th>ชื่อ - นามสกุล / อีเมล</th>
                <th>สาขาวิชา / สังกัด</th>
                <th class="text-center" style="width:110px;">อาจารย์ที่ปรึกษา</th>
                <th class="text-center" style="width:110px;">อาจารย์นิเทศก์</th>
                <th class="text-center" style="width:110px;">อาจารย์ประจำวิชา</th>
                <th class="text-center" style="width:110px;">เจ้าหน้าที่คณะ</th>
                <th class="text-center" style="width:85px;">บันทึก</th>
              </tr>
            </thead>
            <tbody id="staff-roles-tbody">
              <tr><td colspan="7" class="text-center py-6 text-gray-400">กำลังโหลดรายชื่อบุคลากร...</td></tr>
            </tbody>
          </table>
        </div>

        <!-- Modal Footer -->
        <div style="padding:12px 24px; background:#F8FAFC; border-top:1px solid #E2E8F0; display:flex; justify-content:space-between; align-items:center;">
          <div style="font-size:12px; color:#64748B; display:flex; align-items:center; gap:6px;">
            <span class="material-icons" style="font-size:16px; color:#4F46E5;">info</span>
            <span>สามารถเลือกปรับสิทธิ์พร้อมกันหลายคน แล้วกด <b>"บันทึกทั้งหมด"</b> ได้ในคลิกเดียว</span>
          </div>
          <div style="display:flex; align-items:center; gap:10px;">
            <button class="btn btn-outline btn-sm" onclick="closeStaffRolesModal()" style="height:36px; padding:0 14px; border-radius:8px;">ปิดหน้าต่าง</button>
            <button
              type="button"
              id="btn-save-all-staff-footer"
              class="btn btn-primary btn-sm"
              onclick="saveAllStaffRoles()"
              style="height:36px; padding:0 16px; border-radius:8px; font-size:12.5px; font-weight:600; display:inline-flex; align-items:center; gap:6px; background:#4338CA; border:none; box-shadow:0 2px 6px rgba(67,56,202,0.25); cursor:pointer;"
            >
              <span class="material-icons" style="font-size:16px;">save</span>
              <span>บันทึกทั้งหมด</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal: ดรอปนิสิต -->
    <div id="drop-modal" style="display:none; position:fixed; inset:0; background:rgba(15,23,42,0.55); z-index:1000; justify-content:center; align-items:center; backdrop-filter:blur(4px);">
      <div style="background:white; border-radius:20px; padding:24px 28px; width:440px; max-width:92%; box-shadow:0 20px 50px rgba(15,23,42,0.25);">
        <div style="display:flex; align-items:center; gap:8px; margin-bottom:12px;">
          <span class="material-icons" style="color:#DC2626; font-size:24px;">warning_amber</span>
          <h3 style="font-size:17px; font-weight:700; color:#991B1B; margin:0;">ยืนยันการดรอปนิสิต</h3>
        </div>
        <p style="font-size:13px; color:#475569; margin-bottom:14px; line-height:1.5;">
          คุณกำลังจะดรอปนิสิตที่เลือกจำนวน <strong id="drop-selected-count" style="color:#DC2626;">0</strong> คน ออกจากรอบการฝึกงานปัจจุบัน (ข้อมูลไม่ถูกลบและกู้คืนได้ภายหลัง)
        </p>
        <div style="margin-bottom:12px;">
          <label style="font-size:13px; font-weight:600; color:#475569;">สาเหตุการดรอป</label>
          <select id="drop-reason-preset" class="input-field" style="margin-top:4px;" onchange="toggleDropReasonNote()">
            <option value="ดรอปเรียน / พักการศึกษา">ดรอปเรียน / พักการศึกษา</option>
            <option value="ถอนรายวิชาเตรียมฝึกงาน (W)">ถอนรายวิชาเตรียมฝึกงาน (W)</option>
            <option value="ชั่วโมงอบรมไม่ครบตามเกณฑ์">ชั่วโมงอบรมไม่ครบตามเกณฑ์</option>
            <option value="เลื่อนการฝึกงานไปปีถัดไป">เลื่อนการฝึกงานไปปีถัดไป</option>
            <option value="custom">อื่นๆ (ระบุในหมายเหตุ)</option>
          </select>
        </div>
        <div style="margin-bottom:18px;">
          <label style="font-size:13px; font-weight:600; color:#475569;">หมายเหตุเพิ่มเติม (ถ้ามี)</label>
          <input type="text" id="drop-reason-note" class="input-field" placeholder="เปิดให้กรอกเมื่อเลือก 'อื่นๆ (ระบุในหมายเหตุ)'" style="margin-top:4px; background-color:#F1F5F9; cursor:not-allowed;" disabled />
        </div>
        <div style="display:flex; justify-content:flex-end; gap:8px;">
          <button class="btn btn-outline btn-sm" onclick="closeDropStudentModal()">ยกเลิก</button>
          <button class="btn btn-sm" onclick="submitDropStudents()" style="background:#DC2626; color:white; border:none; padding:8px 16px; border-radius:10px; cursor:pointer; font-weight:600;">ยืนยันดรอปนิสิต</button>
        </div>
      </div>
    </div>

    <!-- Modal: กู้คืนสถานะนิสิต -->
    <div id="restore-modal" style="display:none; position:fixed; inset:0; background:rgba(15,23,42,0.55); z-index:1000; justify-content:center; align-items:center; backdrop-filter:blur(4px);">
      <div style="background:white; border-radius:20px; padding:24px 28px; width:420px; max-width:92%; box-shadow:0 20px 50px rgba(15,23,42,0.25);">
        <div style="display:flex; align-items:center; gap:8px; margin-bottom:12px;">
          <span class="material-icons" style="color:#059669; font-size:24px;">restore</span>
          <h3 style="font-size:17px; font-weight:700; color:#065F46; margin:0;">กู้คืนสถานะนิสิต</h3>
        </div>
        <p style="font-size:13px; color:#475569; margin-bottom:18px; line-height:1.5;">
          ต้องการนำนิสิตที่เลือกจำนวน <strong id="restore-selected-count" style="color:#059669;">0</strong> คน กลับเข้าสู่รายชื่อนิสิตกำลังศึกษา/ฝึกงานปกติใช่หรือไม่?
        </p>
        <div style="display:flex; justify-content:flex-end; gap:8px;">
          <button class="btn btn-outline btn-sm" onclick="closeRestoreStudentModal()">ยกเลิก</button>
          <button class="btn btn-sm" onclick="submitRestoreStudents()" style="background:#059669; color:white; border:none; padding:8px 16px; border-radius:10px; cursor:pointer; font-weight:600;">ยืนยันกู้คืนสถานะ</button>
        </div>
      </div>
    </div>

    <!-- Modal: [REQ-02 & REQ-03] นำเข้ารายชื่อนิสิตจากระบบ REG & UP Academy พร้อม Update Detection Popup -->
    <div id="import-modal" style="display:none; position:fixed; inset:0; background:rgba(15,23,42,0.6); z-index:1000; justify-content:center; align-items:center; backdrop-filter:blur(4px);">
      <div style="background:white; border-radius:20px; width:760px; max-width:95%; max-height:90vh; display:flex; flex-direction:column; box-shadow:0 25px 60px rgba(15,23,42,0.3); overflow:hidden;">
        <div style="background:linear-gradient(135deg, #065F46 0%, #10B981 100%); padding:18px 24px; color:white; display:flex; align-items:center; justify-content:space-between;">
          <div style="display:flex; align-items:center; gap:10px;">
            <span class="material-icons" style="font-size:24px;">upload_file</span>
            <div>
              <h3 style="font-size:16px; font-weight:700; margin:0;">นำเข้าข้อมูลนิสิตจากระบบ REG &amp; UP Academy (Excel / CSV)</h3>
              <p style="font-size:11.5px; color:#D1FAE5; margin:2px 0 0 0;">แมปตามรหัสนิสิตอัตโนมัติ ตรวจจับแถวที่มีการอัปเดตโดยไม่ลบข้อมูลเดิม</p>
            </div>
          </div>
          <button onclick="closeImportModal()" style="background:none; border:none; color:white; cursor:pointer; display:flex; align-items:center; opacity:0.85;">
            <span class="material-icons" style="font-size:20px;">close</span>
          </button>
        </div>

        <div style="padding:20px 24px; overflow-y:auto; flex:1;">
          <!-- Step 1: Upload File Zone -->
          <div id="import-upload-zone" style="border:2px dashed #CBD5E1; border-radius:16px; padding:28px 20px; text-align:center; background:#F8FAFC; cursor:pointer; transition:all 0.2s;"
               onclick="document.getElementById('import-file-input').click()"
               ondragover="event.preventDefault(); this.style.borderColor='#10B981'; this.style.background='#ECFDF5';"
               ondragleave="this.style.borderColor='#CBD5E1'; this.style.background='#F8FAFC';"
               ondrop="handleImportDrop(event)">
            <input type="file" id="import-file-input" accept=".xlsx,.xls,.csv" style="display:none;" onchange="handleImportFileSelect(event)" />
            <span class="material-icons" style="font-size:44px; color:#10B981; margin-bottom:8px;">cloud_upload</span>
            <p style="font-size:14.5px; font-weight:700; color:#1E293B; margin:0 0 4px 0;">คลิกเพื่อเลือกไฟล์ หรือลากไฟล์จากระบบ REG / UP Academy มาวางที่นี่</p>
            <p style="font-size:12px; color:#64748B; margin:0;">รองรับไฟล์ <strong>.xlsx, .xls, .csv</strong> (รองรับทั้ง 8 สาขาวิชาของคณะ ICT และตรวจจับการอัปเดต GPAX / ชั่วโมงเตรียมความพร้อมอัตโนมัติ)</p>
          </div>

          <!-- Selected File Info -->
          <div id="import-selected-file-wrap" style="display:none; margin-top:12px; padding:10px 14px; background:#F0FDF4; border:1px solid #BBF7D0; border-radius:12px; align-items:center; justify-content:space-between;">
            <div style="display:flex; align-items:center; gap:8px;">
              <span class="material-icons" style="color:#16A34A; font-size:20px;">description</span>
              <span id="import-selected-file-name" style="font-size:13px; font-weight:600; color:#166534;">filename.xlsx</span>
            </div>
            <button onclick="resetImportFile()" style="background:none; border:none; color:#DC2626; font-size:12px; font-weight:600; cursor:pointer; display:flex; align-items:center; gap:2px;">
              <span class="material-icons" style="font-size:15px;">delete</span> เปลี่ยนไฟล์
            </button>
          </div>

          <!-- Step 2: Preview & Update Detection Summary -->
          <div id="import-preview-wrap" style="display:none; margin-top:16px;">
            <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:10px; margin-bottom:12px;">
              <div style="padding:10px 12px; background:#F8FAFC; border:1px solid #E2E8F0; border-radius:12px; text-align:center;">
                <div style="font-size:11px; color:#64748B;">อ่านพบในไฟล์</div>
                <div id="import-stat-total" style="font-size:18px; font-weight:800; color:#334155;">0</div>
              </div>
              <div style="padding:10px 12px; background:#F0FDF4; border:1px solid #BBF7D0; border-radius:12px; text-align:center;">
                <div style="font-size:11px; color:#166534;">✨ นิสิตใหม่</div>
                <div id="import-stat-new" style="font-size:18px; font-weight:800; color:#15803D;">0</div>
              </div>
              <div style="padding:10px 12px; background:#EFF6FF; border:1px solid #BFDBFE; border-radius:12px; text-align:center;">
                <div style="font-size:11px; color:#1E40AF;">🔄 อัปเดตข้อมูลเดิม</div>
                <div id="import-stat-updated" style="font-size:18px; font-weight:800; color:#1D4ED8;">0</div>
              </div>
              <div style="padding:10px 12px; background:#EEF2FF; border:1px solid #C7D2FE; border-radius:12px; text-align:center;">
                <div style="font-size:11px; color:#3730A3;">คงเดิม / ปีการศึกษา</div>
                <div style="font-size:14px; font-weight:700; color:#4338CA;">
                  <span id="import-stat-unchanged">0</span> คน (<span id="import-stat-acad-year">-</span>)
                </div>
              </div>
            </div>

            <span id="import-stat-matched" style="display:none;">0</span>
            <span id="import-stat-skipped" style="display:none;">0</span>

            <div id="import-update-detection-box" style="display:none; margin-bottom:14px; padding:12px 16px; background:#FFFBEB; border:1px solid #FDE68A; border-radius:12px;">
              <div style="display:flex; align-items:center; gap:6px; font-size:12.5px; font-weight:700; color:#92400E; margin-bottom:6px;">
                <span class="material-icons" style="font-size:17px; color:#D97706;">sync_problem</span>
                <span>ระบบตรวจพบการเปลี่ยนแปลงข้อมูลนิสิตเดิม (Update Detection):</span>
              </div>
              <div id="import-update-detection-list" style="max-height:110px; overflow-y:auto; font-size:12px; color:#78350F; display:flex; flex-direction:column; gap:4px;"></div>
            </div>

            <div style="font-size:12px; font-weight:700; color:#475569; margin-bottom:6px; display:flex; justify-content:space-between;">
              <span>ตัวอย่างรายชื่อนิสิตที่จะนำเข้า / อัปเดต (<span id="import-preview-count">0</span> คน):</span>
              <span style="color:#64748B; font-weight:400;">* ไม่ลบข้อมูลติดต่อและเอกสารเดิมของนิสิต</span>
            </div>

            <div style="max-height:220px; overflow-y:auto; border:1px solid #E2E8F0; border-radius:12px;">
              <table style="width:100%; border-collapse:collapse; font-size:12px;">
                <thead style="background:#F1F5F9; position:sticky; top:0;">
                  <tr>
                    <th style="padding:8px 10px; text-align:left; color:#475569;">รหัสนิสิต</th>
                    <th style="padding:8px 10px; text-align:left; color:#475569;">ชื่อ - นามสกุล</th>
                    <th style="padding:8px 10px; text-align:left; color:#475569;">สาขาวิชา</th>
                    <th style="padding:8px 10px; text-align:center; color:#475569;">ชั้นปี / GPAX</th>
                    <th style="padding:8px 10px; text-align:left; color:#475569;">สถานะการนำเข้า</th>
                  </tr>
                </thead>
                <tbody id="import-preview-tbody"></tbody>
              </table>
            </div>
          </div>

          <div id="import-loading" style="display:none; text-align:center; padding:24px;">
            <span class="inline-block animate-spin rounded-full h-6 w-6 border-2 border-emerald-600 border-t-transparent"></span>
            <p style="font-size:13px; color:#475569; margin-top:8px;">กำลังตรวจสอบไฟล์และเปรียบเทียบข้อมูลเดิม...</p>
          </div>
        </div>

        <div style="padding:14px 24px; background:#F8FAFC; border-top:1px solid #E2E8F0; display:flex; justify-content:flex-end; gap:8px;">
          <button class="btn btn-outline btn-sm" onclick="closeImportModal()" style="border-radius:10px;">ยกเลิก</button>
          <button id="btn-confirm-import" class="btn btn-sm" onclick="confirmImport()" style="display:none; background:#10B981; color:white; border:none; border-radius:10px; align-items:center; gap:6px; padding:8px 18px; font-weight:600; cursor:pointer;">
            <span class="material-icons" style="font-size:16px;">check_circle</span>
            <span id="btn-confirm-import-text">ยืนยันนำเข้าข้อมูล</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Modal: เลือกรูปแบบการ Export Excel/CSV -->
    <div id="export-modal" style="display:none; position:fixed; inset:0; background:rgba(15,23,42,0.55); z-index:1000; justify-content:center; align-items:center; backdrop-filter:blur(4px);">
      <div style="background:white; border-radius:20px; width:480px; max-width:92%; box-shadow:0 20px 50px rgba(15,23,42,0.25); overflow:hidden;">
        <div style="background:linear-gradient(135deg, #1E1B4B 0%, #4338CA 100%); padding:18px 24px; color:white; display:flex; align-items:center; justify-content:space-between;">
          <div style="display:flex; align-items:center; gap:10px;">
            <span class="material-icons" style="font-size:22px;">file_download</span>
            <h3 style="font-size:16px; font-weight:700; margin:0;">ส่งออกข้อมูลนิสิต (Export CSV / Excel)</h3>
          </div>
          <button onclick="closeExportModal()" style="background:none; border:none; color:white; cursor:pointer; display:flex; align-items:center; opacity:0.85;">
            <span class="material-icons" style="font-size:20px;">close</span>
          </button>
        </div>

        <div style="padding:20px 24px;">
          <p style="font-size:13px; color:#475569; margin-bottom:14px; font-weight:500;">กรุณาเลือกขอบเขตข้อมูลนิสิตที่ต้องการส่งออก:</p>

          <div style="display:flex; flex-direction:column; gap:10px;">
            <label id="export-opt-filtered-label" style="display:flex; align-items:flex-start; gap:12px; padding:12px 14px; border:2px solid #4338CA; background:#EEF2FF; border-radius:12px; cursor:pointer; transition:all 0.15s;">
              <input type="radio" name="export-scope" value="filtered" id="export-scope-filtered" checked onchange="updateExportSummary()" style="margin-top:3px; width:16px; height:16px; accent-color:#4338CA; cursor:pointer;" />
              <div style="flex:1;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <span style="font-size:13.5px; font-weight:700; color:#1E293B;">ตามตัวกรองปัจจุบัน (Filtered)</span>
                  <span id="export-count-filtered" style="font-size:11px; font-weight:700; background:#DBEAFE; color:#1D4ED8; padding:2px 8px; border-radius:999px;">0 รายการ</span>
                </div>
                <p style="font-size:12px; color:#64748B; margin:3px 0 0 0;">ส่งออกเฉพาะรายชื่อที่ตรงกับตัวกรอง สาขา ชั้นปี สถานะ หรือคำค้นหาปัจจุบัน</p>
              </div>
            </label>

            <label id="export-opt-selected-label" style="display:flex; align-items:flex-start; gap:12px; padding:12px 14px; border:2px solid #E2E8F0; background:#FFFFFF; border-radius:12px; cursor:pointer; transition:all 0.15s;">
              <input type="radio" name="export-scope" value="selected" id="export-scope-selected" onchange="updateExportSummary()" style="margin-top:3px; width:16px; height:16px; accent-color:#4338CA; cursor:pointer;" />
              <div style="flex:1;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <span style="font-size:13.5px; font-weight:700; color:#1E293B;">เฉพาะนิสิตที่ติ๊กเลือก (Selected)</span>
                  <span id="export-count-selected" style="font-size:11px; font-weight:700; background:#F1F5F9; color:#475569; padding:2px 8px; border-radius:999px;">0 รายการ</span>
                </div>
                <p id="export-selected-desc" style="font-size:12px; color:#64748B; margin:3px 0 0 0;">ส่งออกเฉพาะรายชื่อที่คุณติ๊กถูกในช่อง Checkbox ของตาราง</p>
              </div>
            </label>

            <label id="export-opt-all-label" style="display:flex; align-items:flex-start; gap:12px; padding:12px 14px; border:2px solid #E2E8F0; background:#FFFFFF; border-radius:12px; cursor:pointer; transition:all 0.15s;">
              <input type="radio" name="export-scope" value="all" id="export-scope-all" onchange="updateExportSummary()" style="margin-top:3px; width:16px; height:16px; accent-color:#4338CA; cursor:pointer;" />
              <div style="flex:1;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <span id="export-all-title" style="font-size:13.5px; font-weight:700; color:#1E293B;">นิสิตทั้งหมดในระบบ (All Students)</span>
                  <span id="export-count-all" style="font-size:11px; font-weight:700; background:#F1F5F9; color:#475569; padding:2px 8px; border-radius:999px;">0 รายการ</span>
                </div>
                <p style="font-size:12px; color:#64748B; margin:3px 0 0 0;">ส่งออกข้อมูลนิสิตทุกชั้นปีและทุกสถานะในแท็บปัจจุบัน</p>
              </div>
            </label>
          </div>

          <div style="margin-top:14px; padding:10px 14px; background:#F8FAFC; border:1px solid #E2E8F0; border-radius:10px; display:flex; align-items:center; gap:8px;">
            <span class="material-icons" style="font-size:18px; color:#4338CA;">info</span>
            <span id="export-summary-text" style="font-size:12px; color:#334155; font-weight:500;">เตรียมส่งออกข้อมูลนิสิต 0 รายการ</span>
          </div>
        </div>

        <div style="padding:14px 24px; background:#F8FAFC; border-top:1px solid #E2E8F0; display:flex; justify-content:flex-end; gap:8px;">
          <button class="btn btn-outline btn-sm" onclick="closeExportModal()" style="border-radius:10px;">ยกเลิก</button>
          <button id="btn-confirm-export" class="btn btn-primary btn-sm" onclick="confirmExport()" style="border-radius:10px; display:inline-flex; align-items:center; gap:6px; padding:8px 16px;">
            <span class="material-icons" style="font-size:16px;">download</span> ดาวน์โหลดไฟล์ CSV
          </button>
        </div>
      </div>
    </div>

      </main>
    </div>
  </div>
`;

export default function AdminDashboardPage() {
  return (
    <PageShell
      pageKey="dashboard_รายวิชา"
      title={PAGE_TITLE}
      styles={PAGE_STYLES}
      scripts={PAGE_SCRIPTS}
      bodyHtml={PAGE_BODY_HTML}
    >
      <FloatingNotification />
    </PageShell>
  );
}
