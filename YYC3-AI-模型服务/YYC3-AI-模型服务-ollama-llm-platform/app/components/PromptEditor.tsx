// components/PromptEditor.tsx
'use client';
import React, { useState } from 'react';

// 扩展 Props 类型：支持外部控制提示词 & 监听变化
interface PromptEditorProps {
  prompt: string;                 // 当前提示词
  onPromptChange: (prompt: string) => void; // 提示词变化回调
  templates: Record<string, string>; // 提示词模板（如 { "代码助手": "请解释 TypeScript 泛型..." }）
}

const PromptEditor: React.FC<PromptEditorProps> = ({
  prompt,
  onPromptChange,
  templates,
}) => {
  // 模板选择状态
  const [selectedTemplate, setSelectedTemplate] = useState('');

  // 选择模板时填充提示词
  const handleTemplateSelect = (templateKey: string) => {
    setSelectedTemplate(templateKey);
    onPromptChange(templates[templateKey] || '');
  };

  return (
    <div className="border p-4 rounded-md mb-4">
      <h2 className="text-lg font-bold mb-2">提示词编辑器</h2>

      {/* 模板选择区 */}
      <div className="flex flex-wrap gap-2 mb-4">
        {Object.keys(templates).map((templateKey) => (
          <button
            key={templateKey}
            type="button"
            className={`px-3 py-1 rounded-md cursor-pointer 
              ${
                templateKey === selectedTemplate 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 text-gray-800'
              }`}
            onClick={() => handleTemplateSelect(templateKey)}
          >
            {templateKey}
          </button>
        ))}
      </div>

      {/* 提示词输入区 */}
      <textarea
        value={prompt}
        onChange={(e) => onPromptChange(e.target.value)}
        className="w-full p-2 border rounded-md"
        rows={4}
        placeholder="输入你的提示词..."
      />
    </div>
  );
};

export default PromptEditor;