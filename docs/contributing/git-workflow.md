# 🌿 Git Workflow, Branch Naming & Commits

To maintain repository hygiene and avoid merge conflicts, SkyView follows a structured Git workflow based on **GitHub Flow** and **Conventional Commits**.

---

## 🏷️ Branch Naming Conventions

Never commit directly to `main`. Always create a descriptive branch prefixed with the change type:

| Prefix | Usage | Example |
| :--- | :--- | :--- |
| `feat/` | New features or functional additions | `feat/fast2sms-key-pool` |
| `fix/` | Bug fixes and defect repairs | `fix/sonarqube-s2245-random` |
| `perf/` | Performance optimizations | `perf/barter-graph-cache` |
| `docs/` | Documentation additions or edits | `docs/api-routes-reference` |
| `refactor/` | Code refactoring without behavioral change | `refactor/riverpod-providers` |
| `ci/` | GitHub Actions and CI/CD workflow updates | `ci/automate-apk-releases` |
| `hw/` | Hardware schematics, firmware or Vivado HLS | `hw/esp32-sleep-tuning` |

### Creating a New Branch
```bash
# Fetch latest main
git checkout main
git pull origin main

# Create and switch to new branch
git checkout -b feat/your-feature-name
```

---

## 📝 Commit Message Format (Conventional Commits)

Commit messages must follow the standard format:
```
<type>(<scope>): <short description in present tense>

[optional body providing rationale]

[optional footer e.g. Closes #123]
```

### Examples:
- `feat(auth): add multi-key failover pool for Fast2SMS OTP`
- `fix(security): resolve SonarCloud S2245 by using secure crypto generator`
- `docs(hardware): document AgriSense WS01 ESP32 pinouts and BOM`
- `ci(mobile): publish signed release APK directly to GitHub Releases`
