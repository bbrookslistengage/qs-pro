# Product Mission

## Pitch
Query++ is an ISV-grade SQL Integrated Development Environment (IDE) that helps Salesforce Marketing Cloud Engagement (MCE) Architects and Campaign Managers reduce query development time and eliminate runtime failures by providing a robust "Zen Mode" interface with intelligent context-aware autocomplete and strict guardrails.

## Users

### Primary Customers
- **MCE Architects:** Need to quickly query subscriber segments to verify counts without memorizing schema names. Need to validate query logic before deploying to Automation Studio.
- **Campaign Managers:** Need a low-friction way to inspect data, verify audience sizes, and troubleshoot data issues without deep technical knowledge of MCE's underlying table structures.

### User Personas
**The MCE Architect**
- **Role:** Technical Architect / Developer
- **Context:** Building mission-critical data pipelines and segmentation logic within Salesforce Marketing Cloud Engagement.
- **Pain Points:** Queries lost upon closing tabs, generic text types failing in production, and "Silent Failures" due to undocumented SQL limitations.
- **Goals:** Develop queries efficiently, ensure production safety, and deploy directly to Automation Studio.

## The Problem

### The "Scratchpad" Limit & Silent Failures
Current tools lack persistence; queries are lost upon closing tabs, and results are trapped in temporary tables. Furthermore, MCE's SQL engine has strict, often undocumented limitations. Users often discover these only after a query fails.

**Our Solution:** A "Zen Mode" IDE that knows the platform rules so the user doesn't have to. It warns users about invalid MCE SQL as they type (prevention over correction) and provides persistence for queries and snippets.

## Differentiators

### Intelligent Guardrails
Unlike native tools, we provide real-time blocking of prohibited commands (UPDATE, DELETE) and warn about platform-specific limitations *before* execution, preventing runtime errors.

### Zero-Data Proxy Architecture
Unlike traditional SQL clients, our architecture ensures PII is handled according to strict ISV standards, leveraging a pass-through proxy that processes results in memory without unnecessary persistence.

### Direct-to-Automation Deployment
Unlike Query Studio, we bridge the gap between ad-hoc testing and production by allowing users to save queries directly as permanent MCE Query Activities.

## Key Features

### Core Features
- **Monaco Editor Workspace:** A professional-grade editor with multi-cursor support, minimap, and robust syntax highlighting for MCE SQL.
- **Intelligent Autocomplete:** Context-aware suggestions for Data Extensions and fields, including real-time type information (e.g., Text(254) vs Number).
- **Split-Action "RUN":** Toggle between "Run to Temp" for quick scratchpad testing and "Run to Target DE" for production data management.

### Collaboration Features
- **Snippet Library:** Centralized repository to save, categorize, and share complex query blocks across the team.
- **Saved Queries Explorer:** Persistent storage for all drafted queries, eliminating the risk of losing work when closing browser tabs.

### Advanced Features
- **Intelligent Linter (Guardrails):** Real-time detection and blocking of prohibited T-SQL commands and warning system for date-view retention limits.
- **Target DE Wizard:** A structured modal for creating permanent Data Extensions with explicit schema mapping and type validation.
- **Heuristic Error Translator:** Converts cryptic MCE engine errors into actionable human-readable advice and troubleshooting steps.

---

## Technical Appendix

### Design Principles
- **"Zen Mode" First:** Maximize screen real estate. No extraneous sidebars or Activity Bars. Focus entirely on the code and the data.
- **Context over Memorization:** The system knows the schema and the platform rules so the user doesn't have to. Intelligent defaults and suggestions are the priority.
- **Prevention over Correction:** Warn the user about invalid MCE SQL as they type, not after they run. Shift-left on error detection.

### Functional Requirements
... (I will use the existing content here)

### 5.1 The Editor Workspace (Core)
- **FR-1.1 Monaco Engine:** Utilize the Monaco Editor engine for minimap, multi-cursor editing, and robust syntax highlighting.
- **FR-1.2 Syntax Highlighting:** SQL keywords must be visually distinct from string literals, table names, and field names.
- **FR-1.3 Intelligent Autocomplete:**
    - **Trigger:** `FROM` / `JOIN` triggers a Data Extension (DE) search list.
    - **Context:** `alias.` triggers fields for that specific table/DE.
    - **Display:** Show Field Name + Data Type (e.g., `EmailAddress - Text(254)`).

### 5.2 Intelligent Guardrails (The "Linter")
- **FR-2.1 Restricted Command Blocker:**
    - **Constraint:** The RUN button must be disabled (or trigger a blocking modal) if the editor contains prohibited keywords: `UPDATE`, `DELETE`, `INSERT`, `DROP`, `ALTER`, `TRUNCATE`, `MERGE` or any CTE Logic.
    - **Feedback:** Highlight these keywords in RED with a tooltip: "Not Supported: MCE SQL only supports SELECT. Use the 'Run to Target' wizard for updates."
- **FR-2.2 Procedural SQL Ban:**
    - **Constraint:** Flag usage of T-SQL procedural elements: `DECLARE`, `SET`, `WHILE`, `PRINT`, `GO`.
    - **Feedback:** Tooltip: "Variables and loops are not supported in Marketing Cloud."
- **FR-2.3 Temp Table & CTE Detection:**
    - **Constraint:** Detect `#TempTable` or `WITH x AS (...)` syntax.
    - **Feedback:** Warn user: "Temp tables and CTEs are not officially supported and may cause failures. Use Subqueries instead."
- **FR-2.4 Data View Retention Warning:**
    - **Logic:** Detect usage of System Data Views (`_Open`, `_Click`, `_Sent`, `_Bounce`).
    - **Constraint:** If a `WHERE` clause filters on a date > 6 months in the past, display a warning toast: "Data Limitation: System views only retain 6 months of history. This query may return 0 rows."

### 5.3 Navigation & Organization (Sidebar)
- **FR-3.1 Primary Sidebar:** A single, collapsible left panel containing:
    - **Explorer:** Folder tree of Data Extensions.
    - **Library:** Folder tree of Saved Queries and Snippets.
- **FR-3.2 No Activity Bar:** No vertical icon strip on the far left (VS Code style), maximizing horizontal space for the editor.

### 5.4 Execution & Deployment
- **FR-4.1 Split-Action "RUN":**
    - **Primary:** "Run to Temp" (Expires in 24h).
    - **Secondary:** "Run & Save to Target DE" (Opens Wizard).
- **FR-4.2 Split-Action "SAVE":**
    - **Primary:** "Save Query" (Internal persistence).
    - **Secondary:** "Create SQL Query Definition" (Deploy to MCE).

### 5.5 The Target Wizard (Modal)
- **FR-5.1 Configuration:** Input "Target DE Name" and select Action: Overwrite, Append, or Update.
- **FR-5.2 Schema Mapping:** Two-column grid (Source vs. Target Type) for explicit mapping.
- **FR-5.3 Type Restrictions:**
    - **Constraint:** Must conform to all MCE Data Types.
    - **Defaulting:** If a text field exceeds 4000 chars, default to `Text(4000)` and warn the user.

### 5.6 Results & Analysis
- **FR-6.1 Interactive Grid:** Virtualized grid with pagination to view all results without performance lag.
- **FR-6.2 Deep Linking:** Button "Open in Contact Builder" directs user to MCE UI for that specific Data Extension.
- **FR-6.3 Heuristic Error Translator:** Analyze generic "Query Failed" errors and suggest specific causes (e.g., Primary Key Violation, Type Mismatch).

## Non-Functional Requirements
- **Performance:** Linter (Guardrails) must run in real-time (debounce < 300ms) without freezing the UI.
- **Security:** Deep links and API interactions must respect and maintain MCE session authentication.
- **Scalability:** The Explorer must handle Business Units with thousands of Data Extensions via lazy-loading.

## UX/UI Specifications
- **Theme:** Professional Dark Mode/Light Mode toggle.
- **Visual Hierarchy:**
    - **Errors:** Red underline + Hover Card.
    - **Warnings:** Yellow underline + Status Bar text.
    - **Valid Code:** Standard Syntax Highlighting.
- **Layout:** "Zen Mode" - Minimalist chrome, high-contrast typography.

## Success Metrics
- **Time-to-Deploy:** Reduce time from "Draft" to "Automation" by 50%.
- **Failed Runs:** Reduce "Invalid Keyword" errors (e.g., users trying to UPDATE) to 0% through real-time linting.

## API Interaction Mapping

### 1. Initialization (App Load)
| User Action | Business Rule | API Implementation Details |
| :--- | :--- | :--- |
| **App Loads** | Fetch Local Data Extensions | Retrieve all DEs in the current BU. **Method:** SOAP Retrieve, **Object:** `DataExtension`. **Filter:** `Client.ID = [Current_MID]` |
| **App Loads** | Fetch Shared Data Extensions | Retrieve DEs from Parent BU. **Method:** SOAP Retrieve, **Object:** `DataExtension`. **Filter:** `Client.ID = [Parent_MID]` |
| **App Loads** | Build Folder Structure | Organize DEs visually. **Method:** SOAP Retrieve, **Object:** `DataFolder`. **Filter:** `ContentType = dataextension` |

### 2. Intelligent Autocomplete (Context Awareness)
| User Action | Business Rule | API Implementation Details |
| :--- | :--- | :--- |
| **Expand DE / Type FROM** | Lazy-Load Schema | Fetch columns only when needed. **Method:** SOAP Retrieve, **Object:** `DataExtensionField`. **Filter:** `DataExtension.CustomerKey = [Selected_DE_Key]` |

### 3. Execution: The "Run" Button
#### Scenario A: "Run to Temp" (Scratchpad)
| Step | Business Rule | API Implementation Details |
| :--- | :--- | :--- |
| 1 | Generate Session Artifacts | Generate unique `RunID`. Target DE Name = `Spectra_Temp_[RunID]`. |
| 2 | Create Temp Data Extension | Create container with 24h expiration. **Method:** SOAP Create, **Object:** `DataExtension`. Payload includes `DataRetentionPeriodLength: 24` |
| 3 | Create Query Definition | Point SQL to the new Temp DE. **Method:** SOAP Create, **Object:** `QueryDefinition`. |
| 4 | Execute Query | Start the job. **Method:** SOAP Perform, **Object:** `QueryDefinition`. **Action:** `Start` |
| 5 | Retrieve Results | Fetch first 50 rows for the grid. **Method:** REST GET, **Endpoint:** `/data/v1/customobjectdata/key/[Temp_DE_Key]/rowset` |

#### Scenario B: "Run & Save to Target DE" (Wizard)
| Step | Business Rule | API Implementation Details |
| :--- | :--- | :--- |
| 1 | Validate Target Exists | Check if overwriting existing DE. **Method:** SOAP Retrieve, **Object:** `DataExtension`. |
| 2 | Create Permanent DE | Create table with Wizard-defined mapping. **Method:** SOAP Create, **Object:** `DataExtension` (No Retention Policy). |
| 3 | Execute Query | Same as Scenario A, but pointing to the Permanent DE Key. |

### 4. Deployment: "Deploy to Automation"
| User Action | Business Rule | API Implementation Details |
| :--- | :--- | :--- |
| **Click "Deploy"** | Create Query Activity | Save SQL as permanent asset. **Method:** SOAP Create, **Object:** `QueryDefinition`. |

### 5. Data Viewing
| User Action | Business Rule | API Implementation Details |
| :--- | :--- | :--- |
| **Scroll Grid** | Fetch Next Page | Fetch next 50 rows. **Method:** REST GET, **Endpoint:** `/data/v1/customobjectdata/key/{DE_Key}/rowset?page=2` |
| **Click "Contact Builder"** | Deep Link | Construct URL: `https://mc.exacttarget.com/cloud/#app/Email/Datamanagement/DataExtension/...` |