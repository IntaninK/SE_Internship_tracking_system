"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";

export type NotificationCategory = "advisor" | "placement" | "mismatch" | "readiness";

export interface FloatingNotificationItem {
  id: string;
  category: NotificationCategory;
  message: string;
  createdAt: string;
  read: boolean;
}

interface FloatingNotificationProps {
  initialNotifications?: FloatingNotificationItem[];
  onViewAll?: () => void;
}

const MOCK_NOTIFICATIONS: FloatingNotificationItem[] = [
  {
    id: "missing-advisor",
    category: "advisor",
    message: "มีนิสิตที่ยังไม่มีอาจารย์ที่ปรึกษา",
    createdAt: new Date(Date.now() - 5 * 60_000).toISOString(),
    read: false,
  },
  {
    id: "placement-pending",
    category: "placement",
    message: "มีรายการสถานที่ฝึกงานรออนุมัติ",
    createdAt: new Date(Date.now() - 25 * 60_000).toISOString(),
    read: false,
  },
  {
    id: "placement-mismatch",
    category: "mismatch",
    message: "[REQ-06] บริษัทที่นิสิตเข้าฝึกไม่ตรงกับ Checklist",
    createdAt: new Date(Date.now() - 60 * 60_000).toISOString(),
    read: false,
  },
  {
    id: "readiness-failed",
    category: "readiness",
    message: "มีนิสิตตกเกณฑ์การเตรียมความพร้อมก่อนฝึกงาน",
    createdAt: new Date(Date.now() - 3 * 60 * 60_000).toISOString(),
    read: true,
  },
];

const CATEGORY_ICON: Record<NotificationCategory, string> = {
  advisor: "person_off",
  placement: "pending_actions",
  mismatch: "business",
  readiness: "assignment_late",
};

const CATEGORY_ICON_CLASS: Record<NotificationCategory, string> = {
  advisor: "bg-red-50 text-red-600",
  placement: "bg-amber-50 text-amber-600",
  mismatch: "bg-orange-50 text-orange-600",
  readiness: "bg-rose-50 text-rose-600",
};

function formatRelativeTime(createdAt: string): string {
  const timestamp = new Date(createdAt).getTime();
  if (!Number.isFinite(timestamp)) return "ไม่ทราบเวลา";

  const elapsedMinutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60_000));
  const formatter = new Intl.RelativeTimeFormat("th", { numeric: "auto" });

  if (elapsedMinutes < 60) {
    return formatter.format(-elapsedMinutes, "minute");
  }

  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) {
    return formatter.format(-elapsedHours, "hour");
  }

  return formatter.format(-Math.floor(elapsedHours / 24), "day");
}

export default function FloatingNotification({
  initialNotifications = MOCK_NOTIFICATIONS,
  onViewAll,
}: FloatingNotificationProps) {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [isOpen, setIsOpen] = useState(false);
  const [isPanelMounted, setIsPanelMounted] = useState(false);
  const [panelPhase, setPanelPhase] = useState<"enter" | "exit">("enter");
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unreadCount = notifications.filter((notification) => !notification.read).length;

  useEffect(() => {
    setNotifications(initialNotifications);
  }, [initialNotifications]);

  const closePanel = useCallback(() => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    setIsOpen(false);
    setPanelPhase("exit");
    closeTimerRef.current = setTimeout(() => {
      setIsPanelMounted(false);
      closeTimerRef.current = null;
    }, 160);
  }, []);

  const togglePanel = () => {
    if (isOpen) {
      closePanel();
      return;
    }

    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = null;
    setPanelPhase("enter");
    setIsPanelMounted(true);
    setIsOpen(true);
  };

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        closePanel();
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closePanel();
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [closePanel, isOpen]);

  useEffect(
    () => () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    },
    []
  );

  const markAsRead = (id: string) => {
    setNotifications((current) =>
      current.map((notification) =>
        notification.id === id ? { ...notification, read: true } : notification
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications((current) =>
      current.map((notification) => ({ ...notification, read: true }))
    );
  };

  return (
    <>
      <style>{`
        @keyframes floating-notification-enter {
          from { opacity: 0; transform: translateY(8px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes floating-notification-exit {
          from { opacity: 1; transform: translateY(0) scale(1); }
          to { opacity: 0; transform: translateY(8px) scale(0.95); }
        }
        .floating-notification-panel-enter {
          transform-origin: bottom right;
          animation: floating-notification-enter 160ms ease-out both;
        }
        .floating-notification-panel-exit {
          transform-origin: bottom right;
          animation: floating-notification-exit 160ms ease-in both;
          pointer-events: none;
        }
        .floating-notification-scroll {
          scrollbar-width: thin;
          scrollbar-color: #CBD5E1 transparent;
        }
        .floating-notification-scroll::-webkit-scrollbar { width: 4px; }
        .floating-notification-scroll::-webkit-scrollbar-thumb {
          border-radius: 999px;
          background: #CBD5E1;
        }
      `}</style>
      <div ref={containerRef} className="fixed bottom-6 right-6 z-50">
      {isPanelMounted && (
        <section
          id="floating-notification-panel"
          aria-labelledby="floating-notification-title"
          aria-modal="false"
          role="dialog"
          className={`absolute bottom-full right-0 mb-3 flex max-h-[70vh] w-[380px] max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl max-[480px]:right-[-12px] max-[480px]:w-[calc(100vw-24px)] max-[480px]:max-w-[calc(100vw-24px)] ${
            panelPhase === "enter"
              ? "floating-notification-panel-enter"
              : "floating-notification-panel-exit"
          }`}
        >
          <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
            <div className="flex min-w-0 items-center gap-2">
              <span className="material-icons text-xl text-blue-800" aria-hidden="true">
                notifications
              </span>
              <h2
                id="floating-notification-title"
                className="truncate text-base font-bold text-slate-900"
              >
                การแจ้งเตือน
              </h2>
              {unreadCount > 0 && (
                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
                  {unreadCount} ใหม่
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={markAllAsRead}
              disabled={unreadCount === 0}
              className="shrink-0 border-0 bg-transparent px-1 py-1 text-sm font-medium text-blue-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 disabled:cursor-default disabled:text-slate-400 disabled:hover:no-underline"
            >
              อ่านทั้งหมด
            </button>
          </header>

          <div className="floating-notification-scroll min-h-0 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                <span className="material-icons text-4xl text-slate-300" aria-hidden="true">
                  notifications_none
                </span>
                <p className="text-sm text-slate-500">ไม่มีการแจ้งเตือนใหม่</p>
              </div>
            ) : (
              <ul aria-label="รายการแจ้งเตือน">
                {notifications.map((notification) => (
                  <li key={notification.id} className="border-b border-slate-100 last:border-b-0">
                    <button
                      type="button"
                      onClick={() => markAsRead(notification.id)}
                      aria-label={`${notification.message} ${formatRelativeTime(notification.createdAt)}${notification.read ? "" : " ยังไม่อ่าน"}`}
                      className={`flex w-full cursor-pointer items-start gap-3 border-0 px-4 py-3 text-left outline-none transition-colors hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-300 ${
                        notification.read ? "bg-white" : "bg-blue-50/40"
                      }`}
                    >
                      <span
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${CATEGORY_ICON_CLASS[notification.category]}`}
                        aria-hidden="true"
                      >
                        <span className="material-icons block h-5 w-5 text-center text-xl leading-none">
                          {CATEGORY_ICON[notification.category]}
                        </span>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={`line-clamp-2 block text-sm leading-5 ${
                          notification.read
                            ? "font-medium text-slate-500"
                            : "font-semibold text-slate-800"
                        }`}>
                          {notification.message}
                        </span>
                        <time
                          dateTime={notification.createdAt}
                          className="mt-1 block text-xs text-slate-400"
                        >
                          {formatRelativeTime(notification.createdAt)}
                        </time>
                      </span>
                      {!notification.read && (
                        <span
                          className="h-2 w-2 shrink-0 self-center rounded-full bg-blue-600"
                          aria-label="ยังไม่ได้อ่าน"
                        />
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              onViewAll?.();
              closePanel();
            }}
            className="w-full border-0 border-t border-slate-100 bg-slate-50 px-4 py-3 text-center text-sm font-semibold text-blue-700 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-300"
          >
            ดูการแจ้งเตือนทั้งหมด
          </button>
        </section>
      )}

      <button
        ref={triggerRef}
        type="button"
        aria-label="การแจ้งเตือน"
        aria-expanded={isOpen}
        aria-controls="floating-notification-panel"
        onClick={togglePanel}
        className={`relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br text-white shadow-lg shadow-blue-500/30 transition-transform duration-200 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-2 ${
          isOpen ? "from-blue-800 to-blue-900" : "from-blue-600 to-blue-800"
        }`}
      >
        <span className="material-icons text-[26px]" aria-hidden="true">
          {isOpen ? "close" : "notifications"}
        </span>
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1">
            <span className="absolute inset-0 animate-ping rounded-full bg-red-500/70" />
            <span
              aria-label={`${unreadCount} รายการที่ยังไม่ได้อ่าน`}
              className="relative flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          </span>
        )}
      </button>
    </div>
    </>
  );
}
