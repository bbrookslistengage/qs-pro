import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WorkspaceSidebar } from "@/features/editor-workspace/components/WorkspaceSidebar";
import { DataExtension, Folder } from "@/features/editor-workspace/types";

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

const createWrapper = (queryClient: QueryClient) => {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
};

const renderSidebar = (folders: Folder[], dataExtensions: DataExtension[]) => {
  const queryClient = createQueryClient();
  return render(
    <WorkspaceSidebar
      tenantId="tenant-1"
      folders={folders}
      savedQueries={[]}
      dataExtensions={dataExtensions}
      isCollapsed={false}
      onToggle={() => undefined}
    />,
    { wrapper: createWrapper(queryClient) },
  );
};

describe("WorkspaceSidebar", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });
  it("renders root folders and expands to show child folders", () => {
    // Arrange
    const folders: Folder[] = [
      {
        id: "root",
        name: "Root Folder",
        parentId: null,
        type: "data-extension",
      },
      {
        id: "child",
        name: "Child Folder",
        parentId: "root",
        type: "data-extension",
      },
    ];

    // Act
    renderSidebar(folders, []);

    // Assert
    expect(
      screen.getByRole("button", { name: /root folder/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /child folder/i }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /root folder/i }));

    expect(
      screen.getByRole("button", { name: /child folder/i }),
    ).toBeInTheDocument();
  });

  it("expands data extensions to reveal fields", async () => {
    // Arrange
    const folders: Folder[] = [
      {
        id: "root",
        name: "Root Folder",
        parentId: null,
        type: "data-extension",
      },
    ];
    const dataExtensions: DataExtension[] = [
      {
        id: "de-1",
        name: "Customers",
        customerKey: "DE_Customers",
        folderId: "root",
        description: "",
        fields: [],
      },
    ];
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => [{ Name: "EmailAddress", FieldType: "Text" }],
      }),
    );

    // Act
    renderSidebar(folders, dataExtensions);

    fireEvent.click(screen.getByRole("button", { name: /root folder/i }));
    fireEvent.click(screen.getByRole("button", { name: /customers/i }));

    // Assert
    await waitFor(() => {
      expect(screen.getByText("EmailAddress")).toBeInTheDocument();
    });
    expect(screen.getByText("Text")).toBeInTheDocument();
  });

  it("orders folders before data extensions alphabetically", () => {
    // Arrange
    const folders: Folder[] = [
      {
        id: "root",
        name: "Root Folder",
        parentId: null,
        type: "data-extension",
      },
      {
        id: "alpha",
        name: "Alpha Folder",
        parentId: "root",
        type: "data-extension",
      },
      {
        id: "beta",
        name: "Beta Folder",
        parentId: "root",
        type: "data-extension",
      },
    ];
    const dataExtensions: DataExtension[] = [
      {
        id: "de-zeta",
        name: "Zeta DE",
        customerKey: "DE_Zeta",
        folderId: "root",
        description: "",
        fields: [],
      },
    ];

    // Act
    renderSidebar(folders, dataExtensions);
    fireEvent.click(screen.getByRole("button", { name: /root folder/i }));

    // Assert
    const alphaButton = screen.getByRole("button", { name: /alpha folder/i });
    const betaButton = screen.getByRole("button", { name: /beta folder/i });
    const deButton = screen.getByRole("button", { name: /zeta de/i });

    expect(
      alphaButton.compareDocumentPosition(betaButton) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      betaButton.compareDocumentPosition(deButton) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
});
