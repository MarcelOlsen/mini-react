# 🚀 NPM Publishing Automation Setup

This guide covers setting up automated NPM publishing with your GitHub repository using two different approaches.

## 📋 Quick Overview

| Approach              | Complexity | Features                                    | Best For                 |
| --------------------- | ---------- | ------------------------------------------- | ------------------------ |
| **Manual Versioning** | Simple     | Basic versioning, GitHub releases           | Small projects, learning |
| **Semantic Release**  | Advanced   | Auto-versioning, changelogs, smart releases | Production projects      |

---

## 🛠️ Prerequisites

### 1. NPM Account & Token

```bash
# 1. Create NPM account at https://www.npmjs.com
# 2. Generate access token
npm login
npm token create --access public
```

### 2. GitHub Repository Secrets

Go to your GitHub repo → Settings → Secrets and variables → Actions

Add these secrets:

- `NPM_TOKEN`: Your NPM access token (required)
- `GITHUB_TOKEN`: Auto-generated (already available)

---

## 🎯 Approach 1: Manual Versioning (Recommended for Beginners)

**File**: `.github/workflows/publish.yml`

### ✅ What it does:

- Automatically determines version bump from commit messages
- Runs tests and quality checks before publishing
- Creates GitHub releases with changelogs
- Uses conventional commit parsing for versioning

### 📝 Commit Message Rules:

```bash
# Patch version (0.0.1 → 0.0.2)
git commit -m "🐛 fix: resolve useState hook bug"
git commit -m "🎨 refactor: improve code organization"

# Minor version (0.0.1 → 0.1.0)
git commit -m "✨ feat: add useReducer hook"

# Major version (0.0.1 → 1.0.0)
git commit -m "💥 feat!: breaking API changes"
git commit -m "✨ feat: new feature

BREAKING CHANGE: This changes the API"
```

### 🚀 How to use:

1. Push commits to `master` branch
2. GitHub Actions automatically:
   - Runs tests
   - Determines version bump
   - Updates `package.json`
   - Creates git tag
   - Publishes to NPM
   - Creates GitHub release

---

## 🔄 Approach 2: Semantic Release (Advanced)

**Files**:

- `.github/workflows/semantic-release.yml`
- `.releaserc.json`

### ✅ What it does:

- Fully automated versioning based on commit history
- Generates detailed changelogs automatically
- Skips releases when no relevant changes
- More sophisticated release management

### 📝 Required Commit Format:

```bash
# Must follow conventional commits exactly
git commit -m "feat: add new hook system"
git commit -m "fix: resolve memory leak in reconciler"
git commit -m "docs: update API documentation"
git commit -m "test: add integration tests"

# Breaking changes
git commit -m "feat!: redesign public API"
```

### 🚀 Setup steps:

1. Install semantic-release dependencies:
   ```bash
   bun install
   ```
2. Delete `.github/workflows/publish.yml` (conflicts with semantic-release)
3. Push to `master` with conventional commits
4. Semantic release handles everything automatically

---

## 🔧 Configuration Options

### Manual Versioning Customization

Edit `.github/workflows/publish.yml`:

```yaml
# Change version bump logic
if echo "$COMMIT_MSG" | grep -q "^feat"; then
  echo "bump=minor" >> $GITHUB_OUTPUT
elif echo "$COMMIT_MSG" | grep -q "^fix"; then
  echo "bump=patch" >> $GITHUB_OUTPUT
# Add your custom rules here
fi
```

### Semantic Release Customization

Edit `.releaserc.json`:

```json
{
  "branches": ["master", "main"],
  "plugins": [
    // Add or modify plugins
    "@semantic-release/changelog",
    "@semantic-release/npm"
  ]
}
```

---

## 📊 Workflow Comparison

### Manual Versioning Flow:

```
Push to master → Run tests → Parse commit → Bump version →
Tag release → Publish NPM → Create GitHub release
```

### Semantic Release Flow:

```
Push to master → Run tests → Analyze commits →
Generate changelog → Determine version → Publish everything
```

---

## 🛡️ Safety Features

Both approaches include:

- ✅ **Test gates**: Won't publish if tests fail
- ✅ **Quality checks**: Linting and formatting validation
- ✅ **Build verification**: Ensures package builds correctly
- ✅ **Rollback protection**: Git tags for easy rollbacks
- ✅ **Security**: Token-based authentication

---

## 🔍 Troubleshooting

### Common Issues:

**NPM publish fails:**

```bash
# Check NPM token
npm whoami
# Verify package name isn't taken
npm info your-package-name
```

**GitHub Actions fail:**

- Verify `NPM_TOKEN` secret is set correctly
- Check if package name conflicts exist
- Ensure tests pass locally first

**Version conflicts:**

```bash
# Reset version manually
npm version patch --no-git-tag-version
git add package.json
git commit -m "🔖 chore: reset version"
```

---

## 🎉 Testing Your Setup

### 1. Test Locally First:

```bash
npm run test
npm run check
npm run build
npm pack  # Creates .tgz file to test
```

### 2. Test with Dry Run:

For semantic-release:

```bash
npx semantic-release --dry-run
```

### 3. First Release:

```bash
# Manual approach
git commit -m "✨ feat: initial release"
git push origin master

# Semantic approach
git commit -m "feat: initial release"
git push origin master
```

---

## 📈 Best Practices

### Commit Messages:

- Use conventional commits consistently
- Be descriptive but concise
- Use appropriate emoji for manual versioning

### Release Strategy:

- Start with manual versioning for learning
- Upgrade to semantic-release for production
- Always test in a separate repo first

### Security:

- Regularly rotate NPM tokens
- Use organization-scoped packages when possible
- Enable 2FA on NPM account

---

## 🔗 Useful Links

- [Conventional Commits](https://conventionalcommits.org/)
- [Semantic Release](https://semantic-release.gitbook.io/)
- [NPM Publishing Guide](https://docs.npmjs.com/packages-and-modules/contributing-packages-to-the-registry)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)

Choose the approach that fits your project's complexity and team experience level!
