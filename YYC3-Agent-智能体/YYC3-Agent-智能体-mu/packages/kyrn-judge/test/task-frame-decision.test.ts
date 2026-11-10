import { describe, expect, it } from "vitest";
import { DecisionEngine } from "../src/decision.ts";
import { type TaskFrameInput, taskFrame } from "../src/decisions/task-frame.ts";
import { Judge } from "../src/judge.ts";
import { MockJudgeProvider } from "../src/providers/mock.ts";
import type { Answer } from "../src/types.ts";

const PRD_EXAMPLE = "保留原方案，但取消数据库变更";

describe("task.frame decision", () => {
	const input: TaskFrameInput = {
		userMessage: PRD_EXAMPLE,
		frame: { goal: "Add pagination to the users API", constraints: ["never commit without asking"] },
		recentTurns: ["assistant: I will add a cursor column to the users table."],
	};
	const decide = async (answer: Answer | undefined, mode: "active" | "shadow" | "off" = "active") => {
		const provider = new MockJudgeProvider((): Record<string, Answer> => (answer ? { change: answer } : {}));
		const engine = new DecisionEngine({ judge: new Judge({ provider }), defaultMode: mode });
		return { decision: await engine.decide(taskFrame, input), provider };
	};
	const pick = (choice: string, probabilities?: Record<string, number>): Answer => ({
		type: "choice",
		choice,
		probabilities,
	});

	it("asks one short question about named state fields, the message first", async () => {
		const { provider } = await decide(undefined);
		const [call] = provider.calls;
		expect(Object.keys(call.questions)).toEqual(["change"]);
		const question = call.questions.change;
		expect(question.instructions).toBe("What does `user_message` change in `task_frame`?");
		expect(question.type === "choice" && Object.keys(question.criteria)).toEqual([
			"new_task",
			"constraint",
			"correction",
			"subgoal",
			"none",
		]);
		expect(Object.keys(call.state as object)).toEqual(["user_message", "task_frame", "recent_turns"]);
		expect(call.state).toMatchObject({
			user_message: PRD_EXAMPLE,
			task_frame: { goal: input.frame.goal, constraints: ["never commit without asking"], current_subgoal: null },
		});
		expect(taskFrame.capabilities).toBe("relate");
	});

	it("acts on a sure kind, and leaves the frame alone on none, on a weak pick and without a judge", async () => {
		expect((await decide(pick("new_task", { new_task: 0.93, none: 0.04 }))).decision.outcome).toBe("new_task");
		expect((await decide(pick("subgoal", { subgoal: 0.7, none: 0.3 }))).decision.outcome).toBe("subgoal");
		expect((await decide(pick("none", { none: 0.97 }))).decision).toMatchObject({ outcome: "none", source: "judge" });
		expect((await decide(pick("subgoal", { subgoal: 0.45, none: 0.4, new_task: 0.15 }))).decision.outcome).toBe(
			"none",
		);
		// A neutral judge picks the escape option.
		expect((await decide(undefined)).decision.outcome).toBe("none");
		// No distribution: the pick is taken at its word.
		expect((await decide(pick("constraint"))).decision.outcome).toBe("constraint");
	});

	it("pools constraint and correction, which lead to the same update", async () => {
		const split = pick("correction", { correction: 0.48, constraint: 0.44, none: 0.08 });
		expect((await decide(split)).decision.outcome).toBe("correction");
		const other = pick("constraint", { correction: 0.3, constraint: 0.5, none: 0.2 });
		expect((await decide(other)).decision.outcome).toBe("constraint");
	});

	it("sure that something changed but not what: unclear, never a silent new task", async () => {
		const torn = pick("new_task", { new_task: 0.45, subgoal: 0.4, none: 0.15 });
		expect((await decide(torn)).decision.outcome).toBe("unclear");
	});

	it("shadow records the verdict and returns the fallback; off asks nothing", async () => {
		const shadow = await decide(pick("correction", { correction: 0.95 }), "shadow");
		expect(shadow.decision).toMatchObject({ outcome: "none", source: "fallback", judged: "correction" });
		const off = await decide(pick("correction", { correction: 0.95 }), "off");
		expect(off.decision).toMatchObject({ outcome: "none", source: "fallback", reason: "off" });
		expect(off.provider.calls).toHaveLength(0);
	});
});
