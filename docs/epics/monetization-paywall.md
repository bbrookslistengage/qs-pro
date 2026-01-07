# Epic: Monetization & Paywall Implementation

## Overview
Implement a robust monetization framework for Query++ (QS Pro) to support its listing as a paid application on the Salesforce AppExchange. This epic follows a tiered approach to move users from the free "Zen Mode" IDE to a production-grade automation suite.

## Subscription Tiers

### 1. Free Tier (Standard)
- **Goal:** Drive adoption and beat "Query Studio."
- **Features:** Zen Mode Editor, Schema Explorer, Up to 5 snippets, Basic Autocomplete.

### 2. Pro Tier ($99/mo)
- **Goal:** Targeted at individual Architects and Power Users.
- **Features:**
  - Unlimited Snippets.
  - Target DE Wizard (Save results to DE).
  - Automation Studio Integration (Create Query Activity).
  - **Pre-Flight Validation:** Detect Primary Key conflicts before automation failures.

### 3. Enterprise Tier ($299+/mo)
- **Goal:** Targeted at Global Brands and Agencies.
- **Features:**
  - **Multi-BU Deployment:** Bulk deploy Query Activities and DEs across many Business Units.
  - **Team Shared Libraries:** Collaborative folders with permissions for snippet sharing.
  - **Performance Analyzer:** Deep SQL analysis to prevent 30-minute timeout failures.
  - **Scenario Builder:** Pre-built templates for complex System Data View joins.

## Technical Requirements (Phase 2 Additions)

### 1. Multi-BU Orchestration
- Backend service to loop through `Client.ID` (MIDs) in SOAP requests.
- Logic to ensure Target DEs exist in target BUs or are located in Shared folders.

### 2. Private vs. Shared Snippets
- Update `snippets` table to support a `scope` (user vs. tenant).
- Implement a shared folder metadata structure for "Workspace" organization.

### 3. Intelligence Engine
- Implement a SQL Parser (e.g., `pg-query-emscripten` or similar) to analyze joins against target DE schemas.
- Build a heuristic engine to flag "performance killers" (e.g., non-SARGable queries).

## Success Metrics
- Conversion rate from Free to Pro tier.
- Org-wide adoption of Shared Libraries in Enterprise accounts.
- Reduction in reported "Automation Failures" for users using Pre-Flight Validation.