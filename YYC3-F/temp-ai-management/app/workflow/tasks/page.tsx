import { ApprovalTasks } from '@/components/workflow/approval-tasks';

export default function WorkflowTasksPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">我的工作流任务</h1>
        <p className="text-muted-foreground">查看并处理分配给您的工作流任务</p>
      </div>
      <ApprovalTasks />
    </div>
  );
}
