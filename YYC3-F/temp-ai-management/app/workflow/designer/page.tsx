import { WorkflowDesigner } from '@/components/workflow/workflow-designer';

export default function WorkflowDesignerPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">工作流设计器</h1>
        <p className="text-muted-foreground">拖拽节点来设计您的工作流程</p>
      </div>
      <WorkflowDesigner />
    </div>
  );
}
