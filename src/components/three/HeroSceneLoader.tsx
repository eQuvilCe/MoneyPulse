"use client";

import dynamic from "next/dynamic";

// Client-only, never enters the SSR/Landing text critical path.
const HeroScene = dynamic(() => import("./HeroScene"), { ssr: false });

export default function HeroSceneLoader() {
  return <HeroScene />;
}
