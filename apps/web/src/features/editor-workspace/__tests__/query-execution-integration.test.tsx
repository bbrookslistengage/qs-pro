import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useAuthStore } from "@/store/auth-store";
import { server } from "@/test/mocks/server";
import { createTenantStub, createUserStub } from "@/test/stubs";

import { useQueryExecution } from "../hooks/use-query-execution";

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
  },
}));

const mockToastError = vi.mocked(toast.error);

class MockEventSource {
  static instances: MockEventSource[] = [];
  url: string;
  withCredentials: boolean;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onopen: ((event: Event) => void) | null = null;
  readyState = 0;

  constructor(url: string, options?: { withCredentials?: boolean }) {
    this.url = url;
    this.withCredentials = options?.withCredentials ?? false;
    MockEventSource.instances.push(this);
  }

  close = vi.fn(() => {
    this.readyState = 2;
  });

  simulateMessage(data: object) {
    if (this.onmessage) {
      this.onmessage(
        new MessageEvent("message", { data: JSON.stringify(data) }),
      );
    }
  }

  simulateError() {
    if (this.onerror) {
      this.onerror(new Event("error"));
    }
  }

  static reset() {
    MockEventSource.instances = [];
  }

  static getLatest(): MockEventSource {
    const latest =
      MockEventSource.instances[MockEventSource.instances.length - 1];
    if (!latest) {
      throw new Error("No EventSource instance created");
    }
    return latest;
  }
}

describe("Query Execution Integration Tests", () => {
  const mockSessionStorage = new Map<string, string>();

  const createQueryClient = () => {
    return new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
  };

  const createWrapper = (queryClient: QueryClient) => {
    return function Wrapper({ children }: { children: ReactNode }) {
      return (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      );
    };
  };

  beforeEach(() => {
    MockEventSource.reset();
    mockToastError.mockClear();
    mockSessionStorage.clear();

    vi.stubGlobal("EventSource", MockEventSource);
    vi.stubGlobal("sessionStorage", {
      getItem: (key: string) => mockSessionStorage.get(key) ?? null,
      setItem: (key: string, value: string) =>
        mockSessionStorage.set(key, value),
      removeItem: (key: string) => mockSessionStorage.delete(key),
    });

    useAuthStore.setState({
      user: createUserStub(),
      tenant: createTenantStub(),
      csrfToken: "csrf-test-token-123",
      isAuthenticated: true,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    useAuthStore.getState().logout();
  });

  describe("E2E: Execute query -> receive status updates -> display results", () => {
    it("completes full execution lifecycle with all status transitions", async () => {
      let requestHeaders: Record<string, string> = {};

      server.use(
        http.post("/api/runs", async ({ request }) => {
          requestHeaders = Object.fromEntries(request.headers.entries());
          return HttpResponse.json(
            { runId: "run-e2e-123", status: "queued" },
            { status: 201 },
          );
        }),
        http.get("/api/runs/run-e2e-123/results", () => {
          return HttpResponse.json({
            columns: ["email"],
            rows: [{ email: "test@test.com" }],
            totalRows: 1,
            page: 1,
            pageSize: 50,
          });
        }),
      );

      const queryClient = createQueryClient();
      const { result } = renderHook(() => useQueryExecution(), {
        wrapper: createWrapper(queryClient),
      });

      expect(result.current.status).toBe("idle");
      expect(result.current.isRunning).toBe(false);

      await act(async () => {
        await result.current.execute("SELECT * FROM _Subscribers", "Test");
      });

      expect(requestHeaders["x-csrf-token"]).toBe("csrf-test-token-123");
      expect(result.current.status).toBe("queued");
      expect(result.current.isRunning).toBe(true);

      const eventSource = MockEventSource.getLatest();

      const statusSequence = [
        { status: "validating_query", message: "Validating query..." },
        {
          status: "creating_data_extension",
          message: "Creating temp Data Extension...",
        },
        { status: "executing_query", message: "Executing query..." },
        { status: "fetching_results", message: "Fetching results..." },
        { status: "ready", message: "Query completed" },
      ] as const;

      for (const statusEvent of statusSequence) {
        await act(async () => {
          eventSource.simulateMessage(statusEvent);
        });

        if (statusEvent.status === "ready") {
          expect(result.current.isRunning).toBe(false);
        } else {
          expect(result.current.isRunning).toBe(true);
        }
        expect(result.current.status).toBe(statusEvent.status);
      }

      expect(result.current.status).toBe("ready");
      expect(eventSource.close).toHaveBeenCalled();
      expect(mockSessionStorage.get("activeRunId")).toBeUndefined();

      await waitFor(() => {
        expect(result.current.results.data).toEqual({
          columns: ["email"],
          rows: [{ email: "test@test.com" }],
          totalRows: 1,
          page: 1,
          pageSize: 50,
        });
      });
    });

    it("refetches results when changing pages", async () => {
      const requestedPages: string[] = [];

      server.use(
        http.post("/api/runs", () => {
          return HttpResponse.json(
            { runId: "run-page-123", status: "queued" },
            { status: 201 },
          );
        }),
        http.get("/api/runs/run-page-123/results", ({ request }) => {
          const page = new URL(request.url).searchParams.get("page") ?? "1";
          requestedPages.push(page);

          if (page === "2") {
            return HttpResponse.json({
              columns: ["email"],
              rows: [{ email: "page2@test.com" }],
              totalRows: 2,
              page: 2,
              pageSize: 50,
            });
          }

          return HttpResponse.json({
            columns: ["email"],
            rows: [{ email: "page1@test.com" }],
            totalRows: 2,
            page: 1,
            pageSize: 50,
          });
        }),
      );

      const queryClient = createQueryClient();
      const { result } = renderHook(() => useQueryExecution(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        await result.current.execute("SELECT * FROM _Subscribers", "Test");
      });

      const eventSource = MockEventSource.getLatest();
      await act(async () => {
        eventSource.simulateMessage({ status: "ready", message: "Done" });
      });

      await waitFor(() => {
        expect(result.current.results.data?.rows[0]).toEqual({
          email: "page1@test.com",
        });
      });

      await act(async () => {
        result.current.setPage(2);
      });

      await waitFor(() => {
        expect(result.current.results.data?.rows[0]).toEqual({
          email: "page2@test.com",
        });
      });

      expect(requestedPages).toEqual(["1", "2"]);
    });
  });

  describe("E2E: Execute query -> cancel -> verify canceled state", () => {
    it("cancels running query and transitions to canceled state", async () => {
      let cancelEndpointCalled = false;

      server.use(
        http.post("/api/runs", () => {
          return HttpResponse.json(
            { runId: "run-cancel-e2e", status: "queued" },
            { status: 201 },
          );
        }),
        http.post("/api/runs/run-cancel-e2e/cancel", () => {
          cancelEndpointCalled = true;
          return HttpResponse.json({ status: "canceled" });
        }),
      );

      const queryClient = createQueryClient();
      const { result } = renderHook(() => useQueryExecution(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        await result.current.execute("SELECT * FROM DE", "Test");
      });

      const eventSource = MockEventSource.getLatest();

      await act(async () => {
        eventSource.simulateMessage({
          status: "executing_query",
          message: "Executing...",
        });
      });

      expect(result.current.status).toBe("executing_query");
      expect(result.current.isRunning).toBe(true);

      await act(async () => {
        await result.current.cancel();
      });

      expect(cancelEndpointCalled).toBe(true);
      expect(result.current.status).toBe("canceled");
      expect(result.current.isRunning).toBe(false);
      expect(eventSource.close).toHaveBeenCalled();
      expect(mockSessionStorage.get("activeRunId")).toBeUndefined();
    });
  });

  describe("E2E: Rate limit reached -> button disabled -> run completes -> button enabled", () => {
    it("handles rate limit and re-enables after completion", async () => {
      let callCount = 0;

      server.use(
        http.post("/api/runs", () => {
          callCount++;
          if (callCount === 1) {
            return HttpResponse.json(
              { error: "Rate limit exceeded" },
              { status: 429 },
            );
          }
          return HttpResponse.json(
            { runId: "run-retry", status: "queued" },
            { status: 201 },
          );
        }),
        http.get("/api/runs/run-retry/results", () => {
          return HttpResponse.json({
            columns: [],
            rows: [],
            totalRows: 0,
            page: 1,
            pageSize: 50,
          });
        }),
      );

      const queryClient = createQueryClient();
      const { result } = renderHook(() => useQueryExecution(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        await result.current.execute("SELECT 1", "Test");
      });

      expect(mockToastError).toHaveBeenCalledWith(
        "Too many queries running. Close a tab or wait for a query to complete.",
      );
      expect(result.current.status).toBe("idle");
      expect(result.current.isRunning).toBe(false);

      await act(async () => {
        await result.current.execute("SELECT 1", "Test Retry");
      });

      expect(result.current.status).toBe("queued");
      expect(result.current.isRunning).toBe(true);

      const eventSource = MockEventSource.getLatest();

      await act(async () => {
        eventSource.simulateMessage({ status: "ready", message: "Done" });
      });

      expect(result.current.status).toBe("ready");
      expect(result.current.isRunning).toBe(false);

      await waitFor(() => {
        expect(result.current.results.data?.totalRows).toBe(0);
      });
    });
  });

  describe("Integration: CSRF token flows through to backend", () => {
    it("includes CSRF token in POST /runs request header", async () => {
      let capturedCsrfToken: string | undefined;

      server.use(
        http.post("/api/runs", ({ request }) => {
          capturedCsrfToken = request.headers.get("x-csrf-token") ?? undefined;
          return HttpResponse.json(
            { runId: "run-csrf", status: "queued" },
            { status: 201 },
          );
        }),
      );

      const queryClient = createQueryClient();
      const { result } = renderHook(() => useQueryExecution(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        await result.current.execute("SELECT 1", "CSRF Test");
      });

      expect(capturedCsrfToken).toBe("csrf-test-token-123");
    });

    it("includes CSRF token in POST /runs/:runId/cancel request", async () => {
      let cancelCsrfToken: string | undefined;

      server.use(
        http.post("/api/runs", () => {
          return HttpResponse.json(
            { runId: "run-csrf-cancel", status: "queued" },
            { status: 201 },
          );
        }),
        http.post("/api/runs/run-csrf-cancel/cancel", ({ request }) => {
          cancelCsrfToken = request.headers.get("x-csrf-token") ?? undefined;
          return HttpResponse.json({ status: "canceled" });
        }),
      );

      const queryClient = createQueryClient();
      const { result } = renderHook(() => useQueryExecution(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        await result.current.execute("SELECT 1", "Test");
      });

      await act(async () => {
        await result.current.cancel();
      });

      expect(cancelCsrfToken).toBe("csrf-test-token-123");
    });
  });

  describe("Integration: MCE validation error surfaces in UI", () => {
    it("displays MCE validation error when query is invalid", async () => {
      server.use(
        http.post("/api/runs", () => {
          return HttpResponse.json(
            { runId: "run-validation-error", status: "queued" },
            { status: 201 },
          );
        }),
      );

      const queryClient = createQueryClient();
      const { result } = renderHook(() => useQueryExecution(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        await result.current.execute("INVALID SQL", "Test");
      });

      const eventSource = MockEventSource.getLatest();

      await act(async () => {
        eventSource.simulateMessage({
          status: "failed",
          message: "Query failed: Syntax error near INVALID",
          errorMessage: "Syntax error near INVALID",
        });
      });

      expect(result.current.status).toBe("failed");
      expect(result.current.errorMessage).toBe("Syntax error near INVALID");
      expect(result.current.isRunning).toBe(false);
      expect(eventSource.close).toHaveBeenCalled();
    });
  });

  describe("Integration: SSE reconnection on page refresh", () => {
    it("reconnects to existing run on mount when sessionStorage has runId", async () => {
      mockSessionStorage.set("activeRunId", "run-reconnect-123");

      server.use(
        http.get("/api/runs/run-reconnect-123", () => {
          return HttpResponse.json({
            runId: "run-reconnect-123",
            status: "executing_query",
          });
        }),
        http.get("/api/runs/run-reconnect-123/results", () => {
          return HttpResponse.json({
            columns: ["email"],
            rows: [{ email: "reconnect@test.com" }],
            totalRows: 1,
            page: 1,
            pageSize: 50,
          });
        }),
      );

      const queryClient = createQueryClient();
      const { result } = renderHook(() => useQueryExecution(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.runId).toBe("run-reconnect-123");
      });

      expect(result.current.status).toBe("executing_query");
      expect(result.current.isRunning).toBe(true);

      const eventSource = MockEventSource.getLatest();
      expect(eventSource.url).toBe("/api/runs/run-reconnect-123/events");

      await act(async () => {
        eventSource.simulateMessage({ status: "ready", message: "Done" });
      });

      expect(result.current.status).toBe("ready");
      expect(result.current.isRunning).toBe(false);

      await waitFor(() => {
        expect(result.current.results.data?.rows[0]).toEqual({
          email: "reconnect@test.com",
        });
      });
    });

    it("does not reconnect when sessionStorage runId is for completed run", async () => {
      mockSessionStorage.set("activeRunId", "run-completed-123");

      server.use(
        http.get("/api/runs/run-completed-123", () => {
          return HttpResponse.json({
            runId: "run-completed-123",
            status: "ready",
          });
        }),
        http.get("/api/runs/run-completed-123/results", () => {
          return HttpResponse.json({
            columns: [],
            rows: [],
            totalRows: 0,
            page: 1,
            pageSize: 50,
          });
        }),
      );

      const queryClient = createQueryClient();
      const { result } = renderHook(() => useQueryExecution(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.runId).toBe("run-completed-123");
      });

      expect(result.current.status).toBe("ready");
      expect(result.current.isRunning).toBe(false);
      expect(mockSessionStorage.get("activeRunId")).toBeUndefined();
    });
  });
});
