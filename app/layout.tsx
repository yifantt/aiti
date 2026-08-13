import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AITI｜你的 AI 使用人格",
  description: "24 道题，看看你一用 AI 会变成什么人。",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
  openGraph: {
    title: "AITI｜你的 AI 使用人格",
    description: "24 道题，看看你一用 AI 会变成什么人。",
    images: ["/og.png"],
  },
  twitter: { card: "summary_large_image", images: ["/og.png"] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
