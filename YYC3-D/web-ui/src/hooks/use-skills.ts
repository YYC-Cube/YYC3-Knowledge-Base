/**
 * @description useSkills Hook
 * @module @yyc3/web-ui/hooks/use-skills
 */

import { useState, useEffect, useCallback } from 'react';
import { useYYC3Context } from '../provider';

interface Skill {
  id: string;
  name: string;
  description: string;
  category: string;
}

export function useSkills() {
  const { hub } = useYYC3Context();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);

  useEffect(() => {
    if (hub) {
      setSkills([
        { id: 'unit-tests', name: '单元测试生成', description: '自动生成单元测试', category: 'development' },
        { id: 'code-review', name: '代码审查', description: '智能代码审查', category: 'quality' },
        { id: 'security-scan', name: '安全扫描', description: '安全漏洞扫描', category: 'security' },
        { id: 'performance-opt', name: '性能优化', description: '性能优化建议', category: 'optimization' },
      ]);
    }
  }, [hub]);

  const executeSkill = useCallback(async (skillId: string, input: Record<string, unknown>) => {
    return {
      success: true,
      output: { message: `Skill ${skillId} executed` },
    };
  }, []);

  return {
    skills,
    selectedSkill,
    setSelectedSkill,
    executeSkill,
  };
}
