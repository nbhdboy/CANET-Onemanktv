"use client";

import { useEffect } from "react";
import confetti from "canvas-confetti";

export function MatchConfetti() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const end = Date.now() + 900;
    const frame = () => {
      confetti({
        particleCount: 3,
        spread: 60,
        origin: { y: 0.7 },
        colors: ["#7C3AED", "#EC4899", "#22D3EE", "#F5C542"],
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  }, []);
  return null;
}
