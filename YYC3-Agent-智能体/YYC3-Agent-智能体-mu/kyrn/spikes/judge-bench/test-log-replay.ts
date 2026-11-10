/**
 * Replays the labeled test-log cases through the admission arms and reports, per arm:
 * required evidence kept, wrong omissions, optional noise omitted, net characters saved
 * (markers and pointer paid), judge calls, latency, input tokens, and what a wrong
 * omission would cost to recover from the archive.
 *
 *   node kyrn/spikes/judge-bench/test-log-replay.ts                       offline: full, rules, ceiling, oracle
 *   KYRN_JUDGE=jev node --env-file=.env kyrn/spikes/judge-bench/test-log-replay.ts     adds the live judge
 *
 * Offline reference arms use mock judges and cost nothing:
 * - `ceiling`: a judge that always says "omit". What the protections alone guarantee, and
 *   what a goal-blind filter (failures only, passing collapsed) would do to each goal.
 * - `oracle`:  a judge that reads the labels. The best a correct judge could do.
 *
 * Options: SET=tuned|heldout|all  WORDINGS=suffices,policy  ANCHORS=on|off|both  MAX_REQUESTS=150
 * Only the synthetic fixtures are sent. Needs Node >= 23.6. Writes results/test-log-<judge>-<time>.json.
 */
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
	planTestLog,
	renderTestLog,
	type TestLogPlan,
	type TestLogStrategy,
	type TestLogWording,
} from "../../../packages/kyrn-judge/src/admission/test-log.ts";
import { DecisionEngine } from "../../../packages/kyrn-judge/src/decision.ts";
import { Judge } from "../../../packages/kyrn-judge/src/judge.ts";
import { GatewayJudgeProvider } from "../../../packages/kyrn-judge/src/providers/gateway.ts";
import { MockJudgeProvider } from "../../../packages/kyrn-judge/src/providers/mock.ts";
import { TypeSafeJudgeProvider } from "../../../packages/kyrn-judge/src/providers/typesafe.ts";
import type { Answer, JudgeProvider, JudgeRequest } from "../../../packages/kyrn-judge/src/types.ts";
import {
	heldOutCases,
	type TestLogCase,
	testLogCases,
} from "../../../packages/kyrn-judge/test/fixtures/test-log-cases.ts";

const live = process.env.KYRN_JUDGE === "jev";
const wordings = (process.env.WORDINGS ?? "suffices,policy").split(",") as TestLogWording[];
const anchorModes = process.env.ANCHORS === "both" ? [true, false] : [process.env.ANCHORS !== "off"];
const maxRequests = Number(process.env.MAX_REQUESTS ?? 150);
const only = process.env.CASES?.split(",");
// SET=tuned: the cases the wording was developed on. SET=heldout: the ones it never saw. Report them apart.
const pool =
	process.env.SET === "heldout"
		? heldOutCases
		: process.env.SET === "tuned"
			? testLogCases.filter((testCase) => !heldOutCases.includes(testCase))
			: testLogCases;
const cases = pool.filter((testCase) => !only || only.includes(testCase.id));
const archiveDir = mkdtempSync(join(tmpdir(), "kyrn-test-log-"));

function omitAnswer(question: JudgeRequest["questions"][string], omit: boolean): Answer {
	if (question.type !== "choice") throw new Error(`unexpected ${question.type} question`);
	const [keep, drop] = "omit" in question.criteria ? ["keep", "omit"] : ["needed", "not_needed"];
	const choice = omit ? drop : keep;
	return { type: "choice", choice, probabilities: { [choice]: 0.99 } };
}

const ceiling = new MockJudgeProvider(
	(request) => Object.fromEntries(Object.entries(request.questions).map(([id, q]) => [id, omitAnswer(q, true)])),
	"ceiling",
);

/** Says "needed" exactly when the candidate holds a required substring of the case being replayed. */
let current: TestLogCase | undefined;
const oracle = new MockJudgeProvider((request) => {
	const candidates = (request.state as { candidates: Record<string, { text: string }> }).candidates;
	const plan = currentUnits;
	return Object.fromEntries(
		Object.entries(request.questions).map(([id, q]) => {
			const text = plan.get(id) ?? candidates[id]?.text ?? "";
			const needed = (current?.required ?? []).some((required) => text.includes(required));
			return [id, omitAnswer(q, !needed)];
		}),
	);
}, "oracle");
let currentUnits = new Map<string, string>();

let requests = 0;
/** Size of the last live request, to check whether the state is billed once or per question. */
let lastRequest: { stateChars: number; questions: number; questionChars: number } | undefined;
function counted(provider: JudgeProvider): JudgeProvider {
	return {
		id: provider.id,
		evaluate: async (request) => {
			if (++requests > maxRequests) throw new Error(`MAX_REQUESTS=${maxRequests} reached`);
			lastRequest = {
				stateChars: JSON.stringify(request.state).length,
				questions: Object.keys(request.questions).length,
				questionChars: JSON.stringify(request.questions).length,
			};
			return provider.evaluate(request);
		},
	};
}

function liveProvider(): JudgeProvider {
	if (process.env.TYPESAFE_API_KEY) return new TypeSafeJudgeProvider({ apiKey: () => process.env.TYPESAFE_API_KEY });
	return new GatewayJudgeProvider({ apiKey: () => process.env.AI_GATEWAY_API_KEY, model: "typesafe-ai/jev" });
}

interface Arm {
	name: string;
	strategy: TestLogStrategy;
	provider?: JudgeProvider;
	wording?: TestLogWording;
	anchors?: boolean;
}

const arms: Arm[] = [
	{ name: "full", strategy: "full" },
	{ name: "rules", strategy: "rules" },
	{ name: "ceiling", strategy: "jev", provider: ceiling },
	{ name: "oracle", strategy: "jev", provider: oracle },
];
if (live) {
	const provider = counted(liveProvider());
	for (const anchors of anchorModes) {
		for (const wording of wordings) {
			arms.push({ name: `jev:${wording}${anchors ? "" : ":no-anchors"}`, strategy: "jev", provider, wording, anchors });
		}
	}
}

interface Row {
	arm: string;
	case: string;
	chars: number;
	source: TestLogPlan["source"];
	reason?: string;
	applied: boolean;
	candidates: number;
	asked: number;
	omitted: number;
	requiredKept: number;
	requiredTotal: number;
	lost: string[];
	optionalOmitted: number;
	optionalTotal: number;
	netSavedChars: number;
	judgeCalls: number;
	latencyMs?: number;
	inputTokens?: number;
	/** Characters the main model must read back if it follows the pointer after a wrong omission. */
	recoveryChars: number;
	archiveIntact: boolean;
	request?: { stateChars: number; questions: number; questionChars: number };
	answers?: Record<string, unknown>;
}

const rows: Row[] = [];
for (const arm of arms) {
	for (const testCase of cases) {
		current = testCase;
		const provider = arm.provider ?? new MockJudgeProvider();
		const engine = new DecisionEngine({
			judge: new Judge({ provider, timeoutMs: 20_000 }),
			defaultMode: "active",
		});
		// The oracle needs the full candidate text, not the clipped view the judge state carries.
		const preview = await planTestLog(testCase, "full", engine, { anchors: arm.anchors });
		currentUnits = new Map(preview.units.map((unit) => [unit.id, unit.text]));

		const before = requests;
		lastRequest = undefined;
		const mockCallsBefore = provider instanceof MockJudgeProvider ? provider.calls.length : 0;
		const plan = await planTestLog(testCase, arm.strategy, engine, { wording: arm.wording, anchors: arm.anchors });
		const archivePath = join(archiveDir, `${arm.name.replace(/[^\w.-]/g, "_")}-${testCase.id}.txt`);
		writeFileSync(archivePath, testCase.output);
		const rendered = renderTestLog(plan, archivePath);

		const lost = testCase.required.filter((required) => !rendered.text.includes(required));
		const pointer = /full output: (.+?)\]/.exec(rendered.text)?.[1];
		rows.push({
			arm: arm.name,
			case: testCase.id,
			chars: testCase.output.length,
			source: plan.source,
			reason: plan.reason,
			applied: rendered.applied,
			candidates: plan.units.filter((unit) => unit.kind !== "protected").length,
			asked: plan.asked.length,
			omitted: rendered.applied ? plan.omitted.length : 0,
			requiredKept: testCase.required.length - lost.length,
			requiredTotal: testCase.required.length,
			lost,
			optionalOmitted: testCase.optional.filter((optional) => !rendered.text.includes(optional)).length,
			optionalTotal: testCase.optional.length,
			netSavedChars: rendered.netSavedChars,
			judgeCalls:
				provider instanceof MockJudgeProvider ? provider.calls.length - mockCallsBefore : requests - before,
			latencyMs: plan.latencyMs,
			inputTokens: plan.usage?.inputTokens,
			recoveryChars: lost.length > 0 ? testCase.output.length : 0,
			archiveIntact: !rendered.applied || (pointer === archivePath && readFileSync(pointer, "utf8") === testCase.output),
			request: lastRequest,
			answers: live && arm.provider && arm.name.startsWith("jev:") ? plan.answers : undefined,
		});
	}
}

const percentile = (values: number[], p: number): number | undefined =>
	values.length === 0 ? undefined : [...values].sort((a, b) => a - b)[Math.min(values.length - 1, Math.floor(values.length * p))];

const summary = arms.map((arm) => {
	const mine = rows.filter((row) => row.arm === arm.name);
	const sum = (pick: (row: Row) => number) => mine.reduce((total, row) => total + pick(row), 0);
	const latencies = mine.flatMap((row) => (row.latencyMs !== undefined && row.judgeCalls > 0 ? [row.latencyMs] : []));
	return {
		arm: arm.name,
		cases: mine.length,
		applied: mine.filter((row) => row.applied).length,
		required: `${sum((row) => row.requiredKept)}/${sum((row) => row.requiredTotal)}`,
		wrongOmissions: sum((row) => row.lost.length),
		casesWithLoss: mine.filter((row) => row.lost.length > 0).length,
		optional: `${sum((row) => row.optionalOmitted)}/${sum((row) => row.optionalTotal)}`,
		netSavedChars: sum((row) => row.netSavedChars),
		netSavedShare: `${((sum((row) => row.netSavedChars) / sum((row) => row.chars)) * 100).toFixed(1)}%`,
		judgeCalls: sum((row) => row.judgeCalls),
		inputTokens: sum((row) => row.inputTokens ?? 0),
		latencyP50: percentile(latencies, 0.5),
		latencyP95: percentile(latencies, 0.95),
		recoveryChars: sum((row) => row.recoveryChars),
		fallbacks: mine.filter((row) => row.source === "fallback").length,
		archivesIntact: mine.every((row) => row.archiveIntact),
	};
});

console.table(summary);
for (const arm of arms.filter((candidate) => candidate.strategy === "jev")) {
	const lossy = rows.filter((row) => row.arm === arm.name && row.lost.length > 0);
	if (lossy.length === 0) continue;
	console.log(`\n${arm.name}: required evidence lost`);
	for (const row of lossy) console.log(`  ${row.case}: ${row.lost.map((text) => JSON.stringify(text.slice(0, 60))).join(", ")}`);
}
if (live) {
	console.log("\nper case (live arms): net saved chars / required kept / optional omitted");
	console.table(
		rows
			.filter((row) => row.arm.startsWith("jev:") && row.chars > 1500)
			.map((row) => ({
				arm: row.arm,
				case: row.case,
				asked: row.asked,
				omitted: row.omitted,
				required: `${row.requiredKept}/${row.requiredTotal}`,
				optional: `${row.optionalOmitted}/${row.optionalTotal}`,
				net: row.netSavedChars,
				ms: row.latencyMs,
				tokens: row.inputTokens,
				reason: row.reason ?? "",
			})),
	);
}

const resultsDir = join(dirname(fileURLToPath(import.meta.url)), "results");
mkdirSync(resultsDir, { recursive: true });
const file = join(resultsDir, `test-log-${live ? "jev" : "offline"}-${process.env.SET ?? "all"}-${Date.now()}.json`);
writeFileSync(file, JSON.stringify({ at: new Date().toISOString(), live, requests, summary, rows }, null, "\t"));
console.log(`\n${requests} live requests. Results: ${file}`);
