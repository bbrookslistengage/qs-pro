import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { ExecutionResult } from "@/features/editor-workspace/types";

import { ResultsPane } from "../ResultsPane";

function createMockResult(
  overrides: Partial<ExecutionResult> = {},
): ExecutionResult {
  return {
    status: "idle",
    executionStatus: "idle",
    runtime: "",
    columns: [],
    rows: [],
    totalRows: 0,
    currentPage: 1,
    pageSize: 50,
    ...overrides,
  };
}

describe("ResultsPane UI Component Tests", () => {
  describe("Status messages display correctly per state", () => {
    it("shows 'Queued...' when status is queued", () => {
      const result = createMockResult({
        status: "running",
        executionStatus: "queued",
      });

      render(<ResultsPane result={result} />);

      expect(screen.getByTestId("status-message")).toHaveTextContent(
        "Queued...",
      );
      expect(screen.getByTestId("status-spinner")).toBeInTheDocument();
    });

    it("shows 'Creating temp Data Extension...' when creating DE", () => {
      const result = createMockResult({
        status: "running",
        executionStatus: "creating_data_extension",
      });

      render(<ResultsPane result={result} />);

      expect(screen.getByTestId("status-message")).toHaveTextContent(
        "Creating temp Data Extension...",
      );
    });

    it("shows 'Validating query...' when validating", () => {
      const result = createMockResult({
        status: "running",
        executionStatus: "validating_query",
      });

      render(<ResultsPane result={result} />);

      expect(screen.getByTestId("status-message")).toHaveTextContent(
        "Validating query...",
      );
    });

    it("shows 'Executing query...' when executing", () => {
      const result = createMockResult({
        status: "running",
        executionStatus: "executing_query",
      });

      render(<ResultsPane result={result} />);

      expect(screen.getByTestId("status-message")).toHaveTextContent(
        "Executing query...",
      );
    });

    it("shows 'Fetching results...' when fetching results", () => {
      const result = createMockResult({
        status: "running",
        executionStatus: "fetching_results",
      });

      render(<ResultsPane result={result} />);

      expect(screen.getByTestId("status-message")).toHaveTextContent(
        "Fetching results...",
      );
    });

    it("shows success message with runtime and row count when ready", () => {
      const result = createMockResult({
        status: "success",
        executionStatus: "ready",
        runtime: "1.2s",
        totalRows: 150,
        columns: ["ID", "Name"],
        rows: [{ ID: 1, Name: "Test" }],
      });

      render(<ResultsPane result={result} />);

      expect(screen.getByTestId("status-message")).toHaveTextContent(
        "Query executed in 1.2s - 150 records found",
      );
      expect(screen.queryByTestId("status-spinner")).not.toBeInTheDocument();
    });

    it("shows 'Query failed: {errorMessage}' when failed", () => {
      const result = createMockResult({
        status: "error",
        executionStatus: "failed",
        errorMessage: "Syntax error near SELECT",
      });

      render(<ResultsPane result={result} />);

      expect(screen.getByTestId("status-message")).toHaveTextContent(
        "Query failed: Syntax error near SELECT",
      );
    });

    it("shows 'Query canceled' when canceled", () => {
      const result = createMockResult({
        status: "error",
        executionStatus: "canceled",
      });

      render(<ResultsPane result={result} />);

      expect(screen.getByTestId("status-message")).toHaveTextContent(
        "Query canceled",
      );
    });
  });

  describe("Cancel button visibility", () => {
    it("shows Cancel button during queued state", () => {
      const onCancel = vi.fn();
      const result = createMockResult({
        status: "running",
        executionStatus: "queued",
      });

      render(<ResultsPane result={result} onCancel={onCancel} />);

      expect(screen.getByTestId("cancel-button")).toBeInTheDocument();
    });

    it("shows Cancel button during executing_query state", () => {
      const onCancel = vi.fn();
      const result = createMockResult({
        status: "running",
        executionStatus: "executing_query",
      });

      render(<ResultsPane result={result} onCancel={onCancel} />);

      expect(screen.getByTestId("cancel-button")).toBeInTheDocument();
    });

    it("hides Cancel button when status is ready", () => {
      const onCancel = vi.fn();
      const result = createMockResult({
        status: "success",
        executionStatus: "ready",
      });

      render(<ResultsPane result={result} onCancel={onCancel} />);

      expect(screen.queryByTestId("cancel-button")).not.toBeInTheDocument();
    });

    it("hides Cancel button when status is failed", () => {
      const onCancel = vi.fn();
      const result = createMockResult({
        status: "error",
        executionStatus: "failed",
      });

      render(<ResultsPane result={result} onCancel={onCancel} />);

      expect(screen.queryByTestId("cancel-button")).not.toBeInTheDocument();
    });

    it("hides Cancel button when status is canceled", () => {
      const onCancel = vi.fn();
      const result = createMockResult({
        status: "error",
        executionStatus: "canceled",
      });

      render(<ResultsPane result={result} onCancel={onCancel} />);

      expect(screen.queryByTestId("cancel-button")).not.toBeInTheDocument();
    });

    it("calls onCancel when Cancel button is clicked", () => {
      const onCancel = vi.fn();
      const result = createMockResult({
        status: "running",
        executionStatus: "executing_query",
      });

      render(<ResultsPane result={result} onCancel={onCancel} />);

      fireEvent.click(screen.getByTestId("cancel-button"));

      expect(onCancel).toHaveBeenCalledTimes(1);
    });
  });

  describe("Spinner visibility during in-progress states", () => {
    it("shows spinner during all in-progress states", () => {
      const inProgressStates = [
        "queued",
        "creating_data_extension",
        "validating_query",
        "executing_query",
        "fetching_results",
      ] as const;

      for (const executionStatus of inProgressStates) {
        const result = createMockResult({
          status: "running",
          executionStatus,
        });

        const { unmount } = render(<ResultsPane result={result} />);

        expect(
          screen.getByTestId("status-spinner"),
          `Spinner should be visible for ${executionStatus}`,
        ).toBeInTheDocument();

        unmount();
      }
    });

    it("hides spinner on terminal states", () => {
      const terminalStates = ["ready", "failed", "canceled"] as const;

      for (const executionStatus of terminalStates) {
        const status = executionStatus === "ready" ? "success" : "error";
        const result = createMockResult({
          status,
          executionStatus,
        });

        const { unmount } = render(<ResultsPane result={result} />);

        expect(
          screen.queryByTestId("status-spinner"),
          `Spinner should be hidden for ${executionStatus}`,
        ).not.toBeInTheDocument();

        unmount();
      }
    });
  });

  describe("Data grid display", () => {
    it("renders column headers from result columns", () => {
      const result = createMockResult({
        status: "success",
        executionStatus: "ready",
        columns: ["ID", "Name", "Email"],
        rows: [{ ID: 1, Name: "John", Email: "john@test.com" }],
        totalRows: 1,
      });

      render(<ResultsPane result={result} />);

      expect(
        screen.getByRole("columnheader", { name: "ID" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("columnheader", { name: "Name" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("columnheader", { name: "Email" }),
      ).toBeInTheDocument();
    });

    it("renders row data matching column order", () => {
      const result = createMockResult({
        status: "success",
        executionStatus: "ready",
        columns: ["ID", "Name"],
        rows: [
          { ID: 1, Name: "Alice" },
          { ID: 2, Name: "Bob" },
        ],
        totalRows: 2,
      });

      render(<ResultsPane result={result} />);

      expect(screen.getByRole("cell", { name: "1" })).toBeInTheDocument();
      expect(screen.getByRole("cell", { name: "Alice" })).toBeInTheDocument();
      expect(screen.getByRole("cell", { name: "2" })).toBeInTheDocument();
      expect(screen.getByRole("cell", { name: "Bob" })).toBeInTheDocument();
    });

    it("shows empty state message when idle", () => {
      const result = createMockResult({
        status: "idle",
        executionStatus: "idle",
        columns: [],
        rows: [],
      });

      render(<ResultsPane result={result} />);

      // Text appears in both status bar and empty table cell
      const messages = screen.getAllByText("Run a query to see results.");
      expect(messages).toHaveLength(2);
    });

    it("shows no data message when query returns empty results", () => {
      const result = createMockResult({
        status: "success",
        executionStatus: "ready",
        columns: ["ID", "Name"],
        rows: [],
        totalRows: 0,
      });

      render(<ResultsPane result={result} />);

      expect(
        screen.getByText("No data returned for this query."),
      ).toBeInTheDocument();
    });

    it("falls back to Results header when columns array is empty", () => {
      const result = createMockResult({
        status: "idle",
        executionStatus: "idle",
        columns: [],
        rows: [],
      });

      render(<ResultsPane result={result} />);

      expect(
        screen.getByRole("columnheader", { name: "Results" }),
      ).toBeInTheDocument();
    });
  });

  describe("Pagination controls", () => {
    it("displays correct row range for current page", () => {
      const result = createMockResult({
        status: "success",
        executionStatus: "ready",
        columns: ["ID"],
        rows: [{ ID: 1 }],
        totalRows: 150,
        currentPage: 1,
        pageSize: 50,
      });

      render(<ResultsPane result={result} />);

      expect(screen.getByText(/Showing 1 - 50/i)).toBeInTheDocument();
    });

    it("displays correct range for middle page", () => {
      const result = createMockResult({
        status: "success",
        executionStatus: "ready",
        columns: ["ID"],
        rows: [{ ID: 51 }],
        totalRows: 150,
        currentPage: 2,
        pageSize: 50,
      });

      render(<ResultsPane result={result} />);

      expect(screen.getByText(/Showing 51 - 100/i)).toBeInTheDocument();
    });

    it("displays correct range for last partial page", () => {
      const result = createMockResult({
        status: "success",
        executionStatus: "ready",
        columns: ["ID"],
        rows: [{ ID: 101 }],
        totalRows: 125,
        currentPage: 3,
        pageSize: 50,
      });

      render(<ResultsPane result={result} />);

      expect(screen.getByText(/Showing 101 - 125/i)).toBeInTheDocument();
    });

    it("calls onPageChange with page number when page button clicked", () => {
      const onPageChange = vi.fn();
      const result = createMockResult({
        status: "success",
        executionStatus: "ready",
        columns: ["ID"],
        rows: [{ ID: 1 }],
        totalRows: 150,
        currentPage: 1,
        pageSize: 50,
      });

      render(<ResultsPane result={result} onPageChange={onPageChange} />);

      const page2Button = screen.getByRole("button", { name: "2" });
      fireEvent.click(page2Button);

      expect(onPageChange).toHaveBeenCalledWith(2);
    });

    it("highlights current page button", () => {
      const result = createMockResult({
        status: "success",
        executionStatus: "ready",
        columns: ["ID"],
        rows: [{ ID: 51 }],
        totalRows: 150,
        currentPage: 2,
        pageSize: 50,
      });

      render(<ResultsPane result={result} />);

      const page2Button = screen.getByRole("button", { name: "2" });
      expect(page2Button).toHaveClass("bg-primary");
    });

    it("disables previous buttons on first page", () => {
      const result = createMockResult({
        status: "success",
        executionStatus: "ready",
        columns: ["ID"],
        rows: [{ ID: 1 }],
        totalRows: 150,
        currentPage: 1,
        pageSize: 50,
      });

      render(<ResultsPane result={result} />);

      // The pagination container has 4 navigation buttons and page number buttons
      const allButtons = screen.getAllByRole("button");
      const paginationButtons = allButtons.filter(
        (btn) => btn.closest(".flex.items-center.gap-1") !== null,
      );

      // First two pagination buttons (first page, previous page) should be disabled
      expect(paginationButtons[0]).toBeDisabled();
      expect(paginationButtons[1]).toBeDisabled();
    });

    it("disables next buttons on last page", () => {
      const result = createMockResult({
        status: "success",
        executionStatus: "ready",
        columns: ["ID"],
        rows: [{ ID: 101 }],
        totalRows: 150,
        currentPage: 3,
        pageSize: 50,
      });

      render(<ResultsPane result={result} />);

      const allButtons = screen.getAllByRole("button");
      const paginationButtons = allButtons.filter(
        (btn) => btn.closest(".flex.items-center.gap-1") !== null,
      );

      // Last two pagination buttons should be disabled - use at() for safe array access
      const lastButton = paginationButtons.at(-1);
      const secondLastButton = paginationButtons.at(-2);
      expect(lastButton).toBeDefined();
      expect(secondLastButton).toBeDefined();
      expect(lastButton).toBeDisabled();
      expect(secondLastButton).toBeDisabled();
    });

    it("shows ellipsis when more than 5 pages", () => {
      const result = createMockResult({
        status: "success",
        executionStatus: "ready",
        columns: ["ID"],
        rows: [{ ID: 1 }],
        totalRows: 500,
        currentPage: 1,
        pageSize: 50,
      });

      render(<ResultsPane result={result} />);

      expect(screen.getByText("...")).toBeInTheDocument();
    });

    it("shows 0 - 0 range when no results", () => {
      const result = createMockResult({
        status: "success",
        executionStatus: "ready",
        columns: ["ID"],
        rows: [],
        totalRows: 0,
        currentPage: 1,
        pageSize: 50,
      });

      render(<ResultsPane result={result} />);

      expect(screen.getByText(/Showing 0 - 0/i)).toBeInTheDocument();
    });
  });

  describe("View in Contact Builder button", () => {
    it("is enabled when results have rows", () => {
      const onViewInContactBuilder = vi.fn();
      const result = createMockResult({
        status: "success",
        executionStatus: "ready",
        columns: ["ID"],
        rows: [{ ID: 1 }],
        totalRows: 1,
      });

      render(
        <ResultsPane
          result={result}
          onViewInContactBuilder={onViewInContactBuilder}
        />,
      );

      const button = screen.getByRole("button", {
        name: /View in Contact Builder/i,
      });
      expect(button).not.toBeDisabled();
    });

    it("is disabled when results have no rows", () => {
      const onViewInContactBuilder = vi.fn();
      const result = createMockResult({
        status: "success",
        executionStatus: "ready",
        columns: ["ID"],
        rows: [],
        totalRows: 0,
      });

      render(
        <ResultsPane
          result={result}
          onViewInContactBuilder={onViewInContactBuilder}
        />,
      );

      const button = screen.getByRole("button", {
        name: /View in Contact Builder/i,
      });
      expect(button).toBeDisabled();
    });

    it("calls onViewInContactBuilder when clicked", () => {
      const onViewInContactBuilder = vi.fn();
      const result = createMockResult({
        status: "success",
        executionStatus: "ready",
        columns: ["ID"],
        rows: [{ ID: 1 }],
        totalRows: 1,
      });

      render(
        <ResultsPane
          result={result}
          onViewInContactBuilder={onViewInContactBuilder}
        />,
      );

      fireEvent.click(
        screen.getByRole("button", { name: /View in Contact Builder/i }),
      );

      expect(onViewInContactBuilder).toHaveBeenCalledTimes(1);
    });
  });
});
