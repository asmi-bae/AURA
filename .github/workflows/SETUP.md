# GitHub Actions Workflows Setup Guide

## Quick Start

### 1. Configure Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions → New repository secret

**Required Secrets:**

```bash
# Docker Hub
DOCKER_USERNAME=your-docker-username
DOCKER_PASSWORD=your-docker-password-or-token

# Kubernetes (Base64 encoded kubeconfig)
KUBE_CONFIG_STAGING=base64-encoded-staging-kubeconfig
KUBE_CONFIG_PRODUCTION=base64-encoded-production-kubeconfig
```

**Optional Secrets:**

```bash
# Security Tools
SNYK_TOKEN=your-snyk-token
SONAR_TOKEN=your-sonarcloud-token

# Turborepo (for remote caching)
TURBO_TOKEN=your-turborepo-token
TURBO_TEAM=your-turborepo-team
```

### 2. Configure Environments

Go to your GitHub repository → Settings → Environments

**Create Environments:**

1. **staging**
   - URL: `https://staging.aura.example.com`
   - Protection rules: Optional (add required reviewers if needed)

2. **production**
   - URL: `https://aura.example.com`
   - Protection rules: Recommended
     - Required reviewers: Add your team
     - Deployment branches: Only `main` branch
     - Wait timer: 5 minutes (optional)

### 3. Update Configuration

**Update URLs in workflows:**

Edit `.github/workflows/cd.yml`:
- Line 213: Update `STAGING_URL`
- Line 233: Update `STAGING_URL` in smoke tests
- Line 274: Update `PRODUCTION_URL` in health checks

**Update Docker registry (if not using Docker Hub):**

Edit `.github/workflows/cd.yml`:
- Line 12: Update `REGISTRY` environment variable
- Update image references throughout

### 4. Test Workflows

1. **Test CI Pipeline:**
   ```bash
   git checkout -b test/ci-workflow
   git commit --allow-empty -m "test: CI workflow"
   git push origin test/ci-workflow
   ```
   Create a PR to trigger CI

2. **Test CD Pipeline (Staging):**
   ```bash
   git checkout main
   git commit --allow-empty -m "test: CD workflow"
   git push origin main
   ```
   This will trigger staging deployment

3. **Test Release:**
   ```bash
   git tag v0.1.0
   git push origin v0.1.0
   ```
   This will create a release and trigger production deployment

## Workflow Files

### `ci.yml` - Continuous Integration
- Runs on: Push, PR, Manual
- Jobs: Lint, Type Check, Build, Test, Security, Code Quality
- Duration: ~15-30 minutes

### `cd.yml` - Continuous Deployment
- Runs on: Push to main, Version tags, Manual
- Jobs: Build Images, Scan Images, Deploy Staging/Production
- Duration: ~20-60 minutes

### `security.yml` - Security Scanning
- Runs on: Push, PR, Daily (2 AM UTC), Manual
- Jobs: Dependency Review, CodeQL, Secret Scanning, Docker Security
- Duration: ~10-20 minutes

### `release.yml` - Release Automation
- Runs on: Version tags, Manual
- Jobs: Create Release
- Duration: ~5 minutes

### `dependency-update.yml` - Dependency Updates
- Runs on: Weekly (Monday 9 AM UTC), Manual
- Jobs: Update Dependencies
- Duration: ~10-15 minutes

## Customization

### Change Node.js Version

Edit `.github/workflows/ci.yml`:
```yaml
env:
  NODE_VERSION: '20'  # Change to desired version
```

### Change pnpm Version

Edit `.github/workflows/ci.yml`:
```yaml
env:
  PNPM_VERSION: '9.0.0'  # Change to desired version
```

### Add More Services

Edit `.github/workflows/cd.yml`, add to matrix:
```yaml
strategy:
  matrix:
    service:
      - gateway
      - workflow-engine
      - your-new-service  # Add here
```

### Change Deployment Schedule

Edit `.github/workflows/dependency-update.yml`:
```yaml
schedule:
  - cron: '0 9 * * 1'  # Monday 9 AM UTC
```

Cron format: `minute hour day-of-month month day-of-week`

### Disable Security Scans

Comment out or remove the security workflow jobs in `ci.yml`:
```yaml
# security:
#   name: Security Scan
#   ...
```

## Monitoring

### View Workflow Runs

1. Go to your repository
2. Click "Actions" tab
3. View workflow runs and their status

### View Logs

1. Open a workflow run
2. Click on a job
3. View step logs
4. Download artifacts if needed

### Set Up Notifications

GitHub will automatically send notifications for:
- Workflow failures
- Deployment status
- Security alerts

Configure in: Settings → Notifications → Actions

## Troubleshooting

### Workflow Not Running

1. Check workflow file syntax
2. Verify trigger conditions
3. Check branch protection rules
4. Verify GitHub Actions is enabled

### Build Failures

1. Check build logs
2. Verify dependencies in package.json
3. Check for TypeScript errors
4. Verify Node.js version compatibility

### Deployment Failures

1. Check Kubernetes cluster connectivity
2. Verify secrets are set correctly
3. Check deployment logs: `kubectl logs -n aura <pod-name>`
4. Verify image tags are correct

### Secret Issues

1. Verify secrets are set in repository settings
2. Check secret names match workflow references
3. Verify secret values are correct
4. Check if secrets are base64 encoded (for kubeconfig)

### Image Build Failures

1. Check Dockerfile syntax
2. Verify Docker Hub credentials
3. Check build context
4. Verify Dockerfile path is correct

## Best Practices

1. **Never commit secrets** - Always use GitHub Secrets
2. **Review PRs before merging** - Especially dependency updates
3. **Test locally first** - Run CI checks locally before pushing
4. **Monitor deployments** - Check status after each deployment
5. **Keep dependencies updated** - Regular security updates
6. **Use environment protection** - Protect production environment
7. **Review security alerts** - Address vulnerabilities promptly
8. **Backup before production** - Always backup before production deployment

## Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Docker Build Push Action](https://github.com/docker/build-push-action)
- [Kubernetes Deployment](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/)
- [Trivy Security Scanner](https://github.com/aquasecurity/trivy)
- [CodeQL Analysis](https://codeql.github.com/docs/)

## Support

For issues or questions:
1. Check workflow logs
2. Review this documentation
3. Check GitHub Actions status page
4. Contact DevOps team

