"use client";

import dynamic from "next/dynamic";

const DashboardScene = dynamic(() => import("./DashboardScene"), { ssr: false });

export default function DashboardSceneLoader() {
  return <DashboardScene />;
}
