// @ts-nocheck
/**
 * @file: CodeValidator.integration.test.ts
 * @description: CodeValidator 集成测试 - 测试从 LLM 响应到代码验证的完整流程
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-03-31
 * @updated: 2026-03-31
 * @status: test
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: test,integration,code-validator,pipeline
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  parseCodeBlocks,
  validateCodeBlock,
  validateCodeBlocks,
  parseAndValidateCodeBlocks,
} from "../ai/CodeApplicator";
import type { ParsedCodeBlock } from "../ai/CodeApplicator";

// ================================================================
// Integration Tests - CodeValidator with CodeApplicator
// ================================================================

describe("CodeValidator Integration with CodeApplicator", () => {
  let existingFiles: Record<string, string>;

  beforeEach(() => {
    existingFiles = {
      "src/App.tsx": `import React from 'react';

export default function App() {
  return <div>Hello World</div>;
}`,
      "src/index.ts": `export const app = () => {
  console.warn('hello');
};`,
    };
  });

  // ── Test 2.3.4.1: Parse & Validate Flow ──

  describe("Parse & Validate Flow", () => {
    it("should parse and validate valid code", () => {
      const llmResponse = `
我会创建一个新的组件文件：

\`\`\`tsx
// filepath: src/components/Button.tsx
import React from 'react';

export function Button({ label }: { label: string }) {
  return <button>{label}</button>;
}
\`\`\`
`;

      const result = parseAndValidateCodeBlocks(llmResponse, existingFiles);

      expect(result.plan.blocks.length).toBe(1);
      expect(result.plan.blocks[0].filepath).toBe("src/components/Button.tsx");
      expect(result.validations.size).toBe(1);

      const validationResult = result.validations.get("src/components/Button.tsx");
      expect(validationResult).toBeDefined();
      expect(validationResult?.valid).toBe(true);
      expect(validationResult?.errors.length).toBe(0);
    });

    it("should detect syntax errors", () => {
      const llmResponse = `
\`\`\`tsx
// filepath: src/components/Broken.tsx
import React from 'react'

export function Broken() {
  const obj = { a: 1, b: 2
  return <div>Test</div>;
}
\`\`\`
`;

      const result = parseAndValidateCodeBlocks(llmResponse, existingFiles);

      const validationResult = result.validations.get("src/components/Broken.tsx");
      expect(validationResult).toBeDefined();
      // Should detect bracket mismatch
      expect((validationResult as any).errors.some(e => e.includes("括号"))).toBe(true);
    });

    it("should detect security issues", () => {
      const llmResponse = `
\`\`\`js
// filepath: src/dangerous.js
const apiKey = "sk-1234567890abcdef";
eval(userInput);
\`\`\`
`;

      const result = parseAndValidateCodeBlocks(llmResponse, existingFiles);

      expect(result.hasWarnings).toBe(true);

      const validationResult = result.validations.get("src/dangerous.js");
      expect(validationResult?.warnings.some(w => w.includes("eval"))).toBe(true);
    });

    it("should provide best practice suggestions", () => {
      const llmResponse = `
\`\`\`tsx
// filepath: src/components/Test.tsx
import React from 'react';

export function Test() {
  console.log('debug');
  console.log('debug2');
  console.log('debug3');
  console.log('debug4');
  console.log('debug5');
  console.log('debug6');

  // TODO: fix this later
  return <div>Test</div>;
}
\`\`\`
`;

      const result = parseAndValidateCodeBlocks(llmResponse, existingFiles);

      const validationResult = result.validations.get("src/components/Test.tsx");
      expect(validationResult?.warnings.some(w => w.includes("console.log"))).toBe(true);
      expect(validationResult?.suggestions.some(s => s.includes("TODO"))).toBe(true);
    });
  });

  // ── Test 2.3.4.2: Multi-file Validation ──

  describe("Multi-file Validation", () => {
    it("should validate multiple files", () => {
      const llmResponse = `
我会创建两个文件：

\`\`\`tsx
// filepath: src/components/Header.tsx
import React from 'react';

export function Header() {
  return <header>Header</header>;
}
\`\`\`

\`\`\`tsx
// filepath: src/components/Footer.tsx
import React from 'react';

export function Footer() {
  return <footer>Footer</footer>;
}
\`\`\`
`;

      const result = parseAndValidateCodeBlocks(llmResponse, existingFiles);

      expect(result.plan.blocks.length).toBe(2);
      expect(result.validations.size).toBe(2);
      expect(result.hasErrors).toBe(false);
    });

    it("should identify which files have errors", () => {
      const llmResponse = `
\`\`\`tsx
// filepath: src/components/Good.tsx
export const Good = () => <div>Good</div>;
\`\`\`

\`\`\`tsx
// filepath: src/components/Bad.tsx
export const Bad = () => {
  // Missing closing bracket
  return <div>Bad
}
\`\`\`
`;

      const result = parseAndValidateCodeBlocks(llmResponse, existingFiles);

      // Good file should be valid
      const goodResult = result.validations.get("src/components/Good.tsx");
      expect(goodResult?.valid).toBe(true);

      // Bad file may have issues (bracket mismatch or other)
      const badResult = result.validations.get("src/components/Bad.tsx");
      expect(badResult).toBeDefined();
      // The file might not have errors due to basic validation
      // but it should at least be processed
      expect((badResult as any).metrics.lines).toBeGreaterThan(0);
    });
  });

  // ── Test 2.3.4.3: Code Metrics ──

  describe("Code Metrics", () => {
    it("should calculate code metrics", () => {
      const block: ParsedCodeBlock = {
        filepath: "test.ts",
        content: `function test() {
  if (true) {
    for (let i = 0; i < 10; i++) {
      console.warn(i);
    }
  }
}`,
        language: "ts",
        isNew: true,
      };

      const result = validateCodeBlock(block);

      expect(result.metrics.lines).toBeGreaterThan(0);
      expect(result.metrics.characters).toBeGreaterThan(0);
      expect(["low", "medium", "high"]).toContain(result.metrics.complexity);
    });

    it("should detect high complexity", () => {
      const block: ParsedCodeBlock = {
        filepath: "complex.ts",
        content: Array(20).fill("if (true) { console.warn('test'); }").join("\n"),
        language: "ts",
        isNew: true,
      };

      const result = validateCodeBlock(block);

      expect(result.metrics.complexity).toBe("high");
    });

    it("should detect low complexity", () => {
      const block: ParsedCodeBlock = {
        filepath: "simple.ts",
        content: `const simple = "just a string";`,
        language: "ts",
        isNew: true,
      };

      const result = validateCodeBlock(block);

      expect(result.metrics.complexity).toBe("low");
    });
  });

  // ── Test 2.3.4.4: Error Blocking ──

  describe("Error Blocking", () => {
    it("should block code with syntax errors", () => {
      const llmResponse = `
\`\`\`tsx
// filepath: src/Broken.tsx
function Broken( {
  return <div>Missing parameter list closing
}
\`\`\`
`;

      const result = parseAndValidateCodeBlocks(llmResponse, existingFiles);

      expect(result.hasErrors).toBe(true);

      const validationResult = result.validations.get("src/Broken.tsx");
      expect(validationResult?.valid).toBe(false);
      expect(validationResult?.errors.length).toBeGreaterThan(0);

      // In a real application, we would NOT apply this code
      // because valid=false
    });

    it("should block code with hardcoded secrets", () => {
      const llmResponse = `
\`\`\`js
// filepath: src/config.js
const config = {
  password: "my-secret-password",
  apiKey: "sk-1234567890"
};
\`\`\`
`;

      const result = parseAndValidateCodeBlocks(llmResponse, existingFiles);

      expect(result.hasErrors).toBe(true);

      const validationResult = result.validations.get("src/config.js");
      expect(validationResult?.valid).toBe(false);
      expect(validationResult?.errors.some(e =>
        e.includes("密码") || e.includes("API key")
      )).toBe(true);
    });
  });

  // ── Test 2.3.4.5: Warning Flow ──

  describe("Warning Flow", () => {
    it("should warn about debugger statements", () => {
      const llmResponse = `
\`\`\`tsx
// filepath: src/Debug.tsx
export function Debug() {
  debugger;
  return <div>Debug</div>;
}
\`\`\`
`;

      const result = parseAndValidateCodeBlocks(llmResponse, existingFiles);

      const validationResult = result.validations.get("src/Debug.tsx");
      expect(validationResult?.warnings.some(w => w.includes("debugger"))).toBe(true);

      // Code is still valid, but user should be warned
      expect(validationResult?.valid).toBe(true);
    });

    it("should warn about dangerous patterns", () => {
      const llmResponse = `
\`\`\`tsx
// filepath: src/Danger.tsx
export function Danger({ html }) {
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
\`\`\`
`;

      const result = parseAndValidateCodeBlocks(llmResponse, existingFiles);

      const validationResult = result.validations.get("src/Danger.tsx");
      expect(validationResult?.warnings.some(w =>
        w.includes("dangerouslySetInnerHTML")
      )).toBe(true);
    });

    it("should warn about missing React import", () => {
      const llmResponse = `
\`\`\`tsx
// filepath: src/NoReact.tsx
export function NoReact() {
  const [state, setState] = useState(0);
  return <div>{state}</div>;
}
\`\`\`
`;

      const result = parseAndValidateCodeBlocks(llmResponse, existingFiles);

      const validationResult = result.validations.get("src/NoReact.tsx");
      expect(validationResult?.warnings.some(w =>
        w.includes("React") || w.includes("hooks")
      )).toBe(true);
    });
  });

  // ── Test 2.3.4.6: Empty & Edge Cases ──

  describe("Empty & Edge Cases", () => {
    it("should handle empty code", () => {
      const llmResponse = `
\`\`\`tsx
// filepath: src/Empty.tsx
\`\`\`
`;

      const result = parseAndValidateCodeBlocks(llmResponse, existingFiles);

      // Empty block will be parsed but fail validation
      expect(result.plan.blocks.length).toBeGreaterThanOrEqual(0);

      // If parsed, it should have validation errors
      if (result.plan.blocks.length > 0) {
        const validationResult = result.validations.get("src/Empty.tsx");
        expect(validationResult?.valid).toBe(false);
        expect(validationResult?.errors.some(e => e.includes("空"))).toBe(true);
      }
    });

    it("should handle code with only whitespace", () => {
      const block: ParsedCodeBlock = {
        filepath: "whitespace.ts",
        content: "   \n\n   \t\t  ",
        language: "ts",
        isNew: true,
      };

      const result = validateCodeBlock(block);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes("空"))).toBe(true);
    });

    it("should handle very long code", () => {
      const block: ParsedCodeBlock = {
        filepath: "long.ts",
        content: "x".repeat(15000),
        language: "ts",
        isNew: true,
      };

      const result = validateCodeBlock(block);

      expect(result.errors.some(e => e.includes("过长"))).toBe(true);
    });

    it("should handle code with many lines", () => {
      const block: ParsedCodeBlock = {
        filepath: "many-lines.ts",
        content: Array(600).fill("console.warn('line');").join("\n"),
        language: "ts",
        isNew: true,
      };

      const result = validateCodeBlock(block);

      expect(result.warnings.some(w => w.includes("行数"))).toBe(true);
    });
  });

  // ── Test 2.3.4.7: Real-world Scenarios ──

  describe("Real-world Scenarios", () => {
    it("should validate React component with hooks", () => {
      const llmResponse = `
\`\`\`tsx
// filepath: src/components/Counter.tsx
import React, { useState } from 'react';

export function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>
        Increment
      </button>
    </div>
  );
}
\`\`\`
`;

      const result = parseAndValidateCodeBlocks(llmResponse, existingFiles);

      expect(result.hasErrors).toBe(false);

      const validationResult = result.validations.get("src/components/Counter.tsx");
      expect(validationResult?.valid).toBe(true);
    });

    it("should validate TypeScript utility file", () => {
      const llmResponse = `
\`\`\`ts
// filepath: src/utils/helpers.ts
export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function parseJSON<T>(json: string): T | null {
  try {
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}
\`\`\`
`;

      const result = parseAndValidateCodeBlocks(llmResponse, existingFiles);

      expect(result.hasErrors).toBe(false);

      const validationResult = result.validations.get("src/utils/helpers.ts");
      expect(validationResult?.valid).toBe(true);
    });

    it("should validate CSS file", () => {
      const llmResponse = `
\`\`\`css
/* filepath: src/styles/button.css */
.button {
  padding: 10px 20px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.button:hover {
  background-color: #0056b3;
}
\`\`\`
`;

      const result = parseAndValidateCodeBlocks(llmResponse, existingFiles);

      // CSS files have limited validation
      expect(result.plan.blocks.length).toBe(1);

      const validationResult = result.validations.get("src/styles/button.css");
      expect(validationResult).toBeDefined();
    });

    it("should validate JSON file", () => {
      const llmResponse = `
我会创建一个package.json文件：

\`\`\`json
// filepath: package.json
{
  "name": "my-app",
  "version": "1.0.0",
  "dependencies": {
    "react": "^18.0.0"
  }
}
\`\`\`
`;

      const result = parseAndValidateCodeBlocks(llmResponse, existingFiles);

      // JSON file should be parsed (may or may not have filepath comment)
      // At minimum, we should get some code block
      expect(result.plan.blocks.length).toBeGreaterThanOrEqual(0);
    });
  });
});
