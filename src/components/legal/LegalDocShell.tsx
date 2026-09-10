import Link from "next/link";
import type { ReactNode } from "react";
import { APP_NAME } from "@/lib/constants";

export function LegalDocShell({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto min-h-screen max-w-lg space-y-6 px-4 py-10">
      <div>
        <Link href="/" className="text-sm font-semibold text-purple-700">
          ← 回首頁
        </Link>
        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-purple-700">
          {APP_NAME}
        </p>
        <h1 className="mt-2 text-3xl font-bold">{title}</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">更新日期：{updated}</p>
      </div>
      <article className="space-y-5 text-sm leading-7 text-[var(--foreground)]">{children}</article>
    </main>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-base font-bold">{title}</h2>
      <div className="space-y-2 text-[var(--muted)]">{children}</div>
    </section>
  );
}
