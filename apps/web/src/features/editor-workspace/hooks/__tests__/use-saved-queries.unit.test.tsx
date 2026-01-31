import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import { createElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { server } from "@/test/mocks/server";

import {
  useCreateSavedQuery,
  useDeleteSavedQuery,
  useSavedQueries,
  useSavedQuery,
  useSavedQueryCount,
  useUpdateSavedQuery,
} from "../use-saved-queries";

// Mock data
const mockQueries = [
  {
    id: "q1",
    name: "Query 1",
    folderId: null,
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "q2",
    name: "Query 2",
    folderId: "f1",
    updatedAt: "2024-01-02T00:00:00Z",
  },
];

const mockFullQuery = {
  id: "q1",
  name: "Query 1",
  sqlText: "SELECT * FROM _Subscribers",
  folderId: null,
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
};

describe("use-saved-queries hooks", () => {
  const createQueryClient = () => {
    return new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
        mutations: {
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

  describe("useSavedQueries", () => {
    it("fetches list of saved queries", async () => {
      server.use(
        http.get("/api/saved-queries", () => {
          return HttpResponse.json(mockQueries);
        }),
      );

      const queryClient = createQueryClient();
      const { result } = renderHook(() => useSavedQueries(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toHaveLength(2);
      expect(result.current.data?.at(0)?.name).toBe("Query 1");
    });

    it("handles loading state", async () => {
      server.use(
        http.get("/api/saved-queries", async () => {
          await new Promise((resolve) => setTimeout(resolve, 50));
          return HttpResponse.json(mockQueries);
        }),
      );

      const queryClient = createQueryClient();
      const { result } = renderHook(() => useSavedQueries(), {
        wrapper: createWrapper(queryClient),
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });
  });

  describe("useSavedQuery", () => {
    it("fetches single query with SQL text", async () => {
      server.use(
        http.get("/api/saved-queries/:id", ({ params }) => {
          if (params.id === "q1") {
            return HttpResponse.json(mockFullQuery);
          }
          return new HttpResponse(null, { status: 404 });
        }),
      );

      const queryClient = createQueryClient();
      const { result } = renderHook(() => useSavedQuery("q1"), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.sqlText).toBe("SELECT * FROM _Subscribers");
    });

    it("is disabled when id is undefined", () => {
      const queryClient = createQueryClient();
      const { result } = renderHook(() => useSavedQuery(undefined), {
        wrapper: createWrapper(queryClient),
      });

      expect(result.current.fetchStatus).toBe("idle");
    });
  });

  describe("useSavedQueryCount", () => {
    it("fetches query count", async () => {
      server.use(
        http.get("/api/saved-queries/count", () => {
          return HttpResponse.json({ count: 2 });
        }),
      );

      const queryClient = createQueryClient();
      const { result } = renderHook(() => useSavedQueryCount(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toBe(2);
    });
  });

  describe("useCreateSavedQuery", () => {
    it("creates a new saved query", async () => {
      server.use(
        http.post("/api/saved-queries", async ({ request }) => {
          const body = (await request.json()) as {
            name: string;
            sqlText: string;
            folderId?: string | null;
          };
          return HttpResponse.json(
            {
              id: "new-id",
              name: body.name,
              sqlText: body.sqlText,
              folderId: body.folderId ?? null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
            { status: 201 },
          );
        }),
      );

      const queryClient = createQueryClient();
      const { result } = renderHook(() => useCreateSavedQuery(), {
        wrapper: createWrapper(queryClient),
      });

      result.current.mutate({
        name: "New Query",
        sqlText: "SELECT 1",
        folderId: null,
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.name).toBe("New Query");
      expect(result.current.data?.id).toBe("new-id");
    });
  });

  describe("useUpdateSavedQuery", () => {
    it("updates an existing query with optimistic update", async () => {
      server.use(
        http.patch("/api/saved-queries/:id", async ({ params, request }) => {
          const body = (await request.json()) as {
            name?: string;
            sqlText?: string;
          };
          return HttpResponse.json({
            ...mockFullQuery,
            id: params.id as string,
            ...body,
          });
        }),
      );

      const queryClient = createQueryClient();

      // Pre-populate cache
      queryClient.setQueryData(["saved-queries"], mockQueries);

      const { result } = renderHook(() => useUpdateSavedQuery(), {
        wrapper: createWrapper(queryClient),
      });

      result.current.mutate({ id: "q1", data: { name: "Updated Name" } });

      // Optimistic update should reflect immediately
      await waitFor(() => {
        const cachedData = queryClient.getQueryData<typeof mockQueries>([
          "saved-queries",
        ]);
        expect(cachedData?.find((q) => q.id === "q1")?.name).toBe(
          "Updated Name",
        );
      });
    });
  });

  describe("useDeleteSavedQuery", () => {
    it("deletes a query with optimistic update", async () => {
      server.use(
        http.delete("/api/saved-queries/:id", () => {
          return HttpResponse.json({ success: true });
        }),
      );

      const queryClient = createQueryClient();

      // Pre-populate cache
      queryClient.setQueryData(["saved-queries"], mockQueries);

      const { result } = renderHook(() => useDeleteSavedQuery(), {
        wrapper: createWrapper(queryClient),
      });

      result.current.mutate("q1");

      // Optimistic update should remove item immediately
      await waitFor(() => {
        const cachedData = queryClient.getQueryData<typeof mockQueries>([
          "saved-queries",
        ]);
        expect(cachedData?.find((q) => q.id === "q1")).toBeUndefined();
      });
    });

    it("rolls back on error", async () => {
      server.use(
        http.delete("/api/saved-queries/:id", () => {
          return new HttpResponse(null, { status: 500 });
        }),
      );

      const queryClient = createQueryClient();

      // Pre-populate cache
      queryClient.setQueryData(["saved-queries"], mockQueries);

      const { result } = renderHook(() => useDeleteSavedQuery(), {
        wrapper: createWrapper(queryClient),
      });

      result.current.mutate("q1");

      // After error, should roll back
      await waitFor(() => expect(result.current.isError).toBe(true));

      const cachedData = queryClient.getQueryData<typeof mockQueries>([
        "saved-queries",
      ]);
      expect(cachedData?.find((q) => q.id === "q1")).toBeDefined();
    });
  });
});
