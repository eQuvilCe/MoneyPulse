"use client";

import dynamic from "next/dynamic";

const LaserScanScene = dynamic(() => import("./LaserScanScene"), { ssr: false });

export default function LaserScanSceneLoader({ palette }: { palette?: [string, string] }) {
  return <LaserScanScene palette={palette} />;
}
