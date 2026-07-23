import React from 'react';

interface FeatureItem {
  name: string;
  module: string;
  status: '已完成' | '进行中' | '已规划' | '未开始';
  value: '高' | '中' | '低';
  description: string;
}

const featureData: FeatureItem[] = [
  {
    name: '订单管理',
    module: '商务功能',
    status: '已完成',
    value: '高',
    description: '支持订单创建、跟踪、状态更新，覆盖完整生命周期',
  },
  {
    name: '财务对账系统',
    module: '商务功能',
    status: '未开始',
    value: '高',
    description: '实现账单核对、发票管理、异常识别等财务功能',
  },
  {
    name: '合同审批工作流',
    module: '系统设置',
    status: '已规划',
    value: '高',
    description: '支持合同模板、审批流程、电子签名与状态跟踪',
  },
  {
    name: '客服工单系统',
    module: '扩展功能',
    status: '已规划',
    value: '中',
    description: '支持工单创建、分配、状态更新与用户反馈',
  },
  {
    name: '移动端应用',
    module: '系统架构',
    status: '进行中',
    value: '高',
    description: '构建移动端专用界面，支持核心业务操作与通知',
  },
  // 可继续扩展更多功能项...
];

const statusColorMap = {
  '已完成': 'bg-green-100 text-green-800',
  '进行中': 'bg-yellow-100 text-yellow-800',
  '已规划': 'bg-blue-100 text-blue-800',
  '未开始': 'bg-red-100 text-red-800',
};

const valueColorMap = {
  '高': 'text-red-600 font-semibold',
  '中': 'text-yellow-600',
  '低': 'text-gray-500',
};

export default function ComprehensiveFeatureAnalysis() {
  return (
    <section className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">系统功能评估报告</h1>
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-100 text-left">
            <th className="p-3">功能名称</th>
            <th className="p-3">所属模块</th>
            <th className="p-3">完成状态</th>
            <th className="p-3">实用性</th>
            <th className="p-3">业务说明</th>
          </tr>
        </thead>
        <tbody>
          {featureData.map((item, idx) => (
            <tr key={idx} className="border-b hover:bg-gray-50">
              <td className="p-3 font-medium">{item.name}</td>
              <td className="p-3">{item.module}</td>
              <td className={`p-3 rounded ${statusColorMap[item.status]}`}>{item.status}</td>
              <td className={`p-3 ${valueColorMap[item.value]}`}>{item.value}</td>
              <td className="p-3 text-sm text-gray-700">{item.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
