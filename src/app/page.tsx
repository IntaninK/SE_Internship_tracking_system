"use client";

import { useEffect } from "react";

export default function HomePage() {
  useEffect(() => {
    fetch("/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data && data.authenticated && data.user) {
          const role = data.user.role;
          if (role === "STAFF" || role === "ADMIN") {
            window.location.replace("/pages/dashboard_รายวิชา.html");
          } else if (role === "ADVISOR") {
            window.location.replace("/pages/dashboard_ที่ปรึกษา.html");
          } else {
            window.location.replace("/pages/dashboard.html");
          }
        } else {
          window.location.replace("/pages/login.html");
        }
      })
      .catch(() => {
        window.location.replace("/pages/login.html");
      });
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen text-gray-500 text-sm">
      กำลังเข้าสู่ระบบ...
    </div>
  );
}

