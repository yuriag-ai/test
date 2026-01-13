# Dependency Security & Audit Setup

This repository is configured with automated dependency scanning, security monitoring, and vulnerability detection.

## 🔒 Security Features

- ✅ **Automated dependency updates** via Dependabot
- ✅ **Continuous security scanning** via GitHub Actions
- ✅ **Multi-language support** (Node.js, Python, Ruby, Go, Rust, Docker)
- ✅ **Weekly automated audits**
- ✅ **Pull request validation**

## 📋 Quick Start

### For New Projects

When you add your project code:

1. **Dependencies will be automatically scanned** on every push
2. **Dependabot will create PRs** for updates weekly
3. **Security alerts** will appear in the Security tab

### Manual Checks

Run audits locally based on your project type:

**Node.js:**
```bash
npm audit
npm outdated
npx depcheck
```

**Python:**
```bash
pip-audit
pip list --outdated
```

**Ruby:**
```bash
bundle audit
bundle outdated
```

**Go:**
```bash
govulncheck ./...
go list -u -m all
```

**Rust:**
```bash
cargo audit
cargo outdated
```

## 📚 Documentation

- **[DEPENDENCY_AUDIT.md](DEPENDENCY_AUDIT.md)** - Comprehensive guide for managing dependencies
- **[SECURITY.md](SECURITY.md)** - Security policy and vulnerability reporting

## 🔧 Configuration Files

- `.github/workflows/dependency-audit.yml` - Automated CI/CD scanning
- `.github/dependabot.yml` - Dependabot configuration
- `SECURITY.md` - Security policy
- `DEPENDENCY_AUDIT.md` - Detailed audit guide

## 🚀 Workflows

### Dependency Audit Workflow

Automatically runs on:
- Every push to main/master/develop
- Every pull request
- Weekly schedule (Mondays 9 AM UTC)
- Manual trigger

**Features:**
- Detects project language automatically
- Checks for outdated packages
- Scans for security vulnerabilities
- Identifies unused dependencies (Node.js)
- Generates detailed reports

### Dependabot

Creates automated PRs for:
- Security updates (immediate)
- Dependency updates (weekly)
- Version bumps with release notes

## 📊 Where to Find Reports

1. **Actions Tab** → Dependency Audit workflow → Job summaries
2. **Security Tab** → Dependabot alerts
3. **Pull Requests** → Automated Dependabot PRs
4. **Artifacts** → Download detailed JSON reports

## 🎯 Best Practices

1. **Review Dependabot PRs promptly** - Especially security updates
2. **Run local audits before releases** - Use manual commands
3. **Keep lock files committed** - Ensure reproducible builds
4. **Pin versions in production** - Avoid unexpected updates
5. **Remove unused dependencies** - Reduce attack surface

## 🛠️ Customization

### Modify Scan Frequency

Edit `.github/dependabot.yml`:
```yaml
schedule:
  interval: "daily"  # or "weekly", "monthly"
```

### Ignore Specific Dependencies

Add to `.github/dependabot.yml`:
```yaml
ignore:
  - dependency-name: "package-name"
    update-types: ["version-update:semver-major"]
```

### Add More Ecosystems

The setup supports:
- npm / yarn (JavaScript/TypeScript)
- pip / poetry (Python)
- bundler (Ruby)
- go modules (Go)
- cargo (Rust)
- docker (Container images)
- github-actions (CI/CD workflows)

## 🐛 Troubleshooting

**Workflows not running?**
- Check Actions are enabled in Settings → Actions

**No Dependabot PRs?**
- Ensure Dependabot is enabled in Settings → Security → Dependabot
- Verify dependency files exist (package.json, requirements.txt, etc.)

**False positive vulnerabilities?**
- See DEPENDENCY_AUDIT.md for filtering options
- Document exceptions in SECURITY.md

## 📖 Learn More

- [GitHub Dependabot Documentation](https://docs.github.com/en/code-security/dependabot)
- [GitHub Actions Security](https://docs.github.com/en/actions/security-guides)
- [OWASP Dependency Check](https://owasp.org/www-project-dependency-check/)

## 🤝 Contributing

When contributing:
1. Run local audits before submitting PRs
2. Update dependencies to latest compatible versions
3. Fix any security warnings
4. Include dependency changes in PR description

## 📄 License

See repository license file for details.

---

**Need help?** See [DEPENDENCY_AUDIT.md](DEPENDENCY_AUDIT.md) for detailed instructions.
