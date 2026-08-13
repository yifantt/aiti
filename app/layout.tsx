import type { Metadata } from "next";
import "./globals.css";
import OgImage from "./og-image";

export const metadata: Metadata = {
  title: "AITI｜你的 AI 使用人格",
  description: "24 个真实情境，识别你和 AI 到底是什么关系。",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><head><OgImage /><meta name="twitter:card" content="summary_large_image" /><meta name="twitter:image" content="/og.png" /></head><body>{children}</body></html>;
}
