# Story: Query Performance Analyzer & Coaching Engine

## Overview
As part of the Phase 2 Enterprise tier, this story focuses on building a deep SQL analysis engine that detects common Salesforce Marketing Cloud "performance killers." Unlike a standard linter, this engine provides actionable coaching to prevent the dreaded 30-minute timeout and optimize system resources.

## User Stories
- **As an MCE Architect**, I want to be warned if my query is "non-SARGable" so that I can ensure indexes are used.
- **As a Developer**, I want to receive "Better SQL" suggestions so that I can learn SFMC best practices while I work.
- **As a Team Lead**, I want a "Query Health Score" to quickly assess if a query is safe for production automation.

## Performance Rules & Coaching Logic

### 1. SARGable Filter Enforcement
- **Detection:** Use of functions on a column in `WHERE` or `JOIN` (e.g., `DATEDIFF(day, EventDate, GETDATE())`).
- **Coaching:** "Move the function to the right side of the operator."
- **Example Suggestion:** Change `WHERE DATEDIFF(day, Date, GETDATE()) < 7` to `WHERE Date >= DATEADD(day, -7, GETDATE())`.

### 2. Schema Mismatch Detection (Enterprise Only)
- **Detection:** Joining fields with different data types (e.g., `NVARCHAR` joined to `VARCHAR` or `INT`).
- **Coaching:** "Implicit conversion detected. Align Data Extension schemas or use an explicit `CAST` to avoid performance degradation."

### 3. Data View Join Guardrails
- **Detection:** Direct `JOIN` between two or more system Data Views (e.g., `_Sent` JOIN `_Click`).
- **Coaching:** "Direct joins between system views are high-risk. Consider staging these views into indexed Data Extensions first."

### 4. Over-Retention Warnings
- **Detection:** Filtering on system Data Views using a date range > 180 days.
- **Coaching:** "System views only retain 6 months of history. Data > 180 days will return 0 rows but still consume processing power."

### 5. `SELECT *` and Wide-Row Detection
- **Detection:** Use of `SELECT *` or queries where the row width exceeds 4,000 characters.
- **Coaching:** "Explicitly name your columns. Wide rows (>4,000 chars) are stored 'off-row' and slow down retrieval."

### 6. Non-Indexed Join Warning
- **Detection:** Joins on fields that are not Primary Keys or Sendable Relationship fields in the source DE.
- **Coaching:** "Field [FieldName] is not indexed. Joins on non-indexed fields are the leading cause of 30-minute timeouts."

## Features to Implement

### The Query Health Score
A real-time score (0-100) based on detected risks:
- **Red (< 60):** Critical issues (Non-SARGable joins on Data Views).
- **Yellow (60-85):** Optimization recommended (`SELECT *`, Wide rows).
- **Green (86-100):** Optimized for SFMC.

### The "Better SQL" Diff
A UI component that shows a side-by-side comparison of the user's SQL vs. the Optimized suggestion (e.g., moving functions to the right side of the operator).

## Technical Implementation Notes
- **Linter Engine:** Integration with a SQL parser to traverse the AST (Abstract Syntax Tree).
- **Schema Context:** The linter must be "Schema-Aware," pulling field types from the `MetadataService`.
- **Latency:** Analysis must happen in a debounced background worker to keep the editor responsive.
