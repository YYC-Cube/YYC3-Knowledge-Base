import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ApprovalTasks } from '@/components/workflow/approval-tasks';

// 模拟数据
const mockTasks = [
  {
    id: 'task-1',
    title: '合同审批请求',
    workflowName: '合同审批流程',
    assignee: '张三',
    createdAt: '2023-07-15T10:30:00Z',
    dueDate: '2023-07-17T18:00:00Z',
    status: 'pending',
    priority: 'high',
    requestor: {
      id: 'user-1',
      name: '李四',
      avatar: '/avatars/user1.png'
    },
    metadata: {
      contractId: 'CONTRACT-2023-001',
      amount: 100000
    }
  },
  {
    id: 'task-2',
    title: '休假申请审批',
    workflowName: '员工休假流程',
    assignee: '张三',
    createdAt: '2023-07-14T14:20:00Z',
    dueDate: '2023-07-16T18:00:00Z',
    status: 'pending',
    priority: 'medium',
    requestor: {
      id: 'user-2',
      name: '王五',
      avatar: '/avatars/user2.png'
    },
    metadata: {
      leaveDays: 3,
      leaveType: 'annual'
    }
  }
];

// 模拟API调用
jest.mock('../../../services/workflow/workflow-engine.service', () => ({
  fetchUserTasks: jest.fn().mockResolvedValue(mockTasks),
  approveTask: jest.fn().mockResolvedValue({ success: true }),
  rejectTask: jest.fn().mockResolvedValue({ success: true }),
  addTaskComment: jest.fn().mockResolvedValue({ success: true })
}));

describe('ApprovalTasks Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render ApprovalTasks component with initial state', () => {
    render(<ApprovalTasks userId="test-user" />);
    
    // 检查组件标题
    expect(screen.getByText('我的审批任务')).toBeInTheDocument();
    
    // 检查筛选下拉框
    expect(screen.getByLabelText('状态筛选')).toBeInTheDocument();
    expect(screen.getByLabelText('优先级筛选')).toBeInTheDocument();
  });

  it('should fetch and display tasks when component mounts', async () => {
    render(<ApprovalTasks userId="test-user" />);
    
    // 等待任务加载完成
    await waitFor(() => {
      expect(screen.getByText('合同审批请求')).toBeInTheDocument();
      expect(screen.getByText('休假申请审批')).toBeInTheDocument();
    });
    
    // 检查任务数量
    const taskCards = screen.getAllByTestId('task-card');
    expect(taskCards).toHaveLength(2);
  });

  it('should filter tasks by status', async () => {
    render(<ApprovalTasks userId="test-user" />);
    
    // 等待初始任务加载
    await waitFor(() => {
      expect(screen.getByText('合同审批请求')).toBeInTheDocument();
    });
    
    // 更改状态筛选
    const statusFilter = screen.getByLabelText('状态筛选');
    fireEvent.change(statusFilter, { target: { value: 'completed' } });
    
    // 验证筛选后没有任务显示
    await waitFor(() => {
      expect(screen.queryByText('合同审批请求')).not.toBeInTheDocument();
    });
  });

  it('should handle task approval', async () => {
    render(<ApprovalTasks userId="test-user" />);
    
    // 等待任务加载
    await waitFor(() => {
      expect(screen.getByText('合同审批请求')).toBeInTheDocument();
    });
    
    // 找到第一个任务的审批按钮
    const approveButton = screen.getAllByRole('button', { name: '批准' })[0];
    fireEvent.click(approveButton);
    
    // 等待审批确认对话框出现
    await waitFor(() => {
      expect(screen.getByText('确认批准')).toBeInTheDocument();
    });
    
    // 输入审批意见并确认
    const commentInput = screen.getByPlaceholderText('请输入审批意见（可选）');
    fireEvent.change(commentInput, { target: { value: '同意该合同' } });
    
    const confirmButton = screen.getByRole('button', { name: '确认' });
    fireEvent.click(confirmButton);
    
    // 验证API调用
    await waitFor(() => {
      expect(require('../../../services/workflow-engine.service').approveTask).toHaveBeenCalledWith('task-1', '同意该合同');
    });
  });

  it('should handle task rejection', async () => {
    render(<ApprovalTasks userId="test-user" />);
    
    // 等待任务加载
    await waitFor(() => {
      expect(screen.getByText('休假申请审批')).toBeInTheDocument();
    });
    
    // 找到第二个任务的拒绝按钮
    const rejectButton = screen.getAllByRole('button', { name: '拒绝' })[1];
    fireEvent.click(rejectButton);
    
    // 等待拒绝确认对话框出现
    await waitFor(() => {
      expect(screen.getByText('确认拒绝')).toBeInTheDocument();
    });
    
    // 输入拒绝理由并确认
    const reasonInput = screen.getByPlaceholderText('请输入拒绝理由（必填）');
    fireEvent.change(reasonInput, { target: { value: '工作安排紧张，暂不批准' } });
    
    const confirmButton = screen.getByRole('button', { name: '确认' });
    fireEvent.click(confirmButton);
    
    // 验证API调用
    await waitFor(() => {
      expect(require('../../../services/workflow-engine.service').rejectTask).toHaveBeenCalledWith('task-2', '工作安排紧张，暂不批准');
    });
  });

  it('should handle loading state', async () => {
    // 模拟API延迟
    const mockFetchUserTasks = require('../../../services/workflow-engine.service').fetchUserTasks;
    mockFetchUserTasks.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve(mockTasks), 100)));
    
    render(<ApprovalTasks userId="test-user" />);
    
    // 检查加载状态
    expect(screen.getByText('加载中...')).toBeInTheDocument();
    
    // 等待加载完成
    await waitFor(() => {
      expect(screen.queryByText('加载中...')).not.toBeInTheDocument();
    });
  });

  it('should handle error state when fetching tasks fails', async () => {
    // 模拟API失败
    const mockFetchUserTasks = require('../../../services/workflow-engine.service').fetchUserTasks;
    mockFetchUserTasks.mockRejectedValue(new Error('Failed to fetch tasks'));
    
    render(<ApprovalTasks userId="test-user" />);
    
    // 检查错误状态
    await waitFor(() => {
      expect(screen.getByText('获取任务失败，请稍后重试')).toBeInTheDocument();
    });
    
    // 检查重试按钮
    const retryButton = screen.getByRole('button', { name: '重试' });
    expect(retryButton).toBeInTheDocument();
    
    // 点击重试按钮
    fireEvent.click(retryButton);
    
    // 验证API再次调用
    expect(mockFetchUserTasks).toHaveBeenCalledTimes(2);
  });

  it('should show approval-only mode correctly', () => {
    render(<ApprovalTasks userId="test-user" />);
    
    // 检查标题是否正确
    expect(screen.getByText('我的审批任务')).toBeInTheDocument();
  })
});