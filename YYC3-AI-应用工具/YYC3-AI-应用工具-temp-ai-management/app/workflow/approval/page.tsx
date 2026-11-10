import { ApprovalTasks } from '@/components/workflow/approval-tasks';

export default function WorkflowApprovalPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">工作流审批中心</h1>
        <p className="text-muted-foreground">审批和处理待处理的工作流任务</p>
      </div>
      <ApprovalTasks showApprovalOnly={true} />
    </div>
  );
}
