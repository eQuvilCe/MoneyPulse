"use client";

import dynamic from "next/dynamic";

const NeuralThreadsScene = dynamic(() => import("./NeuralThreadsScene"), { ssr: false });

export default function NeuralThreadsSceneLoader({ palette }: { palette?: [string, string] }) {
  return <NeuralThreadsScene palette={palette} />;
}
