/**
 * Keeps the newest `capacity` characters of a stream and knows the absolute
 * offset of each of them, so a reader can pass back a cursor and get only what
 * is new. What falls out of the buffer is not lost: the job's log file has it.
 */
export class RingBuffer {
	readonly capacity: number;
	/** Characters written so far. This is the cursor a reader passes back. */
	end = 0;
	private chunks: string[] = [];
	private held = 0;

	constructor(capacity: number) {
		this.capacity = Math.max(1, Math.floor(capacity));
	}

	/** Offset of the oldest character still held. */
	get start(): number {
		return this.end - this.held;
	}

	append(text: string): void {
		if (!text) return;
		this.end += text.length;
		if (text.length >= this.capacity) {
			this.chunks = [text.slice(-this.capacity)];
			this.held = this.capacity;
			return;
		}
		this.chunks.push(text);
		this.held += text.length;
		while (this.held - this.chunks[0].length >= this.capacity) {
			this.held -= (this.chunks.shift() as string).length;
		}
		if (this.held > this.capacity) {
			const excess = this.held - this.capacity;
			this.chunks[0] = this.chunks[0].slice(excess);
			this.held -= excess;
		}
	}

	/** Text from `since` on. `missed` counts the characters before it that had already left the buffer. */
	read(since = 0): { text: string; from: number; missed: number } {
		const wanted = Math.max(0, Math.min(Math.floor(since), this.end));
		const from = Math.max(wanted, this.start);
		return { text: this.chunks.join("").slice(from - this.start), from, missed: from - wanted };
	}
}

const ANSI = /\x1b\[[0-?]*[ -/]*[@-~]|\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)|\x1b[@-Z\\-_]/g;
/** An escape sequence that has started and not ended yet: the rest is in the next chunk. */
const OPEN_ESCAPE = /\x1b(?:\[[0-?]*[ -/]*|\][^\x07\x1b]*)?$/;
const MAX_CARRY = 256;

/**
 * Turns raw process output into what a model should read: no colour codes, and
 * a carriage return starts a new line, so a progress bar is many short lines
 * instead of one endless one. Sequences split across chunks are held back
 * until they are complete.
 */
export class OutputCleaner {
	private carry = "";

	push(text: string): string {
		let pending = this.carry + text;
		this.carry = "";
		const open = OPEN_ESCAPE.exec(pending);
		if (open && open[0].length <= MAX_CARRY) {
			this.carry = open[0];
			pending = pending.slice(0, open.index);
		}
		// "\r\n" may be cut in two as well.
		if (pending.endsWith("\r")) {
			this.carry = `\r${this.carry}`;
			pending = pending.slice(0, -1);
		}
		return clean(pending);
	}

	flush(): string {
		const rest = clean(this.carry);
		this.carry = "";
		return rest;
	}
}

function clean(text: string): string {
	return text.replace(ANSI, "").replace(/\r\n?/g, "\n");
}
