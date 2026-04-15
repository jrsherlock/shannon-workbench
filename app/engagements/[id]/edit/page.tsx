"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { ArrowLeft, Save } from "lucide-react";

interface FormState {
  name: string;
  clientName: string;
  targetUrl: string;
  repoPath: string;
  description: string;
  threatModel: string;
  notes: string;
  status: string;
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
}

export default function EditEngagementPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [form, setForm] = useState<FormState>({
    name: "",
    clientName: "",
    targetUrl: "",
    repoPath: "",
    description: "",
    threatModel: "",
    notes: "",
    status: "active",
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  useEffect(() => {
    fetch(`/api/engagements/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("Engagement not found");
        return r.json();
      })
      .then((data: Engagement) => {
        setForm({
          name: data.name,
          clientName: data.clientName,
          targetUrl: data.targetUrl,
          repoPath: data.repoPath,
          description: data.description,
          threatModel: data.threatModel,
          notes: data.notes,
          status: data.status,
        });
        setLoading(false);
      })
      .catch((err: Error) => {
        toast.error(err.message);
        router.push("/");
      });
  }, [id, router]);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
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
      const res = await fetch(`/api/engagements/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          clientName: form.clientName.trim(),
          targetUrl: form.targetUrl.trim(),
          repoPath: form.repoPath.trim(),
          description: form.description.trim(),
          threatModel: form.threatModel.trim(),
          notes: form.notes.trim(),
          status: form.status,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? "Failed to update engagement");
      }

      toast.success("Engagement updated");
      router.push(`/engagements/${id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col min-h-full bg-slate-950">
        <div className="border-b border-slate-800 px-8 py-5 flex items-center gap-4 shrink-0">
          <Skeleton className="size-5 bg-slate-800 rounded" />
          <Skeleton className="h-6 w-48 bg-slate-800 rounded" />
        </div>
        <div className="px-8 py-6 max-w-2xl space-y-4">
          <Skeleton className="h-56 w-full bg-slate-900 rounded-lg" />
          <Skeleton className="h-72 w-full bg-slate-900 rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full bg-slate-950">
      {/* Page header */}
      <div className="border-b border-slate-800 px-8 py-5 flex items-center gap-4 shrink-0">
        <button
          onClick={() => router.push(`/engagements/${id}`)}
          className="text-slate-500 hover:text-slate-300 transition-colors"
        >
          <ArrowLeft className="size-4" />
        </button>
        <h1 className="text-lg font-semibold text-slate-100">Edit Engagement</h1>
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
                className="bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-600 focus:border-violet-500 focus:ring-violet-500/20 font-mono text-sm"
              />
              {errors.repoPath && (
                <p className="text-xs text-red-400">{errors.repoPath}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="status" className="text-sm text-slate-300">
                Status
              </Label>
              <select
                id="status"
                name="status"
                value={form.status}
                onChange={handleChange}
                className="flex h-9 w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-1 text-sm text-slate-100 shadow-sm transition-colors focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500/20"
              >
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="archived">Archived</option>
              </select>
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
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pb-8">
            <Button
              type="submit"
              disabled={submitting}
              className="bg-violet-600 hover:bg-violet-500 text-white border-0 h-9 px-4 text-sm gap-1.5 disabled:opacity-50"
            >
              <Save className="size-4" />
              {submitting ? "Saving..." : "Save Changes"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.push(`/engagements/${id}`)}
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
