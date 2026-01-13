# Security Policy

## Dependency Management

This repository uses automated tools to monitor dependencies for security vulnerabilities and outdated packages.

### Automated Scanning

- **Dependabot**: Automatically checks for dependency updates weekly
- **GitHub Actions**: Runs comprehensive dependency audits on every push and weekly
- **Security Advisories**: GitHub will alert maintainers of known vulnerabilities

### What We Check

1. **Security Vulnerabilities**: Known CVEs in dependencies
2. **Outdated Packages**: Dependencies with available updates
3. **Unused Dependencies**: Packages that are installed but not used
4. **License Compliance**: Package licenses (when applicable)

### Manual Audit Commands

Depending on your project type, you can run these commands locally:

#### Node.js
```bash
npm audit                    # Check for vulnerabilities
npm audit fix               # Automatically fix vulnerabilities
npm outdated                # Check for outdated packages
npx depcheck                # Find unused dependencies
```

#### Python
```bash
pip-audit                   # Check for vulnerabilities
pip list --outdated         # Check for outdated packages
```

#### Ruby
```bash
bundle audit                # Check for vulnerabilities
bundle outdated             # Check for outdated packages
```

#### Go
```bash
govulncheck ./...          # Check for vulnerabilities
go list -u -m all          # Check for updates
```

#### Rust
```bash
cargo audit                 # Check for vulnerabilities
cargo outdated              # Check for outdated crates
```

### Responding to Vulnerabilities

When a vulnerability is detected:

1. **Critical/High**: Update immediately
2. **Moderate**: Update within 7 days
3. **Low**: Update in next regular maintenance cycle

### Best Practices

- ✅ Always use lock files (package-lock.json, Pipfile.lock, Gemfile.lock, etc.)
- ✅ Pin dependencies to specific versions in production
- ✅ Review dependency updates before merging
- ✅ Keep dependencies minimal - remove unused packages
- ✅ Audit dependencies before major releases
- ✅ Subscribe to security advisories for critical dependencies

## Reporting a Security Vulnerability

If you discover a security vulnerability, please report it by:

1. **DO NOT** open a public issue
2. Use GitHub's private vulnerability reporting feature
3. Email the maintainers directly (if configured)

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

We will acknowledge receipt within 48 hours and provide a timeline for resolution.
