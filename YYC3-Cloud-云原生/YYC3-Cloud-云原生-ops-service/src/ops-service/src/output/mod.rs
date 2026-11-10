//! 输出存档与脱敏模块
//! P2 阶段：提供输出脱敏和存档功能

use once_cell::sync::Lazy;
use regex::Regex;
use std::sync::Arc;

/// 输出脱敏器
pub struct OutputSanitizer {
    /// 脱敏规则
    rules: Vec<SanitizeRule>,
}

/// 脱敏规则
#[derive(Clone, Debug)]
pub struct SanitizeRule {
    /// 名称（用于调试和规则识别）
    #[allow(dead_code)]
    name: String,
    /// 正则表达式
    pattern: Regex,
    /// 替换字符串
    replacement: String,
}

impl OutputSanitizer {
    /// 创建默认脱敏器
    pub fn new_default() -> Self {
        Self {
            rules: vec![
                // 密码相关
                SanitizeRule {
                    name: "password".to_string(),
                    pattern: Regex::new(r"(?i)(password|passwd|pwd)[\s=:]+[^\s]+").unwrap(),
                    replacement: "$1=***".to_string(),
                },
                // API Key
                SanitizeRule {
                    name: "api_key".to_string(),
                    pattern: Regex::new(r"(?i)(api[_-]?key|apikey)[\s=:]+[^\s]+").unwrap(),
                    replacement: "$1=***".to_string(),
                },
                // Token
                SanitizeRule {
                    name: "token".to_string(),
                    pattern: Regex::new(
                        r"(?i)(token|access[_-]?token|refresh[_-]?token)[\s=:]+[^\s]+",
                    )
                    .unwrap(),
                    replacement: "$1=***".to_string(),
                },
                // Secret
                SanitizeRule {
                    name: "secret".to_string(),
                    pattern: Regex::new(
                        r"(?i)(secret|private[_-]?key|secret[_-]?key)[\s=:]+[^\s]+",
                    )
                    .unwrap(),
                    replacement: "$1=***".to_string(),
                },
                // Email
                SanitizeRule {
                    name: "email".to_string(),
                    pattern: Regex::new(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b")
                        .unwrap(),
                    replacement: "***@***.***".to_string(),
                },
                // 信用卡号
                SanitizeRule {
                    name: "credit_card".to_string(),
                    pattern: Regex::new(r"\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b").unwrap(),
                    replacement: "************".to_string(),
                },
                // JWT Token
                SanitizeRule {
                    name: "jwt".to_string(),
                    pattern: Regex::new(r"eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+")
                        .unwrap(),
                    replacement: "eyJ***.***.***".to_string(),
                },
            ],
        }
    }

    /// 创建自定义脱敏器
    pub fn new(rules: Vec<SanitizeRule>) -> Self {
        Self { rules }
    }

    /// 脱敏输出
    pub fn sanitize(&self, output: &str) -> String {
        let mut result = output.to_string();

        for rule in &self.rules {
            result = rule
                .pattern
                .replace_all(&result, &rule.replacement)
                .to_string();
        }

        result
    }

    /// 脱敏输出并生成摘要
    pub fn sanitize_and_summarize(&self, output: &str, max_length: usize) -> (String, String) {
        let sanitized = self.sanitize(output);

        let summary = if sanitized.len() > max_length {
            format!("{}...", &sanitized[..max_length])
        } else {
            sanitized.clone()
        };

        (sanitized, summary)
    }

    /// 检查输出是否包含敏感信息
    pub fn contains_sensitive(&self, output: &str) -> bool {
        for rule in &self.rules {
            if rule.pattern.is_match(output) {
                return true;
            }
        }
        false
    }
}

/// 全局默认脱敏器
static DEFAULT_SANITIZER: Lazy<Arc<OutputSanitizer>> =
    Lazy::new(|| Arc::new(OutputSanitizer::new_default()));

/// 获取默认脱敏器
pub fn default_sanitizer() -> Arc<OutputSanitizer> {
    Arc::clone(&DEFAULT_SANITIZER)
}

/// 输出存档管理器
pub struct OutputArchive {
    /// 摘要最大长度
    max_summary_length: usize,
    /// 明细最大长度（0表示不限制）
    max_detail_length: usize,
    /// 是否启用脱敏
    enable_sanitization: bool,
    /// 脱敏器
    sanitizer: Arc<OutputSanitizer>,
}

impl OutputArchive {
    /// 创建新的输出存档管理器
    pub fn new(
        max_summary_length: usize,
        max_detail_length: usize,
        enable_sanitization: bool,
    ) -> Self {
        Self {
            max_summary_length,
            max_detail_length,
            enable_sanitization,
            sanitizer: default_sanitizer(),
        }
    }

    /// 使用默认配置
    pub fn default_config() -> Self {
        Self {
            max_summary_length: 1000,
            max_detail_length: 100_000, // 100KB
            enable_sanitization: true,
            sanitizer: default_sanitizer(),
        }
    }

    /// 处理输出（脱敏、截断）
    pub fn process_output(&self, output: &str) -> (String, String) {
        let processed = if self.enable_sanitization {
            self.sanitizer.sanitize(output)
        } else {
            output.to_string()
        };

        // 生成摘要
        let summary = if processed.len() > self.max_summary_length {
            format!("{}...", &processed[..self.max_summary_length])
        } else {
            processed.clone()
        };

        // 截断明细
        let detail = if self.max_detail_length > 0 && processed.len() > self.max_detail_length {
            format!(
                "{}...\n\n[Output truncated: {} bytes total, showing first {} bytes]",
                &processed[..self.max_detail_length],
                processed.len(),
                self.max_detail_length
            )
        } else {
            processed
        };

        (summary, detail)
    }

    /// 仅生成摘要
    pub fn create_summary(&self, output: &str) -> String {
        let processed = if self.enable_sanitization {
            self.sanitizer.sanitize(output)
        } else {
            output.to_string()
        };

        if processed.len() > self.max_summary_length {
            format!("{}...", &processed[..self.max_summary_length])
        } else {
            processed
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_password_sanitization() {
        let sanitizer = OutputSanitizer::new_default();
        let input = "password=secret123";
        let output = sanitizer.sanitize(input);
        assert_eq!(output, "password=***");
    }

    #[test]
    fn test_api_key_sanitization() {
        let sanitizer = OutputSanitizer::new_default();
        let input = "api_key=abc123def456";
        let output = sanitizer.sanitize(input);
        assert_eq!(output, "api_key=***");
    }

    #[test]
    fn test_jwt_sanitization() {
        let sanitizer = OutputSanitizer::new_default();
        let input = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U";
        let output = sanitizer.sanitize(input);
        assert_eq!(output, "eyJ***.***.***");
    }

    #[test]
    fn test_email_sanitization() {
        let sanitizer = OutputSanitizer::new_default();
        let input = "Email: user@example.com";
        let output = sanitizer.sanitize(input);
        assert_eq!(output, "Email: ***@***.***");
    }

    #[test]
    fn test_output_archive() {
        let archive = OutputArchive::default_config();
        let output = "password=secret\napi_key=abc123\nNormal output here";
        let (summary, detail) = archive.process_output(output);

        assert!(!summary.contains("secret"));
        assert!(!detail.contains("secret"));
        assert!(!summary.contains("abc123"));
        assert!(!detail.contains("abc123"));
        assert!(detail.contains("Normal output here"));
    }

    #[test]
    fn test_truncation() {
        let archive = OutputArchive::new(10, 20, false);
        let output = "012345678901234567890123456789";
        let (summary, detail) = archive.process_output(output);

        assert_eq!(summary, "0123456789...");
        assert!(detail.starts_with("01234567890123456789"));
        assert!(detail.contains("truncated"));
    }

    #[test]
    fn test_contains_sensitive() {
        let sanitizer = OutputSanitizer::new_default();
        assert!(sanitizer.contains_sensitive("password=secret"));
        assert!(sanitizer.contains_sensitive("api_key=abc123"));
        assert!(!sanitizer.contains_sensitive("normal output"));
    }
}
