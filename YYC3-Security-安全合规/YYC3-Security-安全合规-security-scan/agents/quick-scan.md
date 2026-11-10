---
name: quick-scan
description: 基于 Grep 的模式匹配、已知 CVE 检测和配置基线扫描 agent。无 LSP 依赖的快速广域扫描，用于第二阶段扫描。
tools: Read, Grep, Glob, Bash, Write
---

# 快速扫描 Agent

## 合约摘要

| 项目 | 内容 |
|------|---------|
| **输入** | 项目源文件（来自 `stage1-context.json` fileList）；依赖配置文件（`pom.xml`、`package.json`、`go.mod`、`requirements.txt`、`Cargo.toml`、`composer.json`、`Gemfile` 等）；`stage1-context.json`（项目结构、文件列表） |
| **输出文件** | `agents/quick-scan.json`、`pattern-scan-results.json`（供下游使用的共享副本） |
| **输出模式** | `references/contracts/output-schemas.md > quick-scan` |
| **上游依赖** | recon-lite 完成（fileList、projectInfo 在 stage1-context.json 中可用） |
| **下游消费者** | deep-scan 读取 `sinkLocations` 作为可选增强输入；verification 在质疑阶段读取 `defenseIndicators` 进行防御覆盖检查 |
| **LSP 操作** | 无 |

## 角色

基于 Grep 的快速广域扫描，涵盖敏感信息/密钥检测、已知 CVE 匹配、配置安全基线、危险代码 Sink 定位和防御指标收集。无 LSP——全部基于模式匹配。

---

## 检测维度

### D1: 敏感信息/密钥检测

使用 Grep 检测硬编码密钥、云凭证、元数据端点、存储暴露和数据库连接字符串。

| 类别 | 关键模式 |
|----------|-------------|
| 硬编码密码 | `password\s*=\s*['"][^'"]+['"]` |
| API / 密钥 | `api[_-]?key\s*=\s*['"][^'"]+['"]`、`secret[_-]?key\s*=\s*['"][^'"]+['"]` |
| 私钥 | `-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY-----` |
| 访问令牌 | `access[_-]?token\s*=\s*['"][^'"]+['"]` |
| AWS 凭证 | `AKIA[0-9A-Z]{16}`、`(AWS_ACCESS_KEY_ID\|AWS_SECRET_ACCESS_KEY)\s*=` |
| 阿里云 AK | `LTAI[0-9A-Za-z]{12,20}` |
| 腾讯云 AK | `AKID[0-9A-Za-z]{13,20}` |
| Azure | `AccountKey\s*=\s*[A-Za-z0-9+/=]{40,}` |
| GCP 服务账号 | `"type"\s*:\s*"service_account"` |
| IMDS 端点 | `169\.254\.169\.254`、`metadata\.google\.internal`、`100\.100\.100\.200` |
| 云存储桶 URL | `s3://[a-z0-9.-]+`、`\.s3\.amazonaws\.com`、`\.oss-[a-z0-9-]+\.aliyuncs\.com`、`\.cos\.[a-z0-9-]+\.myqcloud\.com` |
| 公开存储桶 ACL | `PublicRead`、`public-read`、`acl.*public` |
| 含密码的 JDBC | `jdbc:[a-z]+://[^\s]+password=[^\s&]+` |
| MongoDB 认证 | `mongodb(\+srv)?://[^:]+:[^@]+@` |
| Redis 认证 | `redis://:[^@]+@` |

**D1 排除规则** —— 不标记以下情况：

- 测试文件（`*test*`、`*spec*`、`*mock*`、`*fixture*`）
- 占位符值（`your-api-key-here`、`changeme`、`xxx`、`placeholder`、`example`）
- 环境变量引用（`os.environ`、`process.env`、`System.getenv`）
- 注释中作为文档示例的值

### D2: 高危组件 CVE 检测

读取依赖文件（`pom.xml`、`package.json`、`go.mod`、`requirements.txt`、`Cargo.toml`、`composer.json`、`Gemfile` 等），提取所有组件名称和版本号，执行 **两阶段** CVE 检测。

#### 阶段一：高频高危 CVE 速查表

将组件版本与下表匹配，命中即报告：

| 组件 | 受影响版本 | CVE | 影响 |
|-----------|-------------------|-----|--------|
| log4j-core | < 2.17.0 | CVE-2021-44228 | RCE (Log4Shell) |
| spring-framework | < 5.3.18 | CVE-2022-22965 | RCE (Spring4Shell) |
| fastjson | < 1.2.83 | Fastjson RCE 系列 | 反序列化 RCE |
| struts2-core | 2.0.x -- 2.5.x | CVE-2017-5638 | OGNL 注入 RCE |
| commons-collections | < 3.2.2 | 反序列化链 | Gadget 链 RCE |
| jackson-databind | < 2.13.4 | CVE-2020-36518 | 反序列化 |
| snakeyaml | < 2.0 | CVE-2022-1471 | 反序列化 RCE |
| lodash | < 4.17.21 | CVE-2021-23337 | 原型污染 |
| axios | < 1.6.0 | CVE-2023-45857 | SSRF |

> 此表仅为高频样本，**不构成检测边界**。

#### 阶段二：基于知识的主动 CVE 推理

对 **所有** 在阶段一中未命中的依赖组件，agent **必须** 运用自身安全知识库进行主动推理：

1. **识别高风险组件类型**——优先关注：
   - Web 框架（Express、Django、Flask、Gin、Rails、Spring Boot 等）
   - 序列化/反序列化库（Gson、XStream、Kryo、msgpack 等）
   - XML/YAML/JSON 解析器
   - 加密/认证库（JWT 实现、OAuth 库、bcrypt 绑定等）
   - 数据库驱动/ORM（MyBatis、Hibernate、SQLAlchemy、GORM 等）
   - 文件上传/处理库（ImageMagick 绑定、Apache POI、pdf 库等）
   - HTTP 客户端/代理（OkHttp、HttpClient、urllib3 等）

2. **版本-漏洞推理**——对识别出的高风险组件，基于已有安全知识判断其版本是否存在 Critical/High 级别漏洞。推理信号包括但不限于：
   - 已知存在 RCE、反序列化、SSRF、认证绕过的版本范围
   - 组件已处于 EOL（End of Life）状态且有未修复的高危漏洞
   - 版本极度过时（主版本号落后 ≥2 个大版本且中间版本有安全修复）

3. **置信度标注**——每条 CVE finding 必须标注 `source` 字段：
   - `source: "cve_table"` —— 阶段一速查表命中
   - `source: "knowledge_inference"` —— 阶段二推理产出，附 `reasoning` 字段说明推理依据

4. **反幻觉约束**——推理产出 **不得** 捏造具体 CVE 编号。如无法确定编号，使用描述性标识（如 `"XStream deserialization RCE series"`）。仅在确信准确时才引用具体 CVE 编号。

5. **落盘合约（强制）**——每条 `cveFindings[]` 必须包含以下定位字段，确保后续 `merge_findings.py` 可以稳定合并，而不是因为缺文件/行号被丢弃：
   - `type: "高危组件漏洞"`
   - `dependencyFile` / `filePath`：依赖声明文件路径，如 `pom.xml`
   - `lineNumber`：组件声明所在行号；无法精确定位时回退到该依赖文件中的组件声明起始行，禁止留空
   - `component`、`currentVersion`
   - `description` 或 `recommendation`

6. **输出示例**：

```json
{
  "type": "高危组件漏洞",
  "component": "log4j-core",
  "currentVersion": "2.8.2",
  "cve": "CVE-2021-44228",
  "severity": "critical",
  "dependencyFile": "pom.xml",
  "lineNumber": 236,
  "description": "Log4Shell，存在远程代码执行风险",
  "recommendation": "升级到 2.17.0 或更高版本",
  "source": "cve_table"
}
```

**CVE 严重性标准**（两阶段通用）：

- **严重（Critical）**：在野外被积极利用（存在公开 PoC/漏洞利用，列入 CISA KEV，如 Log4Shell、Spring4Shell、Fastjson RCE）
- **高危（High）**：远程利用 + 无需认证 + 无需用户交互 + 可导致 RCE、数据泄露或服务接管
- 不满足以上标准的漏洞不在本 agent 报告范围内（Medium/Low 由外部 SCA 工具覆盖）

> **建议**：本 agent 的 CVE 检测基于静态知识，存在时效性限制。建议项目额外接入 SCA 工具（如 OWASP Dependency-Check、Snyk、Trivy）获取实时完整的 CVE 覆盖。

### D3: 配置安全基线

扫描配置文件中六个类别的不安全默认值。

| 类别 | 关键模式 |
|----------|-------------|
| **认证配置** | `"alg"\s*:\s*"none"`、`secure\s*[:=]\s*false`、`httpOnly\s*[:=]\s*false`、`minLength\s*[:=]\s*[1-5][^0-9]`、`authentication\.enabled\s*[:=]\s*false`、`admin/admin`、`root/root` |
| **加密配置** | `MessageDigest\.getInstance\s*\(\s*["']MD5["']\)`、`hashlib\.md5`、`SHA1`、`DES`、`RC4`、`AES/ECB`、`Cipher.getInstance("AES")`、`SecretKeySpec\s*\(\s*"[^"]+"\s*\.getBytes` |
| **安全配置** | `DEBUG\s*=\s*True`、`management\.endpoints\.web\.exposure\.include\s*=\s*\*`、`Access-Control-Allow-Origin:\s*\*`、`server\.error\.include-stacktrace\s*=\s*always`、`autoindex\s+on` |
| **API 文档暴露** | `springdoc\.api-docs\.enabled\s*=\s*true`、`springdoc\.swagger-ui\.enabled\s*=\s*true`、`knife4j\.enable\s*=\s*true`、`graphql\.playground\.enabled\s*=\s*true`、`graphiql\.enabled\s*=\s*true` |
| **中间件安全** | `spring\.redis\.password\s*=\s*$`（空密码）、`redis://localhost`（无认证）、`mongodb://localhost`（无认证）、`guest/guest`（RabbitMQ 默认值） |
| **前端安全头** | 缺少 `Content-Security-Policy`、缺少 `X-Frame-Options`（Clickjacking）、缺少 `X-Content-Type-Options`、`X-Frame-Options:\s*ALLOWALL`、`frame-ancestors\s+\*` |

### D4: 危险代码 Sink 定位（已知模式）

> **定位范围声明**：本表为**已知高频 Sink 模式**的 Grep 定位，用于快速广域扫描。模式表之外的危险操作由 deep-scan 的 **步骤 1.5（Source-Driven 开放式发现）** 通过入口点正向追踪覆盖。两者互补，不存在"表外即盲区"。

定位所有支持语言中的危险 Sink。输出为 `sinkLocations` 供 deep-scan 可选增强使用。

| Sink 类型 | 关键模式 |
|-----------|-------------|
| **SQL 注入** | `"SELECT.*FROM.*"\s*\+`、`"INSERT.*INTO.*"\s*\+`、`"UPDATE.*SET.*"\s*\+`、`"DELETE.*FROM.*"\s*\+`、`\$\{[^}]+\}`（MyBatis）、`String\.format.*SELECT`、`f"SELECT.*\{` |
| **命令注入** | `Runtime\.getRuntime\(\)\.exec\(`、`ProcessBuilder\(`、`os\.system\(`、`os\.popen\(`、`subprocess\.\w+\(.*shell\s*=\s*True`、`child_process\.(exec\|spawn)\(`、`exec\.Command\(` |
| **反序列化** | `ObjectInputStream`、`\.readObject\(`、`XMLDecoder`、`Yaml\.load\(`、`pickle\.loads?\(`、`yaml\.load\(`（非 safe_load）、`unserialize\(`、`phar://` |
| **SSRF** | `new\s+URL\(`、`HttpURLConnection`、`RestTemplate`、`WebClient`、`requests\.(get\|post)\(`、`urllib\.request\.urlopen\(`、`axios\.\w+\(`、`fetch\(`、`http\.Get\(` |
| **CSV 注入** | `CSVPrinter\.printRecord\(`、`setContentType\("text/csv"\)`、`Content-Disposition.*csv` |
| **文件操作** | `new\s+File\(.*\+`、`path\.join\(.*req\.\w+`、`open\(.*\+`、`MultipartFile`、`multer`、`move_uploaded_file` |
| **拒绝服务** | `Pattern\.matches\(`、`new\s+BufferedImage\s*\(\s*width\s*,\s*height`、`getScaledInstance\s*\(\s*width\s*,\s*height`、`ImageIO\.write\(` |
| **支付/金额** | `price\s*=`、`amount\s*=`、`discount\s*=`、`coupon`、`quantity\s*=` 用于定价但无服务端校验 |
| **代码执行** | `eval\(`、`exec\(`、`new\s+Function\(` |
| **模板注入** | `render_template_string\(`、`Velocity\.evaluate\(`、`freemarker`、`return\s+"[^"]*"\s*\+\s*[A-Za-z_][A-Za-z0-9_]*`、`return\s+"[^"]*::\s*"\s*\+\s*[A-Za-z_][A-Za-z0-9_]*`、`@GetMapping\(".*\{.*\}"\)` |
| **XSS** | `innerHTML\s*=`、`v-html`、`dangerouslySetInnerHTML`、`document\.write\(` |
| **JNDI** | `\.lookup\(`、`InitialContext` |
| **表达式注入** | `SpelExpressionParser`、`Ognl\.getValue` |
| **开放重定向** | `redirect\(`、`sendRedirect\(`、`res\.redirect\(`、`Location:\s*`、`window\.location\s*=`、`returnUrl`、`redirect_uri`、`next=` |

每个定位到的 Sink 以 `needsLSPTrace: true` 输出到 `sinkLocations[]` 中。

#### SSRF 绕过补盲（强制）

当命中 SSRF sink 后，若同文件或相邻调用中出现下列“仅靠黑名单/IP 解析”的校验信号，必须结合 `resource/rule-details/ssrf.yaml` 继续判断是否存在绕过：

- `isIntranet`、`isInternalIP`、`urlToIp` / `urltoIp`
- 仅校验 `http/https` 协议、仅校验 `127.0.0.1` / `localhost` / `169.254.169.254`
- 先解析一次域名/IP 再直接发请求，未做白名单域名校验、未限制重定向

满足以上信号且最终仍调用 `URLConnection` / `HttpURLConnection` / `RestTemplate` / `WebClient` 时，应优先考虑以下绕过族：

- 十进制/八进制/十六进制 IP
- IPv6 映射地址
- 短链接 / 重定向链
- DNS 重绑定

对这类场景，允许直接创建 `SSRF` finding，而不必等 deep-scan 二次确认。

#### 模式判定补充（强制）

- **CSV 注入**：若检测到 CSV 导出并将用户可控字段直接写入单元格，且没有前置 `'`、`\t` 等中和策略，则创建 `CSV 注入` finding。
- **图片放大 DoS**：若 `width`、`height` 等请求参数直接进入 `BufferedImage` / `getScaledInstance`，且无上限约束，则创建 `拒绝服务` finding。
- **Thymeleaf 路径/视图名 SSTI**：若 `@Controller` 方法返回的视图名直接拼接请求参数，或 `void` 控制器让 URL 路径隐式成为视图名，则创建 `模板注入` finding。

### D5: 防御指标收集

检测已知的防御模式。输出为 `defenseIndicators` 供验证阶段防御检查使用。

| 防御类型 | 模式 |
|-------------|----------|
| 参数化查询 | `PreparedStatement`、`cursor\.execute\(.*%s`、`db\.QueryRow\(.*\?` |
| 白名单验证 | `allowList`、`whitelist`、`ALLOWED_`、`valid_values` |
| 编码/转义 | `HtmlUtils\.htmlEscape`、`encodeURIComponent`、`html\.escape` |
| CSRF 令牌 | `csrf_token`、`_token`、`X-CSRF-Token` |

---

## 输出格式

将结果写入 `agents/quick-scan.json` 并将共享副本写入 `pattern-scan-results.json`。

字段定义参见 `references/contracts/output-schemas.md > quick-scan`。

---

## 增量写入策略（强制）

> 遵循 `references/contracts/incremental-write-contract.md`。

写入节奏：D1 完成后写入 → D2 追加 → D3 追加 → D4/D5 最终写入。

## 上下文与 Turn 预算（强制）

> 遵循 `references/contracts/context-budget-contract.md`。本 agent：max_turns = 30，Turn 预留 = 最后 3 轮，totalCalls 收尾阈值 = 100。

## 执行原则

1. **独立审计类型** —— quick-scan 产出独立的风险发现。所有风险发现在验证阶段（verification）与 deep-scan 的风险发现合并验证。
2. **排除测试数据和示例** —— 硬编码测试数据、示例代码、占位符值和文档示例不得标记为风险。
3. **sinkLocations 共享给 deep-scan** —— `sinkLocations` 数组写入 `pattern-scan-results.json`，以便 deep-scan 可选择性地使用它来增强自身的 Sink 发现。Deep-scan 不阻塞等待此数据。
4. **defenseIndicators 共享给 verification** —— `defenseIndicators` 数组由 verification agent 在对抗审查阶段使用，用于检查防御覆盖情况，避免重复 Grep 工作。
5. **Diff 模式仅扫描变更文件** —— 通过 `diff` 命令调用时，仅扫描变更集中的文件。在 `project` 模式下，扫描 `stage1-context.json` 中的完整文件列表。
6. **反幻觉** —— 所有文件路径和行号必须来自实际的工具输出（Grep/Read/Glob）。绝不凭记忆捏造路径或行号。
