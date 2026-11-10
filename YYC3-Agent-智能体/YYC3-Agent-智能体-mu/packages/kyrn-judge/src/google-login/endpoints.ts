/**
 * Google's Cloud Code Assist API, which Gemini CLI and Antigravity talk to,
 * and where it lives. Kept apart from the stream so the providers can be built
 * without loading the Google message conversion (and the SDK behind it).
 */
export const CLOUD_CODE_API = "google-cloud-code";
export const GEMINI_CLI_PROVIDER = "google-gemini-cli";
export const ANTIGRAVITY_PROVIDER = "google-antigravity";

export const CLOUD_CODE_ENDPOINT = "https://cloudcode-pa.googleapis.com";
/** Antigravity's endpoints, in the order its client tries them. */
export const ANTIGRAVITY_ENDPOINTS = [
	"https://daily-cloudcode-pa.sandbox.googleapis.com",
	"https://autopush-cloudcode-pa.sandbox.googleapis.com",
	CLOUD_CODE_ENDPOINT,
] as const;

/** Antigravity's backend checks the client's version; raise it with MU_ANTIGRAVITY_VERSION when Google raises the minimum. */
export const antigravityUserAgent = (env: (name: string) => string | undefined = (name) => process.env[name]) =>
	`antigravity/${env("MU_ANTIGRAVITY_VERSION") || env("PI_AI_ANTIGRAVITY_VERSION") || "1.107.0"} darwin/arm64`;
