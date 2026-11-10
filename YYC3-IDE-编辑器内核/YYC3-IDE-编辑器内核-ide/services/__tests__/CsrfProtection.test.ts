/**
 * @file: CsrfProtection.test.ts
 * @description: CSRF 防护服务单元测试
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-04-18
 * @status: test
 * @license: MIT
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.stubGlobal("location", { origin: "http://localhost:3200" });

describe("CsrfProtectionService", () => {
  let service: any;

  beforeEach(async () => {
    vi.resetModules();
    service = await import("../CsrfProtection").then((m) => {
      const Svc = (m as any).default.constructor;
      return new Svc({
        tokenLength: 16,
        tokenTtlMs: 60000,
        allowedOrigins: ["http://localhost:3200", "http://localhost:5173"],
        headerName: "X-CSRF-Token",
        cookieName: "test_csrf",
        rotateOnUse: false,
      });
    });
  });

  describe("generateToken", () => {
    it("生成有效令牌", () => {
      const token = service.generateToken();
      expect(token).toBeDefined();
      expect(token.value).toBeTruthy();
      expect(token.value.length).toBe(32);
      expect(token.createdAt).toBeLessThanOrEqual(Date.now());
      expect(token.expiresAt).toBeGreaterThan(Date.now());
    });

    it("每次生成不同令牌", () => {
      const t1 = service.generateToken();
      const t2 = service.generateToken();
      expect(t1.value).not.toBe(t2.value);
    });
  });

  describe("getToken", () => {
    it("返回当前有效令牌", () => {
      const token = service.getToken();
      expect(token).toBeDefined();
      expect(token.value).toBeTruthy();
    });
  });

  describe("validateToken", () => {
    it("验证当前令牌成功", () => {
      const token = service.getToken();
      expect(service.validateToken(token.value)).toBe(true);
    });

    it("空值验证失败", () => {
      expect(service.validateToken("")).toBe(false);
    });

    it("错误令牌验证失败", () => {
      expect(service.validateToken("invalid-token")).toBe(false);
    });
  });

  describe("validateOrigin", () => {
    it("允许列表内 origin 通过", () => {
      expect(service.validateOrigin("http://localhost:3200")).toBe(true);
    });

    it("允许列表外 origin 拒绝", () => {
      expect(service.validateOrigin("http://evil.com")).toBe(false);
    });

    it("null origin 拒绝", () => {
      expect(service.validateOrigin(null)).toBe(false);
    });

    it("undefined origin 拒绝", () => {
      expect(service.validateOrigin(undefined)).toBe(false);
    });
  });

  describe("validateReferer", () => {
    it("null referer 通过", () => {
      expect(service.validateReferer(null)).toBe(true);
    });

    it("合法 referer 通过", () => {
      expect(service.validateReferer("http://localhost:3200/page")).toBe(true);
    });

    it("非法 referer 拒绝", () => {
      expect(service.validateReferer("http://evil.com/page")).toBe(false);
    });
  });

  describe("signRequest", () => {
    it("签名请求包含必要字段", () => {
      const payload = { action: "save", data: "test" };
      const signed = service.signRequest(payload);
      expect(signed.nonce).toBeTruthy();
      expect(signed.signature).toBeTruthy();
      expect(signed.token).toBeTruthy();
      expect(signed.timestamp).toBeLessThanOrEqual(Date.now());
    });
  });

  describe("secureHeaders", () => {
    it("返回安全头", () => {
      const headers = service.secureHeaders();
      expect(headers["X-CSRF-Token"]).toBeTruthy();
      expect(headers["X-Requested-With"]).toBe("XMLHttpRequest");
      expect(headers["X-Content-Type-Options"]).toBe("nosniff");
    });
  });

  describe("doubleSubmitCookieHeaders", () => {
    it("返回双提交头", () => {
      const headers = service.doubleSubmitCookieHeaders();
      expect(headers["X-CSRF-Token"]).toBeTruthy();
      expect(headers["X-Requested-With"]).toBe("XMLHttpRequest");
    });
  });

  describe("validateDoubleSubmit", () => {
    it("匹配时通过", () => {
      const token = service.getToken();
      expect(service.validateDoubleSubmit(token.value, token.value)).toBe(true);
    });

    it("不匹配时失败", () => {
      expect(service.validateDoubleSubmit("cookie", "header")).toBe(false);
    });

    it("空值时失败", () => {
      expect(service.validateDoubleSubmit("", "header")).toBe(false);
      expect(service.validateDoubleSubmit("cookie", "")).toBe(false);
    });
  });

  describe("rotateToken", () => {
    it("轮换产生新令牌", () => {
      const oldToken = service.getToken();
      const newToken = service.rotateToken();
      expect(newToken.value).not.toBe(oldToken.value);
    });
  });

  describe("addAllowedOrigin / removeAllowedOrigin", () => {
    it("添加新 origin", () => {
      service.addAllowedOrigin("http://new-origin.com");
      const stats = service.getStats();
      expect(stats.allowedOrigins).toContain("http://new-origin.com");
    });

    it("移除 origin", () => {
      service.removeAllowedOrigin("http://localhost:5173");
      const stats = service.getStats();
      expect(stats.allowedOrigins).not.toContain("http://localhost:5173");
    });
  });

  describe("getStats", () => {
    it("返回完整统计", () => {
      const stats = service.getStats();
      expect(stats).toHaveProperty("tokenAge");
      expect(stats).toHaveProperty("tokenExpiresIn");
      expect(stats).toHaveProperty("usedTokenCount");
      expect(stats).toHaveProperty("nonceCount");
      expect(stats).toHaveProperty("allowedOrigins");
    });
  });

  describe("reset", () => {
    it("重置后产生新令牌", () => {
      const oldToken = service.getToken();
      service.reset();
      const newToken = service.getToken();
      expect(newToken.value).not.toBe(oldToken.value);
    });
  });
});
