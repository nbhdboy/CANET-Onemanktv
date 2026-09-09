"use client";

import { useEffect, useState } from "react";
import { countdownLabel } from "@/lib/time";

export function PaymentDeadlineCountdown({
  deadlineIso,
  prefix = "請在",
  suffix = "內完成媒合",
}: {
  deadlineIso: string | null | undefined;
  prefix?: string;
  suffix?: string;
}) {
  const [label, setLabel] = useState(() =>
    deadlineIso ? countdownLabel(deadlineIso) : "--",
  );

  useEffect(() => {
    if (!deadlineIso) {
      setLabel("--");
      return;
    }
    const tick = () => setLabel(countdownLabel(deadlineIso));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [deadlineIso]);

  return (
    <p className="text-sm text-[var(--muted)]">
      {prefix} {label} {suffix}
    </p>
  );
}
