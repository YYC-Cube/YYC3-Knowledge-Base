/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck — TODO(P0-1): React 19 + lucide-react 类型兼容性问题，待上游修复
/**
 * @file CopyButton.tsx
 * @description 通用复制到剪贴板按钮组件
 * @author YanYuCloudCube Team <admin@0379.email>
 * @version v1.0.0
 */

import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { copyToClipboard } from '../utils/clipboard'

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    copyToClipboard(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <button
      onClick={handleCopy}
      className="p-1 rounded text-white/15 hover:text-white/40 hover:bg-white/5 transition-all shrink-0"
      title={copied ? '已复制' : '复制'}
    >
      {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
    </button>
  )
}
