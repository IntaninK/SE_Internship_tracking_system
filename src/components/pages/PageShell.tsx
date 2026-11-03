"use client";

import React, { useEffect, useState, useRef } from "react";

export interface PageShellProps {
  pageKey: string;
  title: string;
  styles: string[];
  scripts: string[];
  bodyHtml: string;
}

function resolveScriptUrl(src: string): string {
  const clean = src.replace(/^\.\.\//, "/").replace(/^\.\//, "/");
  if (clean.startsWith("/components/") || clean.startsWith("/api/")) {
    return `/client-scripts${clean}`;
  }
  return clean;
}

function loadScriptSequential(src: string): Promise<void> {
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = `${resolveScriptUrl(src)}?v=${Date.now()}`;
    script.async = false;
    script.onload = () => resolve();
    script.onerror = () => {
      console.error(`Failed to load script: ${src}`);
      resolve();
    };
    document.body.appendChild(script);
  });
}

export default function PageShell({
  pageKey,
  title,
  styles,
  scripts,
  bodyHtml,
}: PageShellProps) {
  const [authorized, setAuthorized] = useState<boolean>(false);
  const scriptsExecutedRef = useRef<boolean>(false);

  useEffect(() => {
    const isLoginPage = pageKey.toLowerCase() === "login";

    fetch("/auth/me")
      .then((res) => res.json())
      .then((data) => {
        const isAuth = Boolean(data && data.authenticated && data.user);
        if (isLoginPage) {
          if (isAuth) {
            const role = data.user.role;
            const isCourseAdminOrStaff = Boolean(
              data.user.isCourseAdmin ||
                data.user.isStaff ||
                role === "STAFF" ||
                role === "ADMIN"
            );
            const isAdvOrSup = Boolean(
              data.user.isAdvisor ||
                data.user.isSupervisor ||
                role === "ADVISOR"
            );
            if (isCourseAdminOrStaff) {
              window.location.replace("/pages/dashboard_รายวิชา.html");
            } else if (isAdvOrSup) {
              window.location.replace("/pages/dashboard_ที่ปรึกษา.html");
            } else {
              window.location.replace("/pages/dashboard.html");
            }
            return;
          }
          setAuthorized(true);
        } else {
          if (!isAuth) {
            window.location.replace("/pages/login.html");
            return;
          }
          setAuthorized(true);
        }
      })
      .catch(() => {
        if (isLoginPage) {
          setAuthorized(true);
        } else {
          window.location.replace("/pages/login.html");
        }
      });
  }, [pageKey]);

  useEffect(() => {
    if (!authorized || scriptsExecutedRef.current) return;
    scriptsExecutedRef.current = true;

    if (title) {
      document.title = title;
    }

    (async () => {
      const w = window as any;
      w.__scriptsLoading = true;
      w.__domReadyQueue = [];

      for (const src of scripts) {
        await loadScriptSequential(src);
      }

      w.__scriptsLoading = false;
      const queue: any[] = w.__domReadyQueue || [];
      w.__domReadyQueue = [];

      for (const listener of queue) {
        try {
          if (typeof listener === "function") {
            listener(new Event("DOMContentLoaded"));
          } else if (listener && typeof listener.handleEvent === "function") {
            listener.handleEvent(new Event("DOMContentLoaded"));
          }
        } catch (err) {
          console.error("Error in DOMContentLoaded handler:", err);
        }
      }
    })();
  }, [authorized, title, scripts]);

  if (!authorized) {
    return null;
  }

  return (
    <>
      {styles.map((css, idx) => (
        <style key={idx} dangerouslySetInnerHTML={{ __html: css }} />
      ))}
      <div dangerouslySetInnerHTML={{ __html: bodyHtml }} />
    </>
  );
}

