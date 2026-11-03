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
  "login": LoginPage,
  "dashboard": StudentDashboardPage,
  "dashboard_ที่ปรึกษา": AdvisorDashboardPage,
  "dashboard_รายวิชา": AdminDashboardPage,
  "Personal_Information": PersonalInfoPage,
  "Certificate": CertificatePage,
  "CV": CvPage,
  "Profile": ProfilePage,
  "checklist": ChecklistPage,
  "status_all": StatusAllPage,
  "submission_status": SubmissionStatusPage,
  "advisor_checklist_review": AdvisorChecklistReviewPage,
  "admin_student_detail": AdminStudentDetailPage,
};

export function resolvePageComponent(rawSlug: string): React.ComponentType | null {
  const decoded = decodeURIComponent(rawSlug || "").replace(/\.html$/i, "");
  if (PAGE_COMPONENTS[decoded]) {
    return PAGE_COMPONENTS[decoded];
  }
  const lower = decoded.toLowerCase();
  for (const [k, Comp] of Object.entries(PAGE_COMPONENTS)) {
    if (k.toLowerCase() === lower) {
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
