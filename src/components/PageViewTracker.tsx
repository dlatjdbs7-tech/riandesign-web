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

    let referrerHost: string | null = null;
    try {
      referrerHost = document.referrer ? new URL(document.referrer).hostname.replace(/^www\./, "") : null;
    } catch {
      referrerHost = null;
    }
    const utmSource = new URLSearchParams(window.location.search).get("utm_source");

    logPageView(pathname, referrerHost, utmSource).catch(() => {});
  }, [pathname]);

  return null;
}
