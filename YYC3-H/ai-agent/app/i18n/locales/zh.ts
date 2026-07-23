/**
 * @file 中文语言字典
 * @description YYC³ AI智能代理构建器中文翻译文件
 * @author YYC³
 * @version 1.0.0
 * @created 2025-09-15
 */

export const zh = {
  // 通用
  common: {
    loading: '加载中...',
    save: '保存',
    cancel: '取消',
    delete: '删除',
    edit: '编辑',
    create: '创建',
    close: '关闭',
    submit: '提交',
    search: '搜索',
    filter: '筛选',
    sort: '排序',
    confirm: '确认',
    back: '返回',
    next: '下一步',
    previous: '上一步',
    done: '完成',
    error: '错误',
    success: '成功',
    warning: '警告',
    info: '提示',
    yes: '是',
    no: '否',
    or: '或',
    and: '和',
    of: '的',
    by: '由',
    with: '与',
    for: '为',
  },
  
  // 应用标题和描述
  app: {
    title: 'YYC³ AI 智能代理构建器',
    description: '低代码AI工作流构建平台，轻松创建强大的AI应用',
    keywords: 'AI,工作流,智能代理,低代码,构建器',
    author: 'YYC³',
  },
  
  // 导航
  navigation: {
    dashboard: '仪表盘',
    projects: '项目',
    templates: '模板',
    documentation: '文档',
    settings: '设置',
    profile: '个人资料',
    logout: '退出登录',
  },
  
  // 工作流编辑器
  workflow: {
    editor: '工作流编辑器',
    name: '工作流名称',
    description: '工作流描述',
    saveWorkflow: '保存工作流',
    newWorkflow: '新建工作流',
    exportCode: '导出代码',
    runWorkflow: '运行工作流',
    stopWorkflow: '停止工作流',
    executionResult: '执行结果',
    addNode: '添加节点',
    connectNodes: '连接节点',
    configureNode: '配置节点',
    deleteNode: '删除节点',
    startNode: '开始节点',
    endNode: '结束节点',
  },
  
  // 节点类型
  nodes: {
    prompt: '提示词节点',
    textModel: '文本模型',
    imageGeneration: '图像生成',
    audio: '音频处理',
    conditional: '条件判断',
    httpRequest: 'HTTP请求',
    javascript: 'JavaScript代码',
    tool: '工具调用',
    embeddingModel: '嵌入模型',
    structuredOutput: '结构化输出',
  },
  
  // 设置页面
  settings: {
    language: '语言',
    theme: '主题',
    appearance: '外观',
    darkMode: '深色模式',
    lightMode: '浅色模式',
    system: '跟随系统',
    preferences: '偏好设置',
    account: '账户设置',
    notifications: '通知设置',
  },
  
  // 语言切换
  languages: {
    zh: '中文',
    en: 'English',
  },
  
  // 错误消息
  errors: {
    networkError: '网络错误，请检查您的连接',
    serverError: '服务器错误，请稍后再试',
    validationError: '验证错误，请检查输入',
    permissionDenied: '权限不足',
    notFound: '未找到请求的资源',
    unexpectedError: '发生意外错误',
  },
  
  // 成功消息
  success: {
    saved: '保存成功',
    updated: '更新成功',
    deleted: '删除成功',
    created: '创建成功',
    exported: '导出成功',
    executed: '执行成功',
  },
};
