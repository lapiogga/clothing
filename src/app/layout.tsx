import type { Metadata } from "next";
import { Noto_Sans_KR } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const notoSansKR = Noto_Sans_KR({ subsets: ["latin"], weight: ["400", "500", "700"], variable: "--font-noto-sans-kr" });

export const metadata: Metadata = {
  title: "피복 구매관리 시스템",
  description: "군 피복 포인트 기반 온/오프라인 구매관리 시스템",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className={`antialiased ${notoSansKR.variable}`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
