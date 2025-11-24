#!/bin/bash
# Setup git hooks for the repository

HOOKS_DIR=".git/hooks"
HOOK_FILE="$HOOKS_DIR/pre-commit"

echo "📦 Setting up git hooks..."

# Create pre-commit hook
cat > "$HOOK_FILE" << 'EOF'
#!/bin/sh
# Pre-commit hook that formats code with Biome

# Get list of staged files (only .ts, .tsx, .js, .jsx, .json files)
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(ts|tsx|js|jsx|json)$')

if [ -z "$STAGED_FILES" ]; then
  echo "No staged files to format"
  exit 0
fi

echo "🎨 Formatting staged files with Biome..."

# Format the staged files
echo "$STAGED_FILES" | xargs bun biome format --write

# Add the formatted files back to staging
echo "$STAGED_FILES" | xargs git add

echo "✅ Formatting complete"
exit 0
EOF

# Make it executable
chmod +x "$HOOK_FILE"

echo "✅ Pre-commit hook installed successfully!"
echo ""
echo "The hook will automatically format your code with Biome before each commit."
echo "To bypass the hook (not recommended), use: git commit --no-verify"
