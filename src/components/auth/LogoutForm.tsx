"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { logoutAction } from "@/actions/auth";
import { EqualizerLoader } from "@/components/ui/EqualizerLoader";

/**
 * 登出時顯示全頁 loading，完成後強制回首頁並 refresh，
 * 避免已在「/」時僅靠 redirect 不刷新而卡在 loading。
 */
export function LogoutForm({
  className,
  buttonClassName,
  label = "登出",
  pendingLabel = "登出中…",
  loggedIn = true,
}: {
  className?: string;
  buttonClassName?: string;
  label?: string;
  pendingLabel?: string;
  /** 登出完成、layout 變成未登入後會關閉全頁 loading */
  loggedIn?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!loggedIn) setLoading(false);
  }, [loggedIn]);

  useEffect(() => {
    if (!loading) return;
    const t = window.setTimeout(() => setLoading(false), 12_000);
    return () => window.clearTimeout(t);
  }, [loading]);

  async function handleLogout() {
    setLoading(true);
    try {
      await logoutAction();
    } catch {
      // 相容若 action 仍 redirect
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <>
      {loading ? (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-white">
          <EqualizerLoader />
        </div>
      ) : null}
      <form action={handleLogout} className={className}>
        <button type="submit" disabled={loading} className={buttonClassName}>
          {loading ? pendingLabel : label}
        </button>
      </form>
    </>
  );
}
