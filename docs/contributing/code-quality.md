# 🎯 Code Quality, SonarQube Standards & Security Rules

SkyView maintains strict quality standards to ensure code reliability, maintainability, and zero security vulnerabilities.

---

## 🏆 SonarCloud Quality Gate Requirements

All new code committed to SkyView must meet or exceed the following SonarCloud criteria:

| Quality Gate Metric | Required Standard | Current Project Status |
| :--- | :--- | :--- |
| **New Reliability Rating** | **A** (0 Bugs) | ✅ Passed (Rating A) |
| **New Security Rating** | **A** (0 Vulnerabilities) | ✅ Passed (Rating A) |
| **New Maintainability Rating** | **A** (Debt ratio < 5%) | ✅ Passed (Rating A) |
| **Duplicated Lines Density** | **< 3.0%** | ✅ Passed (0.0%) |
| **Security Hotspots Reviewed** | **100%** | ✅ Passed (100.0%) |

---

## 🛡️ Critical Security Rules & Remediation

### 1. TypeScript `S2245`: Insecure Pseudorandom Generators
- **Issue:** Using `Math.random()` for tokens, keys, IDs, or security-sensitive numbers.
- **Rule:** Never use `Math.random()`.
- **Solution:** Always use `getSecureRandom()`, `getSecureRandomInt()`, or `getSecureId()` from `@/lib/secureRandom`, which leverages `window.crypto.getRandomValues()`.

```typescript
// ❌ WRONG (Triggers SonarCloud S2245)
const orderId = "ORD-" + Math.floor(Math.random() * 900000);

// ✅ CORRECT (SonarCloud Compliant)
import { getSecureRandomInt } from "@/lib/secureRandom";
const orderId = "ORD-" + getSecureRandomInt(100000, 999999);
```

### 2. Python `S5145`: Log Injection / Log Forging
- **Issue:** Passing unvalidated or untrusted user input containing potential newline (`\r`, `\n`) characters directly to a logger.
- **Solution:** Sanitize all parameters before logging using `_sanitize_for_log()`.

```python
# ❌ WRONG (Triggers SonarCloud S5145)
logger.info("User registered with phone: %s", req.phone)

# ✅ CORRECT (SonarCloud Compliant)
safe_phone = _sanitize_for_log(req.phone)
logger.info("User registered with phone: %s", safe_phone)
```

### 3. TypeScript `S8475`: Browser Storage Poisoning
- **Issue:** Writing unsanitized, untyped user input directly into `localStorage`.
- **Solution:** Strip dangerous characters and limit input lengths before setting keys:

```typescript
// ✅ CORRECT (SonarCloud Compliant)
const sanitizeStorage = (val: string) => val.replace(/[^a-zA-Z0-9\s,.-]/g, '').trim().slice(0, 100);
localStorage.setItem('user_name', sanitizeStorage(name));
```
