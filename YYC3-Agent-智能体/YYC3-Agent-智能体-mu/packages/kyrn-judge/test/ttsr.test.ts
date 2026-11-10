import { fauxAssistantMessage } from "@earendil-works/pi-ai";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createHarness, type Harness } from "../../coding-agent/test/suite/harness.ts";
import { parseConfig } from "../src/config.ts";
import type { DecisionMode } from "../src/decision.ts";
import { outputDrift } from "../src/decisions/output-drift.ts";
import { TTSR_MESSAGE } from "../src/extension/features/ttsr.ts";
import { createKyrnJudgeExtension, type FeatureName } from "../src/extension/kyrn-judge.ts";
import { MockJudgeProvider, type MockResponder } from "../src/providers/mock.ts";
import type { Answer } from "../src/types.ts";

const yes: Answer = { type: "boolean", probability: 0.97 };
const no: Answer = { type: "boolean", probability: 0.02 };
const unsure: Answer = { type: "boolean", probability: 0.55 };

/** Long enough that the stream is still running when the first verdict comes back. */
const ENGLISH = "The importer reads the file line by line and skips the empty ones. ".repeat(300);

describe("mid-stream correction (semantic TTSR)", () => {
	const harnesses: Harness[] = [];
	afterEach(() => {
		while (harnesses.length > 0) harnesses.pop()?.cleanup();
		delete process.env.KYRN_SWARM_CONSTRAINTS;
	});

	async function start(
		responder: MockResponder,
		extra: { mode?: DecisionMode; ttsr?: unknown; only?: FeatureName[] } = {},
	): Promise<Harness> {
		const harness = await createHarness({
			extensionFactories: [
				createKyrnJudgeExtension({
					provider: new MockJudgeProvider(responder),
					mode: extra.mode ?? "active",
					config: parseConfig({
						features: { memory: false, ttsr: extra.ttsr ?? { enabled: true, rules: ["用中文回答"] } },
					}),
					only: extra.only ?? ["preflight", "ttsr"],
				}),
			],
		});
		harnesses.push(harness);
		return harness;
	}

	const assistants = (harness: Harness) =>
		harness.session.messages.filter((message) => message.role === "assistant") as unknown as {
			content: { type: string; text?: string }[];
			stopReason: string;
		}[];
	const textOf = (message: { content: { type: string; text?: string }[] }) =>
		message.content.map((part) => part.text ?? "").join("");
	const corrections = (harness: Harness): string[] =>
		harness.session.messages
			.filter(
				(message) => message.role === "custom" && (message as { customType?: string }).customType === TTSR_MESSAGE,
			)
			.map((message) => String((message as { content?: unknown }).content));
	const settled = (harness: Harness, left: number) =>
		vi.waitFor(() => expect(harness.getPendingResponseCount()).toBe(left), { timeout: 5000 });

	it("asks one yes/no per rule about the tail of the output, and acts only on a confident yes", () => {
		const input = { recentOutput: "The importer reads", rules: ["用中文回答", "No placeholder implementations"] };
		const questions = outputDrift.questionsFor?.(input) ?? {};
		expect(Object.keys(questions)).toEqual(["rule_0", "rule_1"]);
		expect(questions.rule_0.instructions).toContain("用中文回答");
		expect(outputDrift.buildState(input)).toEqual({ recent_output: "The importer reads" });
		expect(outputDrift.policy({ rule_0: yes, rule_1: no }, input)).toEqual({ broken: [0] });
		expect(outputDrift.policy({ rule_0: unsure, rule_1: no }, input)).toEqual({ broken: [] });
		expect(outputDrift.fallback(input)).toEqual({ broken: [] });
	});

	it("cuts the output that goes against a rule, names the rule, and lets the model carry on", async () => {
		const seen: string[] = [];
		const harness = await start((request): Record<string, Answer> => {
			if (!("rule_0" in request.questions)) return {};
			seen.push(String((request.state as { recent_output?: unknown }).recent_output));
			return { rule_0: yes };
		});
		harness.setResponses([
			fauxAssistantMessage(ENGLISH),
			fauxAssistantMessage("好的，改用中文：导入器逐行读取文件，并跳过空行。"),
			fauxAssistantMessage("unused"),
		]);

		await harness.session.prompt("导入器是怎么处理空行的？");
		await settled(harness, 1);

		const [cut, redone] = assistants(harness);
		expect(cut.stopReason).toBe("aborted");
		expect(textOf(cut).length).toBeLessThan(ENGLISH.length);
		expect(textOf(redone)).toContain("改用中文");
		expect(corrections(harness)).toHaveLength(1);
		expect(corrections(harness)[0]).toContain("用中文回答");
		// The judge read the end of the output, not all of it, and was not asked again once the cut was decided.
		expect(seen).toHaveLength(1);
		expect(seen[0].length).toBeLessThanOrEqual(900);
	});

	it("lets the output run when the judge says no, is unsure, or is only shadowing", async () => {
		for (const [answer, mode] of [
			[no, "active"],
			[unsure, "active"],
			[yes, "shadow"],
		] as const) {
			let asked = 0;
			const harness = await start(
				(request): Record<string, Answer> => {
					if (!("rule_0" in request.questions)) return {};
					asked++;
					return { rule_0: answer };
				},
				{ mode },
			);
			harness.setResponses([fauxAssistantMessage(ENGLISH), fauxAssistantMessage("unused")]);

			await harness.session.prompt("导入器是怎么处理空行的？");
			await settled(harness, 1);

			const [only] = assistants(harness);
			expect(only.stopReason).toBe("stop");
			expect(textOf(only)).toBe(ENGLISH);
			expect(corrections(harness)).toHaveLength(0);
			expect(asked).toBeGreaterThan(0);
		}
	});

	it("stops cutting after its allowance, so a rule the model cannot keep does not become a loop", async () => {
		const harness = await start(
			(request): Record<string, Answer> => ("rule_0" in request.questions ? { rule_0: yes } : {}),
			{ ttsr: { enabled: true, rules: ["用中文回答"], maxInterrupts: 1 } },
		);
		harness.setResponses([
			fauxAssistantMessage(ENGLISH),
			fauxAssistantMessage(ENGLISH),
			fauxAssistantMessage("unused"),
		]);

		await harness.session.prompt("导入器是怎么处理空行的？");
		await settled(harness, 1);

		const [cut, second] = assistants(harness);
		expect(cut.stopReason).toBe("aborted");
		expect(second.stopReason).toBe("stop");
		expect(textOf(second)).toBe(ENGLISH);
		expect(corrections(harness)).toHaveLength(1);
	});

	it("holds the model to what the user ruled out in the task frame, and does nothing while switched off", async () => {
		process.env.KYRN_SWARM_CONSTRAINTS = JSON.stringify(["不要提到竞品的名字"]);
		const asked: string[] = [];
		const harness = await start(
			(request): Record<string, Answer> => {
				const question = (request.questions as Record<string, { instructions?: string }>).rule_0;
				if (!question) return {};
				asked.push(String(question.instructions));
				return { rule_0: no };
			},
			{ ttsr: { enabled: true }, only: ["preflight", "frame", "ttsr"] },
		);
		harness.setResponses([fauxAssistantMessage(ENGLISH), fauxAssistantMessage("unused")]);
		await harness.session.prompt("写一段产品介绍。");
		await settled(harness, 1);
		expect(asked.length).toBeGreaterThan(0);
		expect(asked[0]).toContain("不要提到竞品的名字");

		let calls = 0;
		const off = await start(
			(request) => {
				if ("rule_0" in request.questions) calls++;
				return {};
			},
			{ ttsr: { rules: ["用中文回答"] } },
		);
		off.setResponses([fauxAssistantMessage(ENGLISH), fauxAssistantMessage("unused")]);
		await off.session.prompt("导入器是怎么处理空行的？");
		await settled(off, 1);
		expect(calls).toBe(0);
	});
});
