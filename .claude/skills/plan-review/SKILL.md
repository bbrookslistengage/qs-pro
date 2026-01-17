---
name: Plan Review
description: Review Claude Code implementation plans to ensure they're ready for execution. Validates completeness, specificity, security, and implementability of plans before coding begins. Use this skill after creating a plan in plan mode and before calling ExitPlanMode, when reviewing plan files or implementation outlines, when the user asks to "review my plan", "check the plan", or "validate the implementation approach", when analyzing multi-step implementation strategies for completeness, when checking if a plan has proper step ordering and dependencies, when verifying security considerations are addressed in implementation plans, when looking for vague instructions like "handle edge cases" or "follow best practices" that need to be made specific, or when assessing whether a plan reuses existing code appropriately and avoids over-engineering.
---

## When to use this skill

- After drafting a plan in Claude Code's plan mode (before calling ExitPlanMode)
- When reviewing plan files, implementation outlines, or step-by-step instructions
- When the user asks to "review my plan", "check the plan", or "validate the approach"
- Before executing a multi-step implementation plan
- When analyzing implementation strategies for completeness and clarity
- When checking if a plan has proper step ordering and dependencies
- When verifying that security considerations are addressed (auth, validation, data handling)
- When looking for vague instructions that need to be made specific
- When assessing whether a plan properly reuses existing code
- When validating that each step is verifiable and has clear success criteria
- To catch issues before implementation wastes effort
- When reviewing plans created by other agents or sessions
- When the user presents a numbered list of implementation steps to validate
- When checking for anti-patterns like missing file paths or circular dependencies
- When ensuring plans reference the AppExchange Security Review Checklist for security-sensitive features

# Plan Review Prompt

Use this prompt to review a Claude Code implementation plan.

---

## Review Philosophy

**CRITICAL:** Your goal is to catch plans that will fail or waste effort, NOT to find something wrong with every plan. A good plan that's ready to execute should be approved without nitpicking. "No issues found" is a valid outcome.

### What Actually Matters (flag these)

1. **Missing information** - Can't execute because something isn't specified
2. **Wrong order** - Steps depend on things that come later
3. **Security gaps** - Auth, validation, or data protection missing for sensitive features
4. **Vague steps** - "Handle edge cases" without listing them

### Do NOT Flag

- Minor wording preferences
- Steps that could theoretically be more detailed but are clear enough
- "Consider also doing X" additions beyond scope
- Formatting or organizational style preferences
- Plans that work correctly but aren't how you would write them

### Before Including Any Issue, Ask Yourself

1. Could this cause incorrect behavior or a security vulnerability?
2. Is there genuine ambiguity that could lead to wrong implementation?
3. Does the implementer have enough information to proceed correctly?

**Flag if ANY answer is "yes" or "uncertain."**

### When In Doubt, Flag It

If you're uncertain whether something is a real issue:
- Flag it as "Clarification Needed" (not Critical)
- Phrase as a question: "Should step X handle Y case?"
- Let the author confirm or clarify

Err toward flagging genuine ambiguity, not toward silence. But do not manufacture issues.

---

## Review Instructions

You are reviewing an implementation plan to ensure it's ready for execution.

### Step 1: Gather Context

1. Read the plan file
2. Read CLAUDE.md for project conventions
3. Identify scope: What files/features will be touched?

### Step 2: Core Quality Checks

**Must Check (every plan):**

- [ ] Is the goal clearly stated? (What are we building/fixing?)
- [ ] Are steps in executable order? (No step uses something from a later step)
- [ ] Are file paths specific enough to find? (Not "the auth file")
- [ ] Is there a way to verify completion?

**Check If Applicable:**

| Plan Area | Key Questions |
|-----------|---------------|
| New endpoints | Auth/authz specified? Input validation mentioned? |
| Database changes | Migrations ordered before code using them? RLS considered? |
| Frontend features | Where does state live? What triggers updates? |
| Multi-step changes | Dependencies between steps clear? |

### Step 3: Specificity Check

Flag only if genuinely ambiguous:

| Vague Pattern | Only Flag If... |
|---------------|-----------------|
| "Handle edge cases" | No edge cases are listed anywhere |
| "Add proper validation" | No validation approach is specified |
| "Follow existing patterns" | The pattern isn't obvious from context |
| "Update tests" | No indication of what to test |

Plans don't need to specify every line of code. They need enough detail for an implementer to proceed without guessing at intent.

### Step 4: Security Review (If Applicable)

Only for plans touching sensitive areas. Skip for UI-only or internal tooling changes.

**Reference:** [AppExchange Security Review Checklist](../../../docs/security-review-materials/APPEXCHANGE-SECURITY-REVIEW-CHECKLIST.md)

| Plan Area | Security Check |
|-----------|----------------|
| Auth/Session | Token storage, cookie flags, refresh handling |
| New endpoints | Authorization + input validation mentioned |
| Database queries | Parameterization, RLS context |
| User input display | XSS prevention approach |
| MCE API calls | SOAP escaping, zero-data proxy pattern |

**Risk Classification:**
- 🟢 **Low:** No auth, no user input, no data changes
- 🟡 **Medium:** New endpoints, form inputs, data access
- 🔴 **High:** Auth changes, MCE integration, multi-tenant logic

### Step 5: Provide Feedback

```markdown
## Plan Review: [Brief Title]

### Summary
One paragraph: what the plan does and whether it's ready.

### Readiness: Ready / Needs Clarification / Needs Rework

### Issues Found

#### Critical (blocks execution)
- **[Location in plan]** Issue description
  - **Impact:** Why this blocks execution
  - **Fix:** What needs to change

#### Clarifications Needed
- **[Location]** What's ambiguous
  - **Question:** Specific question to resolve it

*(If no issues: "Plan is clear and ready for execution.")*

### Security Assessment
**Risk Level:** 🟢/🟡/🔴 or N/A

| Area | Addressed? |
|------|------------|
| Auth/Authz | ✅/⚠️/N/A |
| Input Validation | ✅/⚠️/N/A |
| Data Protection | ✅/⚠️/N/A |

*(Skip table for low-risk plans)*

### Verdict
**Approved** / **Needs Clarification** / **Needs Rework**
```

---

## Valid Review Outcomes

These are all legitimate:

- "Plan is clear and complete. Approved for execution."
- "One clarification needed on step 3, otherwise ready."
- "Solid plan. No issues found."

Do not manufacture feedback to appear thorough. A good plan deserves a clean approval.

---

## Common Anti-Patterns (Reference)

Only flag if the plan actually exhibits these:

| Anti-Pattern | Problem |
|--------------|---------|
| "Implement the feature" | No breakdown—what files? what functions? |
| Step 3 uses result of Step 5 | Dependency ordering broken |
| 50 steps for a small feature | Over-planned, consolidate to 5-10 |
| No file paths anywhere | Implementer will guess wrong files |
| "Make it secure" with no specifics | Security-sensitive code needs explicit approach |

---

## References

- [Addy Osmani: How to write a good spec for AI agents](https://addyosmani.com/blog/good-spec/)
- [JetBrains: Spec-Driven Approach for Coding with AI](https://blog.jetbrains.com/junie/2025/10/how-to-use-a-spec-driven-approach-for-coding-with-ai/)
- [AppExchange Security Review Checklist](../../../docs/security-review-materials/APPEXCHANGE-SECURITY-REVIEW-CHECKLIST.md)
