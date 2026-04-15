"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { ArrowLeft, Bot, Plus, User } from "lucide-react";

interface Finding {
  id: string;
  engagementId: string;
  runId: string | null;
  shannonId: string | null;
  source: string;
  category: string;
  title: string;
  severity: string;
  description: string;
  poc: string;
  codeLocation: string;
  remediation: string;
  testerNotes: string;
  status: string;
  cvss: number | null;
  createdAt: string;
  updatedAt: string;
}

const SEVERITIES = ["critical", "high", "medium", "low", "info"] as const;
const STATUSES = [
  "needs-review",
  "confirmed",
  "dismissed",
  "needs-more-testing",
] as const;

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

const statusConfig: Record<string, { label: string; className: string }> = {
  confirmed: {
    label: "Confirmed",
    className: "bg-green-500/15 text-green-400",
  },
  dismissed: {
    label: "Dismissed",
    className: "bg-slate-500/15 text-slate-400",
  },
  "needs-review": {
    label: "Needs Review",
    className: "bg-yellow-500/15 text-yellow-400",
  },
  "needs-more-testing": {
    label: "More Testing",
    className: "bg-blue-400/15 text-blue-400",
  },
};

// ── Detail Panel ──────────────────────────────────────────────

function FindingDetail({
  finding,
  onPatch,
}: {
  finding: Finding;
  onPatch: (patch: Record<string, unknown>) => void;
}) {
  const [title, setTitle] = useState(finding.title);
  const [description, setDescription] = useState(finding.description);
  const [remediation, setRemediation] = useState(finding.remediation);
  const [testerNotes, setTesterNotes] = useState(finding.testerNotes);
  const [cvss, setCvss] = useState(finding.cvss?.toString() ?? "");

  // Reset local state when switching findings
  useEffect(() => {
    setTitle(finding.title);
    setDescription(finding.description);
    setRemediation(finding.remediation);
    setTesterNotes(finding.testerNotes);
    setCvss(finding.cvss?.toString() ?? "");
  }, [finding.id, finding.title, finding.description, finding.remediation, finding.testerNotes, finding.cvss]);

  function saveIfChanged(field: string, value: string, original: string) {
    if (value !== original) onPatch({ [field]: value });
  }

  return (
    <div className="p-6 space-y-5">
      {/* Title */}
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={() => saveIfChanged("title", title, finding.title)}
        className="w-full text-lg font-semibold text-slate-100 bg-transparent border-0 outline-none p-0"
      />

      {/* Badges row */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select
          value={finding.severity}
          onValueChange={(v) => v && onPatch({ severity: v })}
        >
          <SelectTrigger className="w-32 bg-slate-800 border-slate-700 text-slate-100 h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SEVERITIES.map((sev) => (
              <SelectItem key={sev} value={sev}>
                {severityConfig[sev].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={finding.status}
          onValueChange={(v) => v && onPatch({ status: v })}
        >
          <SelectTrigger className="w-44 bg-slate-800 border-slate-700 text-slate-100 h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map((st) => (
              <SelectItem key={st} value={st}>
                {statusConfig[st].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700">
          {finding.category}
        </span>
        <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700 flex items-center gap-1">
          {finding.source === "shannon" ? (
            <Bot className="size-3" />
          ) : (
            <User className="size-3" />
          )}
          {finding.source}
        </span>
      </div>

      {/* Shannon ID */}
      {finding.shannonId && (
        <div>
          <span className="text-xs text-slate-600 uppercase tracking-wider">
            Shannon ID
          </span>
          <p className="text-sm font-mono text-slate-400 mt-0.5">
            {finding.shannonId}
          </p>
        </div>
      )}

      {/* Description */}
      <div>
        <label className="text-xs text-slate-600 uppercase tracking-wider block mb-1.5">
          Description
        </label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={() =>
            saveIfChanged("description", description, finding.description)
          }
          rows={4}
          className="bg-slate-900 border-slate-800 text-slate-300 resize-none text-sm"
        />
      </div>

      {/* PoC */}
      {finding.poc && (
        <div>
          <label className="text-xs text-slate-600 uppercase tracking-wider block mb-1.5">
            Proof of Concept
          </label>
          <pre className="bg-slate-900 border border-slate-800 rounded-lg p-4 text-sm text-slate-300 font-mono overflow-x-auto whitespace-pre-wrap">
            {finding.poc}
          </pre>
        </div>
      )}

      {/* Code Location */}
      {finding.codeLocation && (
        <div>
          <label className="text-xs text-slate-600 uppercase tracking-wider block mb-1.5">
            Code Location
          </label>
          <p className="text-sm font-mono text-slate-400 bg-slate-900 border border-slate-800 rounded-lg p-3">
            {finding.codeLocation}
          </p>
        </div>
      )}

      {/* Remediation */}
      <div>
        <label className="text-xs text-slate-600 uppercase tracking-wider block mb-1.5">
          Remediation
        </label>
        <Textarea
          value={remediation}
          onChange={(e) => setRemediation(e.target.value)}
          onBlur={() =>
            saveIfChanged("remediation", remediation, finding.remediation)
          }
          rows={3}
          className="bg-slate-900 border-slate-800 text-slate-300 resize-none text-sm"
        />
      </div>

      {/* Tester Notes */}
      <div>
        <label className="text-xs text-slate-600 uppercase tracking-wider block mb-1.5">
          Tester Notes
        </label>
        <Textarea
          value={testerNotes}
          onChange={(e) => setTesterNotes(e.target.value)}
          onBlur={() =>
            saveIfChanged(
              "testerNotes",
              testerNotes,
              finding.testerNotes,
            )
          }
          rows={3}
          placeholder="Add your notes..."
          className="bg-slate-900 border-slate-800 text-slate-300 placeholder:text-slate-700 resize-none text-sm"
        />
      </div>

      {/* CVSS */}
      <div>
        <label className="text-xs text-slate-600 uppercase tracking-wider block mb-1.5">
          CVSS Score
        </label>
        <Input
          type="number"
          min={0}
          max={10}
          step={0.1}
          value={cvss}
          onChange={(e) => setCvss(e.target.value)}
          onBlur={() => {
            const val = cvss.trim() ? parseFloat(cvss) : null;
            if (val !== finding.cvss) onPatch({ cvss: val });
          }}
          placeholder="0.0 - 10.0"
          className="w-32 bg-slate-900 border-slate-800 text-slate-300 placeholder:text-slate-700 text-sm"
        />
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────

export default function FindingsTriagePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [findings, setFindings] = useState<Finding[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Filters
  const [severityFilter, setSeverityFilter] = useState<Set<string>>(
    new Set(),
  );
  const [statusFilter, setStatusFilter] = useState<Set<string>>(
    new Set(),
  );
  const [sourceFilter, setSourceFilter] = useState<string | null>(null);

  const loadFindings = useCallback(() => {
    fetch(`/api/findings?engagementId=${id}`)
      .then((r) => r.json())
      .then((data: Finding[]) => {
        setFindings(data);
        setLoading(false);
      })
      .catch(() => {
        toast.error("Failed to load findings");
        setLoading(false);
      });
  }, [id]);

  useEffect(() => {
    loadFindings();
  }, [loadFindings]);

  const selected = findings.find((f) => f.id === selectedId) ?? null;

  const filtered = findings.filter((f) => {
    if (severityFilter.size > 0 && !severityFilter.has(f.severity))
      return false;
    if (statusFilter.size > 0 && !statusFilter.has(f.status)) return false;
    if (sourceFilter && f.source !== sourceFilter) return false;
    return true;
  });

  function toggle(
    set: Set<string>,
    value: string,
    setter: (s: Set<string>) => void,
  ) {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    setter(next);
  }

  async function patchFinding(
    findingId: string,
    patch: Record<string, unknown>,
  ) {
    try {
      const res = await fetch(`/api/findings/${findingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error("Save failed");
      const updated = (await res.json()) as Finding;
      setFindings((prev) =>
        prev.map((f) => (f.id === findingId ? updated : f)),
      );
    } catch {
      toast.error("Failed to save changes");
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col min-h-full bg-slate-950">
        <div className="border-b border-slate-800 px-8 py-5 flex items-center gap-4 shrink-0">
          <Skeleton className="size-5 bg-slate-800 rounded" />
          <Skeleton className="h-6 w-48 bg-slate-800 rounded" />
        </div>
        <div className="flex-1 px-8 py-6">
          <Skeleton className="h-12 w-full bg-slate-900 rounded-lg mb-4" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-96 bg-slate-900 rounded-lg" />
            <Skeleton className="h-96 bg-slate-900 rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-950">
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
            Findings
            <span className="ml-2 text-sm text-slate-500 font-normal">
              {findings.length}
            </span>
          </h1>
        </div>
        <Button
          onClick={() => router.push(`/engagements/${id}/findings/new`)}
          className="bg-violet-600 hover:bg-violet-500 text-white border-0 h-8 px-3 text-sm gap-1.5"
        >
          <Plus className="size-3.5" />
          Add Finding
        </Button>
      </div>

      {/* Filter bar */}
      <div className="border-b border-slate-800 px-8 py-3 flex items-center gap-4 flex-wrap shrink-0">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-600 mr-1">Severity:</span>
          {SEVERITIES.map((sev) => {
            const cfg = severityConfig[sev];
            const active = severityFilter.has(sev);
            return (
              <button
                key={sev}
                onClick={() =>
                  toggle(severityFilter, sev, setSeverityFilter)
                }
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border transition-colors ${
                  active
                    ? cfg.className
                    : "border-slate-800 text-slate-600 hover:border-slate-700"
                }`}
              >
                <span
                  className={`size-1.5 rounded-full ${active ? cfg.dotColor : "bg-slate-700"}`}
                />
                {cfg.label}
              </button>
            );
          })}
        </div>

        <div className="w-px h-5 bg-slate-800" />

        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-600 mr-1">Status:</span>
          {STATUSES.map((st) => {
            const cfg = statusConfig[st];
            const active = statusFilter.has(st);
            return (
              <button
                key={st}
                onClick={() =>
                  toggle(statusFilter, st, setStatusFilter)
                }
                className={`px-2 py-0.5 rounded-md text-xs font-medium transition-colors ${
                  active
                    ? cfg.className
                    : "text-slate-600 hover:text-slate-500"
                }`}
              >
                {cfg.label}
              </button>
            );
          })}
        </div>

        <div className="w-px h-5 bg-slate-800" />

        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-600 mr-1">Source:</span>
          <button
            onClick={() =>
              setSourceFilter(
                sourceFilter === "shannon" ? null : "shannon",
              )
            }
            className={`px-2 py-0.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1 ${
              sourceFilter === "shannon"
                ? "bg-violet-500/15 text-violet-400"
                : "text-slate-600 hover:text-slate-500"
            }`}
          >
            <Bot className="size-3" />
            Shannon
          </button>
          <button
            onClick={() =>
              setSourceFilter(
                sourceFilter === "manual" ? null : "manual",
              )
            }
            className={`px-2 py-0.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1 ${
              sourceFilter === "manual"
                ? "bg-violet-500/15 text-violet-400"
                : "text-slate-600 hover:text-slate-500"
            }`}
          >
            <User className="size-3" />
            Manual
          </button>
        </div>
      </div>

      {/* Two-panel layout */}
      <div className="flex-1 flex min-h-0">
        {/* Finding list (left) */}
        <div className="w-[400px] shrink-0 border-r border-slate-800 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm text-slate-500">
                {findings.length === 0
                  ? "No findings yet"
                  : "No findings match your filters"}
              </p>
            </div>
          ) : (
            filtered.map((f) => {
              const sevCfg =
                severityConfig[f.severity] ?? severityConfig.info;
              const stCfg =
                statusConfig[f.status] ??
                statusConfig["needs-review"];
              const isSelected = f.id === selectedId;

              return (
                <button
                  key={f.id}
                  onClick={() => setSelectedId(f.id)}
                  className={`w-full text-left px-5 py-3 border-b border-slate-800 transition-colors ${
                    isSelected
                      ? "bg-slate-800/60"
                      : "hover:bg-slate-900"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border ${sevCfg.className}`}
                    >
                      <span
                        className={`size-1 rounded-full ${sevCfg.dotColor}`}
                      />
                      {sevCfg.label}
                    </span>
                    {f.shannonId && (
                      <span className="text-[10px] font-mono text-slate-600">
                        {f.shannonId}
                      </span>
                    )}
                    <span
                      className={`ml-auto px-1.5 py-0.5 rounded text-[10px] font-medium ${stCfg.className}`}
                    >
                      {stCfg.label}
                    </span>
                  </div>
                  <p className="text-sm text-slate-200 truncate">
                    {f.title}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-slate-600">
                      {f.category}
                    </span>
                    {f.source === "shannon" ? (
                      <Bot className="size-3 text-slate-600" />
                    ) : (
                      <User className="size-3 text-slate-600" />
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Detail panel (right) */}
        <div className="flex-1 overflow-y-auto">
          {!selected ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm text-slate-600">
                Select a finding to view details
              </p>
            </div>
          ) : (
            <FindingDetail
              key={selected.id}
              finding={selected}
              onPatch={(patch) => patchFinding(selected.id, patch)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
