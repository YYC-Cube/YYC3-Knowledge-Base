import { describe, expect, it } from "vitest";
import { encodeMessage, FrameError, MessageDecoder } from "../src/lsp/framing.ts";
import { pathKey, pathToUri, type UriStyle, uriStyleFor, uriToPath } from "../src/lsp/uri.ts";

describe("lsp framing", () => {
	const messages = [
		{ jsonrpc: "2.0", id: 1, method: "initialize", params: { note: "héllo 你好 🙂" } },
		{ jsonrpc: "2.0", method: "textDocument/publishDiagnostics", params: { diagnostics: [] } },
		{ jsonrpc: "2.0", id: 2, result: null },
	];

	it("counts bytes, not characters", () => {
		const frame = encodeMessage(messages[0]).toString("utf8");
		const body = JSON.stringify(messages[0]);
		expect(frame).toBe(`Content-Length: ${Buffer.byteLength(body, "utf8")}\r\n\r\n${body}`);
		expect(Buffer.byteLength(body, "utf8")).toBeGreaterThan(body.length);
	});

	it("decodes messages that arrive merged into one chunk", () => {
		const decoder = new MessageDecoder();
		expect(decoder.push(Buffer.concat(messages.map(encodeMessage)))).toEqual(messages);
	});

	it("decodes a stream cut at every possible byte, inside headers and inside multi-byte characters", () => {
		const stream = Buffer.concat(messages.map(encodeMessage));
		for (const size of [1, 2, 3, 7, 64]) {
			const decoder = new MessageDecoder();
			const seen: unknown[] = [];
			for (let offset = 0; offset < stream.length; offset += size) {
				seen.push(...decoder.push(stream.subarray(offset, offset + size)));
			}
			expect(seen, `chunks of ${size}`).toEqual(messages);
		}
	});

	it("accepts extra headers and any header case, and skips what a wrapper printed first", () => {
		const body = JSON.stringify(messages[2]);
		const decoder = new MessageDecoder();
		const seen = decoder.push(
			Buffer.from(
				`Starting server...\nContent-Type: application/vscode-jsonrpc; charset=utf-8\r\ncontent-length: ${body.length}\r\n\r\n${body}`,
			),
		);
		expect(seen).toEqual([messages[2]]);
	});

	it("skips a body that is not JSON and keeps going", () => {
		const decoder = new MessageDecoder();
		const seen = decoder.push(
			Buffer.concat([Buffer.from("Content-Length: 5\r\n\r\n{oops"), encodeMessage(messages[2])]),
		);
		expect(seen).toEqual([messages[2]]);
		expect(decoder.malformed).toBe(1);
	});

	it("gives up on a stream that announces an absurd message or never sends a header", () => {
		expect(() => new MessageDecoder().push(Buffer.from("Content-Length: 99999999999\r\n\r\n"))).toThrow(FrameError);
		expect(() => new MessageDecoder().push(Buffer.alloc(70 * 1024, "x"))).toThrow(FrameError);
	});
});

describe("lsp uris", () => {
	const posix: UriStyle = { kind: "posix" };
	const win32: UriStyle = { kind: "win32" };
	const wsl: UriStyle = { kind: "wsl-windows", distro: "Ubuntu-22.04" };

	it("converts POSIX paths, percent-encoding spaces and non-ASCII names", () => {
		const path = "/home/u/my project/ü#1?.ts";
		const uri = pathToUri(path, posix);
		expect(uri).toBe("file:///home/u/my%20project/%C3%BC%231%3F.ts");
		expect(uriToPath(uri, posix)).toBe(path);
		expect(uriToPath("file://localhost/etc/hosts", posix)).toBe("/etc/hosts");
	});

	it("converts Windows drive paths and reads back every spelling a server may answer with", () => {
		const uri = pathToUri("C:\\Users\\a b\\src\\x.ts", win32);
		expect(uri).toBe("file:///C:/Users/a%20b/src/x.ts");
		expect(uriToPath(uri, win32)).toBe("C:\\Users\\a b\\src\\x.ts");
		expect(uriToPath("file:///c%3A/Users/a%20b/src/x.ts", win32)).toBe("c:\\Users\\a b\\src\\x.ts");
		expect(pathToUri("C:/Users/x.ts", win32)).toBe("file:///C:/Users/x.ts");
		// A drive letter in another case and another slash is the same document.
		expect(pathKey("c:/Users/A B/x.ts", win32)).toBe(pathKey("C:\\Users\\a b\\X.ts", win32));
		expect(pathKey("/Home/X.ts", posix)).toBe("/Home/X.ts");
	});

	it("converts UNC paths: the server name is the authority", () => {
		const uri = pathToUri("\\\\fileserver\\share\\dir\\x.ts", win32);
		expect(uri).toBe("file://fileserver/share/dir/x.ts");
		expect(uriToPath(uri, win32)).toBe("\\\\fileserver\\share\\dir\\x.ts");
	});

	it("gives a Windows server started from WSL the Windows spelling of a Linux path", () => {
		expect(pathToUri("/mnt/c/Users/me/app/x.ts", wsl)).toBe("file:///c:/Users/me/app/x.ts");
		expect(uriToPath("file:///C%3A/Users/me/app/x.ts", wsl)).toBe("/mnt/c/Users/me/app/x.ts");
		expect(uriToPath("file:///c:/", wsl)).toBe("/mnt/c");
		const inside = pathToUri("/home/me/app/x y.ts", wsl);
		expect(inside).toBe("file://wsl.localhost/Ubuntu-22.04/home/me/app/x%20y.ts");
		expect(uriToPath(inside, wsl)).toBe("/home/me/app/x y.ts");
		expect(uriToPath("file://wsl%24/Ubuntu-22.04/home/me/app/x.ts", wsl)).toBe("/home/me/app/x.ts");
	});

	it("picks the style from the platform and the server's executable", () => {
		const env = { WSL_DISTRO_NAME: "Ubuntu" };
		expect(uriStyleFor({ platform: "win32" })).toEqual({ kind: "win32" });
		expect(uriStyleFor({ platform: "darwin", executable: "/usr/bin/clangd" })).toEqual({ kind: "posix" });
		// A Linux server inside WSL sees Linux paths, /mnt/c included.
		expect(uriStyleFor({ platform: "linux", env, executable: "/usr/bin/clangd" })).toEqual({ kind: "posix" });
		expect(uriStyleFor({ platform: "linux", env, executable: "/mnt/c/LLVM/bin/clangd.exe" })).toEqual({
			kind: "wsl-windows",
			distro: "Ubuntu",
		});
	});

	it("ignores URIs that are not files", () => {
		expect(uriToPath("untitled:Untitled-1", posix)).toBeUndefined();
		expect(uriToPath("file:///bad%ZZ", posix)).toBeUndefined();
	});
});
