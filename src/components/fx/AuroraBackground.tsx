"use client";

export default function AuroraBackground({ intensity = 1 }: { intensity?: number }) {
  const o = 0.55 * intensity;
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
      <div
        className="mp-aurora-blob absolute -left-[20%] -top-[10%] h-[70vmax] w-[70vmax] rounded-full blur-[60px] md:blur-[100px]"
        style={{
          background: `radial-gradient(circle, rgba(60,242,176,${0.22 * intensity}) 0%, transparent 65%)`,
          opacity: o,
          animationName: "mp-aurora-a",
          animationDuration: "28s",
          animationTimingFunction: "ease-in-out",
          animationIterationCount: "infinite",
        }}
      />
      <div
        className="mp-aurora-blob absolute -right-[15%] top-[20%] h-[60vmax] w-[60vmax] rounded-full blur-[70px] md:blur-[110px]"
        style={{
          background: `radial-gradient(circle, rgba(56,189,248,${0.2 * intensity}) 0%, transparent 65%)`,
          opacity: o,
          animationName: "mp-aurora-b",
          animationDuration: "32s",
          animationTimingFunction: "ease-in-out",
          animationIterationCount: "infinite",
        }}
      />
      <div
        className="mp-aurora-blob absolute bottom-[-20%] left-[30%] h-[55vmax] w-[55vmax] rounded-full blur-[80px] md:blur-[120px]"
        style={{
          background: `radial-gradient(circle, rgba(139,92,246,${0.16 * intensity}) 0%, transparent 65%)`,
          opacity: o,
          animationName: "mp-aurora-c",
          animationDuration: "26s",
          animationTimingFunction: "ease-in-out",
          animationIterationCount: "infinite",
        }}
      />
      <div
        className="absolute inset-0 hidden opacity-[0.18] md:block"
        style={{
          backgroundImage: "radial-gradient(rgba(148,163,184,0.35) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
          maskImage: "radial-gradient(ellipse at center, #000 20%, transparent 75%)",
          WebkitMaskImage: "radial-gradient(ellipse at center, #000 20%, transparent 75%)",
        }}
      />
    </div>
  );
}
