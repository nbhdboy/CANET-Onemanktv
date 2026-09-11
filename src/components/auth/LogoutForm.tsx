"use client";

import { useRouter } from "next/navigation";
import { flushSync } from "react-dom";
import { logoutAction } from "@/actions/auth";
import { useNavLoading } from "@/components/layout/nav-loading";

/**
 * 用 button onClick（非 form action），才能立刻畫出全頁 loading。
 * form action 會把 setState 延後到 server action 結束，看起來像沒反應然後突然登出。
 */
export function LogoutForm({
  className,
  buttonClassName,
  label = "登出",
}: {
  className?: string;
  buttonClassName?: string;
  label?: string;
}) {
  const router = useRouter();
  const nav = useNavLoading();

  async function onLogout() {
    flushSync(() => {
      nav?.beginLogout();
    });
    try {
      await logoutAction();
    } catch {
      // ignore
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <div className={className}>
      <button type="button" onClick={() => void onLogout()} className={buttonClassName}>
        {label}
      </button>
    </div>
  );
}
