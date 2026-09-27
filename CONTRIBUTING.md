# 🌾 Contributing to SkyView AG-RIN

We are thrilled that you want to contribute to **SkyView AG-RIN**!

For comprehensive, in-depth guidelines, please refer to our complete documentation suite in [`docs/contributing/`](file:///c:/Users/Lenovo/Desktop/google/brics-agrin-platform/docs/contributing/guide.md):

* 📖 **General Contributing Guide**: [`docs/contributing/guide.md`](file:///c:/Users/Lenovo/Desktop/google/brics-agrin-platform/docs/contributing/guide.md)
* 🌿 **Git Branching & Conventional Commits**: [`docs/contributing/git-workflow.md`](file:///c:/Users/Lenovo/Desktop/google/brics-agrin-platform/docs/contributing/git-workflow.md)
* 📬 **Pull Request Lifecycle & Checklist**: [`docs/contributing/pull-requests.md`](file:///c:/Users/Lenovo/Desktop/google/brics-agrin-platform/docs/contributing/pull-requests.md)
* 🛡️ **Branch Protection Rules Setup**: [`docs/contributing/branch-protection.md`](file:///c:/Users/Lenovo/Desktop/google/brics-agrin-platform/docs/contributing/branch-protection.md)
* 🎯 **Code Quality & SonarQube Standards**: [`docs/contributing/code-quality.md`](file:///c:/Users/Lenovo/Desktop/google/brics-agrin-platform/docs/contributing/code-quality.md)

---

## ⚡ Quick Start for Developers

1. **Clone & Create a Branch**:
   ```bash
   git checkout -b feat/your-feature-name
   ```
2. **Validate Backend**:
   ```bash
   python -c "from skyview.main import app; print('Registered:', len(app.routes))"
   ```
3. **Build Frontend**:
   ```bash
   cd frontend
   npm run build
   ```
4. **Push & Open a Pull Request**:
   Follow our Conventional Commit guidelines (e.g., `feat(ui): add new telemetry chart`).
