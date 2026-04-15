"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Edit,
  Play,
  ChevronDown,
  ChevronRight,
  ExternalLink,
} from "lucide-react";

interface Run {
  id: string;
  engagementId: string;
  workflowId: string;
  sessionId: string;
  status: string;
  currentPhase: string | null;
  currentAgent: string | null;
  completedAgents: string;
  totalCostUsd: number;
  totalDurationMs: number;
  errorMessage: string | null;
  startedAt: string;
  completedAt: string | null;
  _count: { findings: number };
}

interface Engagement {
  id: string;
  name: string;
  clientName: string;
  targetUrl: string;
  repoPath: string;
  description: string;
  threatModel: string;
  notes: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  runs: Run[];
  _count: { findings: number };
}

const SEVERITY_LEVELS = ["critical", "high", "medium", "low", "info"] as const;

const severityConfig: Record<string, { label: string; className: string; dotColor: string }> = {
  critical: { label: "Critical", className: "bg-red-500/15 text-red-400 border-red-500/30", dotColor: "bg-red-500" },
  high: { label: "High", className: "bg-orange-500/15 text-orange-400 border-orange-500/30", dotColor: "bg-orange-500" },
  medium: { label: "Medium", className: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30", dotColor: "bg-yellow-500" },
  low: { label: "Low", className: "bg-blue-400/15 text-blue-400 border-blue-400/30", dotColor: "bg-blue-400" },
  info: { label: "Info", className: "bg-slate-500/15 text-slate-400 border-slate-500/30", dotColor: "bg-slate-400" },
};

const statusConfig: Record<string, { label: string; className: string }> = {
  active: { label: "Active", className: "bg-green-500/15 text-green-400 border-green-500/30" },
  archived: { label: "Archived", className: "bg-slate-500/15 text-slate-400 border-slate-500/30" },
  completed: { label: "Completed", className: "bg-blue-400/15 text-blue-400 border-blue-400/30" },
};

const runStatusConfig: Record<string, { label: string; className: string; live?: boolean }> = {
  running: { label: "Running", className: "bg-green-500/15 text-green-400 border-green-500/30", live: true },
  completed: { label: "Completed", className: "bg-blue-400/15 text-blue-400 border-blue-400/30" },
  failed: { label: "Failed", className: "bg-red-500/15 text-red-400 border-red-500/30" },
  cancelled: { label: "Cancelled", className: "bg-slate-500/15 text-slate-400 border-slate-500/30" },
};

function SeverityBadge({ severity }: { severity: string }) {
  const cfg = severityConfig[severity] ?? severityConfig.info;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium border ${cfg.className}`}>
      <span className={`size-1.5 rounded-full ${cfg.dotColor}`} />
      {cfg.label}
    </span>
  );
}

function StatusBadge({ status, config }: { status: string; config: Record<string, { label: string; className: string; live?: boolean }> }) {
  const cfg = config[status] ?? { label: status, className: "bg-slate-500/15 text-slate-400 border-slate-500/30" };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium border ${cfg.className}`}>
      {cfg.live && (
        <span className="relative flex size-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex rounded-full size-1.5 bg-green-500" />
        </span>
      )}
      {cfg.label}
    </span>
  );
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDuration(ms: number): string {
  if (ms === 0) return "—";
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) return `${seconds}s`;
  return `${minutes}m ${seconds}s`;
}

function formatCost(usd: number): string {
  if (usd === 0) return "—";
  return `$${usd.toFixed(2)}`;
}

function parseCompletedAgents(raw: string): string[] {
  try {
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

function CollapsibleSection({
  title,
  content,
  emptyLabel,
}: {
  title: string;
  content: string;
  emptyLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const hasContent = content && content.trim().length > 0;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-slate-800/40 transition-colors"
      >
        <span className="text-sm font-medium text-slate-300">{title}</span>
        <div className="flex items-center gap-2">
          {!hasContent && (
            <span className="text-xs text-slate-600">{emptyLabel}</span>
          )}
          {open ? (
            <ChevronDown className="size-4 text-slate-500" />
          ) : (
            <ChevronRight className="size-4 text-slate-500" />
          )}
        </div>
      </button>
      {open && (
        <div className="px-5 pb-4 border-t border-slate-800">
          {hasContent ? (
            <pre className="text-sm text-slate-400 whitespace-pre-wrap font-sans pt-3 leading-relaxed">
              {content}
            </pre>
          ) : (
            <p className="text-sm text-slate-600 italic pt-3">{emptyLabel}</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function EngagementPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [engagement, setEngagement] = useState<Engagement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch(`/api/engagements/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("Engagement not found");
        return r.json();
      })
      .then((data: Engagement) => {
        setEngagement(data);
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message);
        setLoading(false);
      });
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  // Poll if any runs are active
  useEffect(() => {
    if (!engagement) return;
    const hasRunning = engagement.runs.some((r) => r.status === "running");
    if (!hasRunning) return;

    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [engagement, load]);

  const totalFindings = engagement?._count.findings ?? 0;

  if (loading) {
    return (
      <div className="flex flex-col min-h-full bg-slate-950">
        <div className="border-b border-slate-800 px-8 py-5 flex items-center gap-4 shrink-0">
          <Skeleton className="size-5 bg-slate-800 rounded" />
          <Skeleton className="h-6 w-48 bg-slate-800 rounded" />
        </div>
        <div className="px-8 py-6 space-y-4">
          <Skeleton className="h-24 w-full bg-slate-900 rounded-lg" />
          <Skeleton className="h-48 w-full bg-slate-900 rounded-lg" />
          <Skeleton className="h-64 w-full bg-slate-900 rounded-lg" />
        </div>
      </div>
    );
  }

  if (error || !engagement) {
    return (
      <div className="flex flex-col min-h-full bg-slate-950 items-center justify-center">
        <p className="text-sm text-red-400">{error ?? "Engagement not found"}</p>
        <Button
          variant="ghost"
          className="mt-4 text-slate-400 hover:text-slate-100"
          onClick={() => router.push("/")}
        >
          Back to Dashboard
        </Button>
      </div>
    );
  }

  const engStatusCfg = statusConfig[engagement.status] ?? { label: engagement.status, className: "bg-slate-500/15 text-slate-400 border-slate-500/30" };

  return (
    <div className="flex flex-col min-h-full bg-slate-950">
      {/* Page header */}
      <div className="border-b border-slate-800 px-8 py-5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/")}
            className="text-slate-500 hover:text-slate-300 transition-colors"
          >
            <ArrowLeft className="size-4" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-semibold text-slate-100">{engagement.name}</h1>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${engStatusCfg.className}`}>
                {engStatusCfg.label}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-0.5">
              <span className="text-sm text-slate-500">{engagement.clientName}</span>
              <span className="text-slate-700">·</span>
              <a
                href={engagement.targetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-slate-500 font-mono hover:text-violet-400 transition-colors flex items-center gap-1"
                onClick={(e) => e.stopPropagation()}
              >
                {engagement.targetUrl}
                <ExternalLink className="size-3" />
              </a>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-3 text-sm text-slate-400 hover:text-slate-100 hover:bg-slate-800 gap-1.5"
            onClick={() => router.push(`/engagements/${id}/edit`)}
          >
            <Edit className="size-3.5" />
            Edit
          </Button>
          <Button
            className="bg-violet-600 hover:bg-violet-500 text-white border-0 h-8 px-3 text-sm gap-1.5"
            onClick={() => router.push(`/engagements/${id}/run/new`)}
          >
            <Play className="size-3.5" />
            New Run
          </Button>
        </div>
      </div>

      <div className="flex-1 px-8 py-6 space-y-5">
        {/* Metadata strip */}
        <div className="flex items-center gap-6 text-sm text-slate-500">
          <span>
            Created <span className="text-slate-400">{formatDate(engagement.createdAt)}</span>
          </span>
          <span className="text-slate-700">·</span>
          <span>
            Updated <span className="text-slate-400">{formatDate(engagement.updatedAt)}</span>
          </span>
          <span className="text-slate-700">·</span>
          <span className="font-mono text-xs text-slate-600">{engagement.repoPath}</span>
        </div>

        {/* Context cards */}
        <div className="space-y-2">
          <CollapsibleSection
            title="Description"
            content={engagement.description}
            emptyLabel="No description"
          />
          <CollapsibleSection
            title="Threat Model"
            content={engagement.threatModel}
            emptyLabel="No threat model"
          />
          <CollapsibleSection
            title="Notes"
            content={engagement.notes}
            emptyLabel="No notes"
          />
        </div>

        {/* Findings summary */}
        {totalFindings > 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
            <h2 className="text-sm font-medium text-slate-300 mb-3">Findings Summary</h2>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-2xl font-semibold text-slate-100 tabular-nums">{totalFindings}</span>
              <span className="text-sm text-slate-500">total findings</span>
              <div className="flex items-center gap-2 ml-2 flex-wrap">
                {SEVERITY_LEVELS.map((sev) => {
                  const cfg = severityConfig[sev];
                  return (
                    <span
                      key={sev}
                      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium border ${cfg.className}`}
                    >
                      <span className={`size-1.5 rounded-full ${cfg.dotColor}`} />
                      {cfg.label}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Runs table */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-sm font-medium text-slate-200">
              Runs
              {engagement.runs.length > 0 && (
                <span className="ml-2 text-xs text-slate-600 font-normal">
                  {engagement.runs.length}
                </span>
              )}
            </h2>
            <Button
              className="bg-violet-600 hover:bg-violet-500 text-white border-0 h-7 px-2.5 text-xs gap-1"
              onClick={() => router.push(`/engagements/${id}/run/new`)}
            >
              <Play className="size-3" />
              New Run
            </Button>
          </div>

          {engagement.runs.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <p className="text-sm text-slate-500 mb-4">No runs yet. Launch Shannon to start pentesting.</p>
              <Button
                className="bg-violet-600 hover:bg-violet-500 text-white border-0 h-8 px-3 text-sm gap-1.5"
                onClick={() => router.push(`/engagements/${id}/run/new`)}
              >
                <Play className="size-3.5" />
                Launch First Run
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-slate-800 hover:bg-transparent">
                  <TableHead className="text-xs text-slate-500 font-medium uppercase tracking-wider">Started</TableHead>
                  <TableHead className="text-xs text-slate-500 font-medium uppercase tracking-wider">Status</TableHead>
                  <TableHead className="text-xs text-slate-500 font-medium uppercase tracking-wider text-right">Cost</TableHead>
                  <TableHead className="text-xs text-slate-500 font-medium uppercase tracking-wider text-right">Duration</TableHead>
                  <TableHead className="text-xs text-slate-500 font-medium uppercase tracking-wider">Progress</TableHead>
                  <TableHead className="text-xs text-slate-500 font-medium uppercase tracking-wider text-right">Findings</TableHead>
                  <TableHead className="text-xs text-slate-500 font-medium uppercase tracking-wider text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {engagement.runs.map((run) => {
                  const completedAgents = parseCompletedAgents(run.completedAgents);
                  const progressPct = Math.round((completedAgents.length / 13) * 100);

                  return (
                    <TableRow
                      key={run.id}
                      className="border-slate-800 hover:bg-slate-800/40 cursor-pointer"
                      onClick={() => router.push(`/engagements/${id}/runs/${run.id}`)}
                    >
                      <TableCell className="text-slate-400 text-sm">
                        {formatDateTime(run.startedAt)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={run.status} config={runStatusConfig} />
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-slate-400 font-mono text-sm">
                        {formatCost(run.totalCostUsd)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-slate-400 text-sm">
                        {formatDuration(run.totalDurationMs)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 min-w-32">
                          <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-violet-500 rounded-full transition-all"
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                          <span className="text-xs text-slate-500 tabular-nums w-14 text-right">
                            {completedAgents.length}/13
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-slate-400">
                        {run._count.findings}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2.5 text-xs text-slate-400 hover:text-slate-100 hover:bg-slate-700"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/engagements/${id}/runs/${run.id}`);
                          }}
                        >
                          View
                          <ExternalLink className="size-3 ml-1" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </div>
  );
}
