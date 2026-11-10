import { type Diagnostic, LINE_SLACK, type LineMap, type LineSpan, pair } from "./diagnostics.ts";

/**
 * - `unjudged`: seen, nobody has decided about it yet (it arrived after its edit's tool result was returned).
 * - `held`: to be told when the model pauses.
 * - `delivered`: the model has been told.
 * - `dropped`: not worth telling. An error is still owed at the end of the turn, whatever the judge said.
 */
export type TrackedStatus = "unjudged" | "held" | "delivered" | "dropped";

export interface Tracked {
	readonly path: string;
	diagnostic: Diagnostic;
	/** Where it is in the file's current text. A span when an edit rewrote its line. */
	span: LineSpan;
	status: TrackedStatus;
	readonly elsewhere: boolean;
	/** False once the file changed and the server has not confirmed it since. */
	checked: boolean;
}

/**
 * The per-turn buffer of diagnostics the agent's edits introduced. It does not
 * talk to a server: the feature feeds it what is new, tells it when a file's
 * text moved, and shows it the server's current diagnostics so that what has
 * been fixed in the meantime disappears without a word.
 */
export class DiagnosticsTracker {
	private items: Tracked[] = [];

	reset(): void {
		this.items = [];
	}

	/** Adds what is not tracked yet. Returns how many were added. */
	add(path: string, fresh: readonly Diagnostic[], elsewhere: boolean): number {
		const known = this.items.filter((item) => item.path === path);
		const paired = pair(fresh, known);
		let added = 0;
		fresh.forEach((diagnostic, index) => {
			if (paired[index] >= 0) return;
			this.items.push({
				path,
				diagnostic,
				span: { from: diagnostic.line, to: diagnostic.line },
				status: "unjudged",
				elsewhere,
				checked: true,
			});
			added++;
		});
		return added;
	}

	/** The file's text changed: move what is tracked to where its lines went. */
	remap(path: string, map: LineMap): void {
		for (const item of this.items) {
			if (item.path !== path) continue;
			const from = map(item.span.from);
			const to = map(item.span.to);
			item.span = { from: Math.min(from.from, to.from), to: Math.max(from.to, to.to) };
			item.checked = false;
		}
	}

	/**
	 * The server's current word on a file: what it no longer reports is gone, what it
	 * still reports gets its line updated. Returns what went away without the model ever hearing of it.
	 */
	revalidate(path: string, latest: readonly Diagnostic[]): Tracked[] {
		const mine = this.items.filter((item) => item.path === path);
		if (mine.length === 0) return [];
		// Tracked items are the anchors here, so the pairing runs from the server's list towards them.
		const paired = pair(latest, mine, LINE_SLACK);
		const alive = new Map<Tracked, Diagnostic>();
		paired.forEach((anchor, index) => {
			if (anchor >= 0) alive.set(mine[anchor], latest[index]);
		});
		for (const item of mine) {
			const now = alive.get(item);
			if (!now) continue;
			item.diagnostic = now;
			item.span = { from: now.line, to: now.line };
			item.checked = true;
		}
		const gone = mine.filter((item) => !alive.has(item));
		this.items = this.items.filter((item) => !gone.includes(item));
		return gone.filter((item) => item.status !== "delivered");
	}

	/** The file is gone, and its problems with it. */
	forget(path: string): void {
		this.items = this.items.filter((item) => item.path !== path);
	}

	all(): readonly Tracked[] {
		return this.items;
	}

	withStatus(...statuses: TrackedStatus[]): Tracked[] {
		return this.items.filter((item) => statuses.includes(item.status));
	}

	mark(items: readonly Tracked[], status: TrackedStatus): void {
		for (const item of items) item.status = status;
	}
}
