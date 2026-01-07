import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  useDataExtensionFields,
  useDataExtensions,
  useMetadataFolders,
} from "@/features/editor-workspace/hooks/use-metadata";

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

describe("use-metadata hooks", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("useMetadataFolders_mapsFolderData", async () => {
    // Arrange
    const queryClient = createQueryClient();
    const wrapper = createWrapper(queryClient);
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => [
        { ID: 10, Name: "Root", ParentFolder: null },
        { ID: 11, Name: "Child", ParentFolder: { ID: 10 } },
      ],
    });
    vi.stubGlobal("fetch", fetchMock);

    // Act
    const { result } = renderHook(
      () => useMetadataFolders("tenant-1", "eid-1"),
      {
        wrapper,
      },
    );

    // Assert
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/metadata/folders?eid=eid-1",
      expect.any(Object),
    );
    expect(result.current.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "10", name: "Root", parentId: null }),
        expect.objectContaining({ id: "11", name: "Child", parentId: "10" }),
      ]),
    );
  });

  it("useDataExtensions_mapsDataExtensions", async () => {
    // Arrange
    const queryClient = createQueryClient();
    const wrapper = createWrapper(queryClient);
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => [
        { CustomerKey: "DE_Alpha", Name: "Alpha", CategoryID: 200 },
      ],
    });
    vi.stubGlobal("fetch", fetchMock);

    // Act
    const { result } = renderHook(
      () => useDataExtensions({ tenantId: "tenant-1", eid: "123" }),
      { wrapper },
    );

    // Assert
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(result.current.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "DE_Alpha",
          name: "Alpha",
          customerKey: "DE_Alpha",
          folderId: "200",
        }),
      ]),
    );
  });

  it("useDataExtensionFields_reusesCache", async () => {
    // Arrange
    const queryClient = createQueryClient();
    const wrapper = createWrapper(queryClient);
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => [
        { Name: "EmailAddress", FieldType: "Text", IsRequired: true },
        { Name: "CreatedDate", FieldType: "Date", IsRequired: false },
      ],
    });
    vi.stubGlobal("fetch", fetchMock);

    // Act
    const { result } = renderHook(
      () =>
        useDataExtensionFields({
          tenantId: "tenant-1",
          customerKey: "DE_Alpha",
        }),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const { result: cachedResult } = renderHook(
      () =>
        useDataExtensionFields({
          tenantId: "tenant-1",
          customerKey: "DE_Alpha",
        }),
      { wrapper },
    );

    // Assert
    await waitFor(() => {
      expect(cachedResult.current.isSuccess).toBe(true);
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
