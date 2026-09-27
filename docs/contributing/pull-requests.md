# 📬 Pull Request Lifecycle & Verification

All code changes enter the `main` branch through Pull Requests (PRs).

---

## 📋 Pull Request Submission Checklist

Before submitting a Pull Request, verify the following steps locally:

1. **Backend Validation:**
   ```bash
   python -c "from skyview.main import app; print('Registered:', len(app.routes))"
   ```
2. **Frontend Typecheck & Build:**
   ```bash
   cd frontend
   npm run build
   ```
3. **No Unused or Scratch Files:**
   Ensure no temporary scripts, log dumps, or dead code are left in your branch.
4. **Push Branch & Open PR:**
   ```bash
   git push origin feat/your-feature-name
   ```
   Open PR against `main` using GitHub web UI or the GitHub CLI:
   ```bash
   gh pr create --title "feat(scope): concise summary" --body "Detailed rationale..."
   ```

---

## 🔍 Automated Verification Gates

When a PR is opened, GitHub Actions automatically executes:
- **FastAPI Backend & Multi-Tier AI Mesh Check:** Verifies route registration, decision router, and LLM pool.
- **React 18 + Vite Production Build Check:** Ensures zero TypeScript errors and successful asset bundling.
- **Build Flutter APK:** Compiles the Android binary to verify mobile compatibility.
- **SonarCloud Quality Gate:** Runs automated static analysis ensuring Rating A across Reliability, Maintainability, and Security.

Once all check runs turn green and a peer review is completed, the PR can be merged via **Squash and Merge**.
