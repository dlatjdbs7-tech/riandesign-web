"use client";

import { useEffect } from "react";

// https://www.reandesign.co.kr/#portfolio 로 들어오면 실제 운영 중인 홈페이지로 이동시킨다.
// #해시는 서버로 전달되지 않아 미들웨어/서버 리다이렉트로는 처리할 수 없어 클라이언트에서 확인한다.
export default function PortfolioHashRedirect() {
  useEffect(() => {
    if (window.location.hash === "#portfolio") {
      window.location.replace("https://reandesign.kr/");
    }
  }, []);

  return null;
}
