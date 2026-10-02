"use client";

import type { ComponentType } from "react";
import AuroraBackground from "@/components/fx/AuroraBackground";
import DepthScene from "@/components/fx/DepthScene";
import ParticleField from "@/components/fx/ParticleField";
import HeatDriftField from "@/components/fx/HeatDriftField";
import DashboardSceneGate from "@/components/three/DashboardSceneGate";
import DataTerrainSceneGate from "@/components/three/DataTerrainSceneGate";
import LaserScanSceneGate from "@/components/three/LaserScanSceneGate";
import FloatingOrbsSceneGate from "@/components/three/FloatingOrbsSceneGate";
import NeuralThreadsSceneGate from "@/components/three/NeuralThreadsSceneGate";

type AccentKey = "cyan" | "violet" | "amber" | "emerald" | "rose" | "blue" | "teal" | "sky";

type Accent = {
  /** Matches a `.page-accent-*` class in globals.css — lets page content opt into var(--page-accent). */
  className: string;
  /** Three "R,G,B" triplets for AuroraBackground/DepthScene's three blobs. */
  palette: [string, string, string];
  /** "R,G,B" triplet for ParticleField's dots. */
  particle: string;
  /** "R,G,B" triplet for ParticleField's connecting lines. */
  line: string;
};

const ACCENTS: Record<AccentKey, Accent> = {
  cyan: { className: "page-accent-cyan", palette: ["60,242,176", "56,189,248", "139,92,246"], particle: "56,189,248", line: "60,242,176" },
  violet: { className: "page-accent-violet", palette: ["139,92,246", "217,70,239", "56,189,248"], particle: "217,70,239", line: "139,92,246" },
  amber: { className: "page-accent-amber", palette: ["245,158,11", "251,146,60", "139,92,246"], particle: "251,146,60", line: "245,158,11" },
  emerald: { className: "page-accent-emerald", palette: ["52,211,153", "16,185,129", "56,189,248"], particle: "52,211,153", line: "16,185,129" },
  rose: { className: "page-accent-rose", palette: ["251,113,133", "244,63,94", "139,92,246"], particle: "251,113,133", line: "244,63,94" },
  blue: { className: "page-accent-blue", palette: ["96,165,250", "59,130,246", "139,92,246"], particle: "96,165,250", line: "59,130,246" },
  teal: { className: "page-accent-teal", palette: ["45,212,191", "20,184,166", "56,189,248"], particle: "45,212,191", line: "20,184,166" },
  sky: { className: "page-accent-sky", palette: ["125,211,252", "56,189,248", "139,92,246"], particle: "125,211,252", line: "56,189,248" },
};

// Hex equivalents of each accent's RGB triplet above (ACCENTS stores "R,G,B" strings for
// CSS rgba() use — these WebGL scenes take hex colors instead, so the pairs are restated here).
const HEX = {
  emerald: ["#34d399", "#10b981"] as [string, string],
  amber: ["#f59e0b", "#fb923c"] as [string, string],
  rose: ["#fb7185", "#f43f5e"] as [string, string],
};

/** FloatingOrbsSceneGate defaults to violet/fuchsia (for /goals) — /family and /income reuse it tinted emerald instead. */
function EmeraldOrbsSceneGate() {
  return <FloatingOrbsSceneGate palette={HEX.emerald} />;
}

/** FloatingOrbsSceneGate tinted amber, for /budgets. */
function BudgetsOrbsSceneGate() {
  return <FloatingOrbsSceneGate palette={HEX.amber} />;
}

/** LaserScanSceneGate defaults to sky-blue (for /scan) — /banks reuses it tinted rose instead. */
function BanksLaserSceneGate() {
  return <LaserScanSceneGate palette={HEX.rose} />;
}

type CssLayer = "aurora" | "depth" | "particles-only";

type RouteConfig = {
  accent: AccentKey;
  cssLayer: CssLayer;
  /** Self-gating scene component (handles its own useWebglAllowed/WebGLErrorBoundary), or none. */
  Scene?: ComponentType;
  /** Extra always-on canvas2D layer (cheap enough to skip the WebGL gate entirely). */
  heatDrift?: boolean;
};

const ROUTES: Record<string, RouteConfig> = {
  "/": { accent: "cyan", cssLayer: "aurora", Scene: DashboardSceneGate },
  "/analytics": { accent: "blue", cssLayer: "aurora", Scene: DataTerrainSceneGate },
  "/forecast": { accent: "blue", cssLayer: "depth", Scene: DataTerrainSceneGate },
  "/scan": { accent: "sky", cssLayer: "aurora", Scene: LaserScanSceneGate },
  "/goals": { accent: "violet", cssLayer: "depth", Scene: FloatingOrbsSceneGate },
  "/calendar": { accent: "teal", cssLayer: "aurora", heatDrift: true },
  "/family": { accent: "emerald", cssLayer: "aurora", Scene: EmeraldOrbsSceneGate },
  "/ai": { accent: "sky", cssLayer: "depth", Scene: NeuralThreadsSceneGate },
  "/banks": { accent: "rose", cssLayer: "aurora", Scene: BanksLaserSceneGate },
  "/budgets": { accent: "amber", cssLayer: "depth", Scene: BudgetsOrbsSceneGate },
  "/expenses": { accent: "amber", cssLayer: "aurora" },
  "/income": { accent: "emerald", cssLayer: "depth", Scene: EmeraldOrbsSceneGate },
  "/settings": { accent: "cyan", cssLayer: "aurora" },
  "/subscriptions": { accent: "rose", cssLayer: "depth" },
};

const DEFAULT_CONFIG: RouteConfig = { accent: "cyan", cssLayer: "aurora" };

function resolveConfig(pathname: string): RouteConfig {
  if (ROUTES[pathname]) return ROUTES[pathname];
  const segment = "/" + (pathname.split("/")[1] ?? "");
  return ROUTES[segment] ?? DEFAULT_CONFIG;
}

/**
 * Single mount point for every authenticated page's "live" background — replaces the
 * old blanket AmbientBg. Picks ONE accent + CSS layer + (at most) one self-gating WebGL
 * scene per route, so only one <Canvas> is ever mounted at a time no matter how many
 * pages get a bespoke 3D moment. See BackgroundStage usage in AuthShell.tsx.
 */
export default function BackgroundStage({ pathname }: { pathname: string }) {
  const config = resolveConfig(pathname);
  const accent = ACCENTS[config.accent];
  const Scene = config.Scene;

  return (
    <div className={`pointer-events-none fixed inset-0 z-0 overflow-hidden ${accent.className}`} aria-hidden>
      {config.cssLayer === "aurora" && (
        <>
          <AuroraBackground intensity={1.5} palette={accent.palette} />
          <ParticleField density="app" colorRgb={accent.particle} lineRgb={accent.line} />
        </>
      )}
      {config.cssLayer === "depth" && <DepthScene palette={accent.palette} />}
      {config.cssLayer === "particles-only" && (
        <ParticleField density="app" colorRgb={accent.particle} lineRgb={accent.line} />
      )}
      {config.heatDrift && <HeatDriftField colorRgb={accent.particle} />}
      <div className="mp-grain opacity-[0.03]" />
      {Scene && <Scene />}
    </div>
  );
}
