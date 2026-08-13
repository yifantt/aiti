import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AITI｜你的 AI 使用人格",
  description: "24 个真实情境，识别你和 AI 到底是什么关系。",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
  openGraph: {
    title: "AITI｜你的 AI 使用人格",
    description: "24 个真实情境，识别你和 AI 到底是什么关系。",
    images: ["/og.png"],
  },
  twitter: { card: "summary_large_image", images: ["/og.png"] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
