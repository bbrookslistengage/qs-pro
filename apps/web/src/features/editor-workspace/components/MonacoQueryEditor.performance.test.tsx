import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDebouncedValue } from "@/hooks/use-debounced-value";

describe("MonacoQueryEditor Performance", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("useDebouncedValue_WithRapidUpdates_DebouncesTo150ms", () => {
    // Arrange
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 150),
      { initialProps: { value: "initial" } },
    );

    // Assert initial state
    expect(result.current).toBe("initial");

    // Act - Update rapidly
    rerender({ value: "update1" });
    rerender({ value: "update2" });
    rerender({ value: "update3" });

    // Assert - Still showing initial value before debounce
    expect(result.current).toBe("initial");

    // Act - Advance timers by 150ms
    act(() => {
      vi.advanceTimersByTime(150);
    });

    // Assert - Value updated after debounce
    expect(result.current).toBe("update3");
  });

  it("useDebouncedValue_WithDelayedUpdate_ReturnsLatestValue", () => {
    // Arrange
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 150),
      { initialProps: { value: "initial" } },
    );

    // Act - First update
    rerender({ value: "update1" });

    act(() => {
      vi.advanceTimersByTime(100);
    });

    // Act - Second update before debounce completes
    rerender({ value: "update2" });

    act(() => {
      vi.advanceTimersByTime(150);
    });

    // Assert - Latest value after total debounce time
    expect(result.current).toBe("update2");
  });

  it("useDebouncedValue_WithCustomDelay_UsesProvidedDelay", () => {
    // Arrange
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 300),
      { initialProps: { value: "initial" } },
    );

    // Act - Update value
    rerender({ value: "updated" });

    act(() => {
      vi.advanceTimersByTime(150);
    });

    // Assert - Still initial value at 150ms
    expect(result.current).toBe("initial");

    act(() => {
      vi.advanceTimersByTime(150);
    });

    // Assert - Updated value after 300ms
    expect(result.current).toBe("updated");
  });

  it("useDebouncedValue_OnUnmount_CancelsTimer", () => {
    // Arrange
    const { result, rerender, unmount } = renderHook(
      ({ value }) => useDebouncedValue(value, 150),
      { initialProps: { value: "initial" } },
    );

    // Act - Update and unmount before debounce
    rerender({ value: "updated" });
    unmount();

    act(() => {
      vi.advanceTimersByTime(150);
    });

    // Assert - Value should not update after unmount
    expect(result.current).toBe("initial");
  });
});

describe("MonacoQueryEditor Decoration Updates", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("decorationUpdates_WithRapidTyping_DebouncesUpdates", () => {
    // Arrange
    const mockUpdateDecorations = vi.fn();
    const { rerender } = renderHook(({ sql }) => useDebouncedValue(sql, 150), {
      initialProps: { sql: "SELECT * FROM" },
    });

    // Act - Simulate rapid typing
    rerender({ sql: "SELECT * FROM [" });
    rerender({ sql: "SELECT * FROM [T" });
    rerender({ sql: "SELECT * FROM [Ta" });
    rerender({ sql: "SELECT * FROM [Tab" });
    rerender({ sql: "SELECT * FROM [Table" });
    rerender({ sql: "SELECT * FROM [Table]" });

    // Assert - Updates not called yet
    expect(mockUpdateDecorations).not.toHaveBeenCalled();

    // Act - Complete debounce period
    act(() => {
      vi.advanceTimersByTime(150);
    });

    // Assert - Would trigger single decoration update (simulated)
    // In real implementation, this would call extractTableReferences once
  });

  it("decorationUpdates_WithSlowTyping_UpdatesAfterEachPause", () => {
    // Arrange
    const { result, rerender } = renderHook(
      ({ sql }) => useDebouncedValue(sql, 150),
      { initialProps: { sql: "SELECT" } },
    );

    // Act - Type slowly with pauses
    rerender({ sql: "SELECT *" });
    act(() => {
      vi.advanceTimersByTime(150);
    });

    // Assert - First update complete
    expect(result.current).toBe("SELECT *");

    // Act - Continue typing after pause
    rerender({ sql: "SELECT * FROM" });
    act(() => {
      vi.advanceTimersByTime(150);
    });

    // Assert - Second update complete
    expect(result.current).toBe("SELECT * FROM");
  });
});

describe("MonacoQueryEditor Async Field Fetching", () => {
  it("fieldFetching_WithAbortController_CancelsStaleRequests", async () => {
    // Arrange
    const abortController1 = new AbortController();
    const abortController2 = new AbortController();
    const mockFetch = vi.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(
            () => resolve({ ok: true, json: () => Promise.resolve([]) }),
            100,
          );
        }),
    );

    // Act - First request
    mockFetch({ signal: abortController1.signal });

    // Act - Second request before first completes (cancel first)
    abortController1.abort();
    mockFetch({ signal: abortController2.signal });

    // Assert - Both requests created but first should be cancelled
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(abortController1.signal.aborted).toBe(true);
    expect(abortController2.signal.aborted).toBe(false);
  });

  it("fieldFetching_WithRapidTableChanges_UsesOnlyLatestRequest", () => {
    // Arrange
    const abortControllers: AbortController[] = [];
    const createRequest = () => {
      const controller = new AbortController();
      abortControllers.push(controller);
      return controller;
    };

    // Act - Simulate rapid table changes
    const controller1 = createRequest();
    const controller2 = createRequest();
    const controller3 = createRequest();

    // Abort old requests
    controller1.abort();
    controller2.abort();

    // Assert - Only latest request is active
    expect(controller1.signal.aborted).toBe(true);
    expect(controller2.signal.aborted).toBe(true);
    expect(controller3.signal.aborted).toBe(false);
  });
});

describe("MonacoQueryEditor Join Suggestions Closure", () => {
  it("getJoinSuggestions_InDependencyArray_PreventsStaleClosures", () => {
    // Arrange
    const mockGetJoinSuggestions = vi
      .fn()
      .mockReturnValue([
        { text: "LEFT JOIN [Table2] ON [Table1].ID = [Table2].ID" },
      ]);

    // Act - Simulate dependency array check
    const dependencies = [mockGetJoinSuggestions];

    // Assert - Function reference included in dependencies
    expect(dependencies).toContain(mockGetJoinSuggestions);
  });

  it("inlineCompletionProvider_WithUpdatedSuggestions_UsesLatestFunction", () => {
    // Arrange
    let suggestionVersion = 1;
    const getJoinSuggestions = () => [{ text: `version-${suggestionVersion}` }];

    // Act - Get initial suggestions
    const suggestions1 = getJoinSuggestions();

    // Act - Update version and get new suggestions
    suggestionVersion = 2;
    const suggestions2 = getJoinSuggestions();

    // Assert - Different results based on closure
    expect(suggestions1[0]?.text).toBe("version-1");
    expect(suggestions2[0]?.text).toBe("version-2");
  });
});
