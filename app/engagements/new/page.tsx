"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowLeft, Plus } from "lucide-react";

interface FormState {
  name: string;
  clientName: string;
  targetUrl: string;
  repoPath: string;
  description: string;
  threatModel: string;
  notes: string;
}

const initialForm: FormState = {
  name: "",
  clientName: "",
  targetUrl: "",
  repoPath: "",
  description: "",
  threatModel: "",
  notes: "",
};

export default function NewEngagementPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof FormState]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  }

  function validate(): boolean {
    const newErrors: Partial<Record<keyof FormState, string>> = {};
    if (!form.name.trim()) newErrors.name = "Name is required";
    if (!form.clientName.trim()) newErrors.clientName = "Client name is required";
    if (!form.targetUrl.trim()) newErrors.targetUrl = "Target URL is required";
    if (!form.repoPath.trim()) newErrors.repoPath = "Repo path is required";

    if (form.targetUrl.trim() && !form.targetUrl.startsWith("http")) {
      newErrors.targetUrl = "Target URL must start with http:// or https://";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/engagements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          clientName: form.clientName.trim(),
          targetUrl: form.targetUrl.trim(),
          repoPath: form.repoPath.trim(),
          description: form.description.trim(),
          threatModel: form.threatModel.trim(),
          notes: form.notes.trim(),
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? "Failed to create engagement");
      }

      const engagement = await res.json() as { id: string };
      toast.success("Engagement created");
      router.push(`/engagements/${engagement.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col min-h-full bg-slate-950">
      {/* Page header */}
      <div className="border-b border-slate-800 px-8 py-5 flex items-center gap-4 shrink-0">
        <button
          onClick={() => router.back()}
          className="text-slate-500 hover:text-slate-300 transition-colors"
        >
          <ArrowLeft className="size-4" />
        </button>
        <h1 className="text-lg font-semibold text-slate-100">New Engagement</h1>
      </div>

      <div className="flex-1 px-8 py-6 max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Core fields */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-4">
            <h2 className="text-sm font-medium text-slate-300 pb-1 border-b border-slate-800">
              Basic Information
            </h2>

            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-sm text-slate-300">
                Engagement Name <span className="text-red-400">*</span>
              </Label>
              <Input
                id="name"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Q2 2025 Web App Assessment"
                className="bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-600 focus:border-violet-500 focus:ring-violet-500/20"
              />
              {errors.name && (
                <p className="text-xs text-red-400">{errors.name}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="clientName" className="text-sm text-slate-300">
                Client Name <span className="text-red-400">*</span>
              </Label>
              <Input
                id="clientName"
                name="clientName"
                value={form.clientName}
                onChange={handleChange}
                placeholder="Acme Corp"
                className="bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-600 focus:border-violet-500 focus:ring-violet-500/20"
              />
              {errors.clientName && (
                <p className="text-xs text-red-400">{errors.clientName}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="targetUrl" className="text-sm text-slate-300">
                Target URL <span className="text-red-400">*</span>
              </Label>
              <Input
                id="targetUrl"
                name="targetUrl"
                value={form.targetUrl}
                onChange={handleChange}
                placeholder="https://app.acmecorp.com"
                className="bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-600 focus:border-violet-500 focus:ring-violet-500/20 font-mono text-sm"
              />
              {errors.targetUrl && (
                <p className="text-xs text-red-400">{errors.targetUrl}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="repoPath" className="text-sm text-slate-300">
                Repo Path <span className="text-red-400">*</span>
              </Label>
              <Input
                id="repoPath"
                name="repoPath"
                value={form.repoPath}
                onChange={handleChange}
                placeholder="/home/user/projects/acme-app"
                className="bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-600 focus:border-violet-500 focus:ring-violet-500/20 font-mono text-sm"
              />
              {errors.repoPath && (
                <p className="text-xs text-red-400">{errors.repoPath}</p>
              )}
              <p className="text-xs text-slate-600">Absolute filesystem path to the source code repository.</p>
            </div>
          </div>

          {/* Context fields */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-4">
            <h2 className="text-sm font-medium text-slate-300 pb-1 border-b border-slate-800">
              Context
            </h2>

            <div className="space-y-1.5">
              <Label htmlFor="description" className="text-sm text-slate-300">
                Description
              </Label>
              <Textarea
                id="description"
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={3}
                placeholder="Brief overview of the application and assessment scope..."
                className="bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-600 focus:border-violet-500 focus:ring-violet-500/20 resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="threatModel" className="text-sm text-slate-300">
                Threat Model
              </Label>
              <Textarea
                id="threatModel"
                name="threatModel"
                value={form.threatModel}
                onChange={handleChange}
                rows={4}
                placeholder="Multi-tenant? PCI? HIPAA? Key invariants?"
                className="bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-600 focus:border-violet-500 focus:ring-violet-500/20 resize-none"
              />
              <p className="text-xs text-slate-600">
                Key security assumptions and compliance requirements Shannon should be aware of.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notes" className="text-sm text-slate-300">
                Notes
              </Label>
              <Textarea
                id="notes"
                name="notes"
                value={form.notes}
                onChange={handleChange}
                rows={4}
                placeholder="Scope restrictions, previous findings, don't touch areas..."
                className="bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-600 focus:border-violet-500 focus:ring-violet-500/20 resize-none"
              />
              <p className="text-xs text-slate-600">
                Operational constraints, out-of-scope systems, and tester notes.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pb-8">
            <Button
              type="submit"
              disabled={submitting}
              className="bg-violet-600 hover:bg-violet-500 text-white border-0 h-9 px-4 text-sm gap-1.5 disabled:opacity-50"
            >
              <Plus className="size-4" />
              {submitting ? "Creating..." : "Create Engagement"}
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
