# Dependency Audit Guide

This repository is configured with automated dependency scanning and security monitoring.

## Overview

Three layers of dependency protection:

1. **GitHub Dependabot** - Automatic PRs for dependency updates
2. **GitHub Actions Workflow** - Comprehensive audits on push and weekly
3. **Manual Tools** - Commands you can run locally

## Automated Workflows

### Dependabot (`.github/dependabot.yml`)

Checks for updates weekly (Mondays at 9 AM UTC) and creates PRs for:
- npm packages
- Python packages
- Ruby gems
- Go modules
- Rust crates
- Docker images
- GitHub Actions

**Configuration:**
- Max 10 PRs per ecosystem (5 for Docker)
- Auto-labels PRs by language
- Uses semantic versioning for npm

**To modify:** Edit `.github/dependabot.yml` to change:
- Update frequency
- PR limits
- Ignored dependencies
- Versioning strategy

### GitHub Actions (`.github/workflows/dependency-audit.yml`)

Runs on:
- Every push to main/master/develop
- Every pull request
- Weekly schedule (Mondays at 9 AM UTC)
- Manual trigger via workflow_dispatch

**Features:**
- Auto-detects project type
- Runs language-specific audits
- Generates summary reports
- Uploads detailed results as artifacts

**Outputs:**
- Outdated packages list
- Security vulnerability reports
- Unused dependencies (for Node.js)

## Language-Specific Guides

### Node.js / npm

**Setup:**
```bash
npm install
```

**Check outdated:**
```bash
npm outdated
```

**Security audit:**
```bash
npm audit
npm audit fix              # Auto-fix non-breaking updates
npm audit fix --force      # Fix including breaking changes (careful!)
```

**Find unused dependencies:**
```bash
npx depcheck
```

**Common issues:**
- `ERESOLVE` errors: Use `npm install --legacy-peer-deps`
- High severity: Update immediately
- Peer dependency warnings: Usually safe to ignore

### Python / pip

**Setup:**
```bash
pip install pip-audit
```

**Check outdated:**
```bash
pip list --outdated
```

**Security audit:**
```bash
pip-audit
pip-audit --fix            # Auto-fix vulnerabilities
```

**Update a package:**
```bash
pip install --upgrade <package-name>
```

**Freeze dependencies:**
```bash
pip freeze > requirements.txt
```

### Ruby / Bundler

**Setup:**
```bash
gem install bundler-audit
bundle install
```

**Check outdated:**
```bash
bundle outdated
```

**Security audit:**
```bash
bundle audit check --update
```

**Update gems:**
```bash
bundle update <gem-name>    # Specific gem
bundle update               # All gems (careful!)
```

### Go / go.mod

**Check outdated:**
```bash
go list -u -m all
```

**Security audit:**
```bash
go install golang.org/x/vuln/cmd/govulncheck@latest
govulncheck ./...
```

**Update modules:**
```bash
go get -u <module>          # Specific module
go get -u ./...             # All modules
go mod tidy                 # Clean up
```

### Rust / Cargo

**Setup:**
```bash
cargo install cargo-audit
cargo install cargo-outdated
```

**Check outdated:**
```bash
cargo outdated
```

**Security audit:**
```bash
cargo audit
```

**Update crates:**
```bash
cargo update <crate>        # Specific crate
cargo update                # All crates
```

## Best Practices

### 1. Version Pinning

**Production:**
```json
// package.json - Pin exact versions
{
  "dependencies": {
    "express": "4.18.2"      // ✅ Exact version
  }
}
```

**Development:**
```json
{
  "dependencies": {
    "express": "^4.18.2"     // ✅ Allow patches/minor
  }
}
```

### 2. Lock Files

Always commit lock files:
- `package-lock.json` (npm)
- `yarn.lock` (Yarn)
- `Pipfile.lock` (Pipenv)
- `poetry.lock` (Poetry)
- `Gemfile.lock` (Bundler)
- `go.sum` (Go)
- `Cargo.lock` (Rust)

### 3. Update Strategy

**Regular updates (Low risk):**
- Patch versions (1.2.3 → 1.2.4)
- Security fixes
- Bug fixes

**Careful updates (Medium risk):**
- Minor versions (1.2.0 → 1.3.0)
- New features
- Deprecation warnings

**Planned updates (High risk):**
- Major versions (1.0.0 → 2.0.0)
- Breaking changes
- Require testing

### 4. Reducing Bloat

**Audit your dependencies:**
```bash
# Node.js - Check bundle size
npx webpack-bundle-analyzer

# Find heavy packages
npm ls --depth=0
du -sh node_modules/*

# Alternative: npm-why
npm install -g npm-why
npm-why <package-name>
```

**Remove unused:**
```bash
# Node.js
npx depcheck
npm uninstall <package>

# Python
pip-autoremove <package>

# Go
go mod tidy
```

**Consider alternatives:**
- `lodash` → `lodash-es` (tree-shakeable)
- `moment` → `date-fns` or `dayjs` (smaller)
- `axios` → `fetch` API (native)
- Heavy UI libraries → Lighter alternatives

### 5. Security Response Times

| Severity | Action Required | Timeline |
|----------|----------------|----------|
| Critical | Immediate update & deploy | < 24 hours |
| High | Update & test | < 48 hours |
| Moderate | Scheduled update | < 7 days |
| Low | Next maintenance cycle | < 30 days |

## Troubleshooting

### Dependabot PRs Not Appearing

1. Check if Dependabot is enabled in repository settings
2. Verify `.github/dependabot.yml` syntax
3. Check if dependency files exist
4. Look for Dependabot errors in Security → Dependabot

### Workflow Failing

1. Check Actions tab for error messages
2. Ensure dependencies install correctly
3. Verify Node/Python/Ruby versions are compatible
4. Check if private packages need authentication

### False Positives

Some vulnerabilities may not apply to your usage:

```bash
# npm - Audit only production
npm audit --production

# npm - Ignore specific advisories (temporary)
npm audit --audit-level=moderate
```

**Document why you're ignoring:**
```markdown
## Ignored Vulnerabilities
- CVE-2023-XXXXX: Dev dependency only, not exposed in production
- lodash@4.17.20: Awaiting maintainer update, no affected usage
```

## Manual Audit Checklist

Run before releases:

- [ ] Update all dependencies to latest compatible versions
- [ ] Run security audit (`npm audit`, `pip-audit`, etc.)
- [ ] Check for unused dependencies
- [ ] Review license compatibility
- [ ] Test application thoroughly
- [ ] Update lock files
- [ ] Document any ignored vulnerabilities
- [ ] Check bundle size (if applicable)

## Resources

- [npm audit docs](https://docs.npmjs.com/cli/v9/commands/npm-audit)
- [pip-audit](https://github.com/pypa/pip-audit)
- [bundler-audit](https://github.com/rubysec/bundler-audit)
- [govulncheck](https://pkg.go.dev/golang.org/x/vuln/cmd/govulncheck)
- [cargo-audit](https://github.com/RustSec/rustsec/tree/main/cargo-audit)
- [Snyk Advisor](https://snyk.io/advisor/) - Package health checker
- [GitHub Advisory Database](https://github.com/advisories)

## Questions?

See `SECURITY.md` for security policy and vulnerability reporting.
