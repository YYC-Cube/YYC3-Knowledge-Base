/**
 * @file: CsrfProtection.ts
 * @description: CSRF 防护服务 — 令牌生成/验证、Origin 校验、请求签名、
 *              Double-Submit Cookie 模式，保护 API 调用免受跨站请求伪造攻击
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-04-17
 * @status: production
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: csrf,security,token,origin-validation,request-signing
 */

import { logger } from "./Logger";

export interface CsrfToken {
  value: string;
  createdAt: number;
  expiresAt: number;
}

export interface CsrfConfig {
  tokenLength: number;
  tokenTtlMs: number;
  allowedOrigins: string[];
  headerName: string;
  cookieName: string;
  rotateOnUse: boolean;
}

interface SignedRequest {
  nonce: string;
  timestamp: number;
  signature: string;
  token: string;
}

const DEFAULT_CONFIG: CsrfConfig = {
  tokenLength: 32,
  tokenTtlMs: 3600000,
  allowedOrigins: [
    window.location.origin,
    "http://localhost:5173",
    "http://localhost:3000",
    "http://localhost:3200",
  ],
  headerName: "X-CSRF-Token",
  cookieName: "yyc3_csrf_token",
  rotateOnUse: true,
};

class CsrfProtectionService {
  private config: CsrfConfig;
  private currentToken: CsrfToken | null = null;
  private usedTokens: Set<string> = new Set();
  private nonceHistory: Map<string, number> = new Map();
  private readonly MAX_USED_TOKENS = 100;
  private readonly MAX_NONCE_HISTORY = 200;
  private readonly NONCE_TTL_MS = 300000;

  constructor(config?: Partial<CsrfConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.initializeToken();
  }

  private initializeToken(): void {
    this.currentToken = this.generateToken();
    this.syncCookie();
  }

  generateToken(): CsrfToken {
    const array = new Uint8Array(this.config.tokenLength);
    crypto.getRandomValues(array);
    const value = Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");

    const now = Date.now();
    const token: CsrfToken = {
      value,
      createdAt: now,
      expiresAt: now + this.config.tokenTtlMs,
    };

    return token;
  }

  getToken(): CsrfToken {
    if (!this.currentToken || Date.now() >= this.currentToken.expiresAt) {
      this.currentToken = this.generateToken();
      this.syncCookie();
    }
    return this.currentToken;
  }

  validateToken(tokenValue: string): boolean {
    if (!tokenValue) return false;

    if (this.usedTokens.has(tokenValue)) {
      logger.warn("[CSRF] Token reuse detected — possible replay attack");
      return false;
    }

    if (!this.currentToken) return false;

    if (tokenValue !== this.currentToken.value) {
      return false;
    }

    if (Date.now() >= this.currentToken.expiresAt) {
      logger.warn("[CSRF] Token expired");
      return false;
    }

    if (this.config.rotateOnUse) {
      this.usedTokens.add(this.currentToken.value);
      this.currentToken = this.generateToken();
      this.syncCookie();
      this.pruneUsedTokens();
    }

    return true;
  }

  validateOrigin(origin: string | null | undefined): boolean {
    if (!origin) {
      logger.warn("[CSRF] Missing Origin header");
      return false;
    }

    const isAllowed = this.config.allowedOrigins.some((allowed) => {
      if (allowed === origin) return true;
      try {
        const allowedUrl = new URL(allowed);
        const originUrl = new URL(origin);
        return allowedUrl.origin === originUrl.origin;
      } catch {
        return false;
      }
    });

    if (!isAllowed) {
      logger.warn(`[CSRF] Origin not allowed: ${origin}`);
    }

    return isAllowed;
  }

  validateReferer(referer: string | null | undefined): boolean {
    if (!referer) return true;

    try {
      const refererUrl = new URL(referer);
      return this.validateOrigin(refererUrl.origin);
    } catch {
      return false;
    }
  }

  signRequest(payload: Record<string, unknown>): SignedRequest {
    const token = this.getToken();
    const nonce = this.generateNonce();
    const timestamp = Date.now();

    const dataToSign = `${nonce}:${timestamp}:${token.value}:${JSON.stringify(payload)}`;
    const signature = this.simpleHash(dataToSign);

    this.nonceHistory.set(nonce, timestamp);
    this.pruneNonceHistory();

    return {
      nonce,
      timestamp,
      signature,
      token: token.value,
    };
  }

  validateSignedRequest(signed: SignedRequest, payload: Record<string, unknown>): boolean {
    const now = Date.now();

    if (Math.abs(now - signed.timestamp) > this.NONCE_TTL_MS) {
      logger.warn("[CSRF] Signed request timestamp expired");
      return false;
    }

    if (this.nonceHistory.has(signed.nonce)) {
      logger.warn("[CSRF] Nonce reuse detected — possible replay attack");
      return false;
    }

    const dataToSign = `${signed.nonce}:${signed.timestamp}:${signed.token}:${JSON.stringify(payload)}`;
    const expectedSignature = this.simpleHash(dataToSign);

    if (signed.signature !== expectedSignature) {
      logger.warn("[CSRF] Invalid request signature");
      return false;
    }

    if (!this.validateToken(signed.token)) {
      return false;
    }

    this.nonceHistory.set(signed.nonce, now);
    return true;
  }

  secureHeaders(): Record<string, string> {
    const token = this.getToken();
    return {
      [this.config.headerName]: token.value,
      "X-Requested-With": "XMLHttpRequest",
      "X-Content-Type-Options": "nosniff",
    };
  }

  doubleSubmitCookieHeaders(): Record<string, string> {
    const token = this.getToken();
    return {
      [this.config.headerName]: token.value,
      "X-Requested-With": "XMLHttpRequest",
    };
  }

  validateDoubleSubmit(cookieToken: string, headerToken: string): boolean {
    if (!cookieToken || !headerToken) {
      logger.warn("[CSRF] Double-submit: missing token");
      return false;
    }

    if (cookieToken !== headerToken) {
      logger.warn("[CSRF] Double-submit: token mismatch");
      return false;
    }

    return this.validateToken(cookieToken);
  }

  private syncCookie(): void {
    if (!this.currentToken) return;
    try {
      document.cookie = `${this.config.cookieName}=${this.currentToken.value}; SameSite=Strict; Secure; Path=/; Max-Age=${Math.floor(this.config.tokenTtlMs / 1000)}`;
    } catch {
      logger.warn("[CSRF] Failed to sync cookie");
    }
  }

  private generateNonce(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
  }

  private simpleHash(data: string): string {
    let h1 = 0xdeadbeef;
    let h2 = 0x41c6ce57;
    for (let i = 0; i < data.length; i++) {
      const ch = data.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
    h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
    h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
  }

  private pruneUsedTokens(): void {
    if (this.usedTokens.size > this.MAX_USED_TOKENS) {
      const entries = Array.from(this.usedTokens);
      const toRemove = entries.slice(0, entries.length - this.MAX_USED_TOKENS / 2);
      for (const token of toRemove) {
        this.usedTokens.delete(token);
      }
    }
  }

  private pruneNonceHistory(): void {
    const now = Date.now();
    for (const [nonce, timestamp] of this.nonceHistory) {
      if (now - timestamp > this.NONCE_TTL_MS) {
        this.nonceHistory.delete(nonce);
      }
    }

    if (this.nonceHistory.size > this.MAX_NONCE_HISTORY) {
      const entries = Array.from(this.nonceHistory.entries());
      entries.sort((a, b) => a[1] - b[1]);
      const toRemove = entries.slice(0, entries.length - this.MAX_NONCE_HISTORY / 2);
      for (const [nonce] of toRemove) {
        this.nonceHistory.delete(nonce);
      }
    }
  }

  getStats(): {
    tokenAge: number;
    tokenExpiresIn: number;
    usedTokenCount: number;
    nonceCount: number;
    allowedOrigins: string[];
  } {
    const now = Date.now();
    return {
      tokenAge: this.currentToken ? now - this.currentToken.createdAt : 0,
      tokenExpiresIn: this.currentToken ? this.currentToken.expiresAt - now : 0,
      usedTokenCount: this.usedTokens.size,
      nonceCount: this.nonceHistory.size,
      allowedOrigins: this.config.allowedOrigins,
    };
  }

  rotateToken(): CsrfToken {
    if (this.currentToken) {
      this.usedTokens.add(this.currentToken.value);
    }
    this.currentToken = this.generateToken();
    this.syncCookie();
    return this.currentToken;
  }

  addAllowedOrigin(origin: string): void {
    if (!this.config.allowedOrigins.includes(origin)) {
      this.config.allowedOrigins.push(origin);
    }
  }

  removeAllowedOrigin(origin: string): void {
    this.config.allowedOrigins = this.config.allowedOrigins.filter((o) => o !== origin);
  }

  reset(): void {
    this.usedTokens.clear();
    this.nonceHistory.clear();
    this.currentToken = this.generateToken();
    this.syncCookie();
  }
}

export const csrfProtection = new CsrfProtectionService();
export default csrfProtection;
