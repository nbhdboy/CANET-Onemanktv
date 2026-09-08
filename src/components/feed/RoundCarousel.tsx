"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";

export type RoundCarouselFace = {
  key: string;
  href?: string;
  render: () => ReactNode;
};

export function RoundCarousel({
  faces,
  imageWidth = 280,
  imageHeight = 340,
  spacing = 3,
  speed = 2.2,
  direction = "right",
  drag = true,
  sensitivity = 5,
  tilt = -7,
  perspective = 3000,
  cornerRadius = 22,
  innerDim = 3.5,
}: {
  faces: RoundCarouselFace[];
  imageWidth?: number;
  imageHeight?: number;
  spacing?: number;
  speed?: number;
  direction?: "right" | "left";
  drag?: boolean;
  sensitivity?: number;
  tilt?: number;
  perspective?: number;
  cornerRadius?: number;
  innerDim?: number;
}) {
  const items = faces.length >= 6 ? faces : padFaces(faces, 8);
  const count = items.length;
  const ringRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef(0);
  const rotYRef = useRef(0);
  const velRef = useRef(0);
  const lastRef = useRef(0);
  const dragRef = useRef({ active: false, x: 0, moved: false });

  const angle = 360 / count;
  const factor = 1 + spacing * 0.15;
  const radius = (imageWidth * factor) / (2 * Math.tan(Math.PI / count));
  const degPerSec = speed * 6 * (direction === "left" ? -1 : 1);

  useEffect(() => {
    const ring = ringRef.current;
    if (!ring) return;
    const apply = () => {
      ring.style.transform = `translateZ(${-radius}px) rotateY(${rotYRef.current}deg)`;
    };
    apply();

    const draw = (now: number) => {
      const dt = lastRef.current ? (now - lastRef.current) / 1000 : 0;
      lastRef.current = now;
      const f = Math.min(dt, 0.1);
      const d = dragRef.current;
      if (!d.active) {
        if (Math.abs(velRef.current) > 0.01) {
          rotYRef.current += velRef.current * f;
          velRef.current *= 0.94;
        } else {
          rotYRef.current += degPerSec * f;
        }
      }
      apply();
      rafRef.current = requestAnimationFrame(draw);
    };
    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [radius, degPerSec, count]);

  function onPointerDown(e: React.PointerEvent) {
    if (!drag) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    dragRef.current = { active: true, x: e.clientX, moved: false };
    velRef.current = 0;
  }
  function onPointerMove(e: React.PointerEvent) {
    const d = dragRef.current;
    if (!d.active) return;
    const dx = e.clientX - d.x;
    d.x = e.clientX;
    if (Math.abs(dx) > 2) d.moved = true;
    const k = 0.3 * sensitivity;
    rotYRef.current += dx * k;
    velRef.current = dx * k * 60;
  }
  function onPointerUp(e: React.PointerEvent) {
    e.currentTarget.releasePointerCapture?.(e.pointerId);
    dragRef.current.active = false;
  }

  const faceBase: CSSProperties = {
    position: "absolute",
    inset: 0,
    borderRadius: cornerRadius,
    overflow: "hidden",
    backfaceVisibility: "hidden",
  };

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        background: "transparent",
        perspective: `${perspective}px`,
        cursor: drag ? "grab" : "default",
        touchAction: "none",
        userSelect: "none",
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onPointerLeave={() => {
        dragRef.current.active = false;
      }}
    >
      <div style={{ transformStyle: "preserve-3d", transform: `rotateX(${tilt}deg)` }}>
        <div
          ref={ringRef}
          style={{
            position: "relative",
            width: imageWidth,
            height: imageHeight,
            transformStyle: "preserve-3d",
          }}
        >
          {items.map((item, i) => (
            <div
              key={`${item.key}-${i}`}
              style={{
                position: "absolute",
                inset: 0,
                transform: `rotateY(${i * angle}deg) translateZ(${radius}px)`,
                transformStyle: "preserve-3d",
              }}
            >
              <div
                style={{
                  ...faceBase,
                  boxShadow: "0 10px 30px rgba(0,0,0,0.28)",
                }}
              >
                <FaceLink href={item.href} dragRef={dragRef}>
                  {item.render()}
                </FaceLink>
              </div>
              <div
                style={{
                  ...faceBase,
                  transform: "rotateY(180deg)",
                  filter: `brightness(${innerDim / 10})`,
                  pointerEvents: "none",
                }}
              >
                {item.render()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function FaceLink({
  href,
  dragRef,
  children,
}: {
  href?: string;
  dragRef: React.MutableRefObject<{ active: boolean; x: number; moved: boolean }>;
  children: ReactNode;
}) {
  if (!href) {
    return <div style={{ width: "100%", height: "100%" }}>{children}</div>;
  }
  return (
    <Link
      href={href}
      onClick={(e) => {
        if (dragRef.current.moved) e.preventDefault();
      }}
      style={{
        display: "block",
        width: "100%",
        height: "100%",
        minHeight: 0,
        color: "inherit",
        textDecoration: "none",
      }}
    >
      {children}
    </Link>
  );
}

function padFaces(faces: RoundCarouselFace[], min: number): RoundCarouselFace[] {
  if (!faces.length) return faces;
  const out: RoundCarouselFace[] = [];
  while (out.length < min) {
    out.push(...faces);
  }
  return out.slice(0, min);
}

export function useCarouselSize() {
  const [size, setSize] = useState({ width: 280, height: 340 });
  useEffect(() => {
    const apply = () => {
      const w = window.innerWidth;
      if (w < 640) setSize({ width: 210, height: 268 });
      else if (w < 1024) setSize({ width: 250, height: 310 });
      else setSize({ width: 280, height: 340 });
    };
    apply();
    window.addEventListener("resize", apply);
    return () => window.removeEventListener("resize", apply);
  }, []);
  return size;
}
