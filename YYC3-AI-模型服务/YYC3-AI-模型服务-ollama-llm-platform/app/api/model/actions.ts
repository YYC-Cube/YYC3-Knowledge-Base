import { NextRequest, NextResponse } from 'next/server';
import { ModelConfig } from '@/types/ollama'; // 引入类型

// 模拟获取当前模型配置（实际可从文件或数据库读取）
const getCurrentModelConfig = async (): Promise<ModelConfig> => {
  // 这里示例从固定对象获取，实际可优化为读取 content/model-config.yaml 等
  return {
    default_model: 'llama3:70b',
    max_tokens: 2048,
    temperature: 0.7,
    top_p: 0.95,
    available_models: [
      'llama3:70b',
      'mixtral:latest',
      'codellama:latest',
      'qwen2:latest',
      'phi3:latest'
    ]
  };
};

// 模拟更新模型配置（示例方法，可根据需求扩展）
const updateModelConfig = async (newConfig: ModelConfig) => {
  // 实际可写入文件或更新数据库，此处简单打印
  console.log('更新模型配置:', newConfig);
  return newConfig;
};

export async function GET(request: NextRequest) {
  try {
    const modelConfig = await getCurrentModelConfig();
    return NextResponse.json(modelConfig, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const newConfig = await request.json() as ModelConfig;
    const updatedConfig = await updateModelConfig(newConfig);
    return NextResponse.json(updatedConfig, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}