// 一个非常简单的测试文件，用于验证WorkflowDesigner组件是否能正确导入和渲染
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { WorkflowDesigner } from '@/components/workflow/workflow-designer';

// 最简单的模拟，添加类型注解
jest.mock('reactflow', () => ({
  ReactFlow: ({ children, ...props }: { children?: React.ReactNode, [key: string]: any }) => (
    <div data-testid="react-flow-container" {...props}>
      Mocked ReactFlow
      {children}
    </div>
  ),
  useNodesState: () => [[], jest.fn(), jest.fn()],
  useEdgesState: () => [[], jest.fn(), jest.fn()],
  MiniMap: () => <div>MiniMap</div>,
  Controls: () => <div>Controls</div>,
  Background: () => <div>Background</div>,
  useReactFlow: () => ({})
}));

jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn() }
}));

// 简单模拟所有其他依赖，添加类型注解
jest.mock('@/components/ui/button', () => ({ 
  Button: ({ children }: { children?: React.ReactNode }) => <button>{children}</button> 
}));
jest.mock('@/components/ui/input', () => ({ Input: () => <input /> }));
jest.mock('lucide-react', () => ({}));
jest.mock('@/services/workflow/workflow-engine.service', () => ({}));


describe('WorkflowDesigner Component - Simple Test', () => {
  it('should import and render without throwing errors', () => {
    // 只测试组件是否能导入和渲染，不做具体断言
    expect(() => {
      render(<WorkflowDesigner />);
    }).not.toThrow();
  });
});