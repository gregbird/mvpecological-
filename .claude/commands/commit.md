---
allowed-tools: Bash(git status:*), Bash(git diff:*), Bash(git add:*), Bash(git commit:*), Bash(git log:*)
description: Create a conventional commit
---

# Create Commit

Follow Dulra's commit convention:

1. Run `git status` to see changes
2. Run `git diff --staged` to see staged changes (or `git diff` for unstaged)
3. Run `git log --oneline -3` to see recent commit style
4. Suggest a commit message in format: `<type>(<scope>): <subject>`
   - Types: feat, fix, refactor, style, test, docs, chore
   - Scopes: ui, api, auth, map, db, survey, report
5. Ask user to confirm before committing
6. Run `git add .` then `git commit -m "message"`
