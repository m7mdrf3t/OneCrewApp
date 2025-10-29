# Collaboration Guide - OneCrew App

This guide outlines the Git workflow and collaboration practices for the OneCrew React Native App project.

## Overview

This project uses a **Feature Branch Workflow** with Pull Requests to ensure code quality and prevent conflicts when multiple developers work together.

## Branch Strategy

### Main Branches

- **`master`**: Production-ready code only. Protected branch requiring pull requests.
- **`Amr`**: Long-lived development branch.

### Feature Branches

All new features should be developed in dedicated branches following this naming convention:

- `feature/description` - For new features (e.g., `feature/user-profile-screen`)
- `bugfix/description` - For bug fixes (e.g., `bugfix/login-crash`)
- `hotfix/description` - For urgent production fixes (e.g., `hotfix/api-timeout`)

## Daily Workflow

### Starting Work (Every Morning)

```bash
# 1. Navigate to project directory
cd OneCrewApp

# 2. Switch to master branch and pull latest changes
git checkout master
git pull origin master

# 3. Create a new feature branch from latest master
git checkout -b feature/my-feature-name

# 4. Verify you're on the right branch
git branch
```

### During Development

```bash
# Make changes to files...

# Stage changes
git add .

# Commit with clear message
git commit -m "feat: add user profile screen"

# Push to remote (first time)
git push -u origin feature/my-feature-name

# Subsequent pushes
git push
```

### Commit Message Guidelines

Use conventional commit format:

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

### Creating a Pull Request

**Using GitHub CLI:**
```bash
gh pr create --title "Feature: Add user profile screen" --body "This PR adds a new user profile screen with edit functionality"
```

**Using GitHub Web Interface:**
1. Push your branch to remote
2. Go to GitHub repository
3. Click "Compare & pull request"
4. Fill in PR title and description
5. Request review from your colleague
6. Wait for approval before merging

### Completing Work (End of Day or Feature Complete)

```bash
# 1. After PR is merged, update your local master
git checkout master
git pull origin master

# 2. Delete local feature branch (optional)
git branch -d feature/my-feature-name

# 3. Delete remote branch if not auto-deleted
git push origin --delete feature/my-feature-name
```

## Pull Request Guidelines

### PR Requirements

1. **Description**: Clearly describe what the PR does and why
2. **Small PRs**: Keep PRs focused on a single feature or fix
3. **Code Review**: All PRs require at least one approval before merging
4. **Tests**: Include tests if applicable
5. **Documentation**: Update documentation if needed
6. **Screenshots**: Include screenshots for UI changes

### PR Template

Use the PR template (`.github/PULL_REQUEST_TEMPLATE.md`) when creating pull requests. Include:
- What changes were made
- Why the changes were necessary
- How to test the changes
- Screenshots (if UI changes)
- Any breaking changes

## Resolving Conflicts

### If You Have Conflicts When Pulling

```bash
# 1. Pull latest changes
git pull origin master

# 2. If conflicts occur, Git will indicate which files
# 3. Open conflicted files and resolve manually
# 4. After resolving:
git add .
git commit -m "fix: resolve merge conflicts"
```

### If PR Has Conflicts

1. Update your feature branch:
   ```bash
   git checkout feature/my-feature
   git pull origin master
   # Resolve conflicts
   git add .
   git commit -m "fix: resolve merge conflicts"
   git push
   ```
2. The PR will update automatically

## Communication Protocol

### Before Starting Work

- Check existing PRs to see what others are working on
- Communicate with your colleague about what you're planning to work on
- Use GitHub Issues to track tasks and features

### Coordinating Work

- **Day Start**: Pull latest changes and communicate your planned work
- **During Work**: Update your colleague if you're working on something that might conflict
- **Before Pushing**: Ensure you've pulled latest changes
- **PR Ready**: Notify your colleague that a PR is ready for review

## Best Practices

### Do's ✅

- Pull latest changes before starting work
- Create feature branches for all new work
- Commit frequently with clear messages
- Keep feature branches up to date with master
- Review PRs thoroughly before approving
- Test your changes on device/simulator before submitting PR
- Update documentation when adding features
- Include screenshots for UI/UX changes

### Don'ts ❌

- Don't commit directly to `master` branch
- Don't force push to `master` or shared branches
- Don't work on the same file simultaneously without coordination
- Don't ignore merge conflicts
- Don't merge your own PRs (unless discussed)
- Don't push uncommitted work at end of day
- Don't commit `node_modules` or build artifacts

## Quick Reference Commands

```bash
# Check current branch
git branch

# See what's changed
git status

# See commit history
git log --oneline

# See differences
git diff

# Stash changes temporarily
git stash
git stash pop

# Update feature branch with latest master
git checkout feature/my-feature
git merge master
# Or use rebase:
git rebase master
```

## React Native Specific Notes

### Dependencies

```bash
# After pulling, always run:
npm install

# If package-lock.json changed
npm ci
```

### Testing Changes

```bash
# Clear cache if needed
npm start -- --reset-cache

# Run on iOS
npm run ios

# Run on Android
npm run android
```

### Common Issues

- **Metro bundler cache**: Use `--reset-cache` flag if seeing old code
- **Build conflicts**: Delete `node_modules` and reinstall after conflicts
- **Pod install** (iOS): May need to run `cd ios && pod install` after dependency changes

## Getting Help

If you encounter issues:
1. Check this guide first
2. Review Git documentation: https://git-scm.com/doc
3. Communicate with your colleague
4. Check GitHub Issues for known problems
5. Review React Native documentation: https://reactnative.dev/docs/getting-started

## Branch Protection Rules

The `master` branch is protected with:
- Requires pull request reviews before merging
- Requires branches to be up to date before merging
- No force pushes allowed
- No deletion allowed

This ensures code quality and prevents accidental breaking changes.

---

**Remember**: Always pull before you push, test on device/simulator, and communicate with your teammate to avoid conflicts!

