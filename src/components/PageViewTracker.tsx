"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { logPageView } from "@/app/(marketing)/actions";

export default function PageViewTracker() {
  const pathname = usePathname();
  const lastLogged = useRef<string | null>(null);

  useEffect(() => {
    if (lastLogged.current === pathname) return;
    lastLogged.current = pathname;
    logPageView(pathname).catch(() => {});
  }, [pathname]);

  return null;
}
