# 安全规则配置指南

---

## 目录结构

```
resource/
├── default-rules.yaml              # 核心审计逻辑索引 + 模式参考（必须加载）
├── README-CONFIG-GUIDE.md          # 本文件
├── anti-hallucination-rules.yaml   # 反幻觉规则
├── custom/                         # 用户自定义规则
│   ├── sanitizers.yaml             # 自定义安全函数
│   ├── sinks.yaml                  # 自定义危险函数
│   ├── sources.yaml                # 自定义输入源
│   └── ignore-patterns.yaml        # 忽略规则
├── rule-details/                   # 参考数据文件（按需加载）
│   ├── ssrf.yaml                   # SSRF 绕过技术参考数据
│   └── auth-basic.yaml             # 鉴权/越权基础检测模式
└── logic-audit-rules/              # 业务逻辑缺陷审计规则（按需加载）
    └── authentication-bypass.yaml  # 鉴权风险置信度评估与模式引用
```

---

## 规则加载策略

| 规则文件 | 加载时机 | 说明 |
|---------|---------|------|
| `default-rules.yaml` | **始终加载** | 核心审计逻辑索引，包含模式参考库 |
| `custom/*.yaml` | **存在则加载** | 用户自定义规则，与默认规则合并 |
| `rule-details/*.yaml` | **按需加载** | 特定漏洞类型的参考数据 |
| `logic-audit-rules/*.yaml` | **按需加载** | 业务逻辑缺陷审计规则，仅在发现触发信号时加载 |

**按需加载的好处**：减少 token 消耗，普通审计只需加载核心规则

---

## 未知函数处理逻辑

当 AI 遇到不认识的业务封装函数时，按以下顺序处理：

### 1. 跟进分析（自动）
AI 会尝试读取函数实现代码进行分析：
- 本地函数：直接读取源文件
- 外部依赖：下载源码分析

### 2. 启发式判断（自动）
根据函数特征推断：
- 函数名含 `Safe/Secure/Escape/Sanitize` → 可能安全
- 来自知名安全库 → 可能安全

### 3. 标记不确定
无法确定时，报告中标记为 **UNCERTAIN**，需要用户确认。

---

## 快速消除不确定：@safe 注释

在函数上方添加 `@safe` 注释即可：

```go
// @safe
func SafeHttpGet(url string) (*Response, error) { ... }
```

```python
# @safe
def safe_request(url): ...
```

```java
// @safe
public String safeQuery(String sql) { ... }
```

---

## 批量配置：包路径

整个安全 SDK 包都可信时，配置包路径：

```yaml
# custom/sanitizers.yaml
sanitizers:
  - package: "git.woa.com/sec-api/go/scurl/v2"
    risk_type: ssrf
```

---

## 支持的风险类型

| 类型 | 说明 | 参考数据来源 |
|------|------|-------------|
| `sql_injection` | SQL 注入 | default-rules.yaml (模式参考) |
| `xss` | 跨站脚本 | default-rules.yaml (模式参考) |
| `command_injection` | 命令注入 | default-rules.yaml (模式参考) |
| `path_traversal` | 路径遍历 | default-rules.yaml (模式参考) |
| `ssrf` | 服务端请求伪造 | rule-details/ssrf.yaml |
| `no_authentication` | 接口未鉴权 | logic-audit-rules/authentication-bypass.yaml |
| `flawed_authentication` | 鉴权机制缺陷 | logic-audit-rules/authentication-bypass.yaml |
| `trusted_source_bypass` | 信任来源免鉴权 | logic-audit-rules/authentication-bypass.yaml |
| `hardcoded_backdoor` | 硬编码后门凭据 | logic-audit-rules/authentication-bypass.yaml |
| `authorization_bypass` | 越权漏洞 | logic-audit-rules/authentication-bypass.yaml |

---

## 鉴权/越权风险检测说明

鉴权和越权相关风险的详细检测规则定义在 `logic-audit-rules/authentication-bypass.yaml`。

**触发信号：**
- API 入口缺少鉴权注解/装饰器（@PreAuthorize, @login_required 等）
- 敏感路径（/admin/*, /manage/*）没有权限保护
- 存在跳过鉴权的条件判断（IsCloudOARequest, isInternalIP 等）
- 资源访问仅依赖前端传入的 ID，无归属检查
- **硬编码凭据用于鉴权判断**（password == "xxx", 后门 Token 等）

**发现触发信号后自动加载详细规则进行深入分析。**

### 置信度评估标准

- **高置信度 (≥90)**：完整调用链分析，确认无鉴权或可绕过，能构造 PoC（**可触发自动修复**）
- **中置信度 (60-89)**：分析了主要调用链，但可能存在框架层统一鉴权（**建议人工确认**）
- **低置信度 (<60)**：仅分析部分代码，无法确认完整调用链（**需更多上下文**）

**重要规则**：仅对置信度 >= 90 的漏洞提供自动修复，低置信度漏洞建议人工确认后再处理
