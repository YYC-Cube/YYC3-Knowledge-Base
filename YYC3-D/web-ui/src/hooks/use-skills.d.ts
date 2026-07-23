/**
 * @description useSkills Hook
 * @module @yyc3/web-ui/hooks/use-skills
 */
interface Skill {
    id: string;
    name: string;
    description: string;
    category: string;
}
export declare function useSkills(): {
    skills: Skill[];
    selectedSkill: Skill | null;
    setSelectedSkill: import("react").Dispatch<import("react").SetStateAction<Skill | null>>;
    executeSkill: (skillId: string, input: Record<string, unknown>) => Promise<{
        success: boolean;
        output: {
            message: string;
        };
    }>;
};
export {};
//# sourceMappingURL=use-skills.d.ts.map