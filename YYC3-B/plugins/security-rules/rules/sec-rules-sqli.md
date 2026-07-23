---
description: SQL Injection Protection Rules for AI Code Generation
globs: **/*
alwaysApply: true
enabled: true
---

# High-Priority Secure Coding Standards
This specification contains **mandatory** critical security rules covering the most common and severe security vulnerabilities. Violating these rules may lead to serious security incidents.

---

## Rule 1: SQL Injection Prevention (CRITICAL)

### Core Principle

**Use parameterized queries 100% of the time. Never concatenate user input into SQL statements.**

### Correct Approach: Parameterized Queries

#### Java (JDBC PreparedStatement)
```java
// Correct: Use PreparedStatement
String customerName = request.getParameter("customerName");
String query = "SELECT account_balance FROM user_data WHERE user_name = ?";
PreparedStatement pstmt = connection.prepareStatement(query);
pstmt.setString(1, customerName);  // Parameter binding
ResultSet results = pstmt.executeQuery();
```

#### Go (database/sql)
```go
// Correct: Use placeholders
customerName := r.URL.Query().Get("customerName")
row := db.QueryRow(
    "SELECT account_balance FROM user_data WHERE user_name = ?",
    customerName,  // Parameter binding
)
```

### Wrong Approach: String Concatenation

```java
// Dangerous: String concatenation
String customerName = request.getParameter("customerName");
String query = "SELECT * FROM users WHERE name = '" + customerName + "'";
Statement stmt = connection.createStatement();
ResultSet rs = stmt.executeQuery(query);
// Attacker input: ' OR '1'='1' -- 
// Results in: SELECT * FROM users WHERE name = '' OR '1'='1' --'
```

```python
# Dangerous: String formatting
customer_name = request.GET.get('customerName')
query = f"SELECT * FROM users WHERE name = '{customer_name}'"
cursor.execute(query)
# Attacker input: '; DROP TABLE users; --
```

### Handling Dynamic Table/Column/Group BY/Order BY Names

**TRIGGER**: Parameters named `orderBy`/`sortBy`/`sortDirection`/`groupBy`/`groupByField` OR comments mention "动态SQL"/"order by"/"group by" → **MUST validate with whitelist BEFORE calling mapper/executing SQL**.

```java
// Correct: Whitelist validation
private static final Set<String> ALLOWED_COLUMNS = Set.of("id", "username", "email", "create_time");
private static final Set<String> ALLOWED_DIRECTIONS = Set.of("ASC", "DESC");

public List<User> getUsersByOrder(String orderBy, String sortDirection) {
    if (orderBy == null || !ALLOWED_COLUMNS.contains(orderBy)) {
        throw new IllegalArgumentException("Invalid column: " + orderBy);
    }
    if (sortDirection == null || !ALLOWED_DIRECTIONS.contains(sortDirection.toUpperCase())) {
        throw new IllegalArgumentException("Invalid direction: " + sortDirection);
    }
    return mapper.getUsersByOrder(orderBy, sortDirection.toUpperCase());
}
```

### ORM Framework Considerations

ORMs cannot completely prevent SQL injection, especially when using native SQL or dynamic queries:

```java
// Dangerous: JPA native query concatenation
String username = request.getParameter("username");
Query query = entityManager.createNativeQuery(
    "SELECT * FROM users WHERE username = '" + username + "'"
);

// Correct: JPA parameter binding
String username = request.getParameter("username");
Query query = entityManager.createNativeQuery(
    "SELECT * FROM users WHERE username = :username"
);
query.setParameter("username", username);
```
---

**Remember**: These rules are the minimum security baseline, not optional. Violating any of them may lead to serious security incidents. In code reviews, violations of these rules should be treated as blocking issues. 🛡️
