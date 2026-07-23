// app/components/ModelManager.tsx
'use client';
import React from 'react';
 
interface ModelManagerProps {
  models: string[];
  selectedModel: string;
  onModelChange: (model: string) => void;
}
 
const ModelManager: React.FC<ModelManagerProps> = ({
  models,
  selectedModel,
  onModelChange,
}) => {
  return (
    <div className="border p-4 rounded-md">
      <h2 className="text-lg font-bold mb-2">模型管理器</h2>
      <div className="flex flex-col space-y-2">
        {models.map((model) => (
          <button
            key={model}
            type="button"
            className={`px-4 py-2 rounded-md cursor-pointer ${model === selectedModel ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'}`}
            onClick={() => onModelChange(model)}
          >
            {model}
          </button>
        ))}
      </div>
    </div>
  );
};
 
export default ModelManager;