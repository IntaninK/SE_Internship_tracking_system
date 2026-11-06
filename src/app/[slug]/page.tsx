"use client";

import React from "react";
import { useParams } from "next/navigation";
import { resolvePageComponent } from "../../components/pages";

export default function DynamicCleanRoute() {
  const params = useParams();
  const rawSlug = Array.isArray(params?.slug)
    ? params.slug[0]
    : (params?.slug as string) || "";
  const PageComponent = resolvePageComponent(rawSlug);

  if (!PageComponent) {
    return (
      <div className="flex items-center justify-center min-h-screen text-gray-600">
        ไม่พบหน้าที่ต้องการ (404)
      </div>
    );
  }

  return <PageComponent />;
}

