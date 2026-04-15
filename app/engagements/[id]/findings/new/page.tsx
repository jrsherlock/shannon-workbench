"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Plus } from "lucide-react";

export default function NewFindingPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [form, setForm] = useState({
    category: "other",
    title: "",
    severity: "medium",
    description: "",
    poc: "",
    codeLocation: "",
    remediation: "",
    testerNotes: "",
  });
  const [submitting, setSubmitting] = useState(false);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/findings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          engagementId: id,
          ...form,
          source: "manual",
        }),
      });
      if (!res.ok) throw new Error("Failed to create finding");
      toast.success("Finding created");
      router.push(`/engagements/${id}/findings`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Something went wrong",
      );
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col min-h-full bg-slate-950">
      <div className="border-b border-slate-800 px-8 py-5 flex items-center gap-4 shrink-0">
        <button
          onClick={() => router.back()}
          className="text-slate-500 hover:text-slate-300 transition-colors"
        >
          <ArrowLeft className="size-4" />
        </button>
        <h1 className="text-lg font-semibold text-slate-100">
          Add Finding
        </h1>
      </div>

      <div className="flex-1 px-8 py-6 max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm text-slate-300">
                  Category
                </Label>
                <Select
                  value={form.category}
                  onValueChange={(v) =>
                    v && setForm((prev) => ({ ...prev, category: v }))
                  }
                >
                  <SelectTrigger className="w-full bg-slate-800 border-slate-700 text-slate-100">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="injection">Injection</SelectItem>
                    <SelectItem value="xss">XSS</SelectItem>
                    <SelectItem value="auth">Auth</SelectItem>
                    <SelectItem value="ssrf">SSRF</SelectItem>
                    <SelectItem value="authz">AuthZ</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm text-slate-300">
                  Severity
                </Label>
                <Select
                  value={form.severity}
                  onValueChange={(v) =>
                    v && setForm((prev) => ({ ...prev, severity: v }))
                  }
                >
                  <SelectTrigger className="w-full bg-slate-800 border-slate-700 text-slate-100">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="info">Info</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm text-slate-300">
                Title <span className="text-red-400">*</span>
              </Label>
              <Input
                name="title"
                value={form.title}
                onChange={handleChange}
                placeholder="Finding title"
                className="bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-600"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm text-slate-300">
                Description
              </Label>
              <Textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={4}
                placeholder="Describe the vulnerability..."
                className="bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-600 resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm text-slate-300">
                Proof of Concept
              </Label>
              <Textarea
                name="poc"
                value={form.poc}
                onChange={handleChange}
                rows={4}
                placeholder="Steps to reproduce or curl commands..."
                className="bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-600 resize-none font-mono text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm text-slate-300">
                Code Location
              </Label>
              <Input
                name="codeLocation"
                value={form.codeLocation}
                onChange={handleChange}
                placeholder="src/api/auth.ts:42"
                className="bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-600 font-mono text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm text-slate-300">
                Remediation
              </Label>
              <Textarea
                name="remediation"
                value={form.remediation}
                onChange={handleChange}
                rows={3}
                placeholder="Recommended fix..."
                className="bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-600 resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm text-slate-300">
                Tester Notes
              </Label>
              <Textarea
                name="testerNotes"
                value={form.testerNotes}
                onChange={handleChange}
                rows={3}
                placeholder="Internal notes..."
                className="bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-600 resize-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 pb-8">
            <Button
              type="submit"
              disabled={submitting}
              className="bg-violet-600 hover:bg-violet-500 text-white border-0 h-9 px-4 text-sm gap-1.5 disabled:opacity-50"
            >
              <Plus className="size-4" />
              {submitting ? "Creating..." : "Create Finding"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.back()}
              className="h-9 px-4 text-sm text-slate-400 hover:text-slate-100 hover:bg-slate-800"
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
