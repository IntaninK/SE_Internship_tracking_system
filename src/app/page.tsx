"use client";

import { useEffect } from "react";

export default function HomePage() {
  useEffect(() => {
    fetch("/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data && data.authenticated && data.user) {
          const role = data.user.role;
          if (role === "STAFF" || role === "ADMIN" || data.user.isStaff || data.user.isCourseAdmin) {
            window.location.replace("/admin-dashboard");
          } else if (role === "ADVISOR" || data.user.isAdvisor || data.user.isSupervisor) {
            window.location.replace("/advisor-dashboard");
          } else {
            window.location.replace("/student-dashboard");
          }
        } else {
          window.location.replace("/login");
        }
      })
      .catch(() => {
        window.location.replace("/login");
      });
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen text-gray-500 text-sm">
      กำลังเข้าสู่ระบบ...
    </div>
  );
}
