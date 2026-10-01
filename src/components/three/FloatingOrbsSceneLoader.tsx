"use client";

import dynamic from "next/dynamic";

const FloatingOrbsScene = dynamic(() => import("./FloatingOrbsScene"), { ssr: false });

export default function FloatingOrbsSceneLoader() {
  return <FloatingOrbsScene />;
}
