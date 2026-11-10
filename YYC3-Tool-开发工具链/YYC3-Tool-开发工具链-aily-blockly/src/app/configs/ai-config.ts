export interface AIConfig {
  enabled: boolean;
  apiEndpoint: string;
  apiKey?: string;
  timeout: number;
  maxCacheSize: number;
  model: string;
  temperature: number;
}

export const DEFAULT_AI_CONFIG: AIConfig = {
  enabled: true,
  apiEndpoint: 'http://localhost:3000/api/completion',
  timeout: 5000, // 5秒超时
  maxCacheSize: 100, // 最大缓存100个条目
  model: 'code-completion',
  temperature: 0.3 // 较低的温度以获得更确定的结果
};

export const AI_PROMPTS = {
  SYSTEM_PROMPT: `你是一个专业的Arduino/C++代码助手。请根据用户的代码上下文，提供准确、简洁的代码补全建议。

规则：
1. 只提供与Arduino/C++相关的代码建议
2. 考虑当前代码的上下文和语法
3. 优先提供常用的Arduino函数和模式
4. 确保代码语法正确
5. 提供简短但有用的描述

请以JSON格式返回结果：
{
  "suggestions": [
    {
      "text": "代码文本",
      "description": "简短描述",
      "confidence": 0.9,
      "type": "completion|suggestion|snippet"
    }
  ]
}`,

  USER_PROMPT_TEMPLATE: `
当前代码上下文：
文件类型: {language}
光标位置: 第{line}行，第{column}列

光标前的代码：
{beforeCursor}

光标后的代码：
{afterCursor}

请为光标位置提供代码补全建议。
`,

  COMMON_SNIPPETS: {
    'setup_loop': {
      text: 'void setup() {\n  ${1:// 初始化代码}\n}\n\nvoid loop() {\n  ${2:// 主循环代码}\n}',
      description: 'Arduino基本结构',
      confidence: 0.95,
      type: 'snippet'
    },
    'serial_begin': {
      text: 'Serial.begin(${1:9600});',
      description: '初始化串口通信',
      confidence: 0.9,
      type: 'completion'
    },
    'pin_mode': {
      text: 'pinMode(${1:pin}, ${2|INPUT,OUTPUT,INPUT_PULLUP|});',
      description: '设置引脚模式',
      confidence: 0.9,
      type: 'completion'
    },
    'digital_write': {
      text: 'digitalWrite(${1:pin}, ${2|HIGH,LOW|});',
      description: '数字引脚输出',
      confidence: 0.9,
      type: 'completion'
    },
    'digital_read': {
      text: 'digitalRead(${1:pin})',
      description: '读取数字引脚',
      confidence: 0.9,
      type: 'completion'
    },
    'analog_read': {
      text: 'analogRead(${1:pin})',
      description: '读取模拟引脚',
      confidence: 0.9,
      type: 'completion'
    },
    'delay': {
      text: 'delay(${1:1000});',
      description: '延迟毫秒',
      confidence: 0.85,
      type: 'completion'
    }
  }
};
