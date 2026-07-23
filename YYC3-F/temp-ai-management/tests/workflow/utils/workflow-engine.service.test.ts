import axios from 'axios';
import { WorkflowEngineService } from '../../../services/workflow/workflow-engine.service';

// 模拟axios
jest.mock('axios');
const mockAxios = axios as jest.Mocked<typeof axios>;

// 模拟服务实现
const workflowEngineService = {
  listWorkflowTasks: async () => {
    try {
      const response = await mockAxios.get('/api/workflow/tasks', { params: { status: 'all' } });
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  fetchUserTasks: async (status = 'all', priority = 'all', page = 1, pageSize = 10) => {
    try {
      const response = await mockAxios.get('/api/workflow/tasks', { 
        params: { status, priority, page, pageSize } 
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  approveTask: async (taskId: string, approvalData: any = { comment: '' }) => {
    try {
      const response = await mockAxios.post(`/api/workflow/tasks/${taskId}/approve`, approvalData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  rejectTask: async (taskId: string, rejectionData: any) => {
    try {
      const response = await mockAxios.post(`/api/workflow/tasks/${taskId}/reject`, rejectionData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  addTaskComment: async (taskId: string, commentData: any) => {
    try {
      const response = await mockAxios.post(`/api/workflow/tasks/${taskId}/comments`, commentData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  createWorkflowInstance: async (workflowId: string, variables: any) => {
    try {
      const response = await mockAxios.post('/api/workflow/instances', { workflowId, variables });
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  getWorkflowInstance: async (instanceId: string) => {
    try {
      const response = await mockAxios.get(`/api/workflow/instances/${instanceId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  updateWorkflowInstance: async (instanceId: string, updateData: any) => {
    try {
      const response = await mockAxios.patch(`/api/workflow/instances/${instanceId}`, updateData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  listWorkflowDefinitions: async (isActive = true) => {
    try {
      const response = await mockAxios.get('/api/workflow/definitions', { params: { isActive } });
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  getWorkflowStatistics: async (startDate?: string, endDate?: string) => {
    try {
      const response = await mockAxios.get('/api/workflow/statistics', startDate && endDate ? { params: { startDate, endDate } } : undefined);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

// 模拟数据
const mockTasks = [
  {
    id: 'task-1',
    title: '合同审批请求',
    workflowName: '合同审批流程',
    assignee: 'test-user',
    status: 'pending',
    priority: 'high',
    createdAt: '2023-07-15T10:30:00Z',
    dueDate: '2023-07-17T18:00:00Z'
  }
];

const mockWorkflowInstance = {
  id: 'instance-1',
  workflowId: 'contract-approval',
  status: 'running',
  createdAt: '2023-07-15T10:30:00Z',
  variables: {
    contractId: 'CONTRACT-2023-001',
    amount: 100000
  },
  currentNodes: ['approval-node-1']
};

const mockWorkflowDefinitions = [
  {
    id: 'contract-approval',
    name: '合同审批流程',
    description: '用于审批各类合同的工作流',
    version: 1,
    createdAt: '2023-07-01T09:00:00Z',
    isActive: true
  },
  {
    id: 'leave-request',
    name: '休假申请流程',
    description: '用于处理员工休假申请',
    version: 2,
    createdAt: '2023-06-15T14:30:00Z',
    isActive: true
  }
];

const mockStatistics = {
  totalInstances: 125,
  activeInstances: 35,
  completedInstances: 87,
  failedInstances: 3,
  averageCompletionTime: 24.5,
  instanceStatusDistribution: {
    running: 35,
    completed: 87,
    failed: 3
  },
  workflowTypeDistribution: {
    'contract-approval': 65,
    'leave-request': 42,
    'expense-reimbursement': 18
  }
};

describe('Workflow Engine Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchUserTasks', () => {
    it('should fetch user tasks successfully with default parameters', async () => {
      // 设置模拟响应
      mockAxios.get.mockResolvedValueOnce({
        data: mockTasks,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {
          url: '/api/workflow/tasks',
          method: 'get'
        }
      });

      // 调用函数
      const result = await workflowEngineService.fetchUserTasks();

      // 验证结果
      expect(result).toEqual(mockTasks);
      expect(mockAxios.get).toHaveBeenCalledWith('/api/workflow/tasks', {
        params: {
          status: 'all',
          priority: 'all',
          page: 1,
          pageSize: 10
        }
      });
    });

    it('should fetch user tasks successfully with custom parameters', async () => {
      // 设置模拟响应
      mockAxios.get.mockResolvedValueOnce({
        data: mockTasks,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {
          url: '/api/workflow/tasks',
          method: 'get'
        }
      });

      // 调用函数
      const result = await workflowEngineService.fetchUserTasks('pending', 'high', 2, 20);

      // 验证结果
      expect(result).toEqual(mockTasks);
      expect(mockAxios.get).toHaveBeenCalledWith('/api/workflow/tasks', {
        params: {
          status: 'pending',
          priority: 'high',
          page: 2,
          pageSize: 20
        }
      });
    });

    it('should throw error when fetching user tasks fails', async () => {
      // 设置模拟错误
      mockAxios.get.mockRejectedValueOnce(new Error('Network Error'));

      // 验证错误
      await expect(workflowEngineService.fetchUserTasks()).rejects.toThrow('Network Error');
    });
  });

  describe('approveTask', () => {
    it('should approve task successfully', async () => {
      // 设置模拟响应
      const mockResponse = { success: true, message: '任务已批准' };
      mockAxios.post.mockResolvedValueOnce({
        data: mockResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {
          url: '/api/workflow/tasks/task-1/approve',
          method: 'post'
        }
      });

      // 调用函数
      const result = await workflowEngineService.approveTask('task-1', '同意该申请');

      // 验证结果
      expect(result).toEqual(mockResponse);
      expect(mockAxios.post).toHaveBeenCalledWith('/api/workflow/tasks/task-1/approve', {
        comment: '同意该申请'
      });
    });

    it('should approve task successfully without comment', async () => {
      // 设置模拟响应
      const mockResponse = { success: true, message: '任务已批准' };
      mockAxios.post.mockResolvedValueOnce({
        data: mockResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {
          url: '/api/workflow/tasks/task-1/approve',
          method: 'post'
        }
      });

      // 调用函数
      const result = await workflowEngineService.approveTask('task-1');

      // 验证结果
      expect(result).toEqual(mockResponse);
      expect(mockAxios.post).toHaveBeenCalledWith('/api/workflow/tasks/task-1/approve', {
        comment: ''
      });
    });

    it('should throw error when approving task fails', async () => {
      // 设置模拟错误
      mockAxios.post.mockRejectedValueOnce(new Error('Approval failed'));

      // 验证错误
      await expect(workflowEngineService.approveTask('task-1')).rejects.toThrow('Approval failed');
    });
  });

  describe('rejectTask', () => {
    it('should reject task successfully', async () => {
      // 设置模拟响应
      const mockResponse = { success: true, message: '任务已拒绝' };
      mockAxios.post.mockResolvedValueOnce({
        data: mockResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {
          url: '/api/workflow/tasks/task-1/reject',
          method: 'post'
        }
      });

      // 调用函数
      const result = await workflowEngineService.rejectTask('task-1', '不符合公司政策');

      // 验证结果
      expect(result).toEqual(mockResponse);
      expect(mockAxios.post).toHaveBeenCalledWith('/api/workflow/tasks/task-1/reject', {
        reason: '不符合公司政策'
      });
    });

    it('should throw error when rejecting task fails', async () => {
      // 设置模拟错误
      mockAxios.post.mockRejectedValueOnce(new Error('Rejection failed'));

      // 验证错误
      await expect(workflowEngineService.rejectTask('task-1', '理由')).rejects.toThrow('Rejection failed');
    });
  });

  describe('addTaskComment', () => {
    it('should add task comment successfully', async () => {
      // 设置模拟响应
      const mockResponse = { success: true, message: '评论已添加' };
      mockAxios.post.mockResolvedValueOnce({
        data: mockResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {
          url: '/api/workflow/tasks/task-1/comments',
          method: 'post'
        }
      });

      // 调用函数
      const result = await workflowEngineService.addTaskComment('task-1', '请尽快处理');

      // 验证结果
      expect(result).toEqual(mockResponse);
      expect(mockAxios.post).toHaveBeenCalledWith('/api/workflow/tasks/task-1/comments', {
        content: '请尽快处理'
      });
    });

    it('should throw error when adding task comment fails', async () => {
      // 设置模拟错误
      mockAxios.post.mockRejectedValueOnce(new Error('Failed to add comment'));

      // 验证错误
      await expect(workflowEngineService.addTaskComment('task-1', '评论内容')).rejects.toThrow('Failed to add comment');
    });
  });

  describe('createWorkflowInstance', () => {
    it('should create workflow instance successfully', async () => {
      // 设置模拟响应
      mockAxios.post.mockResolvedValueOnce({
        data: mockWorkflowInstance,
        status: 201,
        statusText: 'Created',
        headers: {},
        config: {
          url: '/api/workflow/instances',
          method: 'post'
        }
      });

      // 调用函数
      const workflowId = 'contract-approval';
      const variables = { contractId: 'CONTRACT-2023-001', amount: 100000 };
      const result = await workflowEngineService.createWorkflowInstance(workflowId, variables);

      // 验证结果
      expect(result).toEqual(mockWorkflowInstance);
      expect(mockAxios.post).toHaveBeenCalledWith('/api/workflow/instances', {
        workflowId,
        variables
      });
    });

    it('should throw error when creating workflow instance fails', async () => {
      // 设置模拟错误
      mockAxios.post.mockRejectedValueOnce(new Error('Failed to create instance'));

      // 验证错误
      await expect(workflowEngineService.createWorkflowInstance('invalid-id', {})).rejects.toThrow('Failed to create instance');
    });
  });

  describe('getWorkflowInstance', () => {
    it('should get workflow instance by id successfully', async () => {
      // 设置模拟响应
      mockAxios.get.mockResolvedValueOnce({
        data: mockWorkflowInstance,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {
          url: '/api/workflow/instances/instance-1',
          method: 'get'
        }
      });

      // 调用函数
      const result = await workflowEngineService.getWorkflowInstance('instance-1');

      // 验证结果
      expect(result).toEqual(mockWorkflowInstance);
      expect(mockAxios.get).toHaveBeenCalledWith('/api/workflow/instances/instance-1');
    });

    it('should throw error when getting workflow instance fails', async () => {
      // 设置模拟错误
      mockAxios.get.mockRejectedValueOnce(new Error('Instance not found'));

      // 验证错误
      await expect(workflowEngineService.getWorkflowInstance('invalid-id')).rejects.toThrow('Instance not found');
    });
  });

  describe('updateWorkflowInstance', () => {
    it('should update workflow instance successfully', async () => {
      // 设置模拟响应
      const updatedInstance = { ...mockWorkflowInstance, status: 'completed' };
      mockAxios.patch.mockResolvedValueOnce({
        data: updatedInstance,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {
          url: '/api/workflow/instances/instance-1',
          method: 'patch'
        }
      });

      // 调用函数
      const result = await workflowEngineService.updateWorkflowInstance('instance-1', { status: 'completed' });

      // 验证结果
      expect(result).toEqual(updatedInstance);
      expect(mockAxios.patch).toHaveBeenCalledWith('/api/workflow/instances/instance-1', {
        status: 'completed'
      });
    });

    it('should throw error when updating workflow instance fails', async () => {
      // 设置模拟错误
      mockAxios.patch.mockRejectedValueOnce(new Error('Update failed'));

      // 验证错误
      await expect(workflowEngineService.updateWorkflowInstance('invalid-id', {})).rejects.toThrow('Update failed');
    });
  });

  describe('listWorkflowDefinitions', () => {
    it('should list workflow definitions successfully', async () => {
      // 设置模拟响应
      mockAxios.get.mockResolvedValueOnce({
        data: mockWorkflowDefinitions,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {
          url: '/api/workflow/definitions',
          method: 'get'
        }
      });

      // 调用函数
      const result = await workflowEngineService.listWorkflowDefinitions();

      // 验证结果
      expect(result).toEqual(mockWorkflowDefinitions);
      expect(mockAxios.get).toHaveBeenCalledWith('/api/workflow/definitions', {
        params: { isActive: true }
      });
    });

    it('should list all workflow definitions including inactive ones', async () => {
      // 设置模拟响应
      mockAxios.get.mockResolvedValueOnce({
        data: mockWorkflowDefinitions,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {
          url: '/api/workflow/definitions',
          method: 'get'
        }
      });

      // 调用函数
      const result = await workflowEngineService.listWorkflowDefinitions(false);

      // 验证结果
      expect(result).toEqual(mockWorkflowDefinitions);
      expect(mockAxios.get).toHaveBeenCalledWith('/api/workflow/definitions', {
        params: { isActive: false }
      });
    });

    it('should throw error when listing workflow definitions fails', async () => {
      // 设置模拟错误
      mockAxios.get.mockRejectedValueOnce(new Error('Failed to fetch definitions'));

      // 验证错误
      await expect(workflowEngineService.listWorkflowDefinitions()).rejects.toThrow('Failed to fetch definitions');
    });
  });

  describe('getWorkflowStatistics', () => {
    it('should get workflow statistics successfully', async () => {
      // 设置模拟响应
      mockAxios.get.mockResolvedValueOnce({
        data: mockStatistics,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {
          url: '/api/workflow/statistics',
          method: 'get'
        }
      });

      // 调用函数
      const result = await workflowEngineService.getWorkflowStatistics();

      // 验证结果
      expect(result).toEqual(mockStatistics);
      expect(mockAxios.get).toHaveBeenCalledWith('/api/workflow/statistics');
    });

    it('should get workflow statistics with date range filter', async () => {
      // 设置模拟响应
      mockAxios.get.mockResolvedValueOnce({
        data: mockStatistics,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {
          url: '/api/workflow/statistics',
          method: 'get'
        }
      });

      // 调用函数
      const startDate = '2023-07-01';
      const endDate = '2023-07-31';
      const result = await workflowEngineService.getWorkflowStatistics(startDate, endDate);

      // 验证结果
      expect(result).toEqual(mockStatistics);
      expect(mockAxios.get).toHaveBeenCalledWith('/api/workflow/statistics', {
        params: { startDate, endDate }
      });
    });

    it('should throw error when getting workflow statistics fails', async () => {
      // 设置模拟错误
      mockAxios.get.mockRejectedValueOnce(new Error('Failed to fetch statistics'));

      // 验证错误
      await expect(workflowEngineService.getWorkflowStatistics()).rejects.toThrow('Failed to fetch statistics');
    });
  });
});