---
name: PR Review
description: Perform a thorough code review of a pull request. Use this skill when reviewing PRs, evaluating code changes, identifying issues, or providing feedback on proposed changes. Invoke with a PR URL or number.
---

## When to use this skill

- When reviewing a pull request for code quality
- When evaluating proposed changes for bugs or issues
- When checking adherence to project conventions and standards
- When providing constructive feedback on code changes

# PR Review Prompt

Use this prompt to review a pull request. Replace `{PR_URL}` with the actual PR URL.

---

## Review Instructions

You are performing a code review for this pull request: `{PR_URL}`

### Step 1: Gather Context

1. Fetch the PR details using `gh pr view {PR_URL} --json title,body,files,additions,deletions,commits`
2. Get the diff: `gh pr diff {PR_URL}`
3. Review the project's CLAUDE.md for coding conventions

### Step 2: Review Checklist

Evaluate the PR against these criteria:

**Code Quality**
- [ ] Code is readable and self-documenting
- [ ] No unnecessary complexity or over-engineering
- [ ] Follows DRY principles without premature abstraction
- [ ] Proper error handling where appropriate

**TypeScript/JavaScript**
- [ ] No `any` types (strict mode compliance)
- [ ] Proper null/undefined handling
- [ ] Unused variables removed or prefixed with `_`
- [ ] Imports use `@` alias for src paths

**Testing**
- [ ] Tests cover the changed functionality
- [ ] Tests follow Arrange-Act-Assert pattern
- [ ] No flaky or timing-dependent tests

**Security**
- [ ] No hardcoded secrets or credentials
- [ ] Input validation at system boundaries
- [ ] No SQL injection, XSS, or other OWASP vulnerabilities

**Project Conventions**
- [ ] Follows commit message format (Conventional Commits)
- [ ] File organization matches project structure
- [ ] State management follows guidelines (useState → Zustand → TanStack Query)

### Step 3: Provide Feedback

Structure your review as:

```markdown
## Summary
Brief overview of what the PR accomplishes and overall assessment.

## Strengths
What the PR does well.

## Issues Found
### Critical (must fix)
- Issue description with file:line reference

### Suggestions (nice to have)
- Improvement suggestion with rationale

## Questions
Any clarifications needed from the author.

## Verdict
- [ ] Approve
- [ ] Request Changes
- [ ] Comment Only
```

### Step 4: Submit Review

Use `gh pr review {PR_URL} --approve/--request-changes/--comment --body "..."` to submit.

---

## Example Usage

```bash
# Review PR #5
gh pr view 5 --json title,body,files
gh pr diff 5
# Then provide structured feedback
```
