import { useQuery } from "@tanstack/react-query";

import api from "@/services/api";

export interface RunResultsResponse {
  columns: string[];
  rows: Record<string, unknown>[];
  totalRows: number;
  page: number;
  pageSize: number;
}

export const runResultsQueryKeys = {
  all: ["runs"] as const,
  results: (runId: string, page: number) =>
    [...runResultsQueryKeys.all, runId, "results", page] as const,
};

async function fetchRunResults(
  runId: string,
  page: number,
): Promise<RunResultsResponse> {
  const response = await api.get<RunResultsResponse>(
    `/runs/${runId}/results?page=${page}`,
  );
  return response.data;
}

interface UseRunResultsOptions {
  runId: string | null;
  page: number;
  enabled: boolean;
}

export function useRunResults({ runId, page, enabled }: UseRunResultsOptions) {
  return useQuery({
    queryKey: runResultsQueryKeys.results(runId ?? "", page),
    queryFn: () => {
      if (!runId) {
        throw new Error("runId is required");
      }
      return fetchRunResults(runId, page);
    },
    enabled: enabled && Boolean(runId),
    staleTime: Infinity,
    gcTime: 30 * 60 * 1000,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
  });
}
