"use client";

import dynamic from "next/dynamic";

const DataTerrainScene = dynamic(() => import("./DataTerrainScene"), { ssr: false });

export default function DataTerrainSceneLoader() {
  return <DataTerrainScene />;
}
