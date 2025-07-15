# 📦 Changesets Integration

This project uses [Changesets](https://github.com/changesets/changesets) for automated version management and publishing.

## 🚀 How it works

Changesets automatically:
- Manages semantic versioning based on changeset files
- Generates changelogs
- Creates release PRs
- Publishes to NPM when PRs are merged

## 📝 Creating a changeset

When you make changes that should trigger a release:

```bash
# Interactive mode (recommended)
bun run changeset

# Or use the CLI directly
bunx changeset
```

Choose the appropriate version bump:
- **patch**: Bug fixes, small improvements
- **minor**: New features, backwards compatible
- **major**: Breaking changes

## 🔄 Release process

1. **Development**: Create changesets for your changes
2. **Merge to master**: Changesets creates a "Version Packages" PR
3. **Review & merge**: The version PR updates package.json and CHANGELOG.md
4. **Automatic publish**: Package is automatically published to NPM

## 📋 Available scripts

```bash
# Create a new changeset
bun run changeset

# Apply changesets and bump versions
bun run version-packages

# Publish packages (usually handled by CI)
bun run release
```

## 🎯 Benefits

- ✅ Automated semantic versioning
- ✅ Generated changelogs
- ✅ No manual version bumping
- ✅ Consistent release process
- ✅ Integration with conventional commits