"use client";

import React, { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { PAGE_TEMPLATES, PageTemplate } from "../../../templates/pageTemplates";

function findTemplate(rawSlug: string): { key: string; template: PageTemplate } | null {
  const decoded = decodeURIComponent(rawSlug || "").replace(/\.html$/i, "");
  if (PAGE_TEMPLATES[decoded]) {
    return { key: decoded, template: PAGE_TEMPLATES[decoded] };
  }
  const lower = decoded.toLowerCase();
  for (const [k, v] of Object.entries(PAGE_TEMPLATES)) {
    if (k.toLowerCase() === lower) {
      return { key: k, template: v };
    }
  }
  return null;
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

export default function DynamicLegacyPage() {
  const params = useParams();
  const rawSlug = Array.isArray(params?.slug) ? params.slug[0] : (params?.slug as string) || "";
  const match = findTemplate(rawSlug);

  const [authorized, setAuthorized] = useState<boolean>(false);
  const scriptsExecutedRef = useRef<boolean>(false);

  useEffect(() => {
    if (!match) return;
    const isLoginPage = match.key.toLowerCase() === "login";

    fetch("/auth/me")
      .then((res) => res.json())
      .then((data) => {
        const isAuth = Boolean(data && data.authenticated && data.user);
        if (isLoginPage) {
          if (isAuth) {
            const role = data.user.role;
            if (role === "STAFF" || role === "ADMIN") {
              window.location.replace("/pages/dashboard_รายวิชา.html");
            } else if (role === "ADVISOR") {
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
  }, [match]);

  useEffect(() => {
    if (!authorized || !match || scriptsExecutedRef.current) return;
    scriptsExecutedRef.current = true;

    const { template } = match;
    if (template.title) {
      document.title = template.title;
    }

    (async () => {
      const w = window as any;
      w.__scriptsLoading = true;
      w.__domReadyQueue = [];

      for (const src of template.scripts) {
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
  }, [authorized, match]);

  if (!match) {
    return (
      <div className="flex items-center justify-center min-h-screen text-gray-600">
        ไม่พบหน้าที่ต้องการ (404)
      </div>
    );
  }

  if (!authorized) {
    return null;
  }

  return (
    <>
      {match.template.styles.map((css, idx) => (
        <style key={idx} dangerouslySetInnerHTML={{ __html: css }} />
      ))}
      <div dangerouslySetInnerHTML={{ __html: match.template.bodyHtml }} />
    </>
  );
}

