---
name: Spec Review
description: Review specifications to ensure they're ready for AI-driven development. Use this skill when validating that a spec is complete, unambiguous, and implementable before handing off to an AI coding agent. Invoke with a spec folder path. Use when reading or working with files in agent-os/specs/ directories, when encountering spec.md or tasks.md files, when preparing to implement a feature from a specification, when the user asks to "review a spec" or "validate requirements", when checking if a spec is ready for implementation, when analyzing specification quality or completeness, when verifying security requirements are addressed in specifications, or when ensuring specs follow the agent-os specification format with proper Goal, User Stories, Requirements, and Out of Scope sections.
---

## When to use this skill

- When reading or working with files in `agent-os/specs/` directories
- When encountering `spec.md`, `tasks.md`, or `requirements.md` files
- Before starting implementation of any feature specification
- When the user asks to "review a spec", "validate requirements", or "check if spec is ready"
- When preparing to hand off a specification to an AI coding agent
- After creating a new spec using the spec-writer or spec-shaper agents
- When validating that requirements are complete and unambiguous
- When checking that a spec follows project conventions and agent-os format
- When ensuring a spec is "AI-ready" (optimized for LLM agents)
- When reviewing specs created by others or by automated processes
- When verifying security requirements reference the AppExchange Security Review Checklist
- When checking task breakdown quality, dependencies, and execution order
- When analyzing whether acceptance criteria are testable and specific
- When looking for anti-patterns like vague instructions or missing file paths

# Spec Review Prompt

Use this prompt to review a specification. Replace `{SPEC_PATH}` with the actual spec folder path.

---

## Review Philosophy

**CRITICAL:** Your goal is to catch specs that will cause implementation to fail or go off-track, NOT to find something wrong with every spec. A spec that provides enough information for successful implementation should be approved. "No issues found" is a valid and expected outcome for well-written specs.

### What Actually Matters (flag these)

1. **Missing requirements** - Can't implement because we don't know what to build
2. **Ambiguous behavior** - Two reasonable interpretations would produce different code
3. **Security gaps** - Sensitive features without security requirements
4. **Untestable criteria** - No way to verify if implementation is correct

### Do NOT Flag

- Specs that work but aren't structured exactly how you'd write them
- Requirements that are "obvious" from context
- Missing details that implementers can reasonably infer
- "Consider also adding..." scope expansions
- Formatting or organizational preferences
- Theoretical edge cases unlikely to occur

### Before Including Any Issue, Ask Yourself

1. Could this cause incorrect behavior or a security vulnerability?
2. Is there genuine ambiguity that could lead to wrong implementation?
3. Am I expanding scope beyond what was requested?

**Flag if answers to #1 or #2 are "yes" or "uncertain."**

### When In Doubt, Flag It

If you're uncertain whether something is a real issue:
- Flag it as "Clarification Needed" (not Critical)
- Phrase as a question: "Should X handle Y case?"
- Let the author confirm or clarify

Err toward flagging genuine ambiguity, not toward silence. But do not manufacture issues.

---

## Review Instructions

You are reviewing a specification for: `{SPEC_PATH}`

### Step 1: Gather Contents

Read the spec files:
1. `spec.md` - Main specification
2. `tasks.md` - Task breakdown (if exists)
3. `planning/requirements.md` - Refined requirements (if exists)

### Step 2: Core Quality Checks

**Must Check (every spec):**

- [ ] Is the goal clear? (What are we building and why?)
- [ ] Are requirements specific enough to implement? (Not "make it work well")
- [ ] Can we verify completion? (Testable acceptance criteria)
- [ ] Are boundaries defined? (What's explicitly out of scope?)

**Check If Applicable:**

| Spec Area | Key Questions |
|-----------|---------------|
| New features | User stories present? Success criteria defined? |
| API changes | Request/response shapes specified? Error cases covered? |
| Database changes | Schema changes clear? Migration approach? |
| UI features | Interaction behavior described? States defined? |

### Step 3: Specificity Check

Flag only if genuinely blocking:

| Pattern | Only Flag If... |
|---------|-----------------|
| "Handle edge cases" | No edge cases listed and they're non-obvious |
| "Follow best practices" | The practice isn't clear from project conventions |
| "Similar to X" | Critical differences aren't explained |
| Missing file paths | Files can't be inferred from context |

Specs don't need to specify every implementation detail. They need enough clarity on *what* to build for *how* to be determinable.

### Step 4: Task Breakdown Check (If tasks.md exists)

- [ ] Are tasks in executable order?
- [ ] Do dependencies make sense?
- [ ] Is granularity reasonable? (Not 50 micro-tasks, not 2 giant tasks)

### Step 5: Security Review (If Applicable)

Only for specs touching sensitive areas. Skip for UI polish or internal tooling.

**Reference:** [AppExchange Security Review Checklist](../../../docs/security-review-materials/APPEXCHANGE-SECURITY-REVIEW-CHECKLIST.md)

| Spec Area | Security Requirement |
|-----------|---------------------|
| Auth/OAuth | Token storage, session security, refresh flow |
| API endpoints | Authorization, input validation, rate limiting |
| Database | RLS context, parameterized queries |
| User data display | XSS prevention |
| MCE integration | SOAP escaping, zero-data proxy |
| Logging | No PII/secrets in logs |

### Step 6: Provide Feedback

```markdown
## Spec Review: [Spec Name]

### Summary
One paragraph: what the spec accomplishes and whether it's ready.

### Readiness: Ready / Needs Clarification / Needs Rework

### Issues Found

#### Critical (blocks implementation)
- **[Location in spec]** Issue description
  - **Impact:** Why this blocks implementation
  - **Fix:** What needs to be specified

#### Clarifications Needed
- **[Location]** What's ambiguous
  - **Question:** Specific question to resolve it

*(If no issues: "Spec is complete and ready for implementation.")*

### Security Assessment
**Applicable:** Yes / No

| Area | Addressed? |
|------|------------|
| Auth/Access Control | ✅/⚠️/N/A |
| Input Validation | ✅/⚠️/N/A |
| Data Protection | ✅/⚠️/N/A |

*(Skip for specs not touching sensitive areas)*

### Verdict
**Approved** / **Needs Clarification** / **Needs Rework**
```

---

## Valid Review Outcomes

These are all legitimate:

- "Spec is complete and well-structured. Approved for implementation."
- "One clarification needed on error handling, otherwise ready."
- "Solid spec. No issues found."

Do not manufacture feedback to appear thorough. A good spec deserves a clean approval.

---

## Common Anti-Patterns (Reference)

Only flag if the spec actually exhibits these:

| Anti-Pattern | Problem |
|--------------|---------|
| "Build the feature" with no requirements | Nothing to implement against |
| Conflicting requirements | Two statements that can't both be true |
| "Performance should be good" | No measurable target |
| 50+ subtasks for a small feature | Over-specified, creates rigidity |
| Security-sensitive feature with no security requirements | Implementation will have gaps |

---

## Scoring (Optional)

If a score is requested:

| Score | Meaning |
|-------|---------|
| 9-10 | Ready for implementation |
| 7-8 | Minor clarifications, can proceed |
| 5-6 | Significant gaps, needs revision |
| <5 | Major rework needed |

---

## References

- [Addy Osmani: How to write a good spec for AI agents](https://addyosmani.com/blog/good-spec/)
- [JetBrains: Spec-Driven Approach for Coding with AI](https://blog.jetbrains.com/junie/2025/10/how-to-use-a-spec-driven-approach-for-coding-with-ai/)
- [AppExchange Security Review Checklist](../../../docs/security-review-materials/APPEXCHANGE-SECURITY-REVIEW-CHECKLIST.md)
