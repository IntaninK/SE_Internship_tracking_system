"use client";

import React from "react";
import LoginPage from "./LoginPage";
import StudentDashboardPage from "./StudentDashboardPage";
import AdvisorDashboardPage from "./AdvisorDashboardPage";
import AdminDashboardPage from "./AdminDashboardPage";
import PersonalInfoPage from "./PersonalInfoPage";
import CertificatePage from "./CertificatePage";
import CvPage from "./CvPage";
import ProfilePage from "./ProfilePage";
import ChecklistPage from "./ChecklistPage";
import StatusAllPage from "./StatusAllPage";
import SubmissionStatusPage from "./SubmissionStatusPage";
import AdvisorChecklistReviewPage from "./AdvisorChecklistReviewPage";
import AdminStudentDetailPage from "./AdminStudentDetailPage";

export const PAGE_COMPONENTS: Record<string, React.ComponentType> = {
  // Clean Routes (แบบที่ 1: มาตรฐาน Clean URL สากล)
  "admin-dashboard": AdminDashboardPage,
  "advisor-dashboard": AdvisorDashboardPage,
  "student-dashboard": StudentDashboardPage,
  "admin-student-detail": AdminStudentDetailPage,
  "advisor-checklist-review": AdvisorChecklistReviewPage,
  "login": LoginPage,
  "personal-info": PersonalInfoPage,
  "certificate": CertificatePage,
  "cv": CvPage,
  "profile": ProfilePage,
  "checklist": ChecklistPage,
  "status-all": StatusAllPage,
  "submission-status": SubmissionStatusPage,

  // PascalCase aliases
  "AdminDashboard": AdminDashboardPage,
  "AdvisorDashboard": AdvisorDashboardPage,
  "StudentDashboard": StudentDashboardPage,
  "AdminStudentDetail": AdminStudentDetailPage,
  "AdvisorChecklistReview": AdvisorChecklistReviewPage,
  "LoginPage": LoginPage,
  "PersonalInfo": PersonalInfoPage,
  "CertificatePage": CertificatePage,
  "CvPage": CvPage,
  "ProfilePage": ProfilePage,
  "ChecklistPage": ChecklistPage,
  "StatusAllPage": StatusAllPage,
  "SubmissionStatusPage": SubmissionStatusPage,

  // Legacy aliases (รองรับลิงก์เก่าทั้งภาษาไทยและอังกฤษ)
  "dashboard": StudentDashboardPage,
  "dashboard_student": StudentDashboardPage,
  "dashboard_นิสิต": StudentDashboardPage,
  "dashboard_ที่ปรึกษา": AdvisorDashboardPage,
  "dashboard_advisor": AdvisorDashboardPage,
  "dashboard_รายวิชา": AdminDashboardPage,
  "dashboard_admin": AdminDashboardPage,
  "Personal_Information": PersonalInfoPage,
  "personal_info": PersonalInfoPage,
  "Certificate": CertificatePage,
  "CV": CvPage,
  "Profile": ProfilePage,
  "proflie": ProfilePage,
  "status_all": StatusAllPage,
  "submission_status": SubmissionStatusPage,
  "advisor_checklist_review": AdvisorChecklistReviewPage,
  "admin_student_detail": AdminStudentDetailPage,
};

export const CLEAN_ROUTE_MAP: Record<string, string> = {
  "dashboard_รายวิชา": "/admin-dashboard",
  "dashboard_admin": "/admin-dashboard",
  "admin-dashboard": "/admin-dashboard",
  "admindashboard": "/admin-dashboard",
  "dashboard_ที่ปรึกษา": "/advisor-dashboard",
  "dashboard_advisor": "/advisor-dashboard",
  "advisor-dashboard": "/advisor-dashboard",
  "advisordashboard": "/advisor-dashboard",
  "dashboard": "/student-dashboard",
  "dashboard_student": "/student-dashboard",
  "dashboard_นิสิต": "/student-dashboard",
  "student-dashboard": "/student-dashboard",
  "studentdashboard": "/student-dashboard",
  "admin_student_detail": "/admin-student-detail",
  "admin-student-detail": "/admin-student-detail",
  "advisor_checklist_review": "/advisor-checklist-review",
  "advisor-checklist-review": "/advisor-checklist-review",
  "personal_information": "/personal-info",
  "personal_info": "/personal-info",
  "personal-info": "/personal-info",
  "certificate": "/certificate",
  "cv": "/cv",
  "profile": "/profile",
  "proflie": "/profile",
  "checklist": "/checklist",
  "status_all": "/status-all",
  "status-all": "/status-all",
  "submission_status": "/submission-status",
  "submission-status": "/submission-status",
  "login": "/login",
};

export function getCleanRoute(slugOrPath: string): string | null {
  const clean = decodeURIComponent(slugOrPath || "")
    .replace(/^\/pages\//i, "")
    .replace(/^\//i, "")
    .replace(/\.html$/i, "")
    .trim();
  if (CLEAN_ROUTE_MAP[clean]) return CLEAN_ROUTE_MAP[clean];
  const lower = clean.toLowerCase();
  return CLEAN_ROUTE_MAP[lower] || null;
}

export function resolvePageComponent(rawSlug: string): React.ComponentType | null {
  const decoded = decodeURIComponent(rawSlug || "").replace(/\.html$/i, "").trim();
  if (PAGE_COMPONENTS[decoded]) {
    return PAGE_COMPONENTS[decoded];
  }
  const lower = decoded.toLowerCase().replace(/_/g, "-");
  for (const [k, Comp] of Object.entries(PAGE_COMPONENTS)) {
    if (k.toLowerCase().replace(/_/g, "-") === lower) {
      return Comp;
    }
  }
  return null;
}

export {
  LoginPage,
  StudentDashboardPage,
  AdvisorDashboardPage,
  AdminDashboardPage,
  PersonalInfoPage,
  CertificatePage,
  CvPage,
  ProfilePage,
  ChecklistPage,
  StatusAllPage,
  SubmissionStatusPage,
  AdvisorChecklistReviewPage,
  AdminStudentDetailPage,
};
