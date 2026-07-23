# YYC3 P2-预览-多设备预览

@file P2-高级功能/YYC3-P2-预览-多设备预览.md | @author YanYuCloudCube Team | @version v1.0.0 | @tags P2,preview,multi-device

## 功能目标
多设备模拟、并行预览、实时同步、性能监控、响应式测试、截图导出

## 预设设备
Desktop 1920x1080 | Laptop 1366x768 | iPad Pro 1024x1366 (dpr:2) | iPhone 14 390x844 (dpr:3) | Android 360x800 (dpr:2)

## 核心组件
- **DeviceManager**: getAllDevices/addCustomDevice/removeDevice/activateDevice/rotateDevice
- **PreviewContainer**: iframe sandbox + dpr scale transform + 加载/错误状态
- **PreviewGrid**: grid/horizontal/vertical 布局 + 滚轮缩放
- **DeviceSelector**: 分组显示(desktop/tablet/mobile) + 搜索过滤 + 全选
- **PreviewSyncManager**: WebSocket 连接 + broadcast/send + 交互同步
- **PerformanceMonitor**: loadTime/renderTime/interactionTime/memoryUsage 指标
- **ResponsiveBreakpointTest**: 断点测试 + 响应式问题检测(溢出/滚动/绝对定位超出)
- **PreviewExporter**: 截图导出(html2canvas) + 性能报告 + 响应式报告

## 验收: 多设备预览/自定义设备/旋转/实时同步/性能监控/截图导出正常
