import { lookup as dnsLookup } from "node:dns";
import { isIP } from "node:net";

/**
 * Which addresses `web_fetch` may connect to. A model that reads the web can be
 * told by a page to fetch `http://169.254.169.254/` or the router's admin page,
 * and a harmless-looking URL can redirect there. So every hop is resolved and
 * the address itself is judged, inside the very lookup the connection uses:
 * there is no second resolution a DNS answer could change in between.
 */
export type AddressClass = "public" | "loopback" | "private" | "link-local" | "reserved";

export interface AddressPolicy {
	/** 127.0.0.0/8, ::1. Dev servers live here. */
	readonly allowLoopback: boolean;
	/** 10/8, 172.16/12, 192.168/16, CGNAT, fc00::/7, and link-local. */
	readonly allowPrivate: boolean;
}

export class FetchRefusal extends Error {
	readonly code: string;
	constructor(code: string, message: string) {
		super(message);
		this.code = code;
	}
}

function v4(octets: readonly number[]): AddressClass {
	const [a, b, c] = octets;
	if (a === 127) return "loopback";
	if (a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)) return "private";
	if (a === 100 && b >= 64 && b <= 127) return "private";
	if (a === 169 && b === 254) return "link-local";
	if (a === 0 || a >= 224) return "reserved";
	if (a === 192 && b === 0 && (c === 0 || c === 2)) return "reserved";
	if ((a === 198 && b === 51 && c === 100) || (a === 203 && b === 0 && c === 113)) return "reserved";
	// 198.18.0.0/15 is deliberately public: it is the default fake-IP range of the rule-based tunnels
	// (Clash, mihomo, Surge) that many users in mainland China run. Behind one, EVERY host name resolves
	// into it, so refusing it would refuse the whole web. Nothing internal is addressed there.
	return "public";
}

/** Expands an IPv6 literal to its eight groups, or undefined when it is not one. */
function groups(address: string): number[] | undefined {
	let text = address.split("%")[0];
	const dotted = /^(.*:)(\d+\.\d+\.\d+\.\d+)$/.exec(text);
	if (dotted) {
		const octets = dotted[2].split(".").map(Number);
		if (octets.some((octet) => octet > 255)) return undefined;
		text = `${dotted[1]}${((octets[0] << 8) | octets[1]).toString(16)}:${((octets[2] << 8) | octets[3]).toString(16)}`;
	}
	const halves = text.split("::");
	if (halves.length > 2) return undefined;
	const head = halves[0] ? halves[0].split(":") : [];
	const tail = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
	const fill = halves.length === 2 ? 8 - head.length - tail.length : 0;
	if (fill < 0 || (halves.length === 1 && head.length !== 8)) return undefined;
	const all = [...head, ...Array<string>(fill).fill("0"), ...tail].map((group) => Number.parseInt(group, 16));
	return all.length === 8 && all.every((group) => group >= 0 && group <= 0xffff) ? all : undefined;
}

export function classifyAddress(address: string): AddressClass {
	const bare = address.replace(/^\[|\]$/g, "");
	if (isIP(bare) === 4) return v4(bare.split(".").map(Number));
	const parts = groups(bare);
	if (!parts) return "reserved";
	const embedded = [parts[6] >> 8, parts[6] & 0xff, parts[7] >> 8, parts[7] & 0xff];
	const zeroPrefix = parts.slice(0, 5).every((group) => group === 0);
	// ::ffff:a.b.c.d, the deprecated ::a.b.c.d, and NAT64 all reach an IPv4 host: judge that host.
	if (zeroPrefix && parts[5] === 0xffff) return v4(embedded);
	if (parts[0] === 0x64 && parts[1] === 0xff9b && parts.slice(2, 6).every((group) => group === 0)) return v4(embedded);
	if (zeroPrefix && parts[5] === 0) {
		if (parts[6] === 0 && parts[7] === 1) return "loopback";
		return parts[6] === 0 && parts[7] === 0 ? "reserved" : v4(embedded);
	}
	if ((parts[0] & 0xfe00) === 0xfc00) return "private";
	if ((parts[0] & 0xffc0) === 0xfe80) return "link-local";
	if ((parts[0] & 0xff00) === 0xff00) return "reserved";
	if (parts[0] === 0x2001 && parts[1] === 0x0db8) return "reserved";
	return "public";
}

export function allowed(kind: AddressClass, policy: AddressPolicy): boolean {
	if (kind === "public") return true;
	if (kind === "loopback") return policy.allowLoopback;
	if (kind === "private" || kind === "link-local") return policy.allowPrivate;
	return false;
}

function refusal(host: string, address: string, kind: AddressClass): FetchRefusal {
	return new FetchRefusal(
		"address",
		`Refused: ${host} is a ${kind} address (${address}). web_fetch only reads the public web and, when asked directly, this machine's own dev servers.`,
	);
}

/** http and https only, no credentials, and a literal address must be allowed. Returns the parsed URL. */
export function checkUrl(raw: string, policy: AddressPolicy): URL {
	let url: URL;
	try {
		url = new URL(raw);
	} catch {
		throw new FetchRefusal("url", `Not a URL: ${raw.slice(0, 200)}`);
	}
	if (url.protocol !== "http:" && url.protocol !== "https:") {
		throw new FetchRefusal("scheme", `Refused: only http and https can be fetched, not ${url.protocol}`);
	}
	if (url.username || url.password) {
		throw new FetchRefusal("credentials", "Refused: the URL carries credentials. Remove the user:password@ part.");
	}
	const host = url.hostname.replace(/^\[|\]$/g, "");
	if (isIP(host)) {
		const kind = classifyAddress(host);
		if (!allowed(kind, policy)) throw refusal(url.hostname, host, kind);
	}
	return url;
}

export function isLoopbackUrl(url: URL): boolean {
	const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
	if (host === "localhost" || host.endsWith(".localhost")) return true;
	return isIP(host) !== 0 && classifyAddress(host) === "loopback";
}

type LookupAddress = { address: string; family: number };
type LookupCallback = (
	error: NodeJS.ErrnoException | null,
	address?: string | LookupAddress[],
	family?: number,
) => void;
export type LookupFn = (hostname: string, options: object, callback: LookupCallback) => void;

/**
 * A `lookup` for `http.request` that refuses when ANY answer for the host is not
 * allowed: a name with one public and one private record is a rebinding attempt,
 * not a site.
 */
export function checkedLookup(policy: AddressPolicy, resolve: LookupFn = dnsLookup as unknown as LookupFn): LookupFn {
	return (hostname, options, callback) => {
		resolve(hostname, { ...options, all: true }, (error, answer) => {
			if (error) return callback(error);
			const addresses = Array.isArray(answer) ? answer : [];
			if (addresses.length === 0) return callback(new FetchRefusal("dns", `${hostname} has no address`));
			for (const entry of addresses) {
				const kind = classifyAddress(entry.address);
				if (!allowed(kind, policy)) return callback(refusal(hostname, entry.address, kind));
			}
			if ((options as { all?: boolean }).all) callback(null, addresses);
			else callback(null, addresses[0].address, addresses[0].family);
		});
	};
}
