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
    // 추적 링크(utm_source)가 없고 네이버 블로그에서 왔으면, 주소에 남은 블로그 아이디로
    // 메인/개인 블로그를 구분한다 (예: blog.naver.com/redvgt/123 → "blog:redvgt").
    let blogSource: string | null = null;
    try {
      if (document.referrer) {
        const ref = new URL(document.referrer);
        referrerHost = ref.hostname.replace(/^www\./, "");
        if (referrerHost.includes("blog.naver")) {
          const id = ref.searchParams.get("blogId") ?? ref.pathname.split("/").filter(Boolean)[0];
          if (id && /^[a-zA-Z0-9_-]+$/.test(id) && !id.endsWith(".naver")) blogSource = `blog:${id}`;
        }
      }
    } catch {
      referrerHost = null;
    }
    const utmSource = new URLSearchParams(window.location.search).get("utm_source") ?? blogSource;

    logPageView(pathname, referrerHost, utmSource).catch(() => {});
  }, [pathname]);

  return null;
}
