import { fauxAssistantMessage } from "@earendil-works/pi-ai";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Harness } from "../../coding-agent/test/suite/harness.ts";
import { priorityBySeverity, priorityOf, reviewTriage } from "../src/decisions/review-triage.ts";
import type { MockResponder } from "../src/providers/mock.ts";
import type { Answer } from "../src/types.ts";
import { active, call, no, startPacks, toolResults, yes } from "./packs-helpers.ts";

/** Answers the triage questions per finding, and no to every disclosure question. */
const triage =
	(verdicts: readonly (readonly [Answer, Answer])[]): MockResponder =>
	(request): Record<string, Answer> => {
		const answers: Record<string, Answer> = {};
		for (const id of Object.keys(request.questions)) {
			const bug = /^is_bug_(\d+)$/.exec(id);
			const scope = /^in_scope_(\d+)$/.exec(id);
			if (id.startsWith("capability_")) answers[id] = no;
			else if (bug) answers[id] = verdicts[Number(bug[1])][0];
			else if (scope) answers[id] = verdicts[Number(scope[1])][1];
		}
		return answers;
	};

const FINDINGS = [
	{ text: "The loop never ends when the list is empty", where: "src/importer.ts:40", severity: "must" },
	{ text: "Rename tmp to buffer", where: "src/importer.ts:12", severity: "nit" },
	{ text: "The old parser drops the last line", where: "src/parser.ts:88", severity: "should" },
	{ text: "Errors are swallowed in load()", where: "src/importer.ts:61", severity: "should" },
];

describe("/review and the triage of its findings", () => {
	const harnesses: Harness[] = [];
	afterEach(() => {
		while (harnesses.length > 0) harnesses.pop()?.cleanup();
	});

	it("sorts by what a finding does and where it is, and never buries what the reviewer insisted on", () => {
		expect(priorityOf("yes", "yes", "must")).toBe("P0");
		expect(priorityOf("yes", "yes", "should")).toBe("P1");
		expect(priorityOf("yes", "no", "must")).toBe("P2");
		expect(priorityOf("yes", "unsure", "should")).toBe("P1");
		expect(priorityOf("unsure", "yes", "must")).toBe("P1");
		expect(priorityOf("unsure", "yes")).toBe("P2");
		expect(priorityOf("no", "yes", "must")).toBe("P2");
		expect(priorityOf("no", "yes", "nit")).toBe("P3");
		// Nobody confirmed anything: the reviewer's word, one step down from the top.
		expect(["must", "should", "nit", undefined].map((severity) => priorityBySeverity(severity as never))).toEqual([
			"P1",
			"P2",
			"P3",
			"P2",
		]);
		// A question the judge left unanswered counts as unsure.
		const input = { change: "an importer", findings: [{ text: "x", severity: "must" as const }] };
		expect(reviewTriage.policy({ is_bug_0: yes }, input)).toEqual({ priorities: ["P1"] });
		expect(Object.keys(reviewTriage.questionsFor?.(input) ?? {})).toEqual(["is_bug_0", "in_scope_0"]);
	});

	it("opens the pack, hands the review over, and returns every finding in order P0 to P3", async () => {
		const { harness } = await startPacks(harnesses, {
			responder: triage([
				[yes, yes],
				[no, yes],
				[yes, no],
				[yes, yes],
			]),
		});
		harness.setResponses([
			call("review_triage", { change: "The importer reads CSV files.", findings: FINDINGS }),
			fauxAssistantMessage("Here is the review."),
		]);

		await harness.session.prompt("/review src/importer.ts");
		await vi.waitFor(() => expect(harness.getPendingResponseCount()).toBe(0));
		await harness.session.waitForIdle();

		const asked = JSON.stringify(harness.session.messages.find((message) => message.role === "user"));
		expect(asked).toContain("Review src/importer.ts.");
		expect(asked).toContain("review_triage");
		expect(active(harness)).toContain("review_triage");
		const [result] = toolResults(harness);
		const order = [
			"P0 (1)",
			"#1 src/importer.ts:40",
			"P1 (1)",
			"#4 src/importer.ts:61",
			"P2 (1)",
			"#3",
			"P3 (1), collapsed",
			"#2",
		];
		const positions = order.map((fragment) => result.indexOf(fragment));
		expect(positions.every((position) => position >= 0)).toBe(true);
		expect([...positions].sort((a, b) => a - b)).toEqual(positions);
		expect(result).toContain("Sorted by the judge");
	});

	it("falls back to the reviewer's own severity when the judge is only shadowing, dropping nothing", async () => {
		const { harness } = await startPacks(harnesses, {
			mode: "shadow",
			responder: triage(FINDINGS.map(() => [yes, yes] as const)),
		});
		harness.setResponses([
			call("review_triage", { change: "The importer reads CSV files.", findings: FINDINGS }),
			fauxAssistantMessage("Here is the review."),
		]);

		await harness.session.prompt("/review");
		await vi.waitFor(() => expect(harness.getPendingResponseCount()).toBe(0));
		await harness.session.waitForIdle();

		const [result] = toolResults(harness);
		expect(result).toContain("P1 (1)");
		expect(result).toContain("P2 (2)");
		expect(result).toContain("P3 (1), collapsed");
		expect(result).toContain("No judge verdict");
		for (const finding of FINDINGS) expect(result).toContain(finding.where);
	});
});
