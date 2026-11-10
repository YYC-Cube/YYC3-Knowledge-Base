---
description: Path Traversal Protection Rules for AI Code Generation
globs: **/*
alwaysApply: true
enabled: true
---

## Path Traversal Prevention Rules

### Core Principle
**External input must not directly control file system paths. All paths must undergo canonicalization and boundary validation.**

---

## 1. Prohibited Patterns

1. String concatenation to construct paths (e.g., `dir + "/" + input`)
2. Filtering/replacing special characters (e.g., `replace("..", "")`)
3. Directly parsing external input as paths
4. Performing boundary checks before canonicalization

---

## 2. Mandatory Process (In Order)

1. **Canonicalize Base Directory** - Convert to absolute path and resolve symbolic links
2. **Path API Concatenation** - Use language-provided path joining methods
3. **Canonicalize Result** - Eliminate `..` and `.`
4. **Boundary Validation** - Confirm within base directory using prefix matching
5. **Fail Fast** - Reject immediately upon validation failure

---

## 3. Scenario Differences

### File Read (Existing Files)
- Base directory → Join → Canonicalize → **Check existence** → **Resolve symlinks** → Validate boundary
- Reason: Symbolic links may point outside, must confirm existence before resolving

### File Write/Create (May Not Exist)
- Base directory → Join → Canonicalize → Validate boundary
- Reason: File not yet created, resolving symlinks will fail

### Archive Extraction (Zip Slip)
- Base directory → For each entry: Join → Canonicalize → Validate boundary
- Reason: Malicious entry names (`../../etc/passwd`) must be individually validated

---

## 4. Key Constraints

- ✅ Join first, then canonicalize; do not validate before canonicalization
- ✅ Base directory must be converted to absolute path and symlinks resolved
- ✅ Reading existing files: Check existence → Resolve symlinks → Validate
- ❌ Writing/Extracting: Do not resolve symlinks on target path
- ✅ Use path prefix matching for validation, not string contains checks

---

## 5. Common Mistakes

| Mistake | Consequence | Correct Approach |
|---------|-------------|------------------|
| Validate before canonicalize | `../../` bypass | Canonicalize then validate |
| Not resolving symlinks when reading | Symlink bypass | Check existence → Resolve → Validate |
| Resolving symlinks on non-existent paths | Operation fails | Only resolve when exists |
| String concatenation | Separator errors | Use path API |

---

## Checklist

- [ ] Base directory converted to absolute path and symlinks resolved
- [ ] Use path API for joining, not string concatenation
- [ ] Canonicalize result path after joining
- [ ] Use prefix matching for boundary validation
- [ ] Read: Check existence before resolving symlinks
- [ ] Write/Extract: Do not resolve symlinks
- [ ] Reject immediately on failure
