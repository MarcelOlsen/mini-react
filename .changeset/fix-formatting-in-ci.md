---
"@marcelolsen/mini-react": patch
---

Fix formatting issues in changeset version bump PRs

- Add automatic formatting step after changeset version bumps in CI
- Ensure all files modified by changesets pass Biome formatting checks
- Prevent CI failures due to formatting issues in release PRs