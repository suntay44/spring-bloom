"use client";

/**
 * Lightweight scroll-triggered fade/slide animation.
 * Uses IntersectionObserver + CSS classes — zero JS animation libraries.
 * Respects prefers-reduced-motion automatically via CSS.
 */

import { useEffect, useRef, type ReactNode } from "react";

interface AnimateInProps {
  children: ReactNode;
  className?: string;
  delay?: number; // ms
  from?: "bottom" | "left" | "right" | "fade";
}

export function AnimateIn({ children, className = "", delay = 0, from = "bottom" }: AnimateInProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setTimeout(() => el.classList.add("is-visible"), delay);
          observer.disconnect();
        }
      },
      { threshold: 0.12 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [delay]);

  return (
    <div ref={ref} className={`animate-in-${from} ${className}`}>
      {children}
    </div>
  );
}
