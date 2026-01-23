# Contributing to OMEGA-Trinity

Thank you for your interest in contributing to OMEGA-Trinity! This document provides guidelines and instructions for contributing to this unified AI agent ecosystem.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Testing](#testing)
- [Documentation](#documentation)

## Code of Conduct

By participating in this project, you agree to maintain a respectful, inclusive, and collaborative environment. We expect all contributors to:

- Be respectful and considerate
- Welcome newcomers and help them get started
- Focus on constructive feedback
- Respect differing viewpoints and experiences
- Accept responsibility for mistakes and learn from them

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- Python >= 3.11 (for Bridge)
- Git
- Code editor (VS Code recommended)

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR-USERNAME/OMEGA-Trinity.git
   cd OMEGA-Trinity
   ```
3. Add the upstream repository:
   ```bash
   git remote add upstream https://github.com/Mega-Therion/OMEGA-Trinity.git
   ```

### Install Dependencies

```bash
# Install all Node.js dependencies
npm install

# Install Python dependencies for Bridge
cd packages/bridge
pip install -r requirements.txt
cd ../..
```

### Set Up Environment

1. Copy `.env.example` files to `.env` in each package
2. Fill in required API keys and configuration
3. Run health check:
   ```bash
   npm run omega:doctor
   ```

## Development Workflow

### Branching Strategy

We use a simplified Git Flow:

- `master` - Production-ready code
- `develop` - Integration branch for features
- `feature/*` - New features
- `fix/*` - Bug fixes
- `docs/*` - Documentation updates
- `refactor/*` - Code refactoring

### Creating a Feature Branch

```bash
# Update your local develop branch
git checkout develop
git pull upstream develop

# Create a new feature branch
git checkout -b feature/your-feature-name
```

### Making Changes

1. Make your changes in the appropriate package(s)
2. Write or update tests
3. Update documentation
4. Test locally:
   ```bash
   npm run dev          # Test all services
   npm run test         # Run tests
   npm run lint         # Check code style
   ```

### Keeping Your Branch Updated

```bash
# Fetch latest changes
git fetch upstream

# Rebase your feature branch
git rebase upstream/develop
```

## Coding Standards

### TypeScript/JavaScript

- Use TypeScript for new code
- Follow ESLint and Prettier configurations
- Use meaningful variable and function names
- Write JSDoc comments for public APIs
- Prefer functional programming patterns
- Use async/await over callbacks

### Python

- Follow PEP 8 style guide
- Use type hints
- Write docstrings for classes and functions
- Use Black for code formatting
- Prefer composition over inheritance

### Code Organization

- Keep functions small and focused
- Separate concerns (UI, business logic, data)
- Use dependency injection
- Avoid circular dependencies
- Follow the principle of least privilege

## Commit Guidelines

### Commit Message Format

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
type(scope): subject

[optional body]

[optional footer]
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Build process or auxiliary tool changes
- `perf`: Performance improvements

### Examples

```
feat(bridge): add TensorFlow integration

fix(gateway): resolve memory leak in WebSocket handler

docs(readme): update installation instructions

refactor(hud): extract authentication logic to separate service
```

## Pull Request Process

### Before Submitting

- [ ] Code follows style guidelines
- [ ] Tests pass locally
- [ ] Documentation is updated
- [ ] Commits follow commit message guidelines
- [ ] Branch is rebased on latest develop

### Submitting a Pull Request

1. Push your changes to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```

2. Create a pull request from your fork to `Mega-Therion/OMEGA-Trinity:develop`

3. Fill in the PR template with:
   - Description of changes
   - Related issues
   - Testing performed
   - Screenshots (if UI changes)

4. Request review from maintainers

### PR Review Process

- Maintainers will review your PR within 48-72 hours
- Address feedback by pushing additional commits
- Once approved, a maintainer will merge your PR
- Delete your feature branch after merge

### CI/CD Checks

All PRs must pass:
- ✅ Linting checks
- ✅ Unit tests
- ✅ Integration tests
- ✅ Security scans
- ✅ Build verification

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests for specific package
npm test --workspace=packages/gateway
npm test --workspace=packages/bridge

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage
```

### Writing Tests

- Write unit tests for all new functions
- Write integration tests for API endpoints
- Mock external dependencies
- Aim for >80% code coverage
- Test edge cases and error conditions

### Test Structure

```typescript
describe('FeatureName', () => {
  beforeEach(() => {
    // Setup
  });

  afterEach(() => {
    // Cleanup
  });

  it('should do something specific', async () => {
    // Arrange
    const input = ...;
    
    // Act
    const result = await functionUnderTest(input);
    
    // Assert
    expect(result).toBe(expected);
  });
});
```

## Documentation

### Code Documentation

- Write clear, concise comments
- Document complex logic
- Keep comments up to date
- Use JSDoc/PyDoc for public APIs

### README Updates

- Update package READMEs for feature changes
- Add usage examples
- Document breaking changes
- Update architecture diagrams if needed

### API Documentation

- Document all API endpoints
- Include request/response examples
- Note authentication requirements
- List possible error responses

## Package-Specific Guidelines

### Gateway (Node.js/TypeScript)

- Use Express middleware for cross-cutting concerns
- Implement proper error handling
- Use async route handlers
- Validate input with Zod or similar

### Bridge (Python/FastAPI)

- Use Pydantic models for validation
- Implement dependency injection
- Use FastAPI's async capabilities
- Add proper type hints

### Client (React/Next.js)

- Use functional components
- Implement proper state management
- Use React hooks appropriately
- Optimize performance (memoization, lazy loading)

## Getting Help

- Check existing [documentation](./README.md)
- Search [existing issues](https://github.com/Mega-Therion/OMEGA-Trinity/issues)
- Ask in [Discussions](https://github.com/Mega-Therion/OMEGA-Trinity/discussions)
- Contact maintainers if needed

## Recognition

All contributors will be:
- Listed in our Contributors section
- Acknowledged in release notes
- Invited to join the core team (for significant contributions)

Thank you for contributing to OMEGA-Trinity! 🚀
