import { getServerSession } from 'next-auth';
import { WorkflowManagement } from '@/components/workflow/workflow-management';

export default async function WorkflowOverviewPage() {
  // 获取用户会话信息
  const session = await getServerSession();
  // 使用类型断言来访问id属性，并提供默认值确保类型安全
  const userId = (session?.user as any)?.id || 'default-user-id';

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">工作流管理</h1>
        <p className="text-muted-foreground">管理和监控所有工作流</p>
      </div>
      <WorkflowManagement userId={userId} />
    </div>
  );
}