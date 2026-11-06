"use client";

import React, { useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { resolvePageComponent, getCleanRoute } from "../../../components/pages";

export default function DynamicPageRoute() {
  const params = useParams();
  const searchParams = useSearchParams();

  const rawSlug = Array.isArray(params?.slug)
    ? params.slug[0]
    : (params?.slug as string) || "";

  useEffect(() => {
    const cleanRoute = getCleanRoute(rawSlug);
    if (cleanRoute) {
      const qs = searchParams ? searchParams.toString() : "";
      const dest = qs ? `${cleanRoute}?${qs}` : cleanRoute;
      window.location.replace(dest);
    }
  }, [rawSlug, searchParams]);

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
