"use client";

import dynamic from "next/dynamic";

const PulseOrbScene = dynamic(() => import("./PulseOrbScene"), { ssr: false });

export default function PulseOrbSceneLoader({ health, size }: { health: number; size?: number }) {
  return <PulseOrbScene health={health} size={size} />;
}
