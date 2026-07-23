"use client";

import { useState } from 'react';
import ModelManager from '@/components/ModelManager';
import PromptEditor from '@/components/PromptEditor';
import { callOllamaModel } from '@/lib/ollama';

// 明确类型定义
type TemplateMap = Record<string, string>;
type ModelConfig = {
  default_model: string;
  max_tokens: number;
  temperature: number;
  top_p: number;
  available_models: string[];
};

export default function LLMPageClient({
  initialTemplates,
  modelConfig
}: {
  initialTemplates: TemplateMap;
  modelConfig: ModelConfig;
}) {
  const [prompt, setPrompt] = useState(initialTemplates['default'] || '');
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState(modelConfig.default_model);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!prompt.trim()) {
      alert('请输入提示词');
      return;
    }

    setIsLoading(true);
    setResponse(''); // 清空之前的响应

    try {
      const modelResponse = await callOllamaModel(selectedModel, prompt, true);
      let responseText = '';

      // 处理流式响应
      if (Symbol.asyncIterator in Object(modelResponse)) {
        for await (const chunk of modelResponse as AsyncGenerator<string>) {
          responseText += chunk;
          setResponse(responseText); // 实时更新响应
        }
      } 
      // 处理普通字符串响应
      else {
        responseText = typeof modelResponse === 'string'
          ? modelResponse
          : '模型返回空响应';
        setResponse(responseText);
      }
    } catch (error: any) {
      setResponse(`错误: ${error.message}`);
      console.error('模型调用失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-6 md:p-12 bg-gray-50">
      <div className="max-w-3xl mx-auto bg-white p-6 md:p-8 rounded-lg shadow">
        <h1 className="text-2xl md:text-3xl font-bold mb-4">
          Ollama LLM 平台 - {Object.keys(initialTemplates)[0]} 场景
        </h1>

        <ModelManager 
          models={modelConfig.available_models}
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
        />
        
        <PromptEditor 
          prompt={prompt}
          onPromptChange={setPrompt}
          templates={initialTemplates}
        />

        <form onSubmit={handleSubmit} className="mb-6">
          <button
            type="submit"
            disabled={isLoading}
            className="px-5 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            {isLoading ? '生成中...' : '生成回答'}
          </button>
        </form>

        {response && (
          <div className="border-t pt-4">
            <h2 className="text-lg font-semibold mb-2">模型回答：</h2>
            <div 
              className={`bg-gray-50 p-3 rounded ${response.startsWith('错误:') ? 'bg-red-50' : ''}`}
            >
              {response}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}