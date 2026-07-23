/**
 * @file 根布局组件
 * @description Next.js App Router 根布局，统一页面结构与全局样式挂载
 * @module app/layout
 * @author YYC
 * @version 1.0.0
 * @created 2024-10-31
 * @updated 2024-10-31
 */

import React from 'react';
import DevSWCleanup from '@/components/DevSWCleanup';

export const metadata = {
  title: 'Ollama LLM Platform',
  description: '本地私有部署的大模型平台，支持多模型与场景化 Prompt',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>
        <DevSWCleanup />
        {children}
      </body>
    </html>
  );
}
