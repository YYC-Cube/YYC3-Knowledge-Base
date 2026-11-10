/**
 * @file: constants/providers.ts
 * @description: 服务商元数据共享常量 — 全局模型数据唯一真相源
 *              ModelSettings / IDE / 聊天页 三处统一引用此文件
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v2.0.0
 * @created: 2026-03-08
 * @updated: 2026-04-16
 * @status: production
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: constants,providers,metadata,zhipu,glm
 */

import { Cpu, Server } from "lucide-react";

export interface ModelDef {
  id: string;
  name: string;
  description: string;
  contextWindow?: string;
  pricing?: string;
}

export interface ProviderDef {
  id: string;
  name: string;
  shortName: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  colorBg: string;
  colorBorder: string;
  description: string;
  baseURL: string;
  apiKeyUrl: string;
  apiKeyPlaceholder: string;
  models: ModelDef[];
  openaiCompatible: boolean;
  docsUrl: string;
}

/**
 * 内置服务商列表 — 全局唯一真相源
 *
 * 仅保留两个供应商：
 *   1. zai-plan — Z.ai Coding Plan (智谱) 云端 API
 *   2. ollama    — 本地推理，运行时动态检测模型（无预设）
 *
 * 所有页面（IDE / 聊天 / 设置）必须从此数组读取，
 * 禁止在别处硬编码供应商或模型定义。
 */
export const BUILTIN_PROVIDERS: ProviderDef[] = [
  {
    id: "ollama",
    name: "Ollama (本地)",
    shortName: "Local",
    icon: Server,
    color: "text-amber-400",
    colorBg: "bg-amber-500/10",
    colorBorder: "border-amber-500/20",
    description: "运行时自动检测 · 本地推理 · 零上传",
    baseURL: "http://localhost:11434/api/chat",
    apiKeyUrl: "",
    apiKeyPlaceholder: "",
    openaiCompatible: false,
    docsUrl: "https://ollama.com",
    models: [], // 运行时动态检测，无预设模型
  },
  {
    id: "zai-plan",
    name: "Z.ai Coding Plan",
    shortName: "智谱",
    icon: Cpu,
    color: "text-indigo-400",
    colorBg: "bg-indigo-500/10",
    colorBorder: "border-indigo-500/20",
    description: "GLM-5 / GLM-5.1 / GLM-4.7 编程专精",
    baseURL: "https://open.bigmodel.cn/api/coding/paas/v4/chat/completions",
    apiKeyUrl: "https://open.bigmodel.cn/usercenter/apikeys",
    apiKeyPlaceholder: "输入 Z.ai API Key...",
    openaiCompatible: true,
    docsUrl: "https://open.bigmodel.cn/dev/api#coding",
    models: [
      {
        id: "glm-5",
        name: "GLM-5",
        description: "最新旗舰推理模型",
        contextWindow: "128K",
      },
      {
        id: "glm-5.1",
        name: "GLM-5.1",
        description: "增强版旗舰模型",
        contextWindow: "128K",
      },
      {
        id: "glm-4.7",
        name: "GLM-4.7",
        description: "高性能通用模型",
        contextWindow: "128K",
      },
    ],
  },
];

/** 导出便捷访问器 */
export const OLLAMA_PROVIDER = BUILTIN_PROVIDERS[0];
export const ZAI_PLAN_PROVIDER = BUILTIN_PROVIDERS[1];
