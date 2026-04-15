"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
import { Plus, ExternalLink, LayoutDashboard } from "lucide-react";

interface Engagement {
  id: string;
  name: string;
  clientName: string;
  targetUrl: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  _count: {
    runs: number;
    findings: number;
  };
}

function statusBadge(status: string) {
  const map: Record<string, { label: string; className: string }> = {
    active: { label: "Active", className: "bg-green-500/15 text-green-400 border-green-500/30" },
    archived: { label: "Archived", className: "bg-slate-500/15 text-slate-400 border-slate-500/30" },
    completed: { label: "Completed", className: "bg-blue-400/15 text-blue-400 border-blue-400/30" },
  };
  const s = map[status] ?? { label: status, className: "bg-slate-500/15 text-slate-400 border-slate-500/30" };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${s.className}`}>
      {s.label}
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

export default function DashboardPage() {
  const router = useRouter();
  const [engagements, setEngagements] = useState<Engagement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/engagements")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load engagements");
        return r.json();
      })
      .then((data: Engagement[]) => {
        setEngagements(data);
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const totalRuns = engagements.reduce((sum, e) => sum + e._count.runs, 0);
  const totalFindings = engagements.reduce((sum, e) => sum + e._count.findings, 0);
  const activeCount = engagements.filter((e) => e.status === "active").length;

  return (
    <div className="flex flex-col min-h-full bg-slate-950">
      {/* Page header */}
      <div className="border-b border-slate-800 px-8 py-5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <LayoutDashboard className="size-5 text-slate-500" />
          <h1 className="text-lg font-semibold text-slate-100">Dashboard</h1>
        </div>
        <Button
          onClick={() => router.push("/engagements/new")}
          className="bg-violet-600 hover:bg-violet-500 text-white border-0 h-8 px-3 text-sm gap-1.5"
        >
          <Plus className="size-4" />
          New Engagement
        </Button>
      </div>

      <div className="flex-1 px-8 py-6 space-y-6">
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total Engagements", value: loading ? null : engagements.length },
            { label: "Active Engagements", value: loading ? null : activeCount },
            { label: "Total Findings", value: loading ? null : totalFindings },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-slate-900 border border-slate-800 rounded-lg px-5 py-4"
            >
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1.5">{stat.label}</p>
              {stat.value === null ? (
                <Skeleton className="h-8 w-16 bg-slate-800" />
              ) : (
                <p className="text-3xl font-semibold text-slate-100 tabular-nums">{stat.value}</p>
              )}
            </div>
          ))}
        </div>

        {/* Engagements table */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-800">
            <h2 className="text-sm font-medium text-slate-200">Engagements</h2>
          </div>

          {loading ? (
            <div className="p-5 space-y-3">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full bg-slate-800" />
              ))}
            </div>
          ) : error ? (
            <div className="px-5 py-12 text-center">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          ) : engagements.length === 0 ? (
            <div className="px-5 py-16 text-center">
              <p className="text-sm text-slate-500 mb-4">No engagements yet.</p>
              <Button
                onClick={() => router.push("/engagements/new")}
                className="bg-violet-600 hover:bg-violet-500 text-white border-0 h-8 px-3 text-sm gap-1.5"
              >
                <Plus className="size-4" />
                Create your first engagement
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-slate-800 hover:bg-transparent">
                  <TableHead className="text-xs text-slate-500 font-medium uppercase tracking-wider">Name</TableHead>
                  <TableHead className="text-xs text-slate-500 font-medium uppercase tracking-wider">Client</TableHead>
                  <TableHead className="text-xs text-slate-500 font-medium uppercase tracking-wider">Target URL</TableHead>
                  <TableHead className="text-xs text-slate-500 font-medium uppercase tracking-wider">Status</TableHead>
                  <TableHead className="text-xs text-slate-500 font-medium uppercase tracking-wider text-right">Runs</TableHead>
                  <TableHead className="text-xs text-slate-500 font-medium uppercase tracking-wider text-right">Findings</TableHead>
                  <TableHead className="text-xs text-slate-500 font-medium uppercase tracking-wider">Created</TableHead>
                  <TableHead className="text-xs text-slate-500 font-medium uppercase tracking-wider text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {engagements.map((eng) => (
                  <TableRow
                    key={eng.id}
                    className="border-slate-800 hover:bg-slate-800/40 cursor-pointer"
                    onClick={() => router.push(`/engagements/${eng.id}`)}
                  >
                    <TableCell className="font-medium text-slate-200">{eng.name}</TableCell>
                    <TableCell className="text-slate-400">{eng.clientName}</TableCell>
                    <TableCell>
                      <span className="font-mono text-xs text-slate-400 truncate block max-w-48">
                        {eng.targetUrl}
                      </span>
                    </TableCell>
                    <TableCell>{statusBadge(eng.status)}</TableCell>
                    <TableCell className="text-right tabular-nums text-slate-400">{eng._count.runs}</TableCell>
                    <TableCell className="text-right tabular-nums text-slate-400">{eng._count.findings}</TableCell>
                    <TableCell className="text-slate-400 text-sm">{formatDate(eng.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2.5 text-xs text-slate-400 hover:text-slate-100 hover:bg-slate-700"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/engagements/${eng.id}`);
                        }}
                      >
                        View
                        <ExternalLink className="size-3 ml-1" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Summary stats when loaded */}
        {!loading && engagements.length > 0 && (
          <p className="text-xs text-slate-600">
            {engagements.length} engagement{engagements.length !== 1 ? "s" : ""} · {totalRuns} run{totalRuns !== 1 ? "s" : ""} · {totalFindings} finding{totalFindings !== 1 ? "s" : ""}
          </p>
        )}
      </div>
    </div>
  );
}
