"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";
import { HERO_IMAGES } from "@/lib/constants";

const EASE = "cubic-bezier(0.4,0,0.2,1)";

export function ToonHero({
  activeIndex,
  onNavigate,
}: {
  activeIndex: number;
  onNavigate: (dir: "next" | "prev") => void;
}) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const hero = HERO_IMAGES[activeIndex];

  useEffect(() => {
    HERO_IMAGES.forEach((img) => {
      const preload = new Image();
      preload.src = img.src;
    });
    const onResize = () => setIsMobile(window.innerWidth < 640);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  function navigate(dir: "next" | "prev") {
    if (isAnimating) return;
    setIsAnimating(true);
    onNavigate(dir);
    window.setTimeout(() => setIsAnimating(false), 650);
  }

  const center = activeIndex;
  const left = (activeIndex + 3) % 4;
  const right = (activeIndex + 1) % 4;

  function roleOf(i: number): "center" | "left" | "right" | "back" {
    if (i === center) return "center";
    if (i === left) return "left";
    if (i === right) return "right";
    return "back";
  }

  function styleFor(role: ReturnType<typeof roleOf>): CSSProperties {
    const base: CSSProperties = {
      position: "absolute",
      aspectRatio: "0.6 / 1",
      transition: `transform 650ms ${EASE}, filter 650ms ${EASE}, opacity 650ms ${EASE}, left 650ms ${EASE}`,
      willChange: "transform, filter, opacity",
    };
    if (role === "center") {
      return {
        ...base,
        transform: `translateX(-50%) scale(${isMobile ? 1.25 : 1.68})`,
        filter: "blur(0px)",
        opacity: 1,
        zIndex: 20,
        left: "50%",
        height: isMobile ? "60%" : "92%",
        bottom: isMobile ? "22%" : 0,
      };
    }
    if (role === "left") {
      return {
        ...base,
        transform: "translateX(-50%) scale(1)",
        filter: "blur(2px)",
        opacity: 0.85,
        zIndex: 10,
        left: isMobile ? "20%" : "30%",
        height: isMobile ? "16%" : "28%",
        bottom: isMobile ? "32%" : "12%",
      };
    }
    if (role === "right") {
      return {
        ...base,
        transform: "translateX(-50%) scale(1)",
        filter: "blur(2px)",
        opacity: 0.85,
        zIndex: 10,
        left: isMobile ? "80%" : "70%",
        height: isMobile ? "16%" : "28%",
        bottom: isMobile ? "32%" : "12%",
      };
    }
    return {
      ...base,
      transform: "translateX(-50%) scale(1)",
      filter: "blur(4px)",
      opacity: 1,
      zIndex: 5,
      left: "50%",
      height: isMobile ? "13%" : "22%",
      bottom: isMobile ? "32%" : "12%",
    };
  }

  return (
    <div
      className="relative w-full overflow-hidden"
      style={{
        backgroundColor: hero.bg,
        transition: `background-color 650ms ${EASE}`,
        fontFamily: "Inter, sans-serif",
      }}
    >
      <div className="relative w-full overflow-hidden" style={{ height: "100vh" }}>
        <div className="grain pointer-events-none absolute inset-0" style={{ zIndex: 50 }} />

        <div
          className="pointer-events-none absolute inset-x-0 flex items-center justify-center select-none"
          style={{ zIndex: 2, top: "18%" }}
        >
          <p
            className="uppercase whitespace-nowrap"
            style={{
              fontFamily: "Anton, sans-serif",
              fontSize: "clamp(90px, 28vw, 380px)",
              fontWeight: 900,
              color: "white",
              opacity: 1,
              lineHeight: 1,
              letterSpacing: "-0.02em",
            }}
          >
            {hero.age}
          </p>
        </div>

        <div
          className="absolute top-6 left-4 sm:left-8 lg:hidden text-xs font-semibold uppercase text-white"
          style={{ zIndex: 60, opacity: 0.9, letterSpacing: "0.18em" }}
        >
          K歌 +1
        </div>

        <div className="absolute inset-0" style={{ zIndex: 3 }}>
          {HERO_IMAGES.map((img, i) => (
            <div key={img.src} style={styleFor(roleOf(i))}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.src}
                alt={`${img.label}歌友`}
                draggable={false}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  objectPosition: "bottom center",
                }}
              />
            </div>
          ))}
        </div>

        <div
          className="pointer-events-none absolute left-1/2 -translate-x-1/2 flex items-end gap-1"
          style={{ bottom: isMobile ? "18%" : "8%", zIndex: 40, height: 36 }}
          aria-hidden
        >
          {[10, 18, 28, 16, 22].map((h, i) => (
            <span
              key={i}
              className="eq-bar w-1.5 rounded-full bg-white/80"
              style={{ height: h }}
            />
          ))}
        </div>

        <div
          className="absolute bottom-6 left-4 sm:bottom-20 sm:left-24"
          style={{ zIndex: 60, maxWidth: 320 }}
        >
          <p
            className="mb-2 sm:mb-3 text-base sm:text-[22px] font-bold uppercase text-white"
            style={{ letterSpacing: "0.02em", opacity: 0.95 }}
          >
            {hero.label}場
          </p>
          <p
            className="hidden sm:block text-xs sm:text-sm text-white mb-4 sm:mb-5"
            style={{ opacity: 0.85, lineHeight: 1.6 }}
          >
            找另一個「也只有一個人」的 {hero.label} 歌友。兩個人，剛剛好。
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              aria-label="上一張"
              onClick={() => navigate("prev")}
              className="flex w-12 h-12 sm:w-16 sm:h-16 items-center justify-center rounded-full border-2 border-white bg-transparent text-white transition-[transform,background-color] duration-150 hover:scale-[1.08] hover:bg-white/12"
            >
              <ArrowLeft size={26} strokeWidth={2.25} />
            </button>
            <button
              type="button"
              aria-label="下一張"
              onClick={() => navigate("next")}
              className="flex w-12 h-12 sm:w-16 sm:h-16 items-center justify-center rounded-full border-2 border-white bg-transparent text-white transition-[transform,background-color] duration-150 hover:scale-[1.08] hover:bg-white/12"
            >
              <ArrowRight size={26} strokeWidth={2.25} />
            </button>
          </div>
        </div>

        <Link
          href={`/requests/new?age=${hero.age}`}
          className="absolute bottom-6 right-4 sm:bottom-20 sm:right-10 flex items-center gap-2 text-white no-underline"
          style={{
            zIndex: 60,
            fontFamily: "Anton, sans-serif",
            fontSize: "clamp(20px, 4vw, 56px)",
            fontWeight: 400,
            letterSpacing: "-0.02em",
            lineHeight: 1,
            textTransform: "uppercase",
            opacity: 0.95,
          }}
        >
          發起需求
          <ArrowRight className="w-5 h-5 sm:w-8 sm:h-8" strokeWidth={2.25} />
        </Link>
      </div>
    </div>
  );
}
