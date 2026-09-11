"use client";

import { createContext, useContext } from "react";

type NavLoadingApi = {
  setNavLoading: (value: boolean) => void;
  /** 登出專用：全頁 loading 會一直維持到 session 變成未登入 */
  beginLogout: () => void;
};

const NavLoadingContext = createContext<NavLoadingApi | null>(null);

export function NavLoadingProvider({
  value,
  children,
}: {
  value: NavLoadingApi;
  children: React.ReactNode;
}) {
  return <NavLoadingContext.Provider value={value}>{children}</NavLoadingContext.Provider>;
}

export function useNavLoading() {
  return useContext(NavLoadingContext);
}
