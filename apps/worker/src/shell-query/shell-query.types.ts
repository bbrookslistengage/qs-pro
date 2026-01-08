export interface ShellQueryJob {
  runId: string;
  tenantId: string;
  userId: string;
  mid: string;
  eid: string;
  sqlText: string;
  snippetName?: string;
}

export interface FlowResult {
  status: "ready" | "failed" | "canceled";
  taskId?: string;
  errorMessage?: string;
}

export interface IFlowStrategy {
  execute(job: ShellQueryJob): Promise<FlowResult>;
}
