"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Bell, Mic2, Music2, UserRound, Plus } from "lucide-react";
import { LogoutForm } from "@/components/auth/LogoutForm";
import { NavLoadingProvider } from "@/components/layout/nav-loading";
import { EqualizerLoader } from "@/components/ui/EqualizerLoader";

type UserLite = {
  id: string;
  nickname: string;
  avatar?: string | null;
  isAdmin: boolean;
  unread: number;
};

const HIDE_NAV = ["/login", "/signup", "/onboarding"];
const authLinkCls =
  "inline-flex h-11 min-h-11 cursor-pointer items-center rounded-full px-3 text-sm font-semibold leading-none text-purple-700 transition-colors hover:bg-purple-50 active:scale-[0.98]";

export function AppChrome({
  user,
  initialPath,
  children,
}: {
  user: UserLite | null;
  initialPath: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname() || initialPath;
  const router = useRouter();
  const [navLoading, setNavLoading] = useState(false);
  const [logoutPending, setLogoutPending] = useState(false);
  const hide = HIDE_NAV.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const isHome = pathname === "/";
  const navApi = useMemo(
    () => ({
      setNavLoading,
      beginLogout: () => {
        setLogoutPending(true);
        setNavLoading(true);
      },
    }),
    [],
  );

  // 一般導頁：路徑變就關 loading
  // 登出中：一路維持到 user 變成未登入，避免中途閃回
  useEffect(() => {
    if (logoutPending) {
      if (!user) {
        setLogoutPending(false);
        setNavLoading(false);
      }
      return;
    }
    setNavLoading(false);
  }, [pathname, user, logoutPending]);

  useEffect(() => {
    if (!logoutPending) return;
    const t = window.setTimeout(() => {
      setLogoutPending(false);
      setNavLoading(false);
    }, 15_000);
    return () => window.clearTimeout(t);
  }, [logoutPending]);

  function goProfile() {
    if (navLoading || pathname.startsWith("/profile")) return;
    setNavLoading(true);
    router.push("/profile");
  }

  return (
    <NavLoadingProvider value={navApi}>
      {navLoading ? (
        <EqualizerLoader />
      ) : (
        <>
          {!hide && (
            <header className="hidden lg:flex sticky top-0 z-40 h-16 items-center gap-8 border-b border-[var(--line)] bg-white/80 px-8 backdrop-blur-md">
              <Link
                href="/"
                className="inline-flex h-11 min-h-11 shrink-0 items-center font-bold tracking-wide text-lg leading-none"
              >
                🎤 K歌 +1
              </Link>
              <nav className="flex min-w-0 flex-1 items-center gap-6 text-sm font-medium">
                <Link href="/" className={navCls(pathname === "/")}>
                  找歌友
                </Link>
                <Link href="/requests/new" className={navCls(pathname.startsWith("/requests/new"))}>
                  發起
                </Link>
                <Link href="/matches" className={navCls(pathname.startsWith("/matches"))}>
                  媒合
                </Link>
                <Link href="/profile" className={navCls(pathname.startsWith("/profile"))}>
                  我的
                </Link>
                {user?.isAdmin && (
                  <Link href="/admin" className={navCls(pathname.startsWith("/admin"))}>
                    Admin
                  </Link>
                )}
              </nav>
              <div className="flex h-11 shrink-0 items-center gap-1">
                {user ? (
                  <>
                    <Link
                      href="/notifications"
                      className="relative inline-flex h-11 w-11 min-h-11 items-center justify-center rounded-full hover:bg-black/5"
                      aria-label="通知"
                    >
                      <Bell size={20} />
                      {user.unread > 0 && (
                        <span className="absolute top-1.5 right-1.5 min-w-4 h-4 px-1 rounded-full bg-pink-500 text-white text-[10px] leading-4 text-center">
                          {user.unread}
                        </span>
                      )}
                    </Link>
                    <button
                      type="button"
                      onClick={goProfile}
                      className="inline-flex h-11 min-h-11 cursor-pointer items-center rounded-full px-3 text-sm leading-none text-[var(--muted)] transition-colors hover:bg-black/5 hover:text-foreground active:scale-[0.98]"
                    >
                      {user.nickname}
                    </button>
                    <LogoutForm
                      className="m-0 inline-flex h-11 items-center p-0"
                      buttonClassName={authLinkCls}
                    />
                  </>
                ) : (
                  <Link href="/login" className={authLinkCls}>
                    登入
                  </Link>
                )}
              </div>
            </header>
          )}

          <div className={hide || isHome ? "" : "pb-24 lg:pb-8"}>{children}</div>

          {!hide && (
            <nav className="lg:hidden fixed bottom-0 inset-x-0 z-[70] bg-white/95 backdrop-blur border-t border-[var(--line)] pb-[env(safe-area-inset-bottom)]">
              <ul className="grid grid-cols-4 h-16">
                <Tab href="/" icon={<Music2 size={22} />} label="找歌友" active={pathname === "/"} />
                <Tab
                  href="/requests/new"
                  icon={<Plus size={22} />}
                  label="發起"
                  active={pathname.startsWith("/requests/new")}
                />
                <Tab
                  href="/matches"
                  icon={<Mic2 size={22} />}
                  label="媒合"
                  active={pathname.startsWith("/matches")}
                />
                <Tab
                  href="/profile"
                  icon={<UserRound size={22} />}
                  label="我的"
                  active={
                    pathname.startsWith("/profile") ||
                    pathname.startsWith("/settings") ||
                    pathname.startsWith("/notifications")
                  }
                  badge={user?.unread ?? 0}
                />
              </ul>
            </nav>
          )}
        </>
      )}
    </NavLoadingProvider>
  );
}

function navCls(active: boolean) {
  return `inline-flex h-11 min-h-11 items-center leading-none ${
    active ? "text-purple-700" : "text-[var(--muted)] hover:text-foreground"
  }`;
}

function Tab({
  href,
  icon,
  label,
  active,
  badge = 0,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
  badge?: number;
}) {
  return (
    <li>
      <Link
        href={href}
        aria-label={badge > 0 ? `${label}，${badge} 則未讀通知` : label}
        className={`relative flex h-full flex-col items-center justify-center gap-1 text-[11px] ${
          active ? "text-purple-700 font-semibold" : "text-[var(--muted)]"
        }`}
      >
        <span className="relative inline-flex">
          {icon}
          {badge > 0 ? (
            <span className="absolute -right-2.5 -top-1.5 min-w-4 h-4 px-1 rounded-full bg-pink-500 text-center text-[10px] leading-4 text-white">
              {badge > 99 ? "99+" : badge}
            </span>
          ) : null}
        </span>
        {label}
      </Link>
    </li>
  );
}
