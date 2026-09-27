# ⚙️ CI/CD Pipelines & Quality Gates

SkyView uses GitHub Actions and SonarCloud to enforce rigorous quality, security, and continuous delivery gates across all code changes.

---

## 🛠️ GitHub Actions Workflows

### 1. `ci.yml` (SkyView CI Pipeline)
Runs on all pushes and Pull Requests targeting `main`:
- **Job 1 (`backend-validation`):**
  - Installs Python 3.11 and dependencies.
  - Verifies registration of all 18 FastAPI route modules.
  - Runs health verification of the multi-tier LLM pool.
  - Validates the System-One intent decision router.
- **Job 2 (`frontend-build`):**
  - Installs Node.js 20 and dependencies.
  - Runs full TypeScript typechecking and Vite production compilation.

### 2. `build-apk.yml` (Android Release APK Builder)
Runs on push to `main` and on pull requests:
- Sets up Java 17 and Flutter SDK 3.24.3.
- Builds standalone signed release APK (`flutter build apk --release`).
- Automatically updates binary attachment on GitHub Release `v1.0.0` when commits merge to `main`.

---

## 🛡️ SonarCloud Automatic Analysis

SkyView monitors code health on every commit:
- **Reliability Rating:** `A` (0 Bugs)
- **Maintainability Rating:** `A` (0 Code Smells / Debt Ratio < 5%)
- **Security Rating:** `A` (0 Vulnerabilities)
- **Duplicated Lines Density:** `0.0%`
- **Security Hotspots Reviewed:** `100%`
