import type { Gear, PreflightInput, TurnType, Verdict } from "../../../packages/kyrn-judge/src/index.ts";

/**
 * Hand-labelled preflight scenarios. Only fields with an unambiguous ground
 * truth are listed in `expect`; a list means any of its members is correct.
 * This is a sanity bench for wiring and wording, not a rigorous evaluation.
 */
export interface Scenario {
	readonly id: string;
	readonly lang: "en" | "zh";
	readonly input: PreflightInput;
	readonly expect: {
		readonly turnType?: readonly TurnType[];
		readonly gear?: readonly Gear[];
		readonly needsFilesChanged?: Verdict;
		readonly sideQuestion?: Verdict;
		readonly needsClarification?: Verdict;
		readonly swarmWorthy?: Verdict;
		readonly planFirst?: Verdict;
	};
}

const flakyLoginFrame = {
	goal: "Fix the flaky login test in CI",
	currentSubgoal: "find why the session cookie is missing in CI",
};

const flakyLoginTurns = [
	"user: The login test fails about one run in five on CI. Please fix it.",
	"assistant: I reproduced it. The session cookie is missing when the test server starts slowly. Checking the startup order next.",
];

export const scenarios: readonly Scenario[] = [
	{
		id: "en-chat-explain",
		lang: "en",
		input: { userMessage: "What's the difference between a mutex and a semaphore?", recentTurns: [] },
		expect: { turnType: ["chat_question"], gear: ["chat"], needsFilesChanged: "no", swarmWorthy: "no" },
	},
	{
		id: "en-quick-lookup",
		lang: "en",
		input: { userMessage: "Which file defines the AgentSession class?", recentTurns: [] },
		expect: { turnType: ["quick_lookup"], gear: ["light", "standard"], needsFilesChanged: "no" },
	},
	{
		id: "en-single-edit",
		lang: "en",
		input: { userMessage: "Rename the variable `cnt` to `count` in src/utils/counter.ts.", recentTurns: [] },
		expect: { turnType: ["single_edit"], gear: ["standard", "light"], needsFilesChanged: "yes", swarmWorthy: "no" },
	},
	{
		id: "en-multi-step",
		lang: "en",
		input: {
			userMessage:
				"The login test is flaky in CI. Find out why, fix it, and then make sure the whole test suite passes.",
			recentTurns: [],
		},
		expect: { turnType: ["multi_step_task"], gear: ["standard", "heavy"], needsFilesChanged: "yes" },
	},
	{
		id: "en-research",
		lang: "en",
		input: {
			userMessage:
				"Survey how every package in this monorepo handles retries and timeouts, and summarize the differences in a table.",
			recentTurns: [],
		},
		expect: { turnType: ["research"], gear: ["heavy"] },
	},
	{
		id: "en-design",
		lang: "en",
		input: {
			userMessage:
				"Should we store sessions in SQLite or in JSONL files? Let's weigh the trade-offs before touching any code.",
			recentTurns: [],
		},
		expect: { turnType: ["design_discussion"], gear: ["chat"], needsFilesChanged: "no" },
	},
	{
		id: "en-side-question",
		lang: "en",
		input: {
			userMessage: "By the way, what does the refreshToken helper do?",
			recentTurns: flakyLoginTurns,
			taskFrame: flakyLoginFrame,
			currentAction: "the agent is mid-run; this message would be delivered as steer",
		},
		expect: { sideQuestion: "yes", needsFilesChanged: "no", turnType: ["chat_question", "quick_lookup"] },
	},
	{
		id: "en-on-task-steer",
		lang: "en",
		input: {
			userMessage: "Use keyset pagination instead of OFFSET for that query.",
			recentTurns: [
				"user: Add pagination to the users API.",
				"assistant: I'm writing the SQL query with LIMIT and OFFSET now.",
			],
			taskFrame: { goal: "Add pagination to the users API", currentSubgoal: "write the SQL query" },
		},
		expect: { sideQuestion: "no", needsFilesChanged: "yes" },
	},
	{
		id: "en-underspecified",
		lang: "en",
		input: { userMessage: "Make it better.", recentTurns: [] },
		expect: { needsClarification: "yes" },
	},
	{
		id: "en-swarm-migration",
		lang: "en",
		input: {
			userMessage:
				"Migrate all 40 packages in this monorepo from Jest to Vitest. Each package is independent of the others.",
			recentTurns: [],
		},
		expect: { turnType: ["multi_step_task"], gear: ["heavy"], needsFilesChanged: "yes", swarmWorthy: "yes" },
	},
	{
		id: "en-risky-rewrite",
		lang: "en",
		input: {
			userMessage:
				"Rewrite the authentication module to use OAuth2 and remove the legacy password flow across the whole app.",
			recentTurns: [],
		},
		expect: { gear: ["heavy"], needsFilesChanged: "yes", planFirst: "yes" },
	},
	{
		id: "en-thanks",
		lang: "en",
		input: {
			userMessage: "Thanks, that works!",
			recentTurns: ["user: Fix the typo in the README title.", "assistant: Fixed: 'Instalation' is now 'Installation'."],
		},
		expect: { gear: ["chat"], needsFilesChanged: "no", swarmWorthy: "no", planFirst: "no" },
	},
	{
		id: "zh-chat-explain",
		lang: "zh",
		input: { userMessage: "解释一下 React 里 useEffect 和 useLayoutEffect 有什么区别？", recentTurns: [] },
		expect: { turnType: ["chat_question"], gear: ["chat"], needsFilesChanged: "no", swarmWorthy: "no" },
	},
	{
		id: "zh-quick-lookup",
		lang: "zh",
		input: { userMessage: "AgentSession 这个类是在哪个文件里定义的？", recentTurns: [] },
		expect: { turnType: ["quick_lookup"], gear: ["light", "standard"], needsFilesChanged: "no" },
	},
	{
		id: "zh-single-edit",
		lang: "zh",
		input: { userMessage: "把 src/config.ts 里的超时时间从 30 秒改成 60 秒。", recentTurns: [] },
		expect: { turnType: ["single_edit"], gear: ["standard", "light"], needsFilesChanged: "yes", swarmWorthy: "no" },
	},
	{
		id: "zh-multi-step",
		lang: "zh",
		input: {
			userMessage: "CI 上的登录测试偶尔会失败，帮我查出原因并修复，然后确认整个测试套件都能通过。",
			recentTurns: [],
		},
		expect: { turnType: ["multi_step_task"], gear: ["standard", "heavy"], needsFilesChanged: "yes" },
	},
	{
		id: "zh-research",
		lang: "zh",
		input: {
			userMessage: "调研一下这个仓库里所有的包分别是怎么处理重试和超时的，整理成一张对比表。",
			recentTurns: [],
		},
		expect: { turnType: ["research"], gear: ["heavy"] },
	},
	{
		id: "zh-design",
		lang: "zh",
		input: {
			userMessage: "会话数据我们是用 SQLite 存还是用 JSONL 文件存？先别动代码，讨论一下各自的利弊。",
			recentTurns: [],
		},
		expect: { turnType: ["design_discussion"], gear: ["chat"], needsFilesChanged: "no" },
	},
	{
		id: "zh-side-question",
		lang: "zh",
		input: {
			userMessage: "顺便问一下，refreshToken 这个函数是干什么用的？",
			recentTurns: [
				"user: CI 上登录测试大概五次会失败一次，帮我修一下。",
				"assistant: 我复现了问题：测试服务器启动慢的时候会话 cookie 会丢失。接下来检查启动顺序。",
			],
			taskFrame: { goal: "修复 CI 上不稳定的登录测试", currentSubgoal: "找出 CI 上会话 cookie 丢失的原因" },
			currentAction: "the agent is mid-run; this message would be delivered as steer",
		},
		expect: { sideQuestion: "yes", needsFilesChanged: "no", turnType: ["chat_question", "quick_lookup"] },
	},
	{
		id: "zh-underspecified",
		lang: "zh",
		input: { userMessage: "优化一下。", recentTurns: [] },
		expect: { needsClarification: "yes" },
	},
	{
		id: "zh-swarm-migration",
		lang: "zh",
		input: {
			userMessage: "把这个 monorepo 里的 40 个包全部从 Jest 迁移到 Vitest，每个包之间互相独立。",
			recentTurns: [],
		},
		expect: { turnType: ["multi_step_task"], gear: ["heavy"], needsFilesChanged: "yes", swarmWorthy: "yes" },
	},
	{
		id: "zh-thanks",
		lang: "zh",
		input: {
			userMessage: "好的，可以了，谢谢！",
			recentTurns: ["user: 把 README 标题里的错别字改掉。", "assistant: 已修复：「安裝」改成了「安装」。"],
		},
		expect: { gear: ["chat"], needsFilesChanged: "no", swarmWorthy: "no", planFirst: "no" },
	},
	{
		id: "en-side-git",
		lang: "en",
		input: {
			userMessage: "Unrelated: how do I squash the last three commits in git?",
			recentTurns: ["user: Add pagination to the users API.", "assistant: I'm writing the SQL query now."],
			taskFrame: { goal: "Add pagination to the users API", currentSubgoal: "write the SQL query" },
		},
		expect: { sideQuestion: "yes", needsFilesChanged: "no", gear: ["chat", "light", "standard"] },
	},
	{
		id: "en-on-task-add",
		lang: "en",
		input: {
			userMessage: "Also add a retry to the cookie check while you're in there.",
			recentTurns: flakyLoginTurns,
			taskFrame: flakyLoginFrame,
		},
		expect: { sideQuestion: "no", needsFilesChanged: "yes" },
	},
	{
		id: "en-underspecified-bug",
		lang: "en",
		input: { userMessage: "Fix the bug.", recentTurns: [] },
		expect: { needsClarification: "yes" },
	},
	{
		id: "en-clear-small",
		lang: "en",
		input: { userMessage: "Add a --verbose flag to the CLI and document it in the README.", recentTurns: [] },
		expect: { needsClarification: "no", needsFilesChanged: "yes", swarmWorthy: "no", planFirst: "no" },
	},
	{
		id: "en-swarm-tests",
		lang: "en",
		input: {
			userMessage: "Write unit tests for each of the 12 API handlers. They don't depend on each other.",
			recentTurns: [],
		},
		expect: { needsFilesChanged: "yes", swarmWorthy: "yes" },
	},
	{
		id: "en-no-swarm-fix",
		lang: "en",
		input: { userMessage: "Fix the off-by-one error in the pagination helper.", recentTurns: [] },
		expect: { turnType: ["single_edit"], needsFilesChanged: "yes", swarmWorthy: "no", planFirst: "no" },
	},
	{
		id: "en-plan-db-migration",
		lang: "en",
		input: {
			userMessage: "Migrate our database from MongoDB to PostgreSQL, including all of the data access code.",
			recentTurns: [],
		},
		expect: { gear: ["heavy"], needsFilesChanged: "yes", planFirst: "yes" },
	},
	{
		id: "zh-side-git",
		lang: "zh",
		input: {
			userMessage: "另外问个无关的：git 怎么把最近三次提交合并成一个？",
			recentTurns: ["user: 给用户 API 加上分页。", "assistant: 我正在写 SQL 查询。"],
			taskFrame: { goal: "给用户 API 加上分页", currentSubgoal: "编写 SQL 查询" },
		},
		expect: { sideQuestion: "yes", needsFilesChanged: "no", gear: ["chat", "light", "standard"] },
	},
	{
		id: "zh-on-task-add",
		lang: "zh",
		input: {
			userMessage: "顺手把 cookie 检查也加个重试。",
			recentTurns: [
				"user: CI 上登录测试大概五次会失败一次，帮我修一下。",
				"assistant: 我复现了问题：测试服务器启动慢的时候会话 cookie 会丢失。接下来检查启动顺序。",
			],
			taskFrame: { goal: "修复 CI 上不稳定的登录测试", currentSubgoal: "找出 CI 上会话 cookie 丢失的原因" },
		},
		expect: { sideQuestion: "no", needsFilesChanged: "yes" },
	},
	{
		id: "zh-underspecified-bug",
		lang: "zh",
		input: { userMessage: "修一下那个 bug。", recentTurns: [] },
		expect: { needsClarification: "yes" },
	},
	{
		id: "zh-clear-small",
		lang: "zh",
		input: { userMessage: "给 CLI 加一个 --verbose 参数，并在 README 里写上说明。", recentTurns: [] },
		expect: { needsClarification: "no", needsFilesChanged: "yes", swarmWorthy: "no", planFirst: "no" },
	},
	{
		id: "zh-swarm-tests",
		lang: "zh",
		input: { userMessage: "给 12 个 API handler 各写一份单元测试，它们之间互不依赖。", recentTurns: [] },
		expect: { needsFilesChanged: "yes", swarmWorthy: "yes" },
	},
	{
		id: "zh-no-swarm-fix",
		lang: "zh",
		input: { userMessage: "修复分页函数里的差一错误。", recentTurns: [] },
		expect: { turnType: ["single_edit"], needsFilesChanged: "yes", swarmWorthy: "no", planFirst: "no" },
	},
	{
		id: "zh-plan-db-migration",
		lang: "zh",
		input: {
			userMessage: "把数据库从 MongoDB 迁移到 PostgreSQL，包括所有数据访问层的代码。",
			recentTurns: [],
		},
		expect: { gear: ["heavy"], needsFilesChanged: "yes", planFirst: "yes" },
	},
	{
		id: "zh-risky-rewrite",
		lang: "zh",
		input: {
			userMessage: "把认证模块重写成 OAuth2，并在整个应用里移除旧的密码登录流程。",
			recentTurns: [],
		},
		expect: { gear: ["heavy"], needsFilesChanged: "yes", planFirst: "yes" },
	},
];
