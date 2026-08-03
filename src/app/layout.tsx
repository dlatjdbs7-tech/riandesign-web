import type { Metadata } from "next";
import localFont from "next/font/local";
import { Manrope } from "next/font/google";
import "./globals.css";

// reandesign.kr 운영 사이트와 동일한 Pretendard로 통일 (홈페이지 + 관리자 시스템 전체)
const pretendard = localFont({
  src: "../../node_modules/pretendard/dist/web/variable/woff2/PretendardVariable.woff2",
  variable: "--font-pretendard",
  weight: "45 920",
  display: "swap",
});

// reandesign.kr이 영문 라벨/큰 타이틀에 쓰는 Manrope (예: "Our story" 헤딩, "ABOUT" 라벨)
const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://reandesign.co.kr"),
  title: {
    default: "리안디자인 | 대전 하이엔드 인테리어",
    template: "%s | 리안디자인",
  },
  description:
    "대전 하이엔드 인테리어 리안디자인. 주거·상업 공간의 격을 높이는 디자인 컨설팅과 시공을 제공합니다.",
  keywords: ["대전 인테리어", "하이엔드 인테리어", "리안디자인", "상업공간 인테리어", "주거 인테리어"],
  openGraph: {
    title: "리안디자인 | 대전 하이엔드 인테리어",
    description: "대전 하이엔드 인테리어 리안디자인. 공간에 격을 더하는 디자인.",
    locale: "ko_KR",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${pretendard.variable} ${manrope.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
