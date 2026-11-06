import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  async redirects() {
    return [
      {
        source: "/pages/dashboard_รายวิชา.html",
        destination: "/admin-dashboard",
        permanent: false,
      },
      {
        source: "/pages/dashboard_ที่ปรึกษา.html",
        destination: "/advisor-dashboard",
        permanent: false,
      },
      {
        source: "/pages/dashboard.html",
        destination: "/student-dashboard",
        permanent: false,
      },
      {
        source: "/pages/dashboard_student.html",
        destination: "/student-dashboard",
        permanent: false,
      },
      {
        source: "/pages/login.html",
        destination: "/login",
        permanent: false,
      },
      {
        source: "/pages/admin_student_detail.html",
        destination: "/admin-student-detail",
        permanent: false,
      },
      {
        source: "/pages/advisor_checklist_review.html",
        destination: "/advisor-checklist-review",
        permanent: false,
      },
      {
        source: "/pages/status_all.html",
        destination: "/status-all",
        permanent: false,
      },
      {
        source: "/pages/checklist.html",
        destination: "/checklist",
        permanent: false,
      },
      {
        source: "/pages/Certificate.html",
        destination: "/certificate",
        permanent: false,
      },
      {
        source: "/pages/Personal_Information.html",
        destination: "/personal-info",
        permanent: false,
      },
      {
        source: "/pages/Profile.html",
        destination: "/profile",
        permanent: false,
      },
      {
        source: "/pages/CV.html",
        destination: "/cv",
        permanent: false,
      },
      {
        source: "/dashboard",
        destination: "/student-dashboard",
        permanent: false,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/auth/:path*",
        destination: "/api/auth/:path*",
      },
    ];
  },
};

export default nextConfig;
