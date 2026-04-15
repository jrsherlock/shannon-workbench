"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Download,
  Loader2,
  Play,
  Square,
  X,
} from "lucide-react";

interface AgentMetrics {
  costUsd?: number;
  durationMs?: number;
  numTurns?: number;
  model?: string;
  status?: string;
}

interface PipelineProgress {
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

const PHASES = [
  { name: "Pre-Recon", agents: ["pre-recon"] },
  { name: "Recon", agents: ["recon"] },
  {
    name: "Vulnerability Analysis",
    agents: [
      "injection-vuln",
      "xss-vuln",
      "auth-vuln",
      "ssrf-vuln",
      "authz-vuln",
    ],
  },
  {
    name: "Exploitation",
    agents: [
      "injection-exploit",
      "xss-exploit",
      "auth-exploit",
      "ssrf-exploit",
      "authz-exploit",
    ],
  },
  { name: "Reporting", agents: ["report"] },
];

const ALL_AGENTS = PHASES.flatMap((p) => p.agents);

function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

function formatCost(usd: number): string {
  return `$${usd.toFixed(2)}`;
}

function agentLabel(agent: string): string {
  return agent
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function StatusIcon({
  state,
}: {
  state: "completed" | "active" | "failed" | "pending";
}) {
  if (state === "completed")
    return (
      <div className="size-4 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
        <Check className="size-2.5 text-green-400" />
      </div>
    );
  if (state === "active")
    return (
      <div className="size-4 rounded-full bg-violet-500/20 flex items-center justify-center shrink-0">
        <div className="size-2 rounded-full bg-violet-400 animate-pulse" />
      </div>
    );
  if (state === "failed")
    return (
      <div className="size-4 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
        <X className="size-2.5 text-red-400" />
      </div>
    );
  return <div className="size-4 rounded-full bg-slate-800 shrink-0" />;
}

const STATUS_BADGES: Record<
  string,
  { label: string; className: string }
> = {
  running: {
    label: "Running",
    className: "bg-green-500/15 text-green-400 border-green-500/30",
  },
  completed: {
    label: "Completed",
    className: "bg-blue-400/15 text-blue-400 border-blue-400/30",
  },
  failed: {
    label: "Failed",
    className: "bg-red-500/15 text-red-400 border-red-500/30",
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-slate-500/15 text-slate-400 border-slate-500/30",
  },
};

export default function RunMonitorPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const runId = params.runId as string;

  const [progress, setProgress] = useState<PipelineProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [cancelling, setCancelling] = useState(false);
  const [resuming, setResuming] = useState(false);
  const [ingesting, setIngesting] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  // SSE connection
  useEffect(() => {
    const es = connectSSE();
    return () => {
      es.close();
      esRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId]);

  // Live elapsed timer
  useEffect(() => {
    if (!progress || progress.status !== "running") return;
    const interval = setInterval(() => {
      if (progress.startTime) {
        setElapsed(Date.now() - progress.startTime);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [progress]);

  function connectSSE() {
    esRef.current?.close();
    const es = new EventSource(`/api/runs/${runId}/progress`);
    esRef.current = es;
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.error && !data.status) {
          setError(data.error);
        } else {
          setProgress(data as PipelineProgress);
          setError(null);
        }
      } catch {
        setError("Failed to parse progress data");
      }
    };
    es.onerror = () => {
      es.close();
    };
    return es;
  }

  async function handleCancel() {
    setCancelling(true);
    try {
      const res = await fetch(`/api/runs/${runId}/cancel`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Stop failed");
      toast.success("Run stopped");
      esRef.current?.close();
      setProgress((prev) =>
        prev ? { ...prev, status: "cancelled" } : prev,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Stop failed");
    } finally {
      setCancelling(false);
    }
  }

  async function handleResume() {
    setResuming(true);
    try {
      const res = await fetch(`/api/runs/${runId}/resume`, {
        method: "POST",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          (body as { error?: string }).error ?? "Resume failed",
        );
      }
      toast.success("Run resumed — picking up from checkpoint");
      setProgress((prev) =>
        prev ? { ...prev, status: "running", error: null } : prev,
      );
      setError(null);
      connectSSE();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Resume failed");
    } finally {
      setResuming(false);
    }
  }

  async function handleIngest() {
    setIngesting(true);
    try {
      const res = await fetch(`/api/runs/${runId}/ingest`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Ingest failed");
      const data = (await res.json()) as { imported: number };
      toast.success(`Imported ${data.imported} findings`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ingest failed");
    } finally {
      setIngesting(false);
    }
  }

  const completedAgents = progress?.completedAgents ?? [];
  const completedCount = completedAgents.length;
  const totalAgents = ALL_AGENTS.length;
  const progressPct = Math.round((completedCount / totalAgents) * 100);
  const totalCost = progress
    ? Object.values(progress.agentMetrics).reduce(
        (sum, m) => sum + (m.costUsd ?? 0),
        0,
      )
    : 0;
  const isTerminal =
    progress &&
    ["completed", "failed", "cancelled"].includes(progress.status);
  const currentElapsed = isTerminal
    ? (progress?.elapsedMs ?? 0)
    : elapsed;

  if (!progress && !error) {
    return (
      <div className="flex flex-col min-h-full bg-slate-950">
        <div className="border-b border-slate-800 px-8 py-5 flex items-center gap-4 shrink-0">
          <Skeleton className="size-5 bg-slate-800 rounded" />
          <Skeleton className="h-6 w-48 bg-slate-800 rounded" />
        </div>
        <div className="px-8 py-6 space-y-4">
          <Skeleton className="h-16 w-full bg-slate-900 rounded-lg" />
          <div className="grid grid-cols-[1fr_320px] gap-4">
            <Skeleton className="h-80 bg-slate-900 rounded-lg" />
            <div className="space-y-4">
              <Skeleton className="h-24 bg-slate-900 rounded-lg" />
              <Skeleton className="h-24 bg-slate-900 rounded-lg" />
              <Skeleton className="h-24 bg-slate-900 rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const statusCfg = progress
    ? (STATUS_BADGES[progress.status] ?? STATUS_BADGES.running)
    : STATUS_BADGES.running;

  return (
    <div className="flex flex-col min-h-full bg-slate-950">
      {/* Header */}
      <div className="border-b border-slate-800 px-8 py-5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push(`/engagements/${id}`)}
            className="text-slate-500 hover:text-slate-300 transition-colors"
          >
            <ArrowLeft className="size-4" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-semibold text-slate-100">
                Run Monitor
              </h1>
              {progress && (
                <span
                  className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium border ${statusCfg.className}`}
                >
                  {progress.status === "running" && (
                    <span className="relative flex size-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                      <span className="relative inline-flex rounded-full size-1.5 bg-green-500" />
                    </span>
                  )}
                  {statusCfg.label}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-0.5 text-sm text-slate-500">
              <span className="font-mono text-xs text-slate-600">
                {runId}
              </span>
              {progress?.startTime && (
                <>
                  <span className="text-slate-700">&middot;</span>
                  <span>
                    {new Date(progress.startTime).toLocaleString()}
                  </span>
                </>
              )}
              <span className="text-slate-700">&middot;</span>
              <span className="tabular-nums">
                {formatElapsed(currentElapsed)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 px-8 py-6 overflow-y-auto">
        {error && !progress && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p className="text-xs text-red-400">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-[1fr_320px] gap-6">
          {/* Left — Phase Timeline */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
            <h2 className="text-sm font-medium text-slate-200 mb-4">
              Pipeline Progress
            </h2>
            <div className="space-y-1">
              {PHASES.map((phase) => {
                const phaseCompleted = phase.agents.every((a) =>
                  completedAgents.includes(a),
                );
                const phaseActive =
                  !phaseCompleted &&
                  phase.agents.some(
                    (a) =>
                      completedAgents.includes(a) ||
                      a === progress?.currentAgent,
                  );
                const phaseFailed = phase.agents.some(
                  (a) => a === progress?.failedAgent,
                );

                const phaseState = phaseFailed
                  ? "failed"
                  : phaseCompleted
                    ? "completed"
                    : phaseActive
                      ? "active"
                      : "pending";

                return (
                  <div key={phase.name}>
                    <div className="flex items-center gap-2 py-1.5">
                      <StatusIcon state={phaseState} />
                      <span
                        className={`text-sm font-medium ${
                          phaseActive
                            ? "text-slate-100"
                            : phaseCompleted
                              ? "text-slate-300"
                              : "text-slate-600"
                        }`}
                      >
                        {phase.name}
                      </span>
                    </div>

                    {/* Show individual agents for multi-agent phases */}
                    {phase.agents.length > 1 && (
                      <div className="ml-6 border-l border-slate-800 pl-4 space-y-0.5 mb-1">
                        {phase.agents.map((agent) => {
                          const isCompleted =
                            completedAgents.includes(agent);
                          const isCurrent =
                            agent === progress?.currentAgent;
                          const isFailed =
                            agent === progress?.failedAgent;
                          const metrics =
                            progress?.agentMetrics[agent];

                          const agentState = isFailed
                            ? "failed"
                            : isCompleted
                              ? "completed"
                              : isCurrent
                                ? "active"
                                : "pending";

                          return (
                            <div
                              key={agent}
                              className="flex items-center gap-2 py-1"
                            >
                              <StatusIcon state={agentState} />
                              <span
                                className={`text-xs ${
                                  isCurrent
                                    ? "text-slate-200"
                                    : isCompleted
                                      ? "text-slate-400"
                                      : "text-slate-600"
                                }`}
                              >
                                {agentLabel(agent)}
                              </span>
                              {isCompleted && metrics && (
                                <span className="text-xs text-slate-600 ml-auto tabular-nums">
                                  {metrics.costUsd
                                    ? formatCost(metrics.costUsd)
                                    : ""}
                                  {metrics.durationMs
                                    ? ` \u00b7 ${formatElapsed(metrics.durationMs)}`
                                    : ""}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Single-agent cost/duration */}
                    {phase.agents.length === 1 &&
                      completedAgents.includes(phase.agents[0]) &&
                      progress?.agentMetrics[phase.agents[0]] && (
                        <div className="ml-6 text-xs text-slate-600 tabular-nums mb-1">
                          {progress.agentMetrics[phase.agents[0]]
                            .costUsd
                            ? formatCost(
                                progress.agentMetrics[
                                  phase.agents[0]
                                ].costUsd!,
                              )
                            : ""}
                          {progress.agentMetrics[phase.agents[0]]
                            .durationMs
                            ? ` \u00b7 ${formatElapsed(progress.agentMetrics[phase.agents[0]].durationMs!)}`
                            : ""}
                        </div>
                      )}
                  </div>
                );
              })}
            </div>

            {progress?.error && (
              <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                <p className="text-xs text-red-400 font-mono">
                  {progress.error}
                </p>
              </div>
            )}
          </div>

          {/* Right — Stats */}
          <div className="space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
              <span className="text-xs text-slate-500 uppercase tracking-wider">
                Running Cost
              </span>
              <p className="text-2xl font-semibold text-slate-100 tabular-nums mt-1">
                {formatCost(totalCost)}
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
              <span className="text-xs text-slate-500 uppercase tracking-wider">
                Agents Complete
              </span>
              <p className="text-2xl font-semibold text-slate-100 tabular-nums mt-1">
                {completedCount}{" "}
                <span className="text-sm text-slate-500 font-normal">
                  / {totalAgents}
                </span>
              </p>
              <div className="mt-3 h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-violet-500 rounded-full transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>

            {progress?.currentAgent &&
              progress.status === "running" && (
                <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
                  <span className="text-xs text-slate-500 uppercase tracking-wider">
                    Current Agent
                  </span>
                  <p className="text-sm font-medium text-violet-400 mt-1 flex items-center gap-2">
                    <Loader2 className="size-3 animate-spin" />
                    {agentLabel(progress.currentAgent)}
                  </p>
                </div>
              )}

            <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
              <span className="text-xs text-slate-500 uppercase tracking-wider">
                Elapsed Time
              </span>
              <p className="text-2xl font-semibold text-slate-100 tabular-nums mt-1">
                {formatElapsed(currentElapsed)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-slate-800 px-8 py-4 flex items-center gap-3 shrink-0">
        {!isTerminal && (
          <Button
            onClick={handleCancel}
            disabled={cancelling}
            variant="ghost"
            className="h-9 px-4 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 gap-1.5"
          >
            {cancelling ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Square className="size-3.5" />
            )}
            Stop Run
          </Button>
        )}
        {isTerminal &&
          (progress?.status === "cancelled" ||
            progress?.status === "failed") && (
            <Button
              onClick={handleResume}
              disabled={resuming}
              className="bg-green-600 hover:bg-green-500 text-white border-0 h-9 px-4 text-sm gap-1.5 disabled:opacity-50"
            >
              {resuming ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Play className="size-3.5" />
              )}
              Resume Run
            </Button>
          )}
        <Button
          onClick={handleIngest}
          disabled={ingesting || progress?.status !== "completed"}
          className="bg-violet-600 hover:bg-violet-500 text-white border-0 h-9 px-4 text-sm gap-1.5 disabled:opacity-40"
        >
          {ingesting ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Download className="size-3.5" />
          )}
          Import Findings
        </Button>
        {isTerminal && (
          <Button
            variant="ghost"
            onClick={() => router.push(`/engagements/${id}/findings`)}
            className="h-9 px-4 text-sm text-slate-400 hover:text-slate-100 hover:bg-slate-800 gap-1.5 ml-auto"
          >
            View Findings
            <ArrowRight className="size-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}
