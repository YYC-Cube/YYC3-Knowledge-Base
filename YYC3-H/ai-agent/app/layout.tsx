/** 
 * @file 根布局组件
 * @description 定义应用的全局布局、元数据和多语言支持
 * @author YYC³ 
 * @version 1.0.0 
 * @created 2025-09-15 
 * @updated 2025-09-15 
 */
import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import { Suspense } from "react"
import { LanguageProvider } from "./i18n/context"
import { languageConfig } from "./i18n/config"
import "./globals.css"

// 为默认语言生成元数据
export const metadata: Metadata = {
  // 支持多语言的标题设置
  title: {
    default: "YYC³ AI 智能代理构建器",
    template: "%s | YYC³ AI 智能代理构建器",
  },
  description:
    "低代码AI工作流构建平台，轻松创建强大的AI应用。通过拖放节点直观地构建工作流程，连接提示词、模型和工具。",
  keywords: [
    "AI",
    "人工智能",
    "工作流构建",
    "可视化编程",
    "低代码",
    "AI代理",
    "大语言模型",
    "OpenAI",
    "Gemini",
    "React Flow",
  ],
  authors: [{ name: "YYC³" }],
  creator: "YYC³",
  publisher: "YYC³",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL("https://yyc3-project.vercel.app"),
  openGraph: {
    type: "website",
    locale: "zh_CN", // 默认区域设置
    url: "/",
    title: "YYC³ AI 智能代理构建器",
    description:
      "低代码AI工作流构建平台，轻松创建强大的AI应用。通过拖放节点直观地构建工作流程，连接提示词、模型和工具。",
    siteName: "YYC³ AI 智能代理构建器",
  },
  twitter: {
    card: "summary_large_image",
    title: "YYC³ AI 智能代理构建器",
    description:
      "低代码AI工作流构建平台，轻松创建强大的AI应用。通过拖放节点直观地构建工作流程，连接提示词、模型和工具。",
    creator: "@yyc3",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  generator: "yyc3-project",
  // 多语言支持
  alternates: {
    languages: {
      'zh': '/',
      'en': '/en',
    },
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang={languageConfig.defaultLanguage}>
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        {/* 使用LanguageProvider包装应用，提供多语言支持 */}
        <LanguageProvider>
          <Suspense fallback={<div>加载中...</div>}>{children}</Suspense>
        </LanguageProvider>
        <Analytics />
      </body>
    </html>
  )
}
