"use client";

import dynamic from "next/dynamic";

const LaserScanScene = dynamic(() => import("./LaserScanScene"), { ssr: false });

export default function LaserScanSceneLoader() {
  return <LaserScanScene />;
}
