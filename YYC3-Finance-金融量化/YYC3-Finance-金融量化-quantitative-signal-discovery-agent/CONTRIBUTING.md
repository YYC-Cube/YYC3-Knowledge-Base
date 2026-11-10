# Contributing to NVIDIA Quantitative Signal Discovery Agent developer example

Thank you for contributing to the Quantitative Signal Discovery Agent developer example. This guide covers the local setup, checks, and submission process.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Ways to Contribute](#ways-to-contribute)
- [Development Setup](#development-setup)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)
- [Issue Reporting](#issue-reporting)
- [Getting Help](#getting-help)

## Code of Conduct

We are committed to providing a welcoming and inclusive environment for all contributors. Please be respectful and professional in all interactions.

## Ways to Contribute

There are many ways to contribute to Quantitative Signal Discovery Agent developer example:

- **Report bugs**: If you find a bug, please open an issue with detailed information
- **Suggest enhancements**: Have an idea for a new feature? Let us know!
- **Improve documentation**: Help us make the docs clearer and more comprehensive
- **Submit code**: Fix bugs, implement features, or improve performance
- **Share examples**: Contribute notebooks, examples, or use cases

## Development Setup

### Prerequisites

- Python 3.11, 3.12, or 3.13
- NVIDIA API key from [build.nvidia.com](https://build.nvidia.com/settings/api-keys)

### Setting Up Your Development Environment

1. **Fork and Clone the Repository**

   ```bash
   git clone https://github.com/your-username/quantitative-signal-discovery-agent.git
   cd quantitative-signal-discovery-agent
   ```

2. **Install uv (if not already installed)**

   ```bash
   curl -LsSf https://astral.sh/uv/install.sh | sh
   ```

   For Windows, use:
   ```powershell
   powershell -c "irm https://astral.sh/uv/install.ps1 | iex"
   ```

3. **Install Development Dependencies**

   ```bash
   uv venv
   source .venv/bin/activate
   uv pip install -e ".[test]"
   ```

4. **Download Data**

   ```bash
   python -m signal_discovery_workflow.download_data
   ```

## Coding Standards

### Python Style Guide

We follow the Ruff rules configured in `pyproject.toml`:

- **Line length**: 120 characters
- **String quotes**: Use double quotes for strings
- **Import ordering**: Managed by Ruff's import sorter

### Code Formatting

Run Ruff before committing:

```bash
uv run ruff check src tests
```

### Documentation

- **Docstrings**: Use Google-style docstrings for all public functions, classes, and modules
- **Type hints**: Include type hints for function parameters and return values
- **Comments**: Write clear comments explaining complex logic

Example:

```python
def evaluate_signal(
    signal_values: pd.DataFrame,
    forward_returns: pd.DataFrame,
    ic_threshold: float = 0.02
) -> dict:
    """
    Evaluate a signal's predictive power using Rank IC.

    Args:
        signal_values: Signal values as a DataFrame (dates x stocks)
        forward_returns: Forward returns as a DataFrame (dates x stocks)
        ic_threshold: Minimum absolute IC value for acceptance

    Returns:
        Dictionary containing Mean IC, p-value, and acceptance status

    Raises:
        ValueError: If DataFrames have mismatched dimensions
    """
    pass
```

## Testing

### Running Tests

We encourage comprehensive testing of all new features and bug fixes.

```bash
# Run all tests
pytest

# Run specific test file
pytest tests/test_signal_evaluator.py

# Run with coverage
pytest --cov=src --cov-report=html
```

### Writing Tests

- Place test files in the appropriate `tests/` directory
- Name test files with `test_` prefix
- Use descriptive test function names
- Include both unit tests and integration tests
- Test edge cases and error conditions

## Submitting Changes

### Branch Naming

Use descriptive branch names following this pattern:

- `feature/description` - for new features
- `bugfix/description` - for bug fixes
- `docs/description` - for documentation updates
- `refactor/description` - for code refactoring

### Commit Messages

Write clear, concise commit messages:

```
Short summary (50 chars or less)

More detailed explanation if needed. Wrap at 72 characters.
Explain what changes were made and why.

- Bullet points are okay
- Use present tense ("Add feature" not "Added feature")
- Reference issues: "Fixes #123" or "Relates to #456"
```

### Pull Request Process

1. **Update your fork** with the latest changes from main:

   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Run all checks** before submitting:

   ```bash
   uv run ruff check src tests
   uv run pytest tests/
   ```

3. **Create a Pull Request** with:
   - Clear title describing the change
   - Detailed description of what and why
   - Link to related issues
   - Screenshots or examples if applicable

4. **Address review feedback** promptly and professionally

5. **Ensure CI passes** - all automated checks must pass

### Pull Request Checklist

Before submitting, ensure:

- [ ] Code follows the Ruff checks in `pyproject.toml`
- [ ] All tests pass
- [ ] New tests added for new features
- [ ] Documentation updated (docstrings, README, etc.)
- [ ] Commit messages are clear and descriptive
- [ ] No merge conflicts with main branch

## Issue Reporting

### Bug Reports

When reporting bugs, please include:

- **Description**: Clear description of the bug
- **Steps to reproduce**: Exact steps to reproduce the issue
- **Expected behavior**: What should happen
- **Actual behavior**: What actually happens
- **Environment**: OS, Python version
- **Code snippet**: Minimal reproducible example
- **Error messages**: Full error traceback

Use this template:

```markdown
**Bug Description**
A clear description of the bug.

**To Reproduce**
1. Step one
2. Step two
3. ...

**Expected Behavior**
What you expected to happen.

**Actual Behavior**
What actually happened.

**Environment**
- OS: [e.g., Ubuntu 22.04]
- Python: [e.g., 3.12]
- Quantitative Signal Discovery Agent version: [e.g., 0.1.0]

**Additional Context**
Any other relevant information.
```

### Feature Requests

When suggesting features:

- Describe the problem it solves
- Explain the proposed solution
- Consider alternative approaches
- Note any breaking changes

## Getting Help

- **Issues**: Open an issue for bugs or questions
- **Discussions**: Use GitHub Discussions for general questions
- **Documentation**: Check the README and module-specific docs

## Signing Your Work

We require that all contributors "sign-off" on their commits. This certifies that the contribution is your original work, or you have rights to submit it under the same license, or a compatible license.

Any contribution which contains commits that are not Signed-Off will not be accepted.

To sign off on a commit you simply use the `--signoff` (or `-s`) option when committing your changes:

```bash
$ git commit -s -m "Add cool feature."
```

This will append the following to your commit message:

```
Signed-off-by: Your Name <your@email.com>
```

## Developer Certificate of Origin
```
Developer Certificate of Origin
Version 1.1

Copyright (C) 2004, 2006 The Linux Foundation and its contributors.
1 Letterman Drive
Suite D4700
San Francisco, CA, 94129

Everyone is permitted to copy and distribute verbatim copies of this license document, but changing it is not allowed.
```

```
Developer's Certificate of Origin 1.1

By making a contribution to this project, I certify that:

(a) The contribution was created in whole or in part by me and I
    have the right to submit it under the open source license
    indicated in the file; or

(b) The contribution is based upon previous work that, to the best
    of my knowledge, is covered under an appropriate open source
    license and I have the right under that license to submit that
    work with modifications, whether created in whole or in part
    by me, under the same open source license (unless I am
    permitted to submit under a different license), as indicated
    in the file; or

(c) The contribution was provided directly to me by some other
    person who certified (a), (b) or (c) and I have not modified
    it.

(d) I understand and agree that this project and the contribution
    are public and that a record of the contribution (including all
    personal information I submit with it, including my sign-off) is
    maintained indefinitely and may be redistributed consistent with
    this project or the open source license(s) involved.
```
