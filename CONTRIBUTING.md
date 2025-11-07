# Contributing to AURA

Thank you for your interest in contributing to AURA! This document provides guidelines and instructions for contributing to the project.

## Code of Conduct

- Be respectful and inclusive
- Welcome newcomers and help them learn
- Focus on constructive feedback
- Respect different viewpoints and experiences

## Getting Started

### Prerequisites

- Node.js >= 18
- pnpm >= 10.0.0
- Git
- Redis (for local development)
- PostgreSQL or SQLite (for local development)

### Setup Development Environment

```bash
# Clone the repository
git clone https://github.com/your-org/aura.git
cd aura

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test
```

## Development Workflow

### 1. Create a Branch

```bash
# Create a feature branch from main
git checkout -b feature/your-feature-name

# Or a bugfix branch
git checkout -b fix/your-bug-description
```

### 2. Make Changes

- Write clear, readable code
- Follow the existing code style
- Add comments for complex logic
- Update documentation as needed

### 3. Commit Changes

We use conventional commits:

```bash
# Format: <type>(<scope>): <description>
git commit -m "feat(gateway): add rate limiting middleware"
git commit -m "fix(agent): resolve memory leak in agent manager"
git commit -m "docs(readme): update installation instructions"
```

**Commit Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks
- `perf`: Performance improvements
- `ci`: CI/CD changes

### 4. Run Tests and Linting

```bash
# Run linting
pnpm lint

# Run type checking
pnpm check-types

# Run tests
pnpm test

# Format code
pnpm format
```

### 5. Push and Create Pull Request

```bash
# Push your branch
git push origin feature/your-feature-name
```

Then create a Pull Request on GitHub with:
- Clear title and description
- Reference to related issues
- Screenshots (if UI changes)
- Test results

## Code Standards

### TypeScript

- Use TypeScript for all new code
- Avoid `any` types - use proper types or `unknown`
- Use interfaces for object shapes
- Use enums for constants
- Add JSDoc comments for public APIs

### Code Style

- Use 2 spaces for indentation
- Use single quotes for strings
- Use trailing commas
- Maximum line length: 100 characters
- Use meaningful variable and function names

### Project Structure

```
packages/          # Shared packages
services/          # Microservices
apps/              # Applications (web, docs)
deployments/       # Deployment configs
```

### Service Guidelines

- Each service should be self-contained
- Use `@aura/core` for shared functionality
- Register services with Registry Service
- Implement health check endpoints
- Add proper error handling
- Include logging

## Testing

### Writing Tests

- Write unit tests for all new features
- Write integration tests for API endpoints
- Test error cases and edge cases
- Aim for >80% code coverage

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests for a specific package
pnpm --filter @aura/gateway test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage
```

## Documentation

### Code Documentation

- Add JSDoc comments for public functions
- Document complex algorithms
- Include usage examples in comments
- Update README files when adding features

### API Documentation

- Document all API endpoints
- Include request/response examples
- Document error codes
- Update OpenAPI/Swagger specs

## Pull Request Process

1. **Update Documentation**: Update relevant docs
2. **Add Tests**: Add tests for new features
3. **Run Checks**: Ensure all CI checks pass
4. **Request Review**: Request review from maintainers
5. **Address Feedback**: Make requested changes
6. **Merge**: Maintainer will merge after approval

### PR Checklist

- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] Tests added/updated
- [ ] All tests pass
- [ ] No new warnings introduced
- [ ] Changes tested locally

## Reporting Issues

### Bug Reports

Include:
- Clear description of the bug
- Steps to reproduce
- Expected vs actual behavior
- Environment details (OS, Node version, etc.)
- Relevant logs or error messages

### Feature Requests

Include:
- Clear description of the feature
- Use case and motivation
- Proposed implementation (if applicable)
- Examples or mockups (if UI)

## Security Issues

**Do NOT** open public issues for security vulnerabilities.

Instead, email security@aura.example.com with:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if available)

## Questions?

- Check existing documentation
- Search existing issues
- Ask in discussions
- Contact maintainers

## Recognition

Contributors will be:
- Listed in CONTRIBUTORS.md
- Credited in release notes
- Acknowledged in project documentation

Thank you for contributing to AURA! 🎉

