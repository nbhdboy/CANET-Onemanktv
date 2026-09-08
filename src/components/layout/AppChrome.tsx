"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Mic2, Music2, UserRound, Plus } from "lucide-react";

type UserLite = {
  id: string;
  nickname: string;
  avatar?: string | null;
  isAdmin: boolean;
  unread: number;
};

const HIDE_NAV = ["/login", "/signup", "/onboarding"];

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
  const hide = HIDE_NAV.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const isHome = pathname === "/";

  return (
    <>
      {!hide && (
        <header className="hidden lg:flex sticky top-0 z-40 items-center justify-between px-8 h-16 bg-white/80 backdrop-blur-md border-b border-[var(--line)]">
          <Link href="/" className="font-bold tracking-wide text-lg">
            🎤 K歌 +1
          </Link>
          <nav className="flex items-center gap-6 text-sm font-medium">
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
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <Link href="/notifications" className="relative p-2 rounded-full hover:bg-black/5" aria-label="通知">
                  <Bell size={20} />
                  {user.unread > 0 && (
                    <span className="absolute top-1 right-1 min-w-4 h-4 px-1 rounded-full bg-pink-500 text-white text-[10px] leading-4 text-center">
                      {user.unread}
                    </span>
                  )}
                </Link>
                <span className="text-sm text-[var(--muted)]">{user.nickname}</span>
              </>
            ) : (
              <Link href="/login" className="text-sm font-semibold text-purple-700">
                登入
              </Link>
            )}
          </div>
        </header>
      )}

      <div className={hide || isHome ? "" : "pb-24 lg:pb-8"}>{children}</div>

      {!hide && (
        <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur border-t border-[var(--line)] pb-[env(safe-area-inset-bottom)]">
          <ul className="grid grid-cols-4 h-16">
            <Tab href="/" icon={<Music2 size={22} />} label="找歌友" active={pathname === "/"} />
            <Tab href="/requests/new" icon={<Plus size={22} />} label="發起" active={pathname.startsWith("/requests/new")} />
            <Tab href="/matches" icon={<Mic2 size={22} />} label="媒合" active={pathname.startsWith("/matches")} />
            <Tab href="/profile" icon={<UserRound size={22} />} label="我的" active={pathname.startsWith("/profile") || pathname.startsWith("/settings")} />
          </ul>
        </nav>
      )}
    </>
  );
}

function navCls(active: boolean) {
  return active ? "text-purple-700" : "text-[var(--muted)] hover:text-foreground";
}

function Tab({
  href,
  icon,
  label,
  active,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
}) {
  return (
    <li>
      <Link
        href={href}
        className={`flex h-full flex-col items-center justify-center gap-1 text-[11px] ${
          active ? "text-purple-700 font-semibold" : "text-[var(--muted)]"
        }`}
      >
        {icon}
        {label}
      </Link>
    </li>
  );
}
