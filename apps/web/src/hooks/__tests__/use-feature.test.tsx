import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it } from "vitest";

import { useFeature } from "@/hooks/use-feature";
import { server } from "@/test/mocks/server";

const createWrapper = (queryClient: QueryClient) => {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
};

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

const mockFeatures = {
  basicLinting: true,
  syntaxHighlighting: true,
  quickFixes: false,
  minimap: false,
  advancedAutocomplete: false,
  teamSnippets: false,
  auditLogs: false,
  createDataExtension: false,
  deployToAutomation: false,
  systemDataViews: true,
};

describe("useFeature", () => {
  beforeEach(() => {
    server.resetHandlers();
  });

  it("returns true for enabled feature", async () => {
    const queryClient = createQueryClient();
    const wrapper = createWrapper(queryClient);

    server.use(
      http.get("/api/features", () => {
        return HttpResponse.json(mockFeatures);
      }),
    );

    const { result } = renderHook(() => useFeature("basicLinting"), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current).toBe(true);
    });
  });

  it("returns false for disabled feature", async () => {
    const queryClient = createQueryClient();
    const wrapper = createWrapper(queryClient);

    server.use(
      http.get("/api/features", () => {
        return HttpResponse.json(mockFeatures);
      }),
    );

    const { result } = renderHook(() => useFeature("quickFixes"), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current).toBe(false);
    });
  });

  it("returns false while loading (fail-closed)", async () => {
    const queryClient = createQueryClient();
    const wrapper = createWrapper(queryClient);

    server.use(
      http.get("/api/features", async () => {
        await new Promise(() => {});
      }),
    );

    const { result } = renderHook(() => useFeature("basicLinting"), {
      wrapper,
    });

    expect(result.current).toBe(false);
  });

  it("returns false when API returns error", async () => {
    const queryClient = createQueryClient();
    const wrapper = createWrapper(queryClient);

    server.use(
      http.get("/api/features", () => {
        return new HttpResponse(null, { status: 500 });
      }),
    );

    const { result } = renderHook(() => useFeature("basicLinting"), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current).toBe(false);
    });
  });

  it("returns false for feature missing from response (fail-closed)", async () => {
    const queryClient = createQueryClient();
    const wrapper = createWrapper(queryClient);

    server.use(
      http.get("/api/features", () => {
        return HttpResponse.json({
          basicLinting: true,
          syntaxHighlighting: true,
        });
      }),
    );

    const { result } = renderHook(() => useFeature("quickFixes"), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current).toBe(false);
    });
  });

  it("caches feature data across multiple hook instances", async () => {
    const queryClient = createQueryClient();
    const wrapper = createWrapper(queryClient);
    let fetchCount = 0;

    server.use(
      http.get("/api/features", () => {
        fetchCount++;
        return HttpResponse.json(mockFeatures);
      }),
    );

    const { result: result1 } = renderHook(() => useFeature("basicLinting"), {
      wrapper,
    });

    await waitFor(() => {
      expect(result1.current).toBe(true);
    });

    const { result: result2 } = renderHook(() => useFeature("quickFixes"), {
      wrapper,
    });

    await waitFor(() => {
      expect(result2.current).toBe(false);
    });

    expect(fetchCount).toBe(1);
  });

  it("handles all feature keys correctly", async () => {
    const queryClient = createQueryClient();
    const wrapper = createWrapper(queryClient);

    const allEnabledFeatures = {
      basicLinting: true,
      syntaxHighlighting: true,
      quickFixes: true,
      minimap: true,
      advancedAutocomplete: true,
      teamSnippets: true,
      auditLogs: true,
      createDataExtension: true,
      deployToAutomation: true,
      systemDataViews: true,
    };

    server.use(
      http.get("/api/features", () => {
        return HttpResponse.json(allEnabledFeatures);
      }),
    );

    const { result } = renderHook(() => useFeature("deployToAutomation"), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current).toBe(true);
    });
  });
});
