import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { QueryExecutionStatus } from "@/features/editor-workspace/hooks/use-query-execution";
import type { RunResultsResponse } from "@/features/editor-workspace/hooks/use-run-results";
import type {
  DataExtension,
  ExecutionResult,
  Folder,
  QueryTab,
  SavedQuery,
} from "@/features/editor-workspace/types";

import { EditorWorkspace } from "../EditorWorkspace";

// Mock child components to isolate EditorWorkspace tests
vi.mock("../MonacoQueryEditor", () => ({
  MonacoQueryEditor: ({
    onChange,
    onSave,
    onRunRequest,
    value,
  }: {
    onChange?: (content: string) => void;
    onSave?: () => void;
    onRunRequest?: () => void;
    value: string;
  }) => (
    <div data-testid="mock-editor">
      <textarea
        data-testid="editor-textarea"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "s" && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            onSave?.();
          }
          if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            onRunRequest?.();
          }
        }}
      />
    </div>
  ),
}));

vi.mock("../ResultsPane", () => ({
  ResultsPane: ({
    result,
    onCancel,
  }: {
    result: ExecutionResult;
    onCancel?: () => void;
  }) => (
    <div data-testid="mock-results-pane" data-status={result.status}>
      {result.errorMessage ? (
        <span data-testid="error-message">{result.errorMessage}</span>
      ) : null}
      {result.status === "running" && (
        <button onClick={onCancel} data-testid="cancel-button">
          Cancel
        </button>
      )}
      {result.rows.length > 0 && (
        <span data-testid="row-count">{result.rows.length} rows</span>
      )}
    </div>
  ),
}));

vi.mock("../WorkspaceSidebar", () => ({
  WorkspaceSidebar: ({
    isCollapsed,
    onToggle,
  }: {
    isCollapsed: boolean;
    onToggle?: () => void;
  }) => (
    <div data-testid="mock-sidebar" data-collapsed={isCollapsed}>
      <button onClick={onToggle} data-testid="sidebar-toggle">
        {isCollapsed ? "Expand" : "Collapse"} Sidebar
      </button>
    </div>
  ),
}));

vi.mock("../DataExtensionModal", () => ({
  DataExtensionModal: ({
    isOpen,
    onClose,
  }: {
    isOpen: boolean;
    onClose: () => void;
  }) =>
    isOpen ? (
      <div data-testid="mock-de-modal" role="dialog">
        <h2>Create Data Extension</h2>
        <button onClick={onClose} data-testid="de-modal-close">
          Close
        </button>
      </div>
    ) : null,
}));

vi.mock("../QueryActivityModal", () => ({
  QueryActivityModal: ({
    isOpen,
    onClose,
  }: {
    isOpen: boolean;
    onClose: () => void;
  }) =>
    isOpen ? (
      <div data-testid="mock-qa-modal" role="dialog">
        <h2>Deploy to Automation</h2>
        <button onClick={onClose} data-testid="qa-modal-close">
          Close
        </button>
      </div>
    ) : null,
}));

vi.mock("../SaveQueryModal", () => ({
  SaveQueryModal: ({
    isOpen,
    onClose,
    onSave,
    folders,
  }: {
    isOpen: boolean;
    onClose: () => void;
    onSave: (name: string, folderId: string) => void;
    folders: Folder[];
  }) =>
    isOpen ? (
      <div data-testid="mock-save-modal" role="dialog">
        <h2>Save Query</h2>
        <button onClick={onClose} data-testid="save-modal-cancel">
          Cancel
        </button>
        <button
          onClick={() => onSave("Test Query", folders[0]?.id ?? "folder-1")}
          data-testid="save-modal-confirm"
        >
          Save
        </button>
      </div>
    ) : null,
}));

vi.mock("../ConfirmationDialog", () => ({
  ConfirmationDialog: ({
    isOpen,
    title,
    onClose,
    onConfirm,
    confirmLabel,
  }: {
    isOpen: boolean;
    title: string;
    onClose: () => void;
    onConfirm: () => void;
    confirmLabel?: string;
  }) =>
    isOpen ? (
      <div data-testid="mock-confirmation-dialog" role="alertdialog">
        <h2 data-testid="confirmation-title">{title}</h2>
        <button onClick={onClose} data-testid="confirmation-cancel">
          Cancel
        </button>
        <button
          onClick={() => {
            onConfirm();
            onClose();
          }}
          data-testid="confirmation-confirm"
        >
          {confirmLabel ?? "Confirm"}
        </button>
      </div>
    ) : null,
}));

// Mock FeatureGate to always render children
vi.mock("@/components/FeatureGate", () => ({
  FeatureGate: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

// Mock hooks
type MockQueryResults = {
  data: RunResultsResponse | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
};

type MockQueryExecution = {
  execute: (sqlText: string, snippetName?: string) => Promise<void>;
  cancel: () => Promise<void>;
  status: QueryExecutionStatus;
  isRunning: boolean;
  runId: string | null;
  errorMessage: string | null;
  results: MockQueryResults;
  currentPage: number;
  setPage: (page: number) => void;
};

const mockExecute = vi.fn<MockQueryExecution["execute"]>().mockResolvedValue();
const mockCancel = vi.fn<MockQueryExecution["cancel"]>().mockResolvedValue();
const mockSetPage = vi.fn<MockQueryExecution["setPage"]>();

const defaultMockQueryExecution: MockQueryExecution = {
  execute: mockExecute,
  cancel: mockCancel,
  status: "idle",
  isRunning: false,
  runId: null,
  errorMessage: null,
  results: {
    data: null,
    isLoading: false,
    error: null,
    refetch: vi.fn<MockQueryResults["refetch"]>().mockResolvedValue(undefined),
  },
  currentPage: 1,
  setPage: mockSetPage,
};

let mockQueryExecutionReturn: MockQueryExecution = {
  ...defaultMockQueryExecution,
};

vi.mock("@/features/editor-workspace/hooks/use-query-execution", () => ({
  useQueryExecution: () => mockQueryExecutionReturn,
}));

vi.mock(
  "@/features/editor-workspace/utils/sql-lint/use-sql-diagnostics",
  () => ({
    useSqlDiagnostics: () => [],
  }),
);

// Helper functions
function createDefaultProps(): Parameters<typeof EditorWorkspace>[0] {
  return {
    tenantId: "tenant-1",
    eid: "100001234",
    folders: [
      { id: "folder-1", name: "My Queries", parentId: null, type: "library" },
    ] satisfies Folder[],
    savedQueries: [] satisfies SavedQuery[],
    dataExtensions: [] satisfies DataExtension[],
    executionResult: createMockExecutionResult(),
    isSidebarCollapsed: false,
  };
}

function createMockExecutionResult(
  overrides: Partial<ExecutionResult> = {},
): ExecutionResult {
  return {
    status: "idle",
    runtime: "0ms",
    totalRows: 0,
    currentPage: 1,
    pageSize: 50,
    columns: [],
    rows: [],
    ...overrides,
  };
}

function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
}

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

function renderEditorWorkspace(
  props: Partial<Parameters<typeof EditorWorkspace>[0]> = {},
) {
  const queryClient = createQueryClient();
  const mergedProps = { ...createDefaultProps(), ...props };

  return {
    ...render(<EditorWorkspace {...mergedProps} />, {
      wrapper: createWrapper(queryClient),
    }),
    props: mergedProps,
  };
}

// Helper to find the tab group containers in the tab rail
function getTabGroups(): HTMLElement[] {
  // Tab groups are .group divs inside the tab rail overflow container
  return Array.from(document.querySelectorAll(".group.relative"));
}

// Helper to find close button within a tab group
function getCloseButtonInGroup(group: HTMLElement): HTMLElement | null {
  const buttons = within(group).getAllByRole("button");
  // Close button is the one with opacity-0 class (hidden until hover)
  return buttons.find((btn) => btn.classList.contains("opacity-0")) ?? null;
}

describe("EditorWorkspace", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockQueryExecutionReturn = { ...defaultMockQueryExecution };
  });

  describe("tab lifecycle", () => {
    it("creates new tab when New Tab button clicked", async () => {
      const user = userEvent.setup();
      const onNewTab = vi.fn();
      renderEditorWorkspace({ onNewTab });

      // Find the "New Tab" button - it's in the tab rail with specific styling
      const tabRailButtons = screen.getAllByRole("button");
      const newTabButton = tabRailButtons.find(
        (btn) =>
          btn.classList.contains("text-primary") &&
          btn.classList.contains("hover:bg-primary/10"),
      );

      expect(newTabButton).not.toBeUndefined();
      await user.click(newTabButton as HTMLElement);

      // onNewTab callback should be called
      await waitFor(() => {
        expect(onNewTab).toHaveBeenCalled();
      });
    });

    it("closes tab when close button clicked", async () => {
      const user = userEvent.setup();
      const onTabClose = vi.fn();

      const initialTabs: QueryTab[] = [
        { id: "tab-1", name: "Query 1", content: "", isDirty: false },
        { id: "tab-2", name: "Query 2", content: "", isDirty: false },
      ];

      renderEditorWorkspace({ initialTabs, onTabClose });

      // Get tab groups - should have 2 tabs
      const tabGroups = getTabGroups();
      expect(tabGroups.length).toBe(2);

      // Find close button on second tab and click it
      const closeButton = getCloseButtonInGroup(tabGroups[1] as HTMLElement);
      expect(closeButton).not.toBeNull();
      await user.click(closeButton as HTMLElement);

      await waitFor(() => {
        expect(onTabClose).toHaveBeenCalledWith("tab-2");
      });
    });

    it("switches active tab when tab header clicked", async () => {
      const user = userEvent.setup();
      const onTabChange = vi.fn();

      const initialTabs: QueryTab[] = [
        { id: "tab-1", name: "Query 1", content: "SELECT 1", isDirty: false },
        { id: "tab-2", name: "Query 2", content: "SELECT 2", isDirty: false },
      ];

      renderEditorWorkspace({ initialTabs, onTabChange });

      // Get tab groups
      const tabGroups = getTabGroups();
      expect(tabGroups.length).toBe(2);

      // Find the main button (not close button) in second tab group
      const tab2Buttons = within(tabGroups[1] as HTMLElement).getAllByRole(
        "button",
      );
      const tab2Button = tab2Buttons.find(
        (btn) => !btn.classList.contains("opacity-0"),
      );

      expect(tab2Button).not.toBeUndefined();

      // First tab should be active initially
      const tab1Buttons = within(tabGroups[0] as HTMLElement).getAllByRole(
        "button",
      );
      const tab1Button = tab1Buttons.find(
        (btn) => !btn.classList.contains("opacity-0"),
      );
      expect(tab1Button).toHaveClass("bg-primary");

      // Click on second tab
      await user.click(tab2Button as HTMLElement);

      // Second tab should now be active
      await waitFor(() => {
        expect(tab2Button).toHaveClass("bg-primary");
        expect(onTabChange).toHaveBeenCalledWith("tab-2");
      });
    });

    it("prompts for save when closing dirty tab", async () => {
      const user = userEvent.setup();

      const initialTabs: QueryTab[] = [
        { id: "tab-1", name: "Query 1", content: "", isDirty: false },
      ];

      renderEditorWorkspace({ initialTabs });

      // Type in editor to make tab dirty
      const editor = screen.getByTestId("editor-textarea");
      await user.type(editor, "SELECT * FROM Test");

      // Get tab group and close button
      const tabGroups = getTabGroups();
      const closeButton = getCloseButtonInGroup(tabGroups[0] as HTMLElement);

      expect(closeButton).not.toBeNull();
      await user.click(closeButton as HTMLElement);

      // Confirmation dialog should appear
      await waitFor(() => {
        expect(
          screen.getByTestId("mock-confirmation-dialog"),
        ).toBeInTheDocument();
        expect(screen.getByTestId("confirmation-title")).toHaveTextContent(
          /unsaved changes/i,
        );
      });
    });

    it("allows close without save when user confirms discard", async () => {
      const user = userEvent.setup();
      const onTabClose = vi.fn();

      const initialTabs: QueryTab[] = [
        { id: "tab-1", name: "Query 1", content: "", isDirty: false },
        { id: "tab-2", name: "Query 2", content: "", isDirty: false },
      ];

      renderEditorWorkspace({ initialTabs, onTabClose });

      // Make first tab dirty
      const editor = screen.getByTestId("editor-textarea");
      await user.type(editor, "SELECT * FROM Test");

      // Get tab group and close button
      const tabGroups = getTabGroups();
      const closeButton = getCloseButtonInGroup(tabGroups[0] as HTMLElement);

      expect(closeButton).not.toBeNull();
      await user.click(closeButton as HTMLElement);

      // Wait for dialog
      await waitFor(() => {
        expect(
          screen.getByTestId("mock-confirmation-dialog"),
        ).toBeInTheDocument();
      });

      // Confirm discard
      await user.click(screen.getByTestId("confirmation-confirm"));

      // Tab should be closed
      await waitFor(() => {
        expect(onTabClose).toHaveBeenCalledWith("tab-1");
      });
    });

    it("cancels close when user cancels discard prompt", async () => {
      const user = userEvent.setup();
      const onTabClose = vi.fn();

      const initialTabs: QueryTab[] = [
        { id: "tab-1", name: "Query 1", content: "", isDirty: false },
      ];

      renderEditorWorkspace({ initialTabs, onTabClose });

      // Make tab dirty
      const editor = screen.getByTestId("editor-textarea");
      await user.type(editor, "SELECT * FROM Test");

      // Get tab group and close button
      const tabGroups = getTabGroups();
      const closeButton = getCloseButtonInGroup(tabGroups[0] as HTMLElement);

      expect(closeButton).not.toBeNull();
      await user.click(closeButton as HTMLElement);

      // Wait for dialog
      await waitFor(() => {
        expect(
          screen.getByTestId("mock-confirmation-dialog"),
        ).toBeInTheDocument();
      });

      // Cancel the close
      await user.click(screen.getByTestId("confirmation-cancel"));

      // Tab should still exist, onTabClose not called
      await waitFor(() => {
        expect(
          screen.queryByTestId("mock-confirmation-dialog"),
        ).not.toBeInTheDocument();
      });
      expect(onTabClose).not.toHaveBeenCalled();
      // Verify tab group still exists
      expect(getTabGroups().length).toBe(1);
    });
  });

  describe("modal handling", () => {
    // Helper to get toolbar buttons in the icon toolbar area
    function getToolbarIconButtons(): HTMLElement[] {
      // The toolbar icon buttons are in div.flex.items-center.gap-1
      const toolbarSection = document.querySelector(
        ".flex.items-center.gap-1.overflow-visible",
      );
      if (!toolbarSection) {
        return [];
      }
      return Array.from(toolbarSection.querySelectorAll("button"));
    }

    it("opens SaveQueryModal when save triggered on new query", async () => {
      const user = userEvent.setup();

      // Default tabs are isNew: true
      renderEditorWorkspace();

      // First button in toolbar icons is the save button (Diskette icon)
      const toolbarButtons = getToolbarIconButtons();
      expect(toolbarButtons.length).toBeGreaterThan(0);

      const saveButton = toolbarButtons.at(0);
      expect(saveButton).toBeDefined();
      await user.click(saveButton as HTMLElement);

      // SaveQueryModal should open
      await waitFor(() => {
        expect(screen.getByTestId("mock-save-modal")).toBeInTheDocument();
      });
    });

    it("saves existing query without modal when save triggered", async () => {
      const user = userEvent.setup();
      const onSave = vi.fn();

      const initialTabs: QueryTab[] = [
        {
          id: "tab-1",
          name: "Existing Query",
          content: "SELECT 1",
          isDirty: true,
          isNew: false,
        },
      ];

      renderEditorWorkspace({ initialTabs, onSave });

      // First button in toolbar icons is the save button
      const toolbarButtons = getToolbarIconButtons();
      const saveButton = toolbarButtons.at(0);
      expect(saveButton).toBeDefined();

      await user.click(saveButton as HTMLElement);

      // Should call onSave directly, not open modal
      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith("tab-1", "SELECT 1");
      });
      expect(screen.queryByTestId("mock-save-modal")).not.toBeInTheDocument();
    });

    it("closes SaveQueryModal on cancel", async () => {
      const user = userEvent.setup();
      renderEditorWorkspace();

      // Open save modal
      const toolbarButtons = getToolbarIconButtons();
      const saveButton = toolbarButtons.at(0);
      expect(saveButton).toBeDefined();
      await user.click(saveButton as HTMLElement);

      await waitFor(() => {
        expect(screen.getByTestId("mock-save-modal")).toBeInTheDocument();
      });

      // Click cancel
      await user.click(screen.getByTestId("save-modal-cancel"));

      // Modal should close
      await waitFor(() => {
        expect(screen.queryByTestId("mock-save-modal")).not.toBeInTheDocument();
      });
    });

    it("saves query and closes modal on confirm", async () => {
      const user = userEvent.setup();
      const onSaveAs = vi.fn();

      renderEditorWorkspace({ onSaveAs });

      // Open save modal
      const toolbarButtons = getToolbarIconButtons();
      const saveButton = toolbarButtons.at(0);
      expect(saveButton).toBeDefined();
      await user.click(saveButton as HTMLElement);

      await waitFor(() => {
        expect(screen.getByTestId("mock-save-modal")).toBeInTheDocument();
      });

      // Confirm save
      await user.click(screen.getByTestId("save-modal-confirm"));

      // onSaveAs should be called and modal closed
      await waitFor(() => {
        expect(onSaveAs).toHaveBeenCalled();
        expect(screen.queryByTestId("mock-save-modal")).not.toBeInTheDocument();
      });
    });

    it("opens DataExtensionModal when DE action triggered", async () => {
      const user = userEvent.setup();
      renderEditorWorkspace();

      // DE button is the 4th button in toolbar icons (after save, format, export)
      const toolbarButtons = getToolbarIconButtons();
      // Buttons: 0=Save, 1=Format, 2=Export, 3=Create DE
      const deButton = toolbarButtons.at(3);
      expect(deButton).toBeDefined();
      await user.click(deButton as HTMLElement);

      // Modal should open
      await waitFor(() => {
        expect(screen.getByTestId("mock-de-modal")).toBeInTheDocument();
      });
    });

    it("opens QueryActivityModal when activity action triggered", async () => {
      const user = userEvent.setup();
      renderEditorWorkspace();

      // Find and click Deploy to Automation button - has specific text
      const deployButton = screen.getByRole("button", {
        name: /deploy to automation/i,
      });
      await user.click(deployButton);

      // Modal should open
      await waitFor(() => {
        expect(screen.getByTestId("mock-qa-modal")).toBeInTheDocument();
      });
    });

    it("closes modals via close button", async () => {
      const user = userEvent.setup();
      renderEditorWorkspace();

      // DE button is the 4th button in toolbar icons
      const toolbarButtons = getToolbarIconButtons();
      const deButton = toolbarButtons.at(3);
      expect(deButton).toBeDefined();
      await user.click(deButton as HTMLElement);

      await waitFor(() => {
        expect(screen.getByTestId("mock-de-modal")).toBeInTheDocument();
      });

      // Close via button
      await user.click(screen.getByTestId("de-modal-close"));

      await waitFor(() => {
        expect(screen.queryByTestId("mock-de-modal")).not.toBeInTheDocument();
      });
    });
  });

  describe("SQL execution flow", () => {
    it("executes SQL when run button clicked", async () => {
      const user = userEvent.setup();

      const initialTabs: QueryTab[] = [
        {
          id: "tab-1",
          name: "Test Query",
          content: "SELECT * FROM Contacts",
          isDirty: false,
        },
      ];

      renderEditorWorkspace({ initialTabs });

      // Click run button
      const runButton = screen.getByTestId("run-button");
      await user.click(runButton);

      // execute should be called with content
      await waitFor(() => {
        expect(mockExecute).toHaveBeenCalledWith(
          "SELECT * FROM Contacts",
          "Test Query",
        );
      });
    });

    it("shows loading state during execution", () => {
      // Mock running state
      mockQueryExecutionReturn = {
        ...defaultMockQueryExecution,
        status: "running",
        isRunning: true,
      };

      renderEditorWorkspace();

      // Spinner should be visible
      expect(screen.getByTestId("run-spinner")).toBeInTheDocument();

      // Run button should be disabled
      expect(screen.getByTestId("run-button")).toBeDisabled();
    });

    it("displays results on successful execution", () => {
      mockQueryExecutionReturn = {
        ...defaultMockQueryExecution,
        status: "ready",
        isRunning: false,
        results: {
          data: {
            columns: ["email", "name"],
            rows: [{ email: "test@test.com", name: "Test User" }],
            totalRows: 1,
            page: 1,
            pageSize: 50,
          },
          isLoading: false,
          error: null,
          refetch: vi.fn(),
        },
      };

      renderEditorWorkspace({
        executionResult: createMockExecutionResult({
          status: "success",
          columns: ["email", "name"],
          rows: [{ email: "test@test.com", name: "Test User" }],
          totalRows: 1,
        }),
      });

      // Results pane should show data
      const resultsPane = screen.getByTestId("mock-results-pane");
      expect(resultsPane).toHaveAttribute("data-status", "success");
      expect(screen.getByTestId("row-count")).toHaveTextContent("1 rows");
    });

    it("displays error message on failed execution", () => {
      mockQueryExecutionReturn = {
        ...defaultMockQueryExecution,
        status: "failed",
        isRunning: false,
        errorMessage: "Query execution failed: Invalid syntax",
      };

      renderEditorWorkspace({
        executionResult: createMockExecutionResult({
          status: "error",
          errorMessage: "Query execution failed: Invalid syntax",
        }),
      });

      // Error should be visible
      const resultsPane = screen.getByTestId("mock-results-pane");
      expect(resultsPane).toHaveAttribute("data-status", "error");
      expect(screen.getByTestId("error-message")).toHaveTextContent(
        "Query execution failed: Invalid syntax",
      );
    });
  });

  describe("sidebar behavior", () => {
    it("collapses sidebar when toggle button clicked", async () => {
      const user = userEvent.setup();
      const onToggleSidebar = vi.fn();

      renderEditorWorkspace({ isSidebarCollapsed: false, onToggleSidebar });

      // Sidebar should show expanded state
      const sidebar = screen.getByTestId("mock-sidebar");
      expect(sidebar).toHaveAttribute("data-collapsed", "false");

      // Click toggle
      await user.click(screen.getByTestId("sidebar-toggle"));

      // onToggleSidebar callback should be called
      expect(onToggleSidebar).toHaveBeenCalled();
    });

    it("expands sidebar when toggle button clicked", async () => {
      const user = userEvent.setup();
      const onToggleSidebar = vi.fn();

      renderEditorWorkspace({ isSidebarCollapsed: true, onToggleSidebar });

      // Sidebar should show collapsed state
      const sidebar = screen.getByTestId("mock-sidebar");
      expect(sidebar).toHaveAttribute("data-collapsed", "true");

      // Click toggle
      await user.click(screen.getByTestId("sidebar-toggle"));

      // onToggleSidebar callback should be called
      expect(onToggleSidebar).toHaveBeenCalled();
    });
  });

  describe("dirty tracking", () => {
    // Helper to get toolbar buttons in the icon toolbar area
    function getToolbarIconButtons(): HTMLElement[] {
      const toolbarSection = document.querySelector(
        ".flex.items-center.gap-1.overflow-visible",
      );
      if (!toolbarSection) {
        return [];
      }
      return Array.from(toolbarSection.querySelectorAll("button"));
    }

    it("marks tab as dirty when content changes", async () => {
      const user = userEvent.setup();

      const initialTabs: QueryTab[] = [
        { id: "tab-1", name: "Clean Query", content: "", isDirty: false },
      ];

      renderEditorWorkspace({ initialTabs });

      // Initially no pulse indicator
      const initialPulse = document.querySelector(".animate-pulse");
      expect(initialPulse).toBeNull();

      // Type in editor to make dirty
      const editor = screen.getByTestId("editor-textarea");
      await user.type(editor, "SELECT 1");

      // Should now have dirty indicator (pulse dot)
      await waitFor(() => {
        const pulseIndicator = document.querySelector(".animate-pulse");
        expect(pulseIndicator).not.toBeNull();
      });
    });

    it("clears dirty flag after successful save", async () => {
      const user = userEvent.setup();
      const onSave = vi.fn();

      const initialTabs: QueryTab[] = [
        {
          id: "tab-1",
          name: "Existing Query",
          content: "SELECT 1",
          isDirty: false,
          isNew: false,
        },
      ];

      renderEditorWorkspace({ initialTabs, onSave });

      // Make dirty
      const editor = screen.getByTestId("editor-textarea");
      await user.type(editor, " FROM Test");

      // Should be dirty now (pulse indicator visible)
      await waitFor(() => {
        const pulseIndicator = document.querySelector(".animate-pulse");
        expect(pulseIndicator).not.toBeNull();
      });

      // Find and click save button (first in toolbar icons)
      const toolbarButtons = getToolbarIconButtons();
      const saveButton = toolbarButtons.at(0);
      expect(saveButton).toBeDefined();

      await user.click(saveButton as HTMLElement);

      // onSave should be called
      expect(onSave).toHaveBeenCalled();

      // Should no longer be dirty (no pulse indicator)
      await waitFor(() => {
        const pulseIndicator = document.querySelector(".animate-pulse");
        expect(pulseIndicator).toBeNull();
      });
    });
  });
});
