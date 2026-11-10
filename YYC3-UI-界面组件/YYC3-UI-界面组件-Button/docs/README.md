设计系统对接规范

## 1.1 组件接口统一规范

所有组件必须遵循以下接口规范：

```typescript
// 基础组件Props接口
interface BaseComponentProps {
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

// 主题相关Props
interface ThemeProps {
  theme?: 'cyberpunk' | 'liquid-glass';
  primaryColor?: string;
}

// 尺寸相关Props
interface SizeProps {
  size?: 'small' | 'medium' | 'large';
}

// 状态相关Props
interface StatusProps {
  disabled?: boolean;
  loading?: boolean;
  error?: boolean;
}
```

## 1.2 主题系统集成要求

设计系统必须提供以下主题变量：

```typescript
// 主题变量接口
interface ThemeVariables {
  // 颜色系统
  colors: {
    primary: string;
    secondary: string;
    success: string;
    warning: string;
    error: string;
    info: string;
    background: string;
    text: string;
    border: string;
  };
  
  // 间距系统
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  
  // 圆角系统
  borderRadius: {
    sm: string;
    md: string;
    lg: string;
    full: string;
  };
  
  // 阴影系统
  shadows: {
    sm: string;
    md: string;
    lg: string;
  };
  
  // 过渡系统
  transitions: {
    fast: string;
    normal: string;
    slow: string;
  };
}
```

## 1.3 可访问性要求

所有组件必须满足以下可访问性要求：

1. **键盘导航**：
   - 支持 Tab 键导航
   - 支持 Enter/Space 键激活
   - 支持 ESC 键关闭

2. **ARIA 属性**：
   - role 属性正确
   - aria-label 完整
   - aria-describedby 适当

3. **焦点管理**：
   - 焦点可见
   - 焦点陷阱（模态框）
   - 焦点恢复

4. **屏幕阅读器**：
   - 语义化标签
   - 隐藏装饰性元素
   - 提供文本替代

## 1.4 响应式设计要求

所有组件必须支持响应式设计：

```typescript
// 响应式断点
const breakpoints = {
  xs: '0px',
  sm: '576px',
  md: '768px',
  lg: '992px',
  xl: '1200px',
  xxl: '1600px'
};

// 响应式Props
interface ResponsiveProps {
  xs?: Partial<ComponentProps>;
  sm?: Partial<ComponentProps>;
  md?: Partial<ComponentProps>;
  lg?: Partial<ComponentProps>;
  xl?: Partial<ComponentProps>;
  xxl?: Partial<ComponentProps>;
}
```

---
