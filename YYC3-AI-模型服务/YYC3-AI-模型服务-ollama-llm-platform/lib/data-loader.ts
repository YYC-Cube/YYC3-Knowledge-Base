import { join } from 'path';
import { readFile } from 'fs/promises';
import { parse } from 'yaml';

type TemplateMap = Record<string, string>;
type ModelConfig = {
  default_model: string;
  max_tokens: number;
  temperature: number;
  top_p: number;
  available_models: string[];
};

// 加载模板数据
export async function loadTemplates(slug: string): Promise<TemplateMap> {
  try {
    const path = join(process.cwd(), 'content/prompts', `${slug}.yaml`);
    const content = await readFile(path, 'utf-8');
    const parsed = parse(content);
    
    return Object.entries(parsed).reduce((acc, [key, value]: [string, any]) => {
      acc[key] = String(value);
      return acc;
    }, {} as TemplateMap);
  } catch (error) {
    console.error('加载模板失败:', error);
    return { [slug]: '请输入提示词...' };
  }
}

// 加载模型配置
export async function loadModelConfig(): Promise<ModelConfig> {
  try {
    const path = join(process.cwd(), 'content/model-config.yaml');
    const content = await readFile(path, 'utf-8');
    return parse(content) as ModelConfig;
  } catch (error) {
    console.error('加载模型配置失败:', error);
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
  }
}