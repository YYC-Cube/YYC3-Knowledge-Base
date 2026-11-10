import type { AgentTool } from "@earendil-works/pi-agent-core";
import { fauxAssistantMessage, fauxToolCall } from "@earendil-works/pi-ai";
import { Type } from "typebox";
import { describe, expect, it } from "vitest";
import { shouldCompact } from "../../coding-agent/src/core/compaction/compaction.ts";
import { SettingsManager } from "../../coding-agent/src/core/settings-manager.ts";
import { createHarness } from "../../coding-agent/test/suite/harness.ts";

describe("configurable context budget", () => {
	it("triggers at the configured cap without relaxing the model reserve", () => {
		const settings = { enabled: true, reserveTokens: 2000, keepRecentTokens: 2000, maxContextTokens: 8192 };
		expect(shouldCompact(8191, 100000, settings)).toBe(false);
		expect(shouldCompact(8192, 100000, settings)).toBe(true);
		expect(shouldCompact(8000, 10000, settings)).toBe(true);
		expect(shouldCompact(100000, 100000, { ...settings, enabled: false })).toBe(false);
		expect(shouldCompact(8192, 100000, { ...settings, maxContextTokens: 0 })).toBe(false);
	});
	it("leaves room to compact at small caps and rejects invalid settings", () => {
		const small = SettingsManager.inMemory({ compaction: { maxContextTokens: 8192 } });
		expect(small.getCompactionSettings().keepRecentTokens).toBe(4096);
		expect(SettingsManager.inMemory().getCompactionSettings()).not.toHaveProperty("maxContextTokens");
		expect(() => SettingsManager.inMemory({ compaction: { maxContextTokens: -1 } }).getCompactionSettings()).toThrow(
			"Invalid",
		);
	});
	it("compacts between tool output and the next model request without aborting the task", async () => {
		const tool: AgentTool = {
			name: "large_result",
			label: "Large result",
			description: "Fixture",
			parameters: Type.Object({}),
			execute: async () => ({ content: [{ type: "text", text: `tool result:${"x".repeat(8000)}` }], details: {} }),
		};
		const order: string[] = [];
		const harness = await createHarness({
			models: [{ id: "fixture", contextWindow: 100000, maxTokens: 100 }],
			settings: {
				compaction: { enabled: true, maxContextTokens: 2200, reserveTokens: 400, keepRecentTokens: 1000 },
			},
			tools: [tool],
			extensionFactories: [
				(pi) => {
					pi.on("session_before_compact", (event) => {
						order.push("compact");
						return {
							compaction: {
								summary: "compressed fixture",
								firstKeptEntryId: event.preparation.firstKeptEntryId,
								tokensBefore: event.preparation.tokensBefore,
							},
						};
					});
				},
			],
		});
		try {
			harness.setResponses([
				fauxAssistantMessage(`old:${"a".repeat(800)}`),
				fauxAssistantMessage(`recent:${"b".repeat(800)}`),
				fauxAssistantMessage(fauxToolCall("large_result", {}), { stopReason: "toolUse" }),
				(context) => {
					order.push("model");
					expect(JSON.stringify(context.messages)).toContain("compressed fixture");
					return fauxAssistantMessage("Finished");
				},
			]);
			await harness.session.prompt("old history");
			await harness.session.prompt("recent history");
			const starts = harness.eventsOfType("agent_start").length;
			await harness.session.prompt("call tool");
			expect(order.slice(0, 2)).toEqual(["compact", "model"]);
			expect(harness.eventsOfType("agent_start").length).toBe(starts + 1);
			expect(harness.eventsOfType("compaction_end")[0]).toMatchObject({ aborted: false, reason: "threshold" });
			expect(harness.session.getLastAssistantText()).toBe("Finished");
		} finally {
			harness.cleanup();
		}
	});
});
