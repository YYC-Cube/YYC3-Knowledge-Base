---
description: Command/Code Injection Protection Rules for AI Code Generation
globs: **/*
alwaysApply: true
enabled: true
---

# AI Prompt Rules — Command / Code Execution Security

> **Scope**: All programming languages, script engines, expression frameworks, Agent scenarios  
> **Objective**: Prevent command execution and dynamic code execution risks (OS Commands + Runtime + SpEL + Groovy)

## 1. Unified Security Principles

1. **User input must only serve as data**, never parsed or executed as code, commands, or expressions
2. **All execution capabilities are restricted by default**, allowed only within explicit boundaries
3. **Script structure must be fixed**, not varying with user input
4. **When uncertain about safety, default to rejection**

## 2. OS Command Execution Defense (InjectionCommand)

Prohibit:
- Concatenating and executing system commands or scripts
- User input controlling command names, parameter structure, or execution paths
- Indirect execution of user input via shell / interpreter

Allow (must satisfy all conditions):
- Actions from predefined whitelist
- User input only as parameter values, validated by whitelist
- Use parameterized arrays (no shell)

**Critical: Filename/Path Injection Prevention**
- Reject filenames containing: `` ` `` (backtick), `$`, `;`, `|`, `&`, `<`, `>`, `\`, newline
- Reason: Even in quotes, shell interprets `` `cmd` `` and `$(cmd)` as command substitution
- C/C++: Use `fork()+execve()` instead of `system()`/`popen()`
- Other languages: Use non-shell APIs (Python `subprocess` with `shell=False`, Java `ProcessBuilder`, etc.)

## 3. Runtime Execution Constraints (InjectionCommandRuntime)

Allowed prerequisites:
1. Executable actions are fixed and enumerable
2. Parameter count, position, and semantics are fixed
3. No use of shell or interpreter
4. User input does not affect execution flow or execution target

Reject generating execution code if any condition is not met.

## 4. Expression Injection Defense (InjectionSpringSpEL)

- User input must not be parsed as expressions
- Prohibit reflection, class loading, system object access
- Only allow: conditional judgment, basic operations, read-only variable access

## 5. Groovy Script Injection Defense (InjectionGroovy)

> **Risk**: User input executed as script directly, leading to arbitrary code execution  
> **Objective**: Allow Groovy capabilities while preventing injection via sandbox and input isolation

### 5.1 Allowed Implementation Approaches (Choose One)

**Option A: Sandbox + Binding (Recommended)** - Use GroovyShell + SecureASTCustomizer; Inject user input via Binding; Disable System/Runtime/ProcessBuilder/execute/metaClass

**Option B: Precompiled Scripts** - Precompile scripts to Script objects; User input only as parameter binding; Script structure fixed and immutable

**Option C: Safe Expression Engine** - Use MVEL/JEXL instead of Groovy; Strictly limit expression capabilities

### 5.2 Minimum Security Requirements for Executing User Scripts (Must Satisfy All)

1. SecureASTCustomizer config: Disallow imports System/Runtime/ProcessBuilder/File/Socket; Disable closures/metaClass/reflection
2. Timeout control + Input validation: Reject scripts containing `.execute()`, `getClass()`, `forName()`
3. Length/complexity limits: < 1000 chars, nesting < 5 levels

### 5.3 Strictly Prohibited
Using GroovyShell without sandbox; Allowing System/Runtime access; Allowing .execute()/metaClass/reflection

### 5.4 Pass Criteria
Malicious scripts blocked by sandbox (SecurityException); Scripts with execute() rejected by pre-check; Cannot access system resources

## 6. Agent Rules · 7. Model Output Constraints · 8. Bottom Line

**Agent Rules**: Must not generate and execute scripts/commands directly from natural language; only call predefined capabilities; high-risk execution requires manual confirmation

**Model Constraints**: Do not generate executable command examples, dynamic Groovy execution code, Sandbox bypass methods; prioritize restricted implementations, security designs, pseudocode

**Bottom Line**: Groovy is a controlled capability, not an execution entry point; user input can never determine "what to execute"; script structure must be fixed, execution boundaries must be locked down
