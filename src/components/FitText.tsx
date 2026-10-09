"use client";

import { ReactNode, useEffect, useRef, useState } from "react";

/**
 * Keeps one line of text inside its box: when the content is wider than the
 * available space it scales down (to `min`) instead of overflowing the card.
 * Anything still too wide at `min` is clipped — pair with a compact formatter.
 */
export default function FitText({
  children,
  min = 0.6,
  className = "",
  title,
}: {
  children: ReactNode;
  min?: number;
  className?: string;
  title?: string;
}) {
  const outer = useRef<HTMLSpanElement>(null);
  const inner = useRef<HTMLSpanElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const o = outer.current;
    const i = inner.current;
    if (!o || !i || typeof ResizeObserver === "undefined") return;
    // ResizeObserver fires once on observe(), so the first measurement happens there.
    const ro = new ResizeObserver(() => {
      const avail = o.clientWidth;
      const need = i.scrollWidth; // layout width — unaffected by the transform below
      setScale(avail > 0 && need > avail ? Math.max(min, avail / need) : 1);
    });
    ro.observe(o);
    ro.observe(i);
    return () => ro.disconnect();
  }, [min]);

  return (
    <span ref={outer} title={title} className={`block min-w-0 max-w-full overflow-hidden ${className}`}>
      <span
        ref={inner}
        className="inline-block origin-left whitespace-nowrap align-bottom"
        style={{ transform: scale === 1 ? undefined : `scale(${scale})` }}
      >
        {children}
      </span>
    </span>
  );
}
