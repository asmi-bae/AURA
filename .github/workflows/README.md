# GitHub Actions Workflows

This directory contains GitHub Actions workflows for CI/CD, security, releases, and dependency management.

## Workflows

### 1. CI (`ci.yml`)
Continuous Integration workflow that runs on every push and pull request.

**Jobs:**
- **Lint & Format**: Runs ESLint and Prettier checks
- **Type Check**: Runs TypeScript type checking
- **Build**: Builds all packages and applications
- **Test**: Runs tests across multiple Node.js versions (20, 22)
- **Security**: Runs security scans (pnpm audit, Snyk)
- **Code Quality**: Runs SonarCloud analysis

**Triggers:**
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop` branches
- Manual workflow dispatch

### 2. CD (`cd.yml`)
Continuous Deployment workflow that deploys to staging and production.

**Jobs:**
- **Determine Environment**: Automatically determines deployment environment
- **Build Images**: Builds Docker images for all services
- **Scan Images**: Security scans Docker images using Trivy
- **Deploy Staging**: Deploys to staging environment
- **Deploy Production**: Deploys to production with blue-green strategy
- **CD Summary**: Generates deployment summary

**Triggers:**
- Push to `main` branch (deploys to staging)
- Tags matching `v*` pattern (deploys to production)
- Manual workflow dispatch with environment selection

**Environments:**
- `staging`: Automatic deployment on push to main
- `production`: Deployment on version tags or manual dispatch

### 3. Security (`security.yml`)
Security scanning workflow for code and dependencies.

**Jobs:**
- **Dependency Review**: Reviews dependency changes in PRs
- **CodeQL Analysis**: Static code analysis for security vulnerabilities
- **Secret Scanning**: Scans for exposed secrets using Gitleaks
- **Docker Security**: Filesystem security scan using Trivy

**Triggers:**
- Push to `main` branch
- Pull requests to `main` branch
- Daily at 2 AM UTC (scheduled)
- Manual workflow dispatch

### 4. Release (`release.yml`)
Creates GitHub releases when version tags are pushed.

**Jobs:**
- **Create Release**: Creates GitHub release with changelog

**Triggers:**
- Tags matching `v*.*.*` pattern
- Manual workflow dispatch with version input

### 5. Dependency Update (`dependency-update.yml`)
Automatically updates dependencies and creates PRs.

**Jobs:**
- **Update Dependencies**: Checks for outdated packages and creates PR

**Triggers:**
- Weekly on Monday at 9 AM UTC (scheduled)
- Manual workflow dispatch

## Required Secrets

### Docker Hub
- `DOCKER_USERNAME`: Docker Hub username
- `DOCKER_PASSWORD`: Docker Hub password or access token

### Kubernetes
- `KUBE_CONFIG_STAGING`: Kubernetes config for staging cluster
- `KUBE_CONFIG_PRODUCTION`: Kubernetes config for production cluster

### Security Tools (Optional)
- `SNYK_TOKEN`: Snyk API token for security scanning
- `SONAR_TOKEN`: SonarCloud token for code quality analysis
- `TURBO_TOKEN`: Turborepo token for remote caching
- `TURBO_TEAM`: Turborepo team name

## Environment Variables

Workflows use the following environment variables:
- `NODE_VERSION`: Node.js version (default: '22')
- `PNPM_VERSION`: pnpm version (default: '10.0.0')
- `REGISTRY`: Docker registry (default: 'docker.io')
- `IMAGE_PREFIX`: Docker image prefix (default: 'aura')

## Workflow Features

### Caching
- pnpm dependencies cached for faster builds
- Docker build cache for faster image builds
- Turborepo remote caching (if configured)

### Parallel Execution
- Multiple jobs run in parallel where possible
- Matrix builds for multiple Node.js versions
- Service builds run in parallel

### Error Handling
- Jobs continue on error where appropriate
- Rollback on deployment failure
- Comprehensive error annotations

### Notifications
- GitHub status checks
- Deployment summaries
- Security alerts

## Usage

### Running CI Locally
```bash
# Install dependencies
pnpm install

# Run linting
pnpm run lint

# Run type checking
pnpm run check-types

# Run tests
pnpm run test

# Build packages
pnpm run build
```

### Manual Deployment
1. Go to Actions tab in GitHub
2. Select "CD" workflow
3. Click "Run workflow"
4. Select environment (staging or production)
5. Optionally select a specific service
6. Click "Run workflow"

### Creating a Release
1. Tag the commit: `git tag v1.0.0`
2. Push the tag: `git push origin v1.0.0`
3. The release workflow will automatically create a GitHub release

Or use manual workflow dispatch:
1. Go to Actions tab
2. Select "Release" workflow
3. Click "Run workflow"
4. Enter version number (e.g., 1.0.0)
5. Click "Run workflow"

## Troubleshooting

### Build Failures
- Check the build logs in the Actions tab
- Verify all dependencies are installed
- Check for TypeScript errors

### Deployment Failures
- Check Kubernetes cluster connectivity
- Verify secrets are configured correctly
- Check deployment logs: `kubectl logs -n aura <pod-name>`

### Security Scan Failures
- Review security alerts in the Security tab
- Update vulnerable dependencies
- Review CodeQL findings

## Best Practices

1. **Never commit secrets**: Use GitHub Secrets for sensitive data
2. **Review PRs**: Always review dependency update PRs before merging
3. **Test locally**: Run CI checks locally before pushing
4. **Monitor deployments**: Check deployment status after each deployment
5. **Regular updates**: Keep dependencies updated for security

