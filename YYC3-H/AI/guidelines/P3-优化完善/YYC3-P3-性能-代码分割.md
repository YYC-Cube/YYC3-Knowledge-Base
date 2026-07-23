# YYC3 P3-性能-代码分割
@file P3-优化完善/YYC3-P3-性能-代码分割.md | @author YanYuCloudCube Team | @version v1.0.0 | @tags P3,performance,code-splitting

## 策略: 路由分割(React.lazy) | 组件分割(dynamic import) | 第三方库分割(manualChunks)
## Vite manualChunks: react-vendor | editor-vendor | ui-vendor | utils-vendor
## 预加载: prefetch 空闲时 | preload 关键路由
## 验收: 主包<200KB、首屏<2s、按需加载无闪烁
