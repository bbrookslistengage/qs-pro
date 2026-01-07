import { useMemo, useState } from "react";
import type {
  DataExtension,
  Folder,
  SavedQuery,
} from "@/features/editor-workspace/types";
import { useDataExtensionFields } from "@/features/editor-workspace/hooks/use-metadata";
import {
  Database,
  Folder2,
  AltArrowLeft,
  AltArrowRight,
  Folder as FolderIcon,
  CodeFile,
} from "@solar-icons/react";
import { cn } from "@/lib/utils";

interface WorkspaceSidebarProps {
  tenantId?: string | null;
  folders: Folder[];
  savedQueries: SavedQuery[];
  dataExtensions: DataExtension[];
  isCollapsed: boolean;
  isDataExtensionsFetching?: boolean;
  onToggle: () => void;
  onSelectQuery?: (id: string) => void;
  onSelectDE?: (id: string) => void;
  onCreateDE?: () => void;
  onCreateFolder?: (parentId: string | null) => void;
}

interface DataExtensionNodeProps {
  dataExtension: DataExtension;
  depth: number;
  isExpanded: boolean;
  onToggle: (id: string) => void;
  onSelectDE?: (id: string) => void;
  tenantId?: string | null;
}

const sortByName = (a: { name: string }, b: { name: string }) =>
  a.name.localeCompare(b.name, undefined, { sensitivity: "base" });

function DataExtensionNode({
  dataExtension,
  depth,
  isExpanded,
  onToggle,
  onSelectDE,
  tenantId,
}: DataExtensionNodeProps) {
  const fieldsQuery = useDataExtensionFields({
    tenantId,
    customerKey: dataExtension.customerKey,
    enabled: isExpanded,
  });

  const hasFields = (fieldsQuery.data?.length ?? 0) > 0;

  return (
    <div className="space-y-1">
      <button
        type="button"
        aria-expanded={isExpanded}
        onClick={() => {
          onToggle(dataExtension.id);
          onSelectDE?.(dataExtension.id);
        }}
        className={cn(
          "w-full flex items-center gap-2 px-2 py-1.5 text-xs text-foreground/80 hover:text-foreground hover:bg-muted rounded group transition-colors",
          depth > 0 && "ml-2",
        )}
      >
        <AltArrowRight
          size={12}
          className={cn(
            "transition-transform text-muted-foreground/70",
            isExpanded ? "rotate-90" : "",
          )}
        />
        <Database
          size={14}
          weight="Linear"
          className="text-primary/60 group-hover:text-primary"
        />
        <span className="truncate">{dataExtension.name}</span>
        {fieldsQuery.isFetching ? (
          <span className="ml-auto h-3 w-3 animate-spin rounded-full border border-muted-foreground/40 border-t-transparent" />
        ) : null}
      </button>
      {isExpanded ? (
        <div className="ml-6 border-l border-border/50 pl-3 space-y-1">
          {fieldsQuery.isFetching ? (
            <div className="text-[10px] text-muted-foreground">
              Loading fields...
            </div>
          ) : hasFields ? (
            fieldsQuery.data?.map((field) => (
              <div
                key={field.name}
                className="flex items-center justify-between gap-2 text-[11px] text-foreground/80"
              >
                <span className="truncate">{field.name}</span>
                <span className="font-mono text-[10px] text-muted-foreground">
                  {field.type}
                </span>
              </div>
            ))
          ) : (
            <div className="text-[10px] text-muted-foreground">
              No fields found.
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

export function WorkspaceSidebar({
  tenantId,
  folders,
  savedQueries,
  dataExtensions,
  isCollapsed,
  isDataExtensionsFetching = false,
  onToggle,
  onSelectQuery,
  onSelectDE,
  onCreateFolder,
}: WorkspaceSidebarProps) {
  const [activeTab, setActiveTab] = useState<"de" | "queries">("de");
  const [expandedFolderIds, setExpandedFolderIds] = useState<
    Record<string, boolean>
  >({});
  const [expandedDeIds, setExpandedDeIds] = useState<Record<string, boolean>>(
    {},
  );

  const foldersByParent = useMemo(() => {
    const map = new Map<string | null, Folder[]>();
    folders.forEach((folder) => {
      const key = folder.parentId ?? null;
      const existing = map.get(key) ?? [];
      existing.push(folder);
      map.set(key, existing);
    });
    map.forEach((entries) => entries.sort(sortByName));
    return map;
  }, [folders]);

  const dataExtensionsByFolder = useMemo(() => {
    const map = new Map<string | null, DataExtension[]>();
    dataExtensions.forEach((dataExtension) => {
      const key = dataExtension.folderId || null;
      const existing = map.get(key) ?? [];
      existing.push(dataExtension);
      map.set(key, existing);
    });
    map.forEach((entries) => entries.sort(sortByName));
    return map;
  }, [dataExtensions]);

  const renderQueriesContent = (parentId: string | null, depth: number = 0) => {
    const currentFolders = folders.filter(
      (folder) => folder.parentId === parentId && folder.type === "library",
    );

    return (
      <div
        className={cn(
          "space-y-0.5",
          depth > 0 && "ml-3 border-l border-border/50 pl-2",
        )}
      >
        {currentFolders.sort(sortByName).map((folder) => (
          <div key={folder.id} className="space-y-0.5">
            <div className="flex items-center gap-2 px-2 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground cursor-pointer group">
              <FolderIcon
                size={14}
                className="text-muted-foreground/60 group-hover:text-primary transition-colors"
              />
              <span>{folder.name}</span>
            </div>
            {renderQueriesContent(folder.id, depth + 1)}
          </div>
        ))}

        {savedQueries
          .filter((query) => query.folderId === parentId)
          .sort(sortByName)
          .map((query) => (
            <button
              key={query.id}
              type="button"
              onClick={() => onSelectQuery?.(query.id)}
              className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-foreground/80 hover:text-foreground hover:bg-muted rounded group transition-colors"
            >
              <CodeFile
                size={14}
                weight="Linear"
                className="text-secondary/60 group-hover:text-secondary"
              />
              <span className="truncate">{query.name}</span>
            </button>
          ))}
      </div>
    );
  };

  const renderFolderNode = (folder: Folder, depth: number) => {
    const isExpanded = Boolean(expandedFolderIds[folder.id]);
    const childFolders = foldersByParent.get(folder.id) ?? [];
    const childDataExtensions = dataExtensionsByFolder.get(folder.id) ?? [];

    return (
      <div key={folder.id} className="space-y-1">
        <button
          type="button"
          aria-expanded={isExpanded}
          onClick={() =>
            setExpandedFolderIds((prev) => ({
              ...prev,
              [folder.id]: !prev[folder.id],
            }))
          }
          className={cn(
            "w-full flex items-center gap-2 px-2 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground cursor-pointer group",
            depth > 0 && "ml-2",
          )}
        >
          <AltArrowRight
            size={12}
            className={cn(
              "transition-transform text-muted-foreground/70",
              isExpanded ? "rotate-90" : "",
            )}
          />
          <FolderIcon
            size={14}
            className="text-muted-foreground/60 group-hover:text-primary transition-colors"
          />
          <span className="truncate">{folder.name}</span>
          {isDataExtensionsFetching && isExpanded ? (
            <span className="ml-auto h-3 w-3 animate-spin rounded-full border border-muted-foreground/40 border-t-transparent" />
          ) : null}
        </button>
        {isExpanded ? (
          <div className="ml-3 border-l border-border/50 pl-2 space-y-1">
            {childFolders.map((child) => renderFolderNode(child, depth + 1))}
            {childDataExtensions.map((dataExtension) => (
              <DataExtensionNode
                key={dataExtension.id}
                dataExtension={dataExtension}
                depth={depth + 1}
                isExpanded={Boolean(expandedDeIds[dataExtension.id])}
                onToggle={(id) =>
                  setExpandedDeIds((prev) => ({
                    ...prev,
                    [id]: !prev[id],
                  }))
                }
                onSelectDE={onSelectDE}
                tenantId={tenantId}
              />
            ))}
          </div>
        ) : null}
      </div>
    );
  };

  if (isCollapsed) {
    return (
      <div className="w-12 border-r border-border bg-background flex flex-col items-center py-4 gap-6 shrink-0">
        <button
          onClick={onToggle}
          className="p-2 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
        >
          <AltArrowRight size={20} />
        </button>
        <div className="h-px w-6 bg-border" />
        <button
          onClick={() => {
            setActiveTab("de");
            onToggle();
          }}
          className="p-2 text-muted-foreground hover:text-primary"
        >
          <Database size={20} weight={activeTab === "de" ? "Bold" : "Linear"} />
        </button>
        <button
          onClick={() => {
            setActiveTab("queries");
            onToggle();
          }}
          className="p-2 text-muted-foreground hover:text-primary"
        >
          <Folder2
            size={20}
            weight={activeTab === "queries" ? "Bold" : "Linear"}
          />
        </button>
      </div>
    );
  }

  const rootFolders = foldersByParent.get(null) ?? [];
  const rootDataExtensions = dataExtensionsByFolder.get(null) ?? [];

  return (
    <div className="w-64 border-r border-border bg-background flex flex-col shrink-0 animate-fade-in">
      {/* Tab Switcher */}
      <div className="flex border-b border-border bg-card">
        <button
          onClick={() => setActiveTab("de")}
          className={cn(
            "flex-1 py-3 text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 border-b-2 transition-colors",
            activeTab === "de"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          <Database size={14} weight={activeTab === "de" ? "Bold" : "Linear"} />
          Data
        </button>
        <button
          onClick={() => setActiveTab("queries")}
          className={cn(
            "flex-1 py-3 text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 border-b-2 transition-colors",
            activeTab === "queries"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          <Folder2
            size={14}
            weight={activeTab === "queries" ? "Bold" : "Linear"}
          />
          Queries
        </button>
        <button
          onClick={onToggle}
          className="px-3 text-muted-foreground hover:text-foreground"
        >
          <AltArrowLeft size={16} />
        </button>
      </div>

      {/* Tree Content */}
      <div className="flex-1 overflow-y-auto p-2">
        <div className="space-y-1">
          <div className="flex items-center justify-between px-2 py-1 mb-2">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              {activeTab === "de" ? "Data Extensions" : "Query Library"}
            </span>
            {activeTab === "queries" && (
              <button
                type="button"
                onClick={() => onCreateFolder?.(null)}
                className="text-[10px] font-bold text-primary hover:text-primary-400 underline decoration-primary/30 underline-offset-2"
              >
                + New Folder
              </button>
            )}
          </div>

          {activeTab === "de" ? (
            <>
              {rootFolders.map((folder) => renderFolderNode(folder, 0))}
              {rootDataExtensions.map((dataExtension) => (
                <DataExtensionNode
                  key={dataExtension.id}
                  dataExtension={dataExtension}
                  depth={0}
                  isExpanded={Boolean(expandedDeIds[dataExtension.id])}
                  onToggle={(id) =>
                    setExpandedDeIds((prev) => ({
                      ...prev,
                      [id]: !prev[id],
                    }))
                  }
                  onSelectDE={onSelectDE}
                  tenantId={tenantId}
                />
              ))}
            </>
          ) : (
            renderQueriesContent(null)
          )}
        </div>
      </div>
    </div>
  );
}
