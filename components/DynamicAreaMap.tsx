"use client";

import dynamic from "next/dynamic";

export const DynamicAreaMap = dynamic(
  () => import("@/components/AreaMap").then((module) => module.AreaMap),
  {
    ssr: false,
    loading: () => <div className="empty">Loading map...</div>
  }
);
