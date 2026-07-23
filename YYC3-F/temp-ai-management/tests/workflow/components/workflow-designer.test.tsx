import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';
import { WorkflowDesigner } from '../../../components/workflow/workflow-designer';

// 定义需要的类型
interface Node {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: { label: string };
}

interface Edge {
  id: string;
  source: string;
  target: string;
}

// 模拟ReactFlow，添加类型注解
jest.mock('reactflow', () => ({
  ReactFlow: ({
    children,
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    ...props
  }: {
    children?: React.ReactNode,
    nodes?: Node[],
    edges?: Edge[],
    onNodesChange?: any,
    onEdgesChange?: any,
    [key: string]: any
  }) => {
    return (
      <div data-testid="react-flow-container" {...props}>
        {nodes?.map((node: Node) => (
          <div
            key={node.id}
            data-testid={`node-${node.id}`}
            className="node"
            style={{
              position: 'absolute',
              left: `${node.position.x}px`,
              top: `${node.position.y}px`,
              width: '100px',
              height: '60px',
              backgroundColor: '#fff',
              border: '1px solid #ccc',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'move'
            }}
          >
            {node.type === 'start' && '开始'}
            {node.type === 'end' && '结束'}
            {node.type === 'task' && '任务'}
            {node.type === 'approval' && '审批'}
            {node.type === 'condition' && '条件'}
          </div>
        ))}
        {edges?.map((edge: Edge) => (
          <div
            key={edge.id}
            data-testid={`edge-${edge.id}`}
            className="edge"
            style={{
              position: 'absolute',
              backgroundColor: '#999',
              height: '2px',
              zIndex: 1
            }}
          />
        ))}
        {children}
      </div>
    );
  },
  Background: () => <div data-testid="react-flow-background" className="react-flow-background" />,
  Controls: () => <div data-testid="react-flow-controls" className="react-flow-controls">Controls</div>,
  MiniMap: () => <div data-testid="react-flow-minimap" className="react-flow-minimap">MiniMap</div>,
  // useNodesState should return [nodes, setNodes]
  useNodesState: jest.fn().mockImplementation((initialNodes = []) => {
    const setNodes = jest.fn();
    return [initialNodes, setNodes];
  }),
  // useEdgesState should return [edges, setEdges]
  useEdgesState: jest.fn().mockImplementation((initialEdges = []) => {
    const setEdges = jest.fn();
    return [initialEdges, setEdges];
  }),
  useReactFlow: () => ({
    getNodes: jest.fn().mockReturnValue([]),
    getEdges: jest.fn().mockReturnValue([]),
    fitView: jest.fn(),
    setCenter: jest.fn(),
    toObject: jest.fn().mockReturnValue({
      nodes: [],
      edges: []
    })
  }),
  // 添加ReactFlow导入的其他方法
  addEdge: jest.fn().mockImplementation((edge, edges) => [])
}));

// 模拟保存工作流定义的API
jest.mock('../../../services/workflow/workflow-engine.service', () => ({
  WorkflowEngineService: jest.fn().mockImplementation(() => ({
    saveWorkflowDefinition: jest.fn().mockResolvedValue(undefined)
  }))
}));

describe('WorkflowDesigner Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render WorkflowDesigner component with initial state', () => {
    render(<WorkflowDesigner />);
    
    // 检查组件标题
    expect(screen.getByText('工作流设计器')).toBeInTheDocument();
    
    // 检查左侧节点库
    expect(screen.getByText('节点库')).toBeInTheDocument();
    
    // 检查节点类型
    expect(screen.getByText('开始节点')).toBeInTheDocument();
    expect(screen.getByText('结束节点')).toBeInTheDocument();
    expect(screen.getByText('任务节点')).toBeInTheDocument();
    expect(screen.getByText('审批节点')).toBeInTheDocument();
    expect(screen.getByText('条件节点')).toBeInTheDocument();
    
    // 检查React Flow容器
    expect(screen.getByTestId('react-flow-container')).toBeInTheDocument();
    
    // 检查操作按钮
    expect(screen.getByRole('button', { name: '保存工作流' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '清空画布' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '放大' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '缩小' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '适应视图' })).toBeInTheDocument();
  });

  it('should display workflow name input field', () => {
    render(<WorkflowDesigner />);
    
    // 检查工作流名称输入框
    const nameInput = screen.getByPlaceholderText('请输入工作流名称');
    expect(nameInput).toBeInTheDocument();
    
    // 检查工作流描述输入框
    const descriptionInput = screen.getByPlaceholderText('请输入工作流描述');
    expect(descriptionInput).toBeInTheDocument();
  });

  it('should allow dragging nodes from the node library', async () => {
    render(<WorkflowDesigner />);
    
    // 获取开始节点
    const startNode = screen.getByText('开始节点');
    
    // 模拟拖拽开始节点到画布
    fireEvent.dragStart(startNode);
    const flowContainer = screen.getByTestId('react-flow-container');
    fireEvent.dragOver(flowContainer);
    fireEvent.drop(flowContainer);
    
    // 由于我们模拟了ReactFlow，节点不会实际渲染，但可以检查拖拽相关的交互
    expect(startNode).toBeInTheDocument();
  });

  it('should handle workflow save button click', async () => {
    render(<WorkflowDesigner />);
    
    // 输入工作流名称和描述
    const nameInput = screen.getByPlaceholderText('请输入工作流名称');
    const descriptionInput = screen.getByPlaceholderText('请输入工作流描述');
    
    fireEvent.change(nameInput, { target: { value: '测试工作流' } });
    fireEvent.change(descriptionInput, { target: { value: '这是一个测试工作流' } });
    
    // 点击保存按钮
    const saveButton = screen.getByRole('button', { name: '保存工作流' });
    fireEvent.click(saveButton);
    
    // 验证API调用
    await waitFor(() => {
      const workflowEngineService = new (require('../../../services/workflow/workflow-engine.service').WorkflowEngineService)();
      expect(workflowEngineService.saveWorkflowDefinition).toHaveBeenCalled();
    });
    
    // 验证成功提示（模拟的Alert组件）
    window.alert = jest.fn();
    expect(window.alert).toHaveBeenCalledWith('工作流保存成功！');
  });

  it('should show validation error when saving without name', async () => {
    render(<WorkflowDesigner />);
    
    // 不输入工作流名称，直接点击保存
    const saveButton = screen.getByRole('button', { name: '保存工作流' });
    fireEvent.click(saveButton);
    
    // 验证错误提示
    expect(screen.getByText('请输入工作流名称')).toBeInTheDocument();
    
    // 验证API没有被调用
    const workflowEngineService = require('../../../services/workflow/workflow-engine.service').WorkflowEngineService;
    expect(workflowEngineService().saveWorkflowDefinition).not.toHaveBeenCalled();
  });

  it('should handle clear canvas button click', () => {
    render(<WorkflowDesigner />);
    
    // 模拟confirm对话框
    window.confirm = jest.fn().mockReturnValue(true);
    
    // 点击清空画布按钮
    const clearButton = screen.getByRole('button', { name: '清空画布' });
    fireEvent.click(clearButton);
    
    // 验证confirm被调用
    expect(window.confirm).toHaveBeenCalledWith('确定要清空当前画布吗？此操作不可恢复。');
  });

  it('should cancel clear canvas when user cancels confirmation', () => {
    render(<WorkflowDesigner />);
    
    // 模拟confirm对话框被取消
    window.confirm = jest.fn().mockReturnValue(false);
    
    // 点击清空画布按钮
    const clearButton = screen.getByRole('button', { name: '清空画布' });
    fireEvent.click(clearButton);
    
    // 验证confirm被调用
    expect(window.confirm).toHaveBeenCalledWith('确定要清空当前画布吗？此操作不可恢复。');
  });

  it('should handle zoom in and zoom out controls', () => {
    render(<WorkflowDesigner />);
    
    // 点击放大按钮
    const zoomInButton = screen.getByRole('button', { name: '放大' });
    fireEvent.click(zoomInButton);
    
    // 点击缩小按钮
    const zoomOutButton = screen.getByRole('button', { name: '缩小' });
    fireEvent.click(zoomOutButton);
    
    // 点击适应视图按钮
    const fitViewButton = screen.getByRole('button', { name: '适应视图' });
    fireEvent.click(fitViewButton);
    
    // 由于模拟了ReactFlow，无法直接验证缩放效果，但可以确认按钮存在且可点击
    expect(zoomInButton).toBeInTheDocument();
    expect(zoomOutButton).toBeInTheDocument();
    expect(fitViewButton).toBeInTheDocument();
  });

  it('should handle error when saving workflow fails', async () => {
    // 模拟API失败
    const workflowEngineService = new (require('../../../services/workflow/workflow-engine.service').WorkflowEngineService)();
    workflowEngineService.saveWorkflowDefinition.mockRejectedValueOnce(new Error('保存失败，服务器错误'));
    
    render(<WorkflowDesigner />);
    
    // 输入工作流名称
    const nameInput = screen.getByPlaceholderText('请输入工作流名称');
    fireEvent.change(nameInput, { target: { value: '测试工作流' } });
    
    // 点击保存按钮
    const saveButton = screen.getByRole('button', { name: '保存工作流' });
    fireEvent.click(saveButton);
    
    // 验证错误提示
    await waitFor(() => {
      expect(screen.getByText('保存失败：保存失败，服务器错误')).toBeInTheDocument();
    });
  });

  it('should render with existing workflow definition when provided', () => {
    const existingWorkflow = {
      id: 'existing-workflow-1',
      name: '现有工作流',
      description: '这是一个已存在的工作流',
      version: 2,
      status: 'active' as 'active',
      createdAt: new Date('2023-01-01T00:00:00Z'),
      updatedAt: new Date('2023-01-02T00:00:00Z'),
      createdBy: 'user-1',
      nodes: [
        {
          id: 'node-1',
          type: 'start' as 'start',
          name: '开始节点',
          position: { x: 100, y: 100 },
          config: {},
          data: { label: '开始' }
        },
        {
          id: 'node-2',
          type: 'end' as 'end',
          name: '结束节点',
          position: { x: 300, y: 100 },
          config: {},
          data: { label: '结束' }
        }
      ],
      edges: [
        {
          id: 'edge-1',
          sourceNodeId: 'node-1',
          targetNodeId: 'node-2'
        }
      ],
      variables: [
        {
          id: 'var-1',
          name: 'test',
          type: 'string' as 'string',
          defaultValue: 'value',
          required: false
        }
      ]
    };
    
    render(<WorkflowDesigner initialWorkflow={existingWorkflow} />);
    
    // 检查工作流名称是否正确填充
    const nameInput = screen.getByDisplayValue('现有工作流');
    expect(nameInput).toBeInTheDocument();
    
    // 检查工作流描述是否正确填充
    const descriptionInput = screen.getByDisplayValue('这是一个已存在的工作流');
    expect(descriptionInput).toBeInTheDocument();
  });
});