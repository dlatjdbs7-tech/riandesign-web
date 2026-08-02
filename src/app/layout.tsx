import type { Metadata } from "next";
import { Noto_Sans_KR, Noto_Serif_KR } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const notoSansKr = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  variable: "--font-sans-kr",
});

const notoSerifKr = Noto_Serif_KR({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-serif-kr",
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
      className={`${notoSansKr.variable} ${notoSerifKr.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
