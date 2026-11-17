import type { InjectionKey } from 'vue'

/**
 * DemoGroup 全局配置类型
 */
export interface DemoGroupGlobalConfig {
  /**
   * 是否全局透明模式
   */
  transparent?: boolean

  /**
   * 全局自定义类名
   */
  customClass?: string

  /**
   * 全局自定义样式
   */
  customStyle?: string
}

/**
 * DemoGroupProvide 类型
 */
export interface DemoGroupProvide {
  props: DemoGroupGlobalConfig
}

/**
 * Injection Key
 */
export const DEMO_GROUP_KEY: InjectionKey<DemoGroupProvide> = Symbol('demo-group')
