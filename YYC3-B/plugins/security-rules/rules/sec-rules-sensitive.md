---
description: Sensitive Information Protection Rules for AI Code Generation
globs: **/*
alwaysApply: true
enabled: true
---

# Sensitive Information Protection

## Core Principle
**Secrets must be loaded from secure sources at runtime, NEVER hardcoded.**

---

## 1. What Are Secrets?
- Passwords, passphrases, API keys, tokens
- Private keys, certificates, signing keys
- Database credentials, connection strings
- OAuth secrets, access keys

---

## 2. Prohibited Patterns

### ❌ NEVER Generate
```
password = "admin123"
apiKey = "sk-1234567890abcdef"
dbUrl = "mysql://root:password@localhost/db"
token = "eyJhbGci..."  // Even if looks like placeholder

// In config files
spring.datasource.password=MyPassword
API_KEY=1234567890
```

**Why**: Leaks into version control, logs, screenshots, documentation.

---

## 3. Safe Implementation Principles

### ✅ Source 1: Environment Variables
```
// Any language
secret = getenv("SECRET_NAME")
if (!secret) throw Error("SECRET_NAME not set")
```

### ✅ Source 2: Configuration Placeholders
```
# Config file
database.password=${DB_PASSWORD}
api.key=${API_KEY}
```

### ✅ Source 3: Secret Managers
```
// AWS/Azure/GCP/Vault
secret = secretManager.getSecret("prod/api/key")
```

---

## 4. Logging & Error Rules

### ❌ NEVER Log Secrets
```
log("Password: " + password)  // BAD
log("Token: " + token)        // BAD
```

### ✅ Safe Logging
```
log("Password present: " + (password != null))
log("Using credentials from environment")
log("API Key: " + apiKey.substring(0,4) + "****")
```

**Rule**: Log metadata only (exists/missing/length), never the value.

---

## 5. Configuration Standards

### ✅ Correct Format
```
server.port=8080              # Integer, no colons
jwt.secret=${JWT_SECRET}      # Placeholder, not hardcoded
```

### ❌ Common Mistakes
```
server.port=808:0             # Invalid format
jwt.secret=my-secret-key-123  # Hardcoded
```

---

## 6. Placeholder Standards

### ✅ Acceptable
```
"YOUR_API_KEY_HERE"
"CHANGE_ME"
"${SECRET}"
```

### ❌ Unacceptable
```
"admin123"      // Looks real
"test-token"    // Might be used as-is
"1234567890"    // Too realistic
```

**Rule**: Placeholders must be OBVIOUSLY non-functional.

---

## 7. AI Code Generation Rules

### When User Requests Authentication/Database/API Code
1. **Default**: Load from environment variables
2. **Always**: Add null/empty check with clear error
3. **Never**: Generate working-looking credentials
4. **Config files**: Use `${VARIABLE}` syntax only

### Template Structure
```
// Step 1: Load from secure source
secret = getenv("SECRET_NAME");

// Step 2: Validate presence
if (!secret) {
    throw Error(
        "SECRET_NAME not set. " +
        "Set via: export SECRET_NAME=your-secret"
    );
}

// Step 3: Use securely (never log)
authenticate(secret);
```

---

## 8. Language-Agnostic Guidelines

### Secret Loading
- **Environment variables** as default
- **Secret managers** for production
- **Never** commit secrets to version control

### Validation
- **Fail explicitly** if secret missing
- **Clear error messages** without exposing context
- **No default/fallback** weak credentials

### Logging
- **Presence/absence** only
- **Never** the actual value
- **Masked format** if displaying (first 4 chars + ****)

---

## 9. Testing Your Generated Code

**It MUST pass this check:**
```bash
grep -r "password.*=" src/  # Should find 0 hardcoded passwords
grep -r "apiKey.*=" src/    # Should find 0 hardcoded keys
```

**Ask yourself:**
- Can this be safely committed to public GitHub?
- Are credentials visible in plaintext?
- Does it work without environment setup?

If credentials are visible → Implementation is WRONG.

---

## Bottom Line
**Secrets only appear as references, never as literal values.**
