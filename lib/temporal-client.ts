import { Client, Connection } from "@temporalio/client";

let client: Client | null = null;

async function getClient(): Promise<Client> {
  if (client) return client;
  const address = process.env.TEMPORAL_ADDRESS ?? "localhost:7233";
  const connection = await Connection.connect({ address });
  client = new Client({ connection });
  return client;
}

export interface AgentMetrics {
  costUsd?: number;
  durationMs?: number;
  numTurns?: number;
  model?: string;
  status?: string;
}

export interface PipelineProgress {
  workflowId: string;
  status: "running" | "completed" | "failed" | "cancelled";
  currentPhase: string | null;
  currentAgent: string | null;
  completedAgents: string[];
  failedAgent: string | null;
  error: string | null;
  startTime: number;
  elapsedMs: number;
  agentMetrics: Record<string, AgentMetrics>;
  summary: {
    totalCostUsd: number;
    totalDurationMs: number;
    agentCount: number;
  } | null;
}

export async function getRunProgress(workflowId: string): Promise<PipelineProgress | null> {
  try {
    const c = await getClient();
    const handle = c.workflow.getHandle(workflowId);
    // The Shannon workflow registers a 'getProgress' query
    const progress = await handle.query<PipelineProgress>("getProgress");
    return progress;
  } catch {
    return null;
  }
}

export async function cancelWorkflow(workflowId: string): Promise<void> {
  const c = await getClient();
  const handle = c.workflow.getHandle(workflowId);
  await handle.cancel();
}
