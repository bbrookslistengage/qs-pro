import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import { createElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { server } from "@/test/mocks/server";

import {
  runResultsQueryKeys,
  type RunResultsResponse,
  useRunResults,
} from "../use-run-results";

describe("useRunResults", () => {
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
      return createElement(
        QueryClientProvider,
        { client: queryClient },
        children,
      );
    };
  };

  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("query keys", () => {
    it("runResultsQueryKeys.all returns base key", () => {
      expect(runResultsQueryKeys.all).toEqual(["runs"]);
    });

    it("runResultsQueryKeys.results creates page-specific key", () => {
      expect(runResultsQueryKeys.results("run-123", 1)).toEqual([
        "runs",
        "run-123",
        "results",
        1,
      ]);
      expect(runResultsQueryKeys.results("run-456", 5)).toEqual([
        "runs",
        "run-456",
        "results",
        5,
      ]);
    });
  });

  describe("fetching results", () => {
    it("fetches results when enabled and runId is provided", async () => {
      const mockResponse: RunResultsResponse = {
        columns: ["id", "name", "email"],
        rows: [
          { id: 1, name: "John", email: "john@example.com" },
          { id: 2, name: "Jane", email: "jane@example.com" },
        ],
        totalRows: 2,
        page: 1,
        pageSize: 50,
      };

      server.use(
        http.get("/api/runs/run-fetch-test/results", ({ request }) => {
          const url = new URL(request.url);
          expect(url.searchParams.get("page")).toBe("1");
          return HttpResponse.json(mockResponse);
        }),
      );

      const queryClient = createQueryClient();
      const { result } = renderHook(
        () =>
          useRunResults({
            runId: "run-fetch-test",
            page: 1,
            enabled: true,
          }),
        { wrapper: createWrapper(queryClient) },
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockResponse);
      expect(result.current.data?.columns).toEqual(["id", "name", "email"]);
      expect(result.current.data?.rows).toHaveLength(2);
      expect(result.current.data?.totalRows).toBe(2);
    });

    it("does not fetch when enabled is false", async () => {
      let fetchCalled = false;

      server.use(
        http.get("/api/runs/:runId/results", () => {
          fetchCalled = true;
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
      const { result } = renderHook(
        () =>
          useRunResults({
            runId: "run-disabled",
            page: 1,
            enabled: false,
          }),
        { wrapper: createWrapper(queryClient) },
      );

      // Give it some time to potentially fire
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(fetchCalled).toBe(false);
      expect(result.current.isFetching).toBe(false);
    });

    it("does not fetch when runId is null", async () => {
      let fetchCalled = false;

      server.use(
        http.get("/api/runs/:runId/results", () => {
          fetchCalled = true;
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
      const { result } = renderHook(
        () =>
          useRunResults({
            runId: null,
            page: 1,
            enabled: true,
          }),
        { wrapper: createWrapper(queryClient) },
      );

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(fetchCalled).toBe(false);
      expect(result.current.isFetching).toBe(false);
    });
  });

  describe("pagination", () => {
    it("fetches different pages correctly", async () => {
      server.use(
        http.get("/api/runs/run-paginate/results", ({ request }) => {
          const url = new URL(request.url);
          const page = parseInt(url.searchParams.get("page") ?? "1", 10);

          return HttpResponse.json({
            columns: ["id"],
            rows: page === 1 ? [{ id: 1 }, { id: 2 }] : [{ id: 3 }, { id: 4 }],
            totalRows: 4,
            page,
            pageSize: 2,
          });
        }),
      );

      const queryClient = createQueryClient();

      // Fetch page 1
      const { result: result1 } = renderHook(
        () =>
          useRunResults({
            runId: "run-paginate",
            page: 1,
            enabled: true,
          }),
        { wrapper: createWrapper(queryClient) },
      );

      await waitFor(() => {
        expect(result1.current.isSuccess).toBe(true);
      });

      expect(result1.current.data?.page).toBe(1);
      expect(result1.current.data?.rows).toEqual([{ id: 1 }, { id: 2 }]);

      // Fetch page 2
      const { result: result2 } = renderHook(
        () =>
          useRunResults({
            runId: "run-paginate",
            page: 2,
            enabled: true,
          }),
        { wrapper: createWrapper(queryClient) },
      );

      await waitFor(() => {
        expect(result2.current.isSuccess).toBe(true);
      });

      expect(result2.current.data?.page).toBe(2);
      expect(result2.current.data?.rows).toEqual([{ id: 3 }, { id: 4 }]);
    });

    it("creates separate cache entries per page", async () => {
      server.use(
        http.get("/api/runs/run-cache/results", ({ request }) => {
          const url = new URL(request.url);
          const page = parseInt(url.searchParams.get("page") ?? "1", 10);

          return HttpResponse.json({
            columns: ["id"],
            rows: [{ id: page * 10 }],
            totalRows: 100,
            page,
            pageSize: 1,
          });
        }),
      );

      const queryClient = createQueryClient();
      const wrapper = createWrapper(queryClient);

      // Fetch page 1
      const { result: r1 } = renderHook(
        () => useRunResults({ runId: "run-cache", page: 1, enabled: true }),
        { wrapper },
      );

      await waitFor(() => expect(r1.current.isSuccess).toBe(true));

      // Fetch page 2
      const { result: r2 } = renderHook(
        () => useRunResults({ runId: "run-cache", page: 2, enabled: true }),
        { wrapper },
      );

      await waitFor(() => expect(r2.current.isSuccess).toBe(true));

      // Verify both cached
      const page1Data = queryClient.getQueryData(
        runResultsQueryKeys.results("run-cache", 1),
      ) as RunResultsResponse | undefined;
      const page2Data = queryClient.getQueryData(
        runResultsQueryKeys.results("run-cache", 2),
      ) as RunResultsResponse | undefined;

      expect(page1Data?.rows).toEqual([{ id: 10 }]);
      expect(page2Data?.rows).toEqual([{ id: 20 }]);
    });
  });

  describe("error handling", () => {
    // Error tests need longer timeout because useRunResults has retry: 3
    // with retryDelay: 1s, 2s, 4s = 7s total for all retries
    const ERROR_WAIT_TIMEOUT = 10_000;

    it(
      "handles 404 error (run not found)",
      async () => {
        let retryCount = 0;

        server.use(
          http.get("/api/runs/run-not-found/results", () => {
            retryCount++;
            return HttpResponse.json(
              { error: "Run not found" },
              { status: 404 },
            );
          }),
        );

        const queryClient = createQueryClient();
        const { result } = renderHook(
          () =>
            useRunResults({
              runId: "run-not-found",
              page: 1,
              enabled: true,
            }),
          { wrapper: createWrapper(queryClient) },
        );

        await waitFor(
          () => {
            expect(result.current.isError).toBe(true);
          },
          { timeout: ERROR_WAIT_TIMEOUT },
        );

        expect(result.current.error).toBeDefined();
        // Hook retries 3 times + original request = 4 total
        expect(retryCount).toBe(4);
      },
      ERROR_WAIT_TIMEOUT + 2_000,
    );

    it(
      "handles 500 server error",
      async () => {
        let retryCount = 0;

        server.use(
          http.get("/api/runs/run-server-error/results", () => {
            retryCount++;
            return HttpResponse.json(
              { error: "Internal server error" },
              { status: 500 },
            );
          }),
        );

        const queryClient = createQueryClient();
        const { result } = renderHook(
          () =>
            useRunResults({
              runId: "run-server-error",
              page: 1,
              enabled: true,
            }),
          { wrapper: createWrapper(queryClient) },
        );

        await waitFor(
          () => {
            expect(result.current.isError).toBe(true);
          },
          { timeout: ERROR_WAIT_TIMEOUT },
        );

        // Verify retry behavior: original + 3 retries = 4
        expect(retryCount).toBe(4);
      },
      ERROR_WAIT_TIMEOUT + 2_000,
    );

    it(
      "handles 401 unauthorized",
      async () => {
        let retryCount = 0;

        server.use(
          http.get("/api/runs/run-unauth/results", () => {
            retryCount++;
            return HttpResponse.json(
              { error: "Unauthorized" },
              { status: 401 },
            );
          }),
        );

        const queryClient = createQueryClient();
        const { result } = renderHook(
          () =>
            useRunResults({
              runId: "run-unauth",
              page: 1,
              enabled: true,
            }),
          { wrapper: createWrapper(queryClient) },
        );

        await waitFor(
          () => {
            expect(result.current.isError).toBe(true);
          },
          { timeout: ERROR_WAIT_TIMEOUT },
        );

        // Verify retry behavior: original + 3 retries = 4
        expect(retryCount).toBe(4);
      },
      ERROR_WAIT_TIMEOUT + 2_000,
    );
  });

  describe("staleTime and caching behavior", () => {
    it("marks data as not stale (staleTime: Infinity)", async () => {
      let fetchCount = 0;

      server.use(
        http.get("/api/runs/run-stale/results", () => {
          fetchCount++;
          return HttpResponse.json({
            columns: ["id"],
            rows: [{ id: 1 }],
            totalRows: 1,
            page: 1,
            pageSize: 50,
          });
        }),
      );

      const queryClient = createQueryClient();
      const wrapper = createWrapper(queryClient);

      const { result, rerender } = renderHook(
        () =>
          useRunResults({
            runId: "run-stale",
            page: 1,
            enabled: true,
          }),
        { wrapper },
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(fetchCount).toBe(1);

      // Rerender - should not refetch due to staleTime: Infinity
      rerender();
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(fetchCount).toBe(1);
      expect(result.current.data?.rows).toEqual([{ id: 1 }]);
    });
  });

  describe("loading states", () => {
    it("shows loading state while fetching", async () => {
      server.use(
        http.get("/api/runs/run-loading/results", async () => {
          await new Promise((resolve) => setTimeout(resolve, 50));
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
      const { result } = renderHook(
        () =>
          useRunResults({
            runId: "run-loading",
            page: 1,
            enabled: true,
          }),
        { wrapper: createWrapper(queryClient) },
      );

      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeUndefined();

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("empty results", () => {
    it("handles empty result set correctly", async () => {
      const emptyResponse: RunResultsResponse = {
        columns: ["id", "name"],
        rows: [],
        totalRows: 0,
        page: 1,
        pageSize: 50,
      };

      server.use(
        http.get("/api/runs/run-empty/results", () => {
          return HttpResponse.json(emptyResponse);
        }),
      );

      const queryClient = createQueryClient();
      const { result } = renderHook(
        () =>
          useRunResults({
            runId: "run-empty",
            page: 1,
            enabled: true,
          }),
        { wrapper: createWrapper(queryClient) },
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.rows).toEqual([]);
      expect(result.current.data?.totalRows).toBe(0);
      expect(result.current.data?.columns).toEqual(["id", "name"]);
    });
  });
});
