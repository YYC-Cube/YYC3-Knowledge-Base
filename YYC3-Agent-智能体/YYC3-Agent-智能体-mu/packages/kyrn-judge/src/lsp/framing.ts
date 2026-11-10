/**
 * JSON-RPC as the Language Server Protocol frames it on stdio:
 *
 *   Content-Length: <bytes>\r\n
 *   \r\n
 *   <that many bytes of UTF-8 JSON>
 *
 * The length counts bytes, not characters, and a pipe hands over whatever it
 * has: half a header, three messages at once, a multi-byte character cut in
 * two. So the decoder works on buffers and only decodes a body once it is whole.
 */
const HEADER_END = Buffer.from("\r\n\r\n", "ascii");
const HEADER_START = /content-length:/i;

/** A server that announces more than this is broken or hostile; the stream cannot be trusted after it. */
export const MAX_MESSAGE_BYTES = 64 * 1024 * 1024;
/** Bytes of non-protocol output (a banner printed to stdout) tolerated before a header shows up. */
const MAX_GARBAGE_BYTES = 64 * 1024;

export function encodeMessage(message: unknown): Buffer {
	const body = Buffer.from(JSON.stringify(message), "utf8");
	return Buffer.concat([Buffer.from(`Content-Length: ${body.length}\r\n\r\n`, "ascii"), body]);
}

export class FrameError extends Error {}

export class MessageDecoder {
	private buffer: Buffer = Buffer.alloc(0);
	private bodyLength: number | undefined;
	/** Bodies that were framed correctly but were not JSON. They are skipped, the stream stays usable. */
	malformed = 0;

	/** Every message completed by this chunk, in order. Throws `FrameError` when the stream is beyond repair. */
	push(chunk: Buffer): unknown[] {
		this.buffer = this.buffer.length === 0 ? chunk : Buffer.concat([this.buffer, chunk]);
		const messages: unknown[] = [];
		while (true) {
			if (this.bodyLength === undefined) {
				const headerEnd = this.buffer.indexOf(HEADER_END);
				if (headerEnd < 0) {
					if (this.buffer.length > MAX_GARBAGE_BYTES) throw new FrameError("No message header in the output");
					return messages;
				}
				const header = this.buffer.subarray(0, headerEnd).toString("ascii");
				// Anything a wrapper script printed before the first header is dropped with the header lines before it.
				const start = header.search(HEADER_START);
				const length = start < 0 ? Number.NaN : Number.parseInt(header.slice(start).split(":")[1] ?? "", 10);
				this.buffer = this.buffer.subarray(headerEnd + HEADER_END.length);
				if (!Number.isInteger(length) || length < 0) continue;
				if (length > MAX_MESSAGE_BYTES) throw new FrameError(`A message of ${length} bytes was announced`);
				this.bodyLength = length;
			}
			if (this.buffer.length < this.bodyLength) return messages;
			const body = this.buffer.subarray(0, this.bodyLength).toString("utf8");
			this.buffer = this.buffer.subarray(this.bodyLength);
			this.bodyLength = undefined;
			try {
				messages.push(JSON.parse(body));
			} catch {
				this.malformed++;
			}
		}
	}
}
