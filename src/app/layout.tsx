import type { Metadata, Viewport } from "next";
import { Anton, Inter, Noto_Sans_TC } from "next/font/google";
import "./globals.css";
import { headers } from "next/headers";
import { AppChrome } from "@/components/layout/AppChrome";
import { getSession } from "@/lib/session";
import { getProfile } from "@/lib/users";
import { unreadCount } from "@/lib/notifications";
import { APP_NAME, APP_TAGLINE } from "@/lib/constants";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const anton = Anton({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-anton",
  display: "swap",
});

const noto = Noto_Sans_TC({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-noto",
  display: "swap",
});

export const metadata: Metadata = {
  title: `${APP_NAME}｜一人 KTV 媒合`,
  description: APP_TAGLINE,
  applicationName: APP_NAME,
  appleWebApp: { capable: true, title: APP_NAME, statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#7c3aed",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const headerList = await headers();
  const initialPath = headerList.get("x-kplus1-path") || "/";
  const session = await getSession();
  const profile = session ? getProfile(session.id) : null;
  const unread = session ? unreadCount(session.id) : 0;

  return (
    <html
      lang="zh-Hant"
      className={`${inter.variable} ${anton.variable} ${noto.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <AppChrome
          initialPath={initialPath}
          user={
            session
              ? {
                  id: session.id,
                  nickname: profile?.nickname || "歌友",
                  avatar: profile?.avatar_url,
                  isAdmin: Boolean(profile?.is_admin),
                  unread,
                }
              : null
          }
        >
          {children}
        </AppChrome>
      </body>
    </html>
  );
}
