import { useState } from "react";
import { EditorWorkspace } from "@/features/editor-workspace/components/EditorWorkspace";
import { useMetadata } from "@/features/editor-workspace/hooks/use-metadata";
import type { ExecutionResult } from "@/features/editor-workspace/types";
import { useAuthStore } from "@/store/auth-store";

const emptyExecutionResult: ExecutionResult = {
  status: "idle",
  runtime: "",
  totalRows: 0,
  currentPage: 1,
  pageSize: 50,
  columns: [],
  rows: [],
};

export function EditorWorkspacePage() {
  const { tenant } = useAuthStore();
  const {
    folders,
    dataExtensions,
    isLoading,
    isDataExtensionsFetching,
    error,
  } = useMetadata({ tenantId: tenant?.id, eid: tenant?.eid });
  const [executionResult, setExecutionResult] =
    useState<ExecutionResult>(emptyExecutionResult);

  const handlePageChange = (page: number) => {
    setExecutionResult((prev) => ({
      ...prev,
      currentPage: page,
    }));
  };

  return (
    <div className="flex flex-1 flex-col min-h-0">
      {error ? (
        <div className="border-b border-error/20 bg-error/10 px-4 py-2 text-xs text-error">
          {error}
        </div>
      ) : null}
      {isLoading ? (
        <div className="border-b border-border bg-card/50 px-4 py-2 text-xs text-muted-foreground">
          Loading metadata...
        </div>
      ) : null}
      <EditorWorkspace
        tenantId={tenant?.id}
        folders={folders}
        savedQueries={[]}
        dataExtensions={dataExtensions}
        executionResult={executionResult}
        isSidebarCollapsed={false}
        isDataExtensionsFetching={isDataExtensionsFetching}
        onPageChange={handlePageChange}
      />
    </div>
  );
}
