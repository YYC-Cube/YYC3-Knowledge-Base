import { describe, expect, it } from "vitest";
import { GatewayJudgeProvider } from "../src/providers/gateway.ts";
import type { Questions } from "../src/types.ts";

const questions = {
	urgent: { type: "boolean", instructions: "Does the sender ask for help today?" },
} satisfies Questions;

interface CapturedRequest {
	url: string;
	init: RequestInit;
}

function fakeFetch(status: number, body: unknown, captured: CapturedRequest[] = []): typeof fetch {
	return async (input, init) => {
		captured.push({ url: String(input), init: init ?? {} });
		return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
	};
}

describe("GatewayJudgeProvider", () => {
	it("sends the evaluation-model request the AI SDK gateway provider sends", async () => {
		const captured: CapturedRequest[] = [];
		const provider = new GatewayJudgeProvider({
			apiKey: "vck_test",
			fetch: fakeFetch(
				200,
				{ answers: { urgent: { type: "boolean", probability: 0.91 } }, usage: { inputTokens: 42 } },
				captured,
			),
		});

		const response = await provider.evaluate({ state: { message: "charged twice" }, questions });

		expect(response.answers.urgent).toEqual({ type: "boolean", probability: 0.91 });
		expect(response.usage?.inputTokens).toBe(42);
		expect(captured[0].url).toBe("https://ai-gateway.vercel.sh/v4/ai/evaluation-model");
		expect(captured[0].init.method).toBe("POST");
		expect(captured[0].init.headers).toMatchObject({
			Authorization: "Bearer vck_test",
			"ai-gateway-protocol-version": "0.0.1",
			"ai-gateway-auth-method": "api-key",
			"ai-evaluation-model-specification-version": "4",
			"ai-model-id": "typesafe-ai/jev",
		});
		expect(JSON.parse(String(captured[0].init.body))).toEqual({ state: { message: "charged twice" }, questions });
	});

	it("resolves the key per request so the host can own credential storage", async () => {
		let current: string | undefined;
		const captured: CapturedRequest[] = [];
		const provider = new GatewayJudgeProvider({
			apiKey: () => current,
			fetch: fakeFetch(200, { answers: { urgent: { type: "boolean", probability: 0.5 } } }, captured),
		});

		await expect(provider.evaluate({ state: "s", questions })).rejects.toMatchObject({ kind: "auth" });
		expect(captured).toHaveLength(0);

		current = "vck_later";
		await provider.evaluate({ state: "s", questions });
		expect(captured[0].init.headers).toMatchObject({ Authorization: "Bearer vck_later" });
	});

	it("classifies the missing-payment-card 403 as payment_required", async () => {
		const provider = new GatewayJudgeProvider({
			apiKey: "vck_test",
			fetch: fakeFetch(403, {
				error: { message: "AI Gateway requires a valid credit card on file to service requests." },
			}),
		});

		await expect(provider.evaluate({ state: "s", questions })).rejects.toMatchObject({
			kind: "payment_required",
			status: 403,
		});
	});

	it("classifies other statuses without leaking the key or the state", async () => {
		const cases: [number, string][] = [
			[401, "auth"],
			[403, "auth"],
			[429, "rate_limited"],
			[400, "bad_request"],
			[503, "server"],
		];
		for (const [status, kind] of cases) {
			const provider = new GatewayJudgeProvider({ apiKey: "vck_secret", fetch: fakeFetch(status, {}) });
			const error = await provider.evaluate({ state: "private state", questions }).catch((caught) => caught);
			expect(error).toMatchObject({ kind, status });
			expect(String(error.message)).not.toContain("vck_secret");
			expect(String(error.message)).not.toContain("private state");
		}
	});

	it("reports a network failure as unreachable and a bodyless success as invalid", async () => {
		const offline = new GatewayJudgeProvider({
			apiKey: "vck_test",
			fetch: async () => {
				throw new TypeError("fetch failed");
			},
		});
		await expect(offline.evaluate({ state: "s", questions })).rejects.toMatchObject({ kind: "unreachable" });

		const empty = new GatewayJudgeProvider({ apiKey: "vck_test", fetch: fakeFetch(200, {}) });
		await expect(empty.evaluate({ state: "s", questions })).rejects.toMatchObject({ kind: "invalid_response" });
	});
});
