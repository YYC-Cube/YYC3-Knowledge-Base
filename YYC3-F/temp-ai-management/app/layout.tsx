import "../styles/globals.css"; // ✅ 引入全局样式
import type React from "react";
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "../theme-provider"; // ✅ 根目录引入
import { I18nProvider } from "../components/providers/i18n-provider";
import { MobileProvider } from "../components/providers/mobile-provider";
import { NetworkStatusProvider } from "../components/providers/network-status-provider";
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "YanYu Cloud³ Cube · 智能云枢管理平台",
  description:
    "万象归元于云枢，深栈智启新纪元 —— YanYu Cloud³ AI Family，打造企业级智能管理新范式。",
  keywords:
    "YanYu Cloud³, YYC Cube, 云管理平台, 企业智能, AI系统, 智能云枢, 数字化转型",
  authors: [{ name: "YanYu Cloud Team" }],
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
  generator: "v0.app",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "YYC Cube",
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "msapplication-TileColor": "#000000",
    "msapplication-tap-highlight": "no",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // 防止iOS上缩放导致的双击问题
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
  viewportFit: "cover", // 适配iPhone X及以上的安全区域
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" dir="ltr">
      <head>
        {/* 预连接和预获取指令 */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin=""
        />

        {/* 添加到主屏幕的图标 */}
        <link rel="apple-touch-icon" href="/logo.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/logo.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/logo.png" />
        <link rel="apple-touch-icon" sizes="167x167" href="/logo.png" />

        {/* 启动画面 */}
        <meta name="apple-mobile-web-app-title" content="YYC Cube" />
        <link rel="apple-touch-startup-image" href="/logo.png" />

        {/* 防止电话号码自动识别 */}
        <meta name="format-detection" content="telephone=no" />

        {/* 优化移动端渲染 */}
        <meta name="HandheldFriendly" content="true" />
        <meta name="MobileOptimized" content="320" />
      </head>
      <body className={`${inter.className} overscroll-none`}>
        <MobileProvider>
          <NetworkStatusProvider>
            <I18nProvider>
              <ThemeProvider>
                {children}
                <Toaster
                  position="top-center"
                  closeButton
                  richColors
                  expand={false}
                  duration={4000}
                />
              </ThemeProvider>
            </I18nProvider>
          </NetworkStatusProvider>
        </MobileProvider>
      </body>
    </html>
  );
}
