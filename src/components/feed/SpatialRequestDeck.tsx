"use client";

import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { AVATAR_PRESETS } from "@/lib/constants";
import { avatarPresetOrFallback, avatarPresetSrc, isPhotoAvatar } from "@/lib/avatar";
import { formatDateTime, hoursUntil } from "@/lib/time";
import type { RequestCardData } from "@/lib/types";

const EASE = "cubic-bezier(0.16, 1.12, 0.28, 1)";
const MOVE_MS = 900;

type Pose = {
  x: number;
  y: number;
  z: number;
  s: number;
  blur: number;
  rx: number;
  ry: number;
};

const CENTER: Pose = { x: 0, y: 0.02, z: 48, s: 1, blur: 0, rx: 0, ry: 0 };

/**
 * x, y are fractions of half the stage (0 = center, ±1 ≈ edge).
 * Mix of near-behind, mid, and outer slots — not all parked on the far sides.
 */
const CLOUD: Pose[] = [
  { x: -0.42, y: -0.38, z: -140, s: 0.72, blur: 8, rx: -6, ry: 16 },
  { x: 0.46, y: 0.32, z: -155, s: 0.7, blur: 9, rx: 5, ry: -18 },
  { x: -0.68, y: 0.48, z: -230, s: 0.5, blur: 13, rx: 8, ry: 12 },
  { x: 0.7, y: -0.52, z: -245, s: 0.48, blur: 14, rx: -8, ry: -13 },
  { x: 0.22, y: -0.58, z: -300, s: 0.38, blur: 17, rx: 6, ry: 6 },
  { x: -0.24, y: 0.55, z: -315, s: 0.36, blur: 18, rx: -6, ry: -7 },
];

const FILLER_POSES: Pose[] = [
  { x: -0.58, y: -0.62, z: -210, s: 0.5, blur: 12, rx: -5, ry: 14 },
  { x: 0.34, y: -0.28, z: -175, s: 0.54, blur: 11, rx: 4, ry: -12 },
  { x: -0.36, y: 0.22, z: -190, s: 0.52, blur: 12, rx: 6, ry: 10 },
  { x: 0.62, y: 0.5, z: -250, s: 0.44, blur: 15, rx: -5, ry: -12 },
  { x: 0.78, y: -0.18, z: -270, s: 0.42, blur: 15, rx: 4, ry: -14 },
  { x: -0.8, y: 0.08, z: -260, s: 0.42, blur: 15, rx: -4, ry: 13 },
  { x: 0.16, y: 0.6, z: -320, s: 0.36, blur: 18, rx: 7, ry: 5 },
  { x: -0.14, y: -0.66, z: -330, s: 0.34, blur: 19, rx: -7, ry: -5 },
];

function poseFromDelta(delta: number): Pose {
  if (delta === 0) return CENTER;
  const mag = Math.abs(delta);
  const odd = delta < 0 ? 1 : 0;
  const idx = Math.min((mag - 1) * 2 + odd, CLOUD.length - 1);
  return CLOUD[idx];
}

function wrappedDelta(i: number, active: number, n: number) {
  let d = i - active;
  if (d > n / 2) d -= n;
  if (d < -n / 2) d += n;
  return d;
}

export function SpatialRequestDeck({
  items,
  sessionId,
}: {
  items: RequestCardData[];
  sessionId?: string;
}) {
  const [active, setActive] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [stageSize, setStageSize] = useState({ w: 1200, h: 660 });
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const stageRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({ id: -1, x: 0, y: 0, moved: false });
  const skipClickRef = useRef(false);

  useEffect(() => {
    setActive(0);
  }, [items]);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 640);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const apply = () => {
      const r = el.getBoundingClientRect();
      setStageSize({ w: r.width, h: r.height });
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const current = items[active];
  if (!current) return null;

  const halfW = Math.max(stageSize.w, 320) / 2;
  const halfH = Math.max(stageSize.h, 400) / 2;
  const cardW = isMobile ? 196 : 268;
  const cardH = isMobile ? 286 : 392;

  function go(dir: -1 | 1) {
    setActive((i) => (i + dir + items.length) % items.length);
  }

  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    dragRef.current = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: false };
  }

  function onPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    const stage = stageRef.current;
    if (stage) {
      const r = stage.getBoundingClientRect();
      const nx = (e.clientX - (r.left + r.width / 2)) / r.width;
      const ny = (e.clientY - (r.top + r.height / 2)) / r.height;
      setTilt({ x: ny * -11, y: nx * 14 });
    }
    const d = dragRef.current;
    if (d.id !== e.pointerId) return;
    if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > 18) d.moved = true;
  }

  function onPointerUp(e: ReactPointerEvent<HTMLDivElement>) {
    const d = dragRef.current;
    if (d.id !== e.pointerId) return;
    const dx = e.clientX - d.x;
    if (d.moved && Math.abs(dx) > 46 && items.length > 1) {
      skipClickRef.current = true;
      go(dx < 0 ? 1 : -1);
    }
    dragRef.current = { id: -1, x: 0, y: 0, moved: false };
  }

  function onPointerLeave() {
    setTilt({ x: 0, y: 0 });
    dragRef.current = { id: -1, x: 0, y: 0, moved: false };
  }

  return (
    <div className="relative">
      <div
        ref={stageRef}
        className="relative mx-auto w-full"
        style={{
          height: isMobile ? 560 : 720,
          perspective: isMobile ? "560px" : "720px",
          perspectiveOrigin: "50% 46%",
          overflow: "visible",
          touchAction: "pan-y",
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerLeave}
        onPointerLeave={onPointerLeave}
      >
        <div
          className="absolute inset-0"
          style={{
            transformStyle: "preserve-3d",
            transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
            transition: "transform 180ms ease-out",
          }}
        >
          {FILLER_POSES.map((pose, i) => {
            const preset = AVATAR_PRESETS[i % AVATAR_PRESETS.length];
            return (
              <FillerCard
                key={`filler-${i}`}
                pose={toWorld(pose, halfW, halfH)}
                width={cardW}
                height={cardH}
                from={preset.from}
                to={preset.to}
                imageSrc={preset.src}
                delay={i * 0.45}
              />
            );
          })}

          {items.map((item, i) => {
            const delta = wrappedDelta(i, active, items.length);
            const isActive = delta === 0;
            const pose = toWorld(poseFromDelta(delta), halfW, halfH);
            return (
              <DeckCard
                key={item.id}
                item={item}
                width={cardW}
                height={cardH}
                pose={pose}
                zIndex={isActive ? 80 : 40 - Math.abs(delta)}
                active={isActive}
                href={isActive ? `/requests/${item.id}` : undefined}
                isOwner={sessionId === item.initiator.id}
                floatDelay={`${(i % 5) * 0.35}s`}
                onSelect={() => setActive(i)}
                onActiveClick={(e) => {
                  if (skipClickRef.current) {
                    e.preventDefault();
                    skipClickRef.current = false;
                  }
                }}
              />
            );
          })}
        </div>
      </div>

      {items.length > 1 ? (
        <div className="relative z-10 mt-1 flex items-center justify-center gap-3">
          <button
            type="button"
            aria-label="上一張需求"
            onClick={() => go(-1)}
            className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-white bg-transparent text-white transition-[transform,background-color] duration-150 hover:scale-[1.08] hover:bg-white/12"
          >
            <ArrowLeft size={22} strokeWidth={2.25} />
          </button>
          <p className="min-w-16 text-center text-sm font-medium text-white/90">
            {active + 1} / {items.length}
          </p>
          <button
            type="button"
            aria-label="下一張需求"
            onClick={() => go(1)}
            className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-white bg-white/90 text-[#2c2420] shadow-[0_6px_18px_rgba(0,0,0,0.18)] transition-transform duration-150 hover:scale-[1.08]"
          >
            <ArrowRight size={22} strokeWidth={2.25} />
          </button>
        </div>
      ) : null}
      <p className="mt-3 text-center text-sm text-white/85">
        點中間卡片即可查看並申請一起唱
      </p>
    </div>
  );
}

function toWorld(pose: Pose, halfW: number, halfH: number): Pose {
  return { ...pose, x: pose.x * halfW, y: pose.y * halfH };
}

function transformOf(pose: Pose) {
  return `translate(-50%, -50%) translate3d(${pose.x}px, ${pose.y}px, ${pose.z}px) rotateX(${pose.rx}deg) rotateY(${pose.ry}deg) scale(${pose.s})`;
}

function DeckCard({
  item,
  width,
  height,
  pose,
  zIndex,
  active,
  href,
  isOwner,
  floatDelay,
  onSelect,
  onActiveClick,
}: {
  item: RequestCardData;
  width: number;
  height: number;
  pose: Pose;
  zIndex: number;
  active: boolean;
  href?: string;
  isOwner?: boolean;
  floatDelay: string;
  onSelect: () => void;
  onActiveClick: (e: { preventDefault: () => void }) => void;
}) {
  const preset = avatarPresetOrFallback(item.initiator.avatar_url);
  const photo = isPhotoAvatar(item.initiator.avatar_url) ? item.initiator.avatar_url : null;
  const face = photo || avatarPresetSrc(item.initiator.avatar_url);
  const soon = hoursUntil(item.sing_at) > 0 && hoursUntil(item.sing_at) <= 3;
  const note = item.note?.replace(/^「|」$/g, "").trim();

  const label = `${item.initiator.nickname} 的歌局，${formatDateTime(item.sing_at)} ${item.venue_name}`;

  const frame: CSSProperties = {
    position: "absolute",
    left: "50%",
    top: "50%",
    width,
    height,
    zIndex,
    transform: transformOf(pose),
    transformStyle: "preserve-3d",
    backfaceVisibility: "hidden",
    transition: `transform ${MOVE_MS}ms ${EASE}`,
    willChange: "transform",
  };

  return (
    <div style={frame}>
      <div
        className={active ? "deck-float-focus" : "deck-float"}
        style={{ height: "100%", position: "relative", animationDelay: floatDelay }}
      >
        <article
          className="relative h-full w-full overflow-hidden text-white"
          style={{
            borderRadius: 36,
            background: face
              ? "#12081f"
              : `linear-gradient(165deg, ${preset.from} 0%, ${preset.to} 58%, #1a1040 100%)`,
            boxShadow: active
              ? "0 28px 70px rgba(0,0,0,0.38), 0 0 0 1px rgba(255,255,255,0.12)"
              : "0 12px 32px rgba(0,0,0,0.22)",
            filter: pose.blur ? `blur(${pose.blur}px)` : "none",
            opacity: active ? 1 : 0.95,
            transition: `filter ${MOVE_MS}ms ${EASE}, box-shadow ${MOVE_MS}ms ${EASE}, opacity ${MOVE_MS}ms ${EASE}`,
          }}
        >
          {face ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={face} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center" aria-hidden>
              <span
                style={{
                  fontSize: active ? 86 : 64,
                  lineHeight: 1,
                  opacity: 0.92,
                  transition: `font-size ${MOVE_MS}ms ${EASE}`,
                }}
              >
                {preset.emoji}
              </span>
            </div>
          )}
          <div
            className="absolute inset-x-0 bottom-0 z-10 px-5 pb-5 pt-16"
            style={{
              background: "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(16,10,28,0.82) 72%)",
            }}
          >
            <p
              className="mb-2 text-xs font-semibold tracking-wide text-amber-200"
              style={{ opacity: soon && active ? 1 : 0, transition: `opacity ${MOVE_MS}ms ${EASE}` }}
            >
              即將開唱
            </p>
            <p
              className="mb-3 text-[15px] font-medium leading-snug text-white/95"
              style={{
                opacity: active && note ? 1 : 0,
                maxHeight: active && note ? 80 : 0,
                overflow: "hidden",
                transition: `opacity ${MOVE_MS}ms ${EASE}, max-height ${MOVE_MS}ms ${EASE}`,
              }}
            >
              {note ? `「${note}」` : ""}
            </p>
            <p className="text-[22px] font-bold leading-tight">{item.initiator.nickname}</p>
            <p className="mt-1 text-sm font-medium text-white/88">
              {formatDateTime(item.sing_at)} · {item.venue_name}
            </p>
            <p
              className="mt-3 text-sm font-semibold tracking-wide"
              style={{ opacity: active ? 1 : 0, transition: `opacity ${MOVE_MS}ms ${EASE}` }}
            >
              {isOwner ? "查看申請者 →" : "去配對 →"}
            </p>
          </div>
        </article>
        {href ? (
          <Link
            href={href}
            onClick={onActiveClick}
            aria-label={label}
            className="absolute inset-0 z-10"
            style={{ minHeight: 0, textDecoration: "none" }}
          />
        ) : (
          <button
            type="button"
            onClick={onSelect}
            aria-label={`查看 ${item.initiator.nickname} 的歌局`}
            className="absolute inset-0 z-10"
            style={{ minHeight: 0, padding: 0, border: 0, background: "transparent", cursor: "pointer" }}
          />
        )}
      </div>
    </div>
  );
}

function FillerCard({
  pose,
  width,
  height,
  from,
  to,
  imageSrc,
  delay,
}: {
  pose: Pose;
  width: number;
  height: number;
  from: string;
  to: string;
  imageSrc: string;
  delay: number;
}) {
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        width,
        height,
        zIndex: 8,
        transform: transformOf(pose),
        pointerEvents: "none",
      }}
    >
      <div className="deck-float" style={{ height: "100%", animationDelay: `${delay}s` }}>
        <div
          className="relative h-full w-full overflow-hidden"
          style={{
            borderRadius: 36,
            background: `linear-gradient(165deg, ${from} 0%, ${to} 70%, #1a1040 100%)`,
            filter: `blur(${pose.blur}px)`,
            opacity: 0.88,
            boxShadow: "0 10px 28px rgba(0,0,0,0.18)",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageSrc} alt="" className="absolute inset-0 h-full w-full object-cover" />
        </div>
      </div>
    </div>
  );
}
