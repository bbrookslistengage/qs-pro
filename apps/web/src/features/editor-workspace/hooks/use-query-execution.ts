import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import api from "@/services/api";

import {
  runResultsQueryKeys,
  type RunResultsResponse,
  useRunResults,
} from "./use-run-results";

export type QueryExecutionStatus =
  | "idle"
  | "queued"
  | "creating_data_extension"
  | "validating_query"
  | "executing_query"
  | "fetching_results"
  | "ready"
  | "failed"
  | "canceled";

interface SSEEvent {
  status: QueryExecutionStatus;
  message: string;
  errorMessage?: string;
  timestamp: string;
  runId: string;
}

interface QueryResults {
  data: RunResultsResponse | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
}

interface UseQueryExecutionResult {
  execute: (sqlText: string, snippetName?: string) => Promise<void>;
  cancel: () => Promise<void>;
  status: QueryExecutionStatus;
  isRunning: boolean;
  runId: string | null;
  errorMessage: string | null;
  results: QueryResults;
  currentPage: number;
  setPage: (page: number) => void;
}

const TERMINAL_STATES: QueryExecutionStatus[] = [
  "idle",
  "ready",
  "failed",
  "canceled",
];
const SESSION_STORAGE_KEY = "activeRunId";

function isTerminalState(status: QueryExecutionStatus): boolean {
  return TERMINAL_STATES.includes(status);
}

export function useQueryExecution(): UseQueryExecutionResult {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<QueryExecutionStatus>("idle");
  const [runId, setRunId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const eventSourceRef = useRef<EventSource | null>(null);

  const resultsQuery = useRunResults({
    runId,
    page: currentPage,
    enabled: status === "ready",
  });

  const closeEventSource = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }, []);

  const clearSessionStorage = useCallback(() => {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  }, []);

  const handleTerminalState = useCallback(
    (newStatus: QueryExecutionStatus, newErrorMessage?: string) => {
      setStatus(newStatus);
      if (newErrorMessage) {
        setErrorMessage(newErrorMessage);
      }
      closeEventSource();
      clearSessionStorage();
    },
    [closeEventSource, clearSessionStorage],
  );

  const subscribeToSSE = useCallback(
    (targetRunId: string) => {
      closeEventSource();

      const eventSource = new EventSource(`/api/runs/${targetRunId}/events`, {
        withCredentials: true,
      });

      eventSource.onmessage = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data as string) as SSEEvent;

          if (isTerminalState(data.status)) {
            handleTerminalState(data.status, data.errorMessage);
          } else {
            setStatus(data.status);
          }
        } catch {
          // Ignore malformed messages
        }
      };

      eventSource.onerror = () => {
        toast.error("Connection lost. Refresh to check status.");
      };

      eventSourceRef.current = eventSource;
    },
    [closeEventSource, handleTerminalState],
  );

  const execute = useCallback(
    async (sqlText: string, snippetName?: string): Promise<void> => {
      setCurrentPage(1);
      if (runId) {
        queryClient.removeQueries({
          queryKey: runResultsQueryKeys.all,
          predicate: (query) => query.queryKey[1] === runId,
        });
      }

      try {
        const response = await api.post<{
          runId: string;
          status: QueryExecutionStatus;
        }>("/runs", { sqlText, snippetName });

        const { runId: newRunId, status: newStatus } = response.data;

        setRunId(newRunId);
        setStatus(newStatus);
        setErrorMessage(null);
        sessionStorage.setItem(SESSION_STORAGE_KEY, newRunId);

        subscribeToSSE(newRunId);
      } catch (error) {
        if (
          error &&
          typeof error === "object" &&
          "response" in error &&
          error.response &&
          typeof error.response === "object" &&
          "status" in error.response &&
          error.response.status === 429
        ) {
          toast.error(
            "Too many queries running. Close a tab or wait for a query to complete.",
          );
          setStatus("idle");
          return;
        }
        throw error;
      }
    },
    [subscribeToSSE, runId, queryClient],
  );

  const cancel = useCallback(async (): Promise<void> => {
    if (!runId) {
      return;
    }

    try {
      await api.post(`/runs/${runId}/cancel`);
      handleTerminalState("canceled");
    } catch {
      // Silently handle cancel failures
    }
  }, [runId, handleTerminalState]);

  const isRunning = !isTerminalState(status);

  useEffect(() => {
    const storedRunId = sessionStorage.getItem(SESSION_STORAGE_KEY);

    if (!storedRunId) {
      return;
    }

    const reconnect = async () => {
      try {
        const response = await api.get<{
          runId: string;
          status: QueryExecutionStatus;
          errorMessage?: string;
        }>(`/runs/${storedRunId}`);

        const {
          runId: fetchedRunId,
          status: fetchedStatus,
          errorMessage: fetchedErrorMessage,
        } = response.data;

        setRunId(fetchedRunId);

        if (isTerminalState(fetchedStatus)) {
          handleTerminalState(fetchedStatus, fetchedErrorMessage);
        } else {
          setStatus(fetchedStatus);
          subscribeToSSE(fetchedRunId);
        }
      } catch (error) {
        if (
          error &&
          typeof error === "object" &&
          "response" in error &&
          error.response &&
          typeof error.response === "object" &&
          "status" in error.response &&
          error.response.status === 404
        ) {
          clearSessionStorage();
          setStatus("idle");
          setRunId(null);
          return;
        }
        clearSessionStorage();
        setStatus("idle");
        setRunId(null);
      }
    };

    void reconnect();
  }, [handleTerminalState, subscribeToSSE, clearSessionStorage]);

  useEffect(() => {
    return () => {
      closeEventSource();
    };
  }, [closeEventSource]);

  const setPage = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const results: QueryResults = {
    data: resultsQuery.data ?? null,
    isLoading: resultsQuery.isLoading,
    error: resultsQuery.error,
    refetch: resultsQuery.refetch,
  };

  return {
    execute,
    cancel,
    status,
    isRunning,
    runId,
    errorMessage,
    results,
    currentPage,
    setPage,
  };
}
