"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { ArrowLeft, Check, Copy, Download } from "lucide-react";

const STATUS_OPTIONS = [
  { value: "confirmed", label: "Confirmed", defaultOn: true },
  { value: "dismissed", label: "Dismissed", defaultOn: false },
  { value: "needs-review", label: "Needs Review", defaultOn: false },
  {
    value: "needs-more-testing",
    label: "Needs More Testing",
    defaultOn: false,
  },
];

const severityConfig: Record<
  string,
  { label: string; className: string; dotColor: string }
> = {
  critical: {
    label: "Critical",
    className: "bg-red-500/15 text-red-400 border-red-500/30",
    dotColor: "bg-red-500",
  },
  high: {
    label: "High",
    className: "bg-orange-500/15 text-orange-400 border-orange-500/30",
    dotColor: "bg-orange-500",
  },
  medium: {
    label: "Medium",
    className: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
    dotColor: "bg-yellow-500",
  },
  low: {
    label: "Low",
    className: "bg-blue-400/15 text-blue-400 border-blue-400/30",
    dotColor: "bg-blue-400",
  },
  info: {
    label: "Info",
    className: "bg-slate-500/15 text-slate-400 border-slate-500/30",
    dotColor: "bg-slate-400",
  },
};

interface ExportData {
  export_version: string;
  generated_at: string;
  engagement: {
    id: string;
    name: string;
    client_name: string;
    target_url: string;
  };
  summary: {
    total_findings: number;
    by_severity: Record<string, number>;
    by_category: Record<string, number>;
  };
  findings: unknown[];
}

export default function ExportPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [statuses, setStatuses] = useState<Set<string>>(
    new Set(["confirmed"]),
  );
  const [exportData, setExportData] = useState<ExportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const fetchExport = useCallback(() => {
    if (statuses.size === 0) {
      setExportData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const statusStr = Array.from(statuses).join(",");
    fetch(`/api/export/${id}?statuses=${statusStr}`)
      .then((r) => {
        if (!r.ok) throw new Error("Export failed");
        return r.json();
      })
      .then((data: ExportData) => {
        setExportData(data);
        setLoading(false);
      })
      .catch(() => {
        toast.error("Failed to generate export");
        setLoading(false);
      });
  }, [id, statuses]);

  useEffect(() => {
    fetchExport();
  }, [fetchExport]);

  function toggleStatus(status: string) {
    setStatuses((prev) => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  }

  const exportJSON = useMemo(() => {
    if (!exportData) return "";
    return JSON.stringify(exportData, null, 2);
  }, [exportData]);

  function handleDownload() {
    if (!exportData) return;
    const blob = new Blob([exportJSON], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${exportData.engagement.name.replace(/\s+/g, "-").toLowerCase()}-findings.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleCopy() {
    navigator.clipboard.writeText(exportJSON).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

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
          <h1 className="text-lg font-semibold text-slate-100">
            Export Findings
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            onClick={handleCopy}
            disabled={!exportData}
            className="h-8 px-3 text-sm text-slate-400 hover:text-slate-100 hover:bg-slate-800 gap-1.5"
          >
            {copied ? (
              <Check className="size-3.5" />
            ) : (
              <Copy className="size-3.5" />
            )}
            {copied ? "Copied" : "Copy"}
          </Button>
          <Button
            onClick={handleDownload}
            disabled={!exportData}
            className="bg-violet-600 hover:bg-violet-500 text-white border-0 h-8 px-3 text-sm gap-1.5 disabled:opacity-40"
          >
            <Download className="size-3.5" />
            Download JSON
          </Button>
        </div>
      </div>

      <div className="flex-1 px-8 py-6 space-y-5 overflow-y-auto">
        {/* Status filter */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
          <h2 className="text-sm font-medium text-slate-300 mb-3">
            Include Statuses
          </h2>
          <div className="flex items-center gap-4">
            {STATUS_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className="flex items-center gap-2 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={statuses.has(opt.value)}
                  onChange={() => toggleStatus(opt.value)}
                  className="rounded border-slate-700 bg-slate-800 text-violet-500 focus:ring-violet-500/20"
                />
                <span className="text-sm text-slate-300">
                  {opt.label}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Summary */}
        {exportData && (
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
            <h2 className="text-sm font-medium text-slate-300 mb-3">
              Summary
            </h2>
            <div className="flex items-center gap-4 flex-wrap">
              <span className="text-2xl font-semibold text-slate-100 tabular-nums">
                {exportData.summary.total_findings}
              </span>
              <span className="text-sm text-slate-500">findings</span>

              <div className="flex items-center gap-2 ml-2 flex-wrap">
                {Object.entries(exportData.summary.by_severity).map(
                  ([sev, count]) => {
                    const cfg =
                      severityConfig[sev] ?? severityConfig.info;
                    return (
                      <span
                        key={sev}
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium border ${cfg.className}`}
                      >
                        <span
                          className={`size-1.5 rounded-full ${cfg.dotColor}`}
                        />
                        {count} {cfg.label}
                      </span>
                    );
                  },
                )}
              </div>
            </div>

            {Object.keys(exportData.summary.by_category).length > 0 && (
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                {Object.entries(exportData.summary.by_category).map(
                  ([cat, count]) => (
                    <span
                      key={cat}
                      className="px-2 py-0.5 rounded-md text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700"
                    >
                      {count} {cat}
                    </span>
                  ),
                )}
              </div>
            )}
          </div>
        )}

        {/* JSON preview */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
          <div className="px-4 py-2.5 border-b border-slate-800">
            <span className="text-xs font-medium text-slate-400">
              JSON Preview
            </span>
          </div>
          {loading ? (
            <div className="p-4">
              <Skeleton className="h-96 w-full bg-slate-800 rounded" />
            </div>
          ) : !exportData ? (
            <div className="p-8 text-center">
              <p className="text-sm text-slate-500">
                Select at least one status to preview
              </p>
            </div>
          ) : (
            <pre className="p-4 text-xs text-slate-400 font-mono overflow-auto max-h-[600px] leading-relaxed">
              {exportJSON}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
