"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

export type GlassMenuOption = {
  value: string;
  label: string;
};

export function GlassMenuSelect({
  name,
  value,
  onChange,
  options,
  placeholder,
  required,
  accent = "#7c5cff",
  compact = false,
  align = "start",
  "aria-label": ariaLabel,
}: {
  name?: string;
  value: string;
  onChange: (next: string) => void;
  options: readonly GlassMenuOption[] | GlassMenuOption[];
  placeholder: string;
  required?: boolean;
  accent?: string;
  compact?: boolean;
  align?: "start" | "center";
  "aria-label"?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const selected = options.find((opt) => opt.value === value);
  const label = selected?.label ?? "";

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open || !listRef.current || !value) return;
    const active = listRef.current.querySelector<HTMLElement>('[aria-selected="true"]');
    active?.scrollIntoView({ block: "nearest" });
  }, [open, value]);

  return (
    <div
      ref={rootRef}
      className={`compose-menu ${compact ? "is-compact" : ""} ${open ? "is-open" : ""}`}
    >
      {name ? (
        <input
          type="text"
          name={name}
          value={value}
          required={required}
          readOnly
          tabIndex={-1}
          aria-hidden
          className="sr-only"
        />
      ) : null}
      <button
        type="button"
        className={`compose-menu-trigger ${label ? "" : "is-placeholder"} ${
          align === "center" ? "is-center" : ""
        }`}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className="compose-menu-trigger-label">{label || placeholder}</span>
        <ChevronDown
          size={compact ? 14 : 16}
          strokeWidth={2.25}
          aria-hidden
          className="compose-menu-chevron"
        />
      </button>
      {open ? (
        <div
          id={listId}
          ref={listRef}
          className="compose-menu-panel"
          role="listbox"
          aria-label={ariaLabel || placeholder}
          style={{ ["--compose-menu-accent" as string]: accent }}
        >
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                className={`compose-menu-option ${isSelected ? "is-selected" : ""}`}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
              >
                <span>{opt.label}</span>
                {isSelected ? <Check size={15} strokeWidth={2.5} aria-hidden /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
