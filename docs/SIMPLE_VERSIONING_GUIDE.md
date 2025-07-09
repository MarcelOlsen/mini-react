# 🎯 Simple Versioning Guide - How It Actually Works

## 🤔 "I'm Confused - What Triggers What?"

You currently have **2 different automation systems** set up. Let me explain what happens when you push code:

---

## 🚦 **Current Situation**

You have these GitHub Action files:

- `.github/workflows/publish.yml` ← **Manual Versioning** (ACTIVE)
- `.github/workflows/semantic-release.yml` ← **Semantic Release** (INACTIVE)
- `.github/workflows/ci.yml` ← **Testing only**

**⚠️ Problem**: Both publish workflows will try to run! Let's fix this.

---

## 🎯 **RECOMMENDED: Use Manual Versioning (Simpler)**

### **What Triggers Publishing:**

```bash
# ANY push to master branch triggers the workflow
git push origin master
```

### **What Happens Step by Step:**

```
YOU DO:                    GITHUB ACTIONS DOES:
┌─────────────────────┐   ┌──────────────────────────────────┐
│ 1. Make changes     │   │                                  │
│ 2. git commit       │──▶│ 3. Reads your commit message     │
│ 3. git push master  │   │ 4. Decides version bump type     │
│                     │   │ 5. Runs tests (must pass)       │
│                     │   │ 6. Builds package               │
│                     │   │ 7. Bumps version in package.json│
│                     │   │ 8. Creates git tag              │
│                     │   │ 9. Publishes to NPM             │
│                     │   │ 10. Creates GitHub release      │
└─────────────────────┘   └──────────────────────────────────┘
```

### **How Version Bumping Works:**

Your commit message determines the version bump:

```bash
# Current version: 0.0.1

# PATCH bump (0.0.1 → 0.0.2)
git commit -m "🐛 fix: button not working"
git commit -m "♻️ refactor: clean up code"
git commit -m "⚡ perf: faster rendering"

# MINOR bump (0.0.1 → 0.1.0)
git commit -m "✨ feat: add new useCallback hook"

# MAJOR bump (0.0.1 → 1.0.0)
git commit -m "💥 feat!: complete API redesign"
git commit -m "✨ feat: breaking change

BREAKING CHANGE: This removes old API"
```

---

## 🔧 **Let's Clean This Up**

### **Step 1: Choose One System (Manual Versioning)**

```bash
# Remove the semantic-release workflow to avoid conflicts
rm .github/workflows/semantic-release.yml
rm .releaserc.json
```

### **Step 2: Test Your First Automated Release**

```bash
# 1. Make a small change
echo "console.log('test');" >> test-file.js

# 2. Commit with proper message
git add .
git commit -m "✨ feat: test automated publishing"

# 3. Push to master (this triggers everything!)
git push origin master
```

### **Step 3: Watch It Work**

Go to your GitHub repo → Actions tab → You'll see the workflow running:

- 🧪 Tests run
- 🏗️ Build happens
- 📈 Version bumps to 0.1.0
- 📦 Publishes to NPM
- 🎉 Creates GitHub release

---

## 🎮 **Quick Examples**

### **Scenario 1: Bug Fix**

```bash
# You fix a bug
git commit -m "🐛 fix: useState hook memory leak"
git push origin master

# Result: 0.0.1 → 0.0.2 (patch bump)
```

### **Scenario 2: New Feature**

```bash
# You add a feature
git commit -m "✨ feat: add useEffect hook"
git push origin master

# Result: 0.0.2 → 0.1.0 (minor bump)
```

### **Scenario 3: Breaking Change**

```bash
# You change the API
git commit -m "💥 feat!: redesign createElement API"
git push origin master

# Result: 0.1.0 → 1.0.0 (major bump)
```

---

## 🛑 **What If I Don't Want to Publish?**

### **Option 1: Push to Different Branch**

```bash
# This won't trigger publishing
git push origin feature-branch
git push origin develop
```

### **Option 2: Skip CI**

```bash
# This skips all automation
git commit -m "📝 docs: update readme [skip ci]"
git push origin master
```

### **Option 3: Work on Feature Branch, Then Merge**

```bash
# Recommended workflow:
git checkout -b my-feature
# ... make changes ...
git commit -m "✨ feat: amazing new feature"
git push origin my-feature
# ... create PR, review, then merge to master
```

---

## 📊 **What Gets Published**

When automation runs, users will be able to:

```bash
# Install your package
npm install mini-react@0.1.0

# Use it in their project
import { render, useState } from 'mini-react';
```

---

## 🔍 **How to Check If It Worked**

### **1. Check NPM:**

```bash
npm info mini-react
# Shows: latest version, publish date, etc.
```

### **2. Check GitHub:**

- Go to your repo → Releases tab
- Should see new release with your version

### **3. Check GitHub Actions:**

- Go to your repo → Actions tab
- Should see green checkmark for successful workflow

---

## 🚨 **Common Questions**

**Q: "What if my tests fail?"**
A: Publishing stops immediately. Fix tests, commit, push again.

**Q: "What if the NPM package name is taken?"**  
A: Change the `name` in `package.json` to something unique like `@yourusername/mini-react`

**Q: "Can I publish manually sometimes?"**
A: Yes! Run `npm publish` locally anytime. Automation is just a convenience.

**Q: "What if I want to skip a version?"**
A: Use `[skip ci]` in commit message, or push to a different branch.

---

## 🎯 **TL;DR - Super Simple**

1. **Make changes**
2. **Commit with proper message** (`feat:`, `fix:`, etc.)
3. **Push to master**
4. **GitHub automatically publishes to NPM**

That's it! The commit message prefix determines how the version number changes.

Ready to try it? Let's clean up the conflicting files and test your first automated release!
