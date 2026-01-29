import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { SqlDiagnostic } from "@/features/editor-workspace/utils/sql-lint/types";

import { useSqlDiagnostics } from "../use-sql-diagnostics";

// Mock Worker class following the same pattern as the existing test file
class MockWorker {
  static instances: MockWorker[] = [];

  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  postMessage = vi.fn();
  terminate = vi.fn();

  constructor(_url: string | URL, _options?: WorkerOptions) {
    MockWorker.instances.push(this);
  }

  emitMessage(data: unknown) {
    this.onmessage?.(new MessageEvent("message", { data }));
  }

  static reset() {
    MockWorker.instances = [];
  }

  static latest(): MockWorker {
    const latest = MockWorker.instances.at(-1);
    if (!latest) {
      throw new Error("No Worker instance created");
    }
    return latest;
  }
}

// Mock lintSql for controlled sync diagnostics
const mockLintSql = vi.fn(
  (
    _sql: string,
    _options: { dataExtensions?: unknown; cursorPosition?: number },
  ): SqlDiagnostic[] => [],
);

vi.mock("@/features/editor-workspace/utils/sql-lint", () => ({
  lintSql: (
    sql: string,
    options: { dataExtensions?: unknown; cursorPosition?: number },
  ) => mockLintSql(sql, options),
}));

describe("useSqlDiagnostics (hook behaviors)", () => {
  beforeEach(() => {
    MockWorker.reset();
    vi.useFakeTimers();
    vi.stubGlobal("Worker", MockWorker);
    mockLintSql.mockReturnValue([]);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe("debounced worker requests", () => {
    it("debounces rapid SQL changes before sending to worker", async () => {
      // Arrange - Start with valid SQL so worker gets created
      const { rerender } = renderHook(
        ({ sql }) => useSqlDiagnostics({ sql, debounceMs: 100 }),
        { initialProps: { sql: "SELECT 1" } },
      );

      await act(async () => {});

      // Advance past debounce to ensure worker is created
      act(() => {
        vi.advanceTimersByTime(100);
      });

      const worker = MockWorker.latest();

      // Clear the initial postMessage calls (init + first lint)
      worker.postMessage.mockClear();

      // Act - Simulate rapid typing within debounce window
      rerender({ sql: "SELECT 2" });
      await act(async () => {});

      // Count lint calls before debounce completes
      let lintCalls = worker.postMessage.mock.calls.filter(
        ([message]) =>
          message &&
          typeof message === "object" &&
          (message as { type?: string }).type === "lint",
      );
      expect(lintCalls).toHaveLength(0);

      // More rapid changes
      rerender({ sql: "SELECT 2 FROM" });
      rerender({ sql: "SELECT 2 FROM Users" });

      // Assert - Still no lint requests (all within debounce window)
      lintCalls = worker.postMessage.mock.calls.filter(
        ([message]) =>
          message &&
          typeof message === "object" &&
          (message as { type?: string }).type === "lint",
      );
      expect(lintCalls).toHaveLength(0);
    });

    it("sends request to worker after debounce period", async () => {
      // Arrange - Use short debounce for testing
      const { result } = renderHook(() =>
        useSqlDiagnostics({ sql: "SELECT 1 FROM Users", debounceMs: 50 }),
      );

      await act(async () => {});

      // Assert - Before debounce, isAsyncLinting should be true
      expect(result.current.isAsyncLinting).toBe(true);

      // Act - Advance past debounce period
      act(() => {
        vi.advanceTimersByTime(50);
      });

      const worker = MockWorker.latest();

      // Assert - Worker should have received lint request
      const lintCall = worker.postMessage.mock.calls.find(
        ([message]) =>
          message &&
          typeof message === "object" &&
          (message as { type?: string }).type === "lint",
      );
      expect(lintCall).toBeDefined();
      expect(lintCall?.[0]).toMatchObject({
        type: "lint",
        sql: "SELECT 1 FROM Users",
      });
    });
  });

  describe("diagnostic deduplication", () => {
    it("deduplicates identical diagnostics from worker", async () => {
      // Arrange - Set up sync diagnostic
      const syncDiagnostic: SqlDiagnostic = {
        message: "Missing FROM clause",
        severity: "prereq",
        startIndex: 0,
        endIndex: 6,
      };
      mockLintSql.mockReturnValue([syncDiagnostic]);

      const { result } = renderHook(() =>
        useSqlDiagnostics({ sql: "SELECT", debounceMs: 10 }),
      );

      await act(async () => {});

      // Act - Advance timers and simulate worker response with identical diagnostic
      act(() => {
        vi.advanceTimersByTime(10);
      });

      const worker = MockWorker.latest();

      // Get the requestId from the lint request
      const lintCall = worker.postMessage.mock.calls.find(
        ([message]) =>
          (message as { type?: string } | undefined)?.type === "lint",
      );
      const requestId = (lintCall?.[0] as { requestId?: string })?.requestId;

      // Simulate worker returning the same diagnostic
      const asyncDiagnostic: SqlDiagnostic = {
        message: "Missing FROM clause",
        severity: "prereq",
        startIndex: 0,
        endIndex: 6,
      };

      act(() => {
        worker.emitMessage({
          type: "lint-result",
          requestId,
          diagnostics: [asyncDiagnostic],
          duration: 10,
        });
      });

      // Assert - Should only have one diagnostic (deduplicated)
      expect(result.current.diagnostics).toHaveLength(1);
      expect(result.current.diagnostics[0]).toEqual(syncDiagnostic);
    });

    it("preserves unique diagnostics from different sources", async () => {
      // Arrange - Set up different sync diagnostic
      const syncDiagnostic: SqlDiagnostic = {
        message: "Missing FROM clause",
        severity: "prereq",
        startIndex: 0,
        endIndex: 6,
      };
      mockLintSql.mockReturnValue([syncDiagnostic]);

      const { result } = renderHook(() =>
        useSqlDiagnostics({ sql: "SELECT *", debounceMs: 10 }),
      );

      await act(async () => {});

      // Act - Advance timers
      act(() => {
        vi.advanceTimersByTime(10);
      });

      const worker = MockWorker.latest();

      // Get the requestId from the lint request
      const lintCall = worker.postMessage.mock.calls.find(
        ([message]) =>
          (message as { type?: string } | undefined)?.type === "lint",
      );
      const requestId = (lintCall?.[0] as { requestId?: string })?.requestId;

      // Simulate worker response with different diagnostic
      const asyncDiagnostic: SqlDiagnostic = {
        message: "SELECT * not recommended",
        severity: "warning",
        startIndex: 7,
        endIndex: 8,
      };

      act(() => {
        worker.emitMessage({
          type: "lint-result",
          requestId,
          diagnostics: [asyncDiagnostic],
          duration: 10,
        });
      });

      // Assert - Should have both unique diagnostics
      expect(result.current.diagnostics).toHaveLength(2);
      expect(result.current.syncDiagnostics).toContainEqual(syncDiagnostic);
      expect(result.current.asyncDiagnostics).toContainEqual(asyncDiagnostic);
    });
  });

  describe("stale response filtering", () => {
    it("ignores responses for outdated SQL content", async () => {
      // Arrange
      const { result, rerender } = renderHook(
        ({ sql }) => useSqlDiagnostics({ sql, debounceMs: 10 }),
        { initialProps: { sql: "SELECT 1" } },
      );

      await act(async () => {});

      // Act - Advance timers for first request
      act(() => {
        vi.advanceTimersByTime(10);
      });

      const worker = MockWorker.latest();

      // Get the first requestId
      const firstLintCall = worker.postMessage.mock.calls.find(
        ([message]) =>
          (message as { type?: string } | undefined)?.type === "lint",
      );
      const firstRequestId = (firstLintCall?.[0] as { requestId?: string })
        ?.requestId;

      // Change SQL - this creates a new request ID
      rerender({ sql: "SELECT 2" });

      // Advance timers for second request
      act(() => {
        vi.advanceTimersByTime(10);
      });

      // Simulate late response from the first request (outdated)
      const staleDiagnostic: SqlDiagnostic = {
        message: "Stale diagnostic",
        severity: "error",
        startIndex: 0,
        endIndex: 5,
      };

      act(() => {
        worker.emitMessage({
          type: "lint-result",
          requestId: firstRequestId, // Old request ID
          diagnostics: [staleDiagnostic],
          duration: 10,
        });
      });

      // Assert - Stale response should be ignored
      expect(result.current.asyncDiagnostics).toHaveLength(0);
      expect(result.current.diagnostics).not.toContainEqual(staleDiagnostic);
    });

    it("processes responses for current SQL content", async () => {
      // Arrange
      const { result } = renderHook(() =>
        useSqlDiagnostics({ sql: "INSERT INTO Users", debounceMs: 10 }),
      );

      await act(async () => {});

      // Act - Advance timers
      act(() => {
        vi.advanceTimersByTime(10);
      });

      const worker = MockWorker.latest();

      // Get the requestId
      const lintCall = worker.postMessage.mock.calls.find(
        ([message]) =>
          (message as { type?: string } | undefined)?.type === "lint",
      );
      const requestId = (lintCall?.[0] as { requestId?: string })?.requestId;

      // Simulate response with matching request ID
      const currentDiagnostic: SqlDiagnostic = {
        message: "INSERT not allowed in MCE",
        severity: "error",
        startIndex: 0,
        endIndex: 6,
      };

      act(() => {
        worker.emitMessage({
          type: "lint-result",
          requestId, // Current request ID
          diagnostics: [currentDiagnostic],
          duration: 15,
        });
      });

      // Assert - Response should be processed
      expect(result.current.asyncDiagnostics).toContainEqual(currentDiagnostic);
      expect(result.current.lastLintDuration).toBe(15);
      expect(result.current.isAsyncLinting).toBe(false);
    });
  });

  describe("empty SQL handling", () => {
    it("skips analysis for empty SQL", async () => {
      // Arrange & Act - Render with empty SQL
      const { result } = renderHook(() =>
        useSqlDiagnostics({ sql: "   ", debounceMs: 10 }),
      );

      await act(async () => {});

      // Advance timers past debounce
      act(() => {
        vi.advanceTimersByTime(10);
      });

      // Note: Worker is not created for empty SQL since the effect returns early
      // We verify the behavior through hook state instead
      expect(MockWorker.instances).toHaveLength(0);

      // Async linting should be false for empty SQL
      expect(result.current.isAsyncLinting).toBe(false);
      expect(result.current.asyncDiagnostics).toHaveLength(0);
    });
  });
});
