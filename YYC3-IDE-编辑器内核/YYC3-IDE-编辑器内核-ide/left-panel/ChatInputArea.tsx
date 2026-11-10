/**
 * @file: left-panel/ChatInputArea.tsx
 * @description: 聊天输入区子组件 — 快捷建议、文本输入框、附件按钮、
 *              发送/停止按钮、Enter 快捷键、文件上传支持
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.1.0
 * @created: 2026-03-18
 * @updated: 2026-04-08
 * @status: stable
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: left-panel,chat-input,suggestions,send,file-upload
 */

import { useRef, useState, useCallback } from "react";
import {
  Paperclip,
  Image as ImageIcon,
  Send,
  X,
  FileText,
  Loader2,
} from "lucide-react";
import { logger } from "../services/Logger";

// ── Types ──

export interface AttachedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  content?: string;
  preview?: string;
}

export interface ChatInputAreaProps {
  chatInput: string;
  setChatInput: (value: string) => void;
  isStreaming: boolean;
  showSuggestions: boolean;
  onSend: () => void;
  onStop: () => void;
  attachedFiles?: AttachedFile[];
  onAttachFiles?: (files: AttachedFile[]) => void;
  onRemoveFile?: (fileId: string) => void;
}

export default function ChatInputArea({
  chatInput,
  setChatInput,
  isStreaming,
  showSuggestions,
  onSend,
  onStop,
  attachedFiles = [],
  onAttachFiles,
  onRemoveFile,
}: ChatInputAreaProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>, type: "file" | "image") => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      setIsUploading(true);
      const newFiles: AttachedFile[] = [];

      for (const file of Array.from(files)) {
        try {
          const content = await readFileContent(file);
          const attachedFile: AttachedFile = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
            name: file.name,
            type: file.type || "application/octet-stream",
            size: file.size,
            content,
          };

          if (type === "image" && file.type.startsWith("image/")) {
            attachedFile.preview = content;
          }

          newFiles.push(attachedFile);
        } catch (error) {
          logger.error("[ChatInputArea] Failed to read file:", file.name, error instanceof Error ? error.message : String(error));
        }
      }

      if (newFiles.length > 0 && onAttachFiles) {
        onAttachFiles([...attachedFiles, ...newFiles]);
      }

      setIsUploading(false);
      e.target.value = "";
    },
    [attachedFiles, onAttachFiles]
  );

  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      if (file.type.startsWith("image/")) {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      } else {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsText(file);
      }
    });
  };

  const handleTextareaChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setChatInput(e.target.value);
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
        textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
      }
    },
    [setChatInput]
  );

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <>
      {/* Input Section */}
      <div className="flex-shrink-0 border-t border-[var(--ide-border-dim)] p-2.5 space-y-2 min-w-[350px]">
        {/* Attached Files Preview */}
        {attachedFiles.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pb-1">
            {attachedFiles.map((file) => (
              <div
                key={file.id}
                className="flex items-center gap-1.5 px-2 py-1 bg-[var(--ide-bg-elevated)] border border-[var(--ide-border-mid)] rounded text-[0.65rem] text-slate-400"
              >
                {file.type.startsWith("image/") ? (
                  <ImageIcon className="w-3 h-3 text-emerald-400" />
                ) : (
                  <FileText className="w-3 h-3 text-sky-400" />
                )}
                <span className="max-w-[100px] truncate">{file.name}</span>
                <span className="text-slate-600">({formatFileSize(file.size)})</span>
                <button
                  onClick={() => onRemoveFile?.(file.id)}
                  className="w-4 h-4 rounded flex items-center justify-center hover:bg-white/10 transition-colors"
                >
                  <X className="w-2.5 h-2.5 text-slate-500" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Input Row */}
        <div className="flex items-end gap-1.5">
          <div className="flex-1 min-w-[320px] flex items-end bg-[var(--ide-bg-elevated)] border border-[var(--ide-border-mid)] rounded-lg px-2.5 py-2">
            <div className="flex gap-0.5 mr-2 mb-0.5">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => handleFileSelect(e, "file")}
                accept=".txt,.md,.json,.js,.ts,.tsx,.jsx,.py,.java,.go,.rs,.c,.cpp,.h,.css,.html,.xml,.yaml,.yml"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isStreaming || isUploading}
                className="w-6 h-6 rounded flex items-center justify-center hover:bg-white/5 transition-colors disabled:opacity-30"
                title="上传文件"
              >
                {isUploading ? (
                  <Loader2 className="w-3.5 h-3.5 text-slate-600 animate-spin" />
                ) : (
                  <Paperclip className="w-3.5 h-3.5 text-slate-600" />
                )}
              </button>

              <input
                ref={imageInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => handleFileSelect(e, "image")}
                accept="image/*"
              />
              <button
                onClick={() => imageInputRef.current?.click()}
                disabled={isStreaming || isUploading}
                className="w-6 h-6 rounded flex items-center justify-center hover:bg-white/5 transition-colors disabled:opacity-30"
                title="上传图片"
              >
                <ImageIcon className="w-3.5 h-3.5 text-slate-600" />
              </button>
            </div>

            <textarea
              ref={textareaRef}
              value={chatInput}
              onChange={handleTextareaChange}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  onSend();
                }
              }}
              placeholder="输入你的需求... (Shift+Enter 换行)"
              className="flex-1 bg-transparent border-0 outline-none text-slate-300 placeholder:text-slate-700 text-[0.75rem] resize-none min-h-[24px] max-h-[120px] leading-relaxed"
              rows={1}
              disabled={isStreaming}
            />

            <button
              onClick={isStreaming ? onStop : onSend}
              disabled={!isStreaming && (!chatInput.trim() || isUploading)}
              className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/5 transition-colors disabled:opacity-30 ml-1"
              title={isStreaming ? "停止" : "发送"}
            >
              {isStreaming ? (
                <div className="w-3.5 h-3.5 rounded-sm bg-red-500/80" />
              ) : (
                <Send className="w-3.5 h-3.5 text-sky-400" />
              )}
            </button>
          </div>
        </div>

        {/* Quick Suggestions */}
        {showSuggestions && (
          <div className="flex flex-wrap gap-1 pt-1">
            {[
              "帮我写一个 React 组件",
              "解释这段代码的作用",
              "优化这个函数的性能",
              "添加错误处理",
            ].map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => setChatInput(suggestion)}
                className="px-2 py-0.5 rounded-full text-[0.6rem] text-slate-500 bg-[var(--ide-bg-elevated)] border border-[var(--ide-border-faint)] hover:border-[var(--ide-accent-solid)]/30 hover:text-slate-400 transition-all"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
