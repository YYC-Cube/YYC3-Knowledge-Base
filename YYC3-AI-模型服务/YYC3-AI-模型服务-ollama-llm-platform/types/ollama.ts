/**
 * @file Ollama 类型定义
 * @description 定义模型配置等核心类型，供服务端与客户端复用
 * @module types/ollama
 * @author YYC
 * @version 1.0.0
 * @created 2024-10-31
 * @updated 2024-10-31
 */

export interface ModelConfig {
  /** 默认模型名称，如 `llama3:7b` */
  default_model: string;
  /** 最大生成 Token 数量 */
  max_tokens: number;
  /** 温度参数，影响随机性 */
  temperature: number;
  /** Top-p 采样参数 */
  top_p: number;
  /** 可用模型列表 */
  available_models: string[];
}
