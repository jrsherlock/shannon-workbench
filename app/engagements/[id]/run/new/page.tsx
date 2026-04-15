"use client";

import { useEffect, useState, useMemo } from "react";
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
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronUp,
  Loader2,
  Plus,
  Rocket,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import {
  buildConfigYAML,
  condenseDescription,
  getDefaultWizardState,
  type AuthConfig,
  type ConfigWizardState,
  type ScopeRule,
} from "@/lib/config-builder";

const STEPS = [
  { label: "Context", description: "Review engagement context" },
  { label: "Auth", description: "Configure authentication" },
  { label: "Scope", description: "Set scope rules" },
  { label: "Pipeline", description: "Pipeline settings" },
  { label: "Launch", description: "Review & launch" },
];

interface Engagement {
  id: string;
  name: string;
  description: string;
  threatModel: string;
  notes: string;
  targetUrl: string;
}

// ── Validation ──────────────────────────────────────────────────

function validateStep(
  step: number,
  wizard: ConfigWizardState,
): string[] {
  const errors: string[] = [];

  if (step === 1) {
    const auth = wizard.auth;
    if (auth) {
      const hasAny =
        auth.login_url.trim() ||
        auth.username.trim() ||
        auth.password;
      if (hasAny) {
        if (!auth.login_url.trim())
          errors.push("Login URL is required when configuring auth");
        if (!auth.username.trim())
          errors.push("Username is required when configuring auth");
        if (!auth.password)
          errors.push("Password is required when configuring auth");
        if (!auth.success_value.trim())
          errors.push("Success condition value is required");
      }
    }
  }

  if (step === 2) {
    if (wizard.focusRules.some((r) => !r.url_path.trim()))
      errors.push("Some focus rules have empty URL paths");
    if (wizard.avoidRules.some((r) => !r.url_path.trim()))
      errors.push("Some avoid rules have empty URL paths");
  }

  return errors;
}

function validateForLaunch(wizard: ConfigWizardState): string[] {
  return [...validateStep(1, wizard), ...validateStep(2, wizard)];
}

// ── Sub-components ──────────────────────────────────────────────

function ContextField({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
      <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
        {label}
      </span>
      {value.trim() ? (
        <p className="text-sm text-slate-300 mt-1 whitespace-pre-wrap">
          {value}
        </p>
      ) : (
        <p className="text-sm text-slate-600 italic mt-1">Not provided</p>
      )}
    </div>
  );
}

function StepContext({
  wizard,
  condensed,
}: {
  wizard: ConfigWizardState;
  condensed: string;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-medium text-slate-200 mb-1">
          Context Review
        </h2>
        <p className="text-xs text-slate-500">
          Review how engagement context will be sent to Shannon.
        </p>
      </div>

      <div className="space-y-3">
        <ContextField label="Description" value={wizard.description} />
        <ContextField label="Threat Model" value={wizard.threatModel} />
        <ContextField label="Notes" value={wizard.notes} />
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-slate-400">
            Shannon Description Preview
          </span>
          <span
            className={`text-xs tabular-nums ${condensed.length > 450 ? "text-yellow-400" : "text-slate-500"}`}
          >
            {condensed.length} / 500
          </span>
        </div>
        {condensed ? (
          <pre className="text-sm text-slate-300 whitespace-pre-wrap font-sans leading-relaxed">
            {condensed}
          </pre>
        ) : (
          <p className="text-sm text-slate-600 italic">No context provided</p>
        )}
      </div>
    </div>
  );
}

function StepAuth({
  auth,
  updateAuth,
  loginFlow,
  addLoginStep,
  removeLoginStep,
  updateLoginStep,
  moveLoginStep,
}: {
  auth: AuthConfig;
  updateAuth: (p: Partial<AuthConfig>) => void;
  loginFlow: string[];
  addLoginStep: () => void;
  removeLoginStep: (i: number) => void;
  updateLoginStep: (i: number, v: string) => void;
  moveLoginStep: (i: number, d: -1 | 1) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-medium text-slate-200 mb-1">
          Authentication
        </h2>
        <p className="text-xs text-slate-500">
          Configure how Shannon authenticates with the target application.
        </p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-4">
        <div className="space-y-1.5">
          <Label className="text-sm text-slate-300">Login Type</Label>
          <Select
            value={auth.login_type}
            onValueChange={(v) =>
              v && updateAuth({ login_type: v as AuthConfig["login_type"] })
            }
          >
            <SelectTrigger className="w-full bg-slate-800 border-slate-700 text-slate-100">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="form">Form Login</SelectItem>
              <SelectItem value="sso">SSO</SelectItem>
              <SelectItem value="api">API Key</SelectItem>
              <SelectItem value="basic">Basic Auth</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm text-slate-300">Login URL</Label>
          <Input
            value={auth.login_url}
            onChange={(e) => updateAuth({ login_url: e.target.value })}
            placeholder="https://app.example.com/login"
            className="bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-600 font-mono text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-sm text-slate-300">Username</Label>
            <Input
              value={auth.username}
              onChange={(e) => updateAuth({ username: e.target.value })}
              placeholder="test@example.com"
              className="bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-600"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm text-slate-300">Password</Label>
            <Input
              type="password"
              value={auth.password}
              onChange={(e) => updateAuth({ password: e.target.value })}
              className="bg-slate-800 border-slate-700 text-slate-100"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm text-slate-300">
            TOTP Secret (Base32)
          </Label>
          <Input
            value={auth.totp_secret ?? ""}
            onChange={(e) =>
              updateAuth({ totp_secret: e.target.value || undefined })
            }
            placeholder="JBSWY3DPEHPK3PXP"
            className="bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-600 font-mono text-sm"
          />
          <p className="text-xs text-slate-600">
            Optional. Required if the app uses TOTP-based MFA.
          </p>
        </div>

        <Separator className="bg-slate-800" />

        {/* Login flow steps */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm text-slate-300">Login Flow Steps</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={addLoginStep}
              className="h-7 px-2 text-xs text-slate-400 hover:text-slate-100 hover:bg-slate-700 gap-1"
            >
              <Plus className="size-3" />
              Add Step
            </Button>
          </div>
          <div className="space-y-2">
            {loginFlow.map((step, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs text-slate-600 w-5 text-right tabular-nums shrink-0">
                  {i + 1}.
                </span>
                <Input
                  value={step}
                  onChange={(e) => updateLoginStep(i, e.target.value)}
                  placeholder="Describe this step..."
                  className="flex-1 bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-600 text-sm"
                />
                <div className="flex items-center gap-0.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => moveLoginStep(i, -1)}
                    disabled={i === 0}
                    className="p-1 text-slate-600 hover:text-slate-300 disabled:opacity-30"
                  >
                    <ChevronUp className="size-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveLoginStep(i, 1)}
                    disabled={i === loginFlow.length - 1}
                    className="p-1 text-slate-600 hover:text-slate-300 disabled:opacity-30"
                  >
                    <ChevronDown className="size-3" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => removeLoginStep(i)}
                  className="p-1 text-slate-600 hover:text-red-400 shrink-0"
                >
                  <Trash2 className="size-3" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <Separator className="bg-slate-800" />

        {/* Success condition */}
        <div className="space-y-3">
          <Label className="text-sm text-slate-300">Success Condition</Label>
          <div className="grid grid-cols-2 gap-3">
            <Select
              value={auth.success_type}
              onValueChange={(v) =>
                v && updateAuth({
                  success_type: v as AuthConfig["success_type"],
                })
              }
            >
              <SelectTrigger className="w-full bg-slate-800 border-slate-700 text-slate-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="url_contains">URL Contains</SelectItem>
                <SelectItem value="element_present">
                  Element Present
                </SelectItem>
                <SelectItem value="url_equals_exactly">
                  URL Equals Exactly
                </SelectItem>
                <SelectItem value="text_contains">Text Contains</SelectItem>
              </SelectContent>
            </Select>
            <Input
              value={auth.success_value}
              onChange={(e) =>
                updateAuth({ success_value: e.target.value })
              }
              placeholder="/dashboard"
              className="bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-600 font-mono text-sm"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function RuleSection({
  title,
  description,
  rules,
  onAdd,
  onRemove,
  onUpdate,
}: {
  title: string;
  description: string;
  rules: ScopeRule[];
  onAdd: () => void;
  onRemove: (i: number) => void;
  onUpdate: (i: number, p: Partial<ScopeRule>) => void;
}) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-slate-300">{title}</h3>
          <p className="text-xs text-slate-600">{description}</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onAdd}
          className="h-7 px-2 text-xs text-slate-400 hover:text-slate-100 hover:bg-slate-700 gap-1"
        >
          <Plus className="size-3" />
          Add Rule
        </Button>
      </div>

      {rules.length === 0 && (
        <p className="text-xs text-slate-600 italic py-2">No rules defined</p>
      )}

      {rules.map((rule, i) => (
        <div key={i} className="flex items-start gap-2">
          <Select
            value={rule.type}
            onValueChange={(v) =>
              v && onUpdate(i, { type: v as ScopeRule["type"] })
            }
          >
            <SelectTrigger className="w-36 shrink-0 bg-slate-800 border-slate-700 text-slate-100">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="path">Path</SelectItem>
              <SelectItem value="subdomain">Subdomain</SelectItem>
              <SelectItem value="domain">Domain</SelectItem>
              <SelectItem value="method">Method</SelectItem>
              <SelectItem value="header">Header</SelectItem>
              <SelectItem value="parameter">Parameter</SelectItem>
            </SelectContent>
          </Select>
          <Input
            value={rule.url_path}
            onChange={(e) => onUpdate(i, { url_path: e.target.value })}
            placeholder="/api/*"
            className="w-48 shrink-0 bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-600 font-mono text-sm"
          />
          <Input
            value={rule.description}
            onChange={(e) => onUpdate(i, { description: e.target.value })}
            placeholder="Description..."
            className="flex-1 bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-600 text-sm"
          />
          <button
            type="button"
            onClick={() => onRemove(i)}
            className="mt-2 p-1 text-slate-600 hover:text-red-400 shrink-0"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}

function StepScope({
  wizard,
  addRule,
  removeRule,
  updateRule,
  warnings,
}: {
  wizard: ConfigWizardState;
  addRule: (t: "focusRules" | "avoidRules") => void;
  removeRule: (t: "focusRules" | "avoidRules", i: number) => void;
  updateRule: (
    t: "focusRules" | "avoidRules",
    i: number,
    p: Partial<ScopeRule>,
  ) => void;
  warnings: string[];
}) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-medium text-slate-200 mb-1">
          Scope Rules
        </h2>
        <p className="text-xs text-slate-500">
          Define which parts of the application Shannon should focus on or
          avoid.
        </p>
      </div>

      {warnings.length > 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 space-y-1">
          {warnings.map((w, i) => (
            <div
              key={i}
              className="flex items-center gap-2 text-xs text-yellow-400"
            >
              <TriangleAlert className="size-3 shrink-0" />
              {w}
            </div>
          ))}
        </div>
      )}

      <RuleSection
        title="Focus Rules"
        description="Shannon will prioritize testing these areas"
        rules={wizard.focusRules}
        onAdd={() => addRule("focusRules")}
        onRemove={(i) => removeRule("focusRules", i)}
        onUpdate={(i, p) => updateRule("focusRules", i, p)}
      />
      <RuleSection
        title="Avoid Rules"
        description="Shannon will skip these areas during testing"
        rules={wizard.avoidRules}
        onAdd={() => addRule("avoidRules")}
        onRemove={(i) => removeRule("avoidRules", i)}
        onUpdate={(i, p) => updateRule("avoidRules", i, p)}
      />
    </div>
  );
}

function StepPipeline({
  wizard,
  updateWizard,
}: {
  wizard: ConfigWizardState;
  updateWizard: (p: Partial<ConfigWizardState>) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-medium text-slate-200 mb-1">
          Pipeline Settings
        </h2>
        <p className="text-xs text-slate-500">
          Configure Shannon&apos;s execution parameters.
        </p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-6">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm text-slate-300">
              Max Concurrent Pipelines
            </Label>
            <span className="text-sm font-mono text-violet-400 tabular-nums">
              {wizard.maxConcurrentPipelines}
            </span>
          </div>
          <input
            type="range"
            min={1}
            max={5}
            value={wizard.maxConcurrentPipelines}
            onChange={(e) =>
              updateWizard({
                maxConcurrentPipelines: Number(e.target.value),
              })
            }
            className="w-full accent-violet-500"
          />
          <div className="flex justify-between text-xs text-slate-600 tabular-nums">
            <span>1</span>
            <span>2</span>
            <span>3</span>
            <span>4</span>
            <span>5</span>
          </div>
        </div>

        <div className="space-y-3">
          <Label className="text-sm text-slate-300">Retry Preset</Label>
          <div className="grid grid-cols-2 gap-3">
            {(["default", "subscription"] as const).map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => updateWizard({ retryPreset: preset })}
                className={`p-3 rounded-lg border text-left transition-colors ${
                  wizard.retryPreset === preset
                    ? "border-violet-500 bg-violet-500/10 text-slate-100"
                    : "border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600"
                }`}
              >
                <span className="text-sm font-medium block capitalize">
                  {preset}
                </span>
                <span className="text-xs text-slate-500 mt-0.5 block">
                  {preset === "default"
                    ? "Standard retry timeouts"
                    : "Extended timeouts for API rate limits"}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StepLaunch({ configYAML }: { configYAML: string }) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-medium text-slate-200 mb-1">
          Review &amp; Launch
        </h2>
        <p className="text-xs text-slate-500">
          Review the generated Shannon configuration before launching.
        </p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
        <div className="px-4 py-2.5 border-b border-slate-800 flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400">
            shannon.yaml
          </span>
          <button
            type="button"
            onClick={() =>
              navigator.clipboard
                .writeText(configYAML)
                .then(() => toast.success("Copied"))
            }
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            Copy
          </button>
        </div>
        <pre className="p-4 text-sm text-slate-300 font-mono leading-relaxed overflow-x-auto">
          {configYAML}
        </pre>
      </div>
    </div>
  );
}

// ── Main page ───────────────────────────────────────────────────

export default function NewRunPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [engagement, setEngagement] = useState<Engagement | null>(null);
  const [wizard, setWizard] = useState<ConfigWizardState>(
    getDefaultWizardState(),
  );
  const [launching, setLaunching] = useState(false);
  const [stepErrors, setStepErrors] = useState<string[]>([]);

  useEffect(() => {
    fetch(`/api/engagements/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then((data: Engagement) => {
        setEngagement(data);
        setWizard(getDefaultWizardState(data));
        setLoading(false);
      })
      .catch(() => {
        toast.error("Failed to load engagement");
        setLoading(false);
      });
  }, [id]);

  const condensed = useMemo(
    () => condenseDescription(wizard),
    [wizard.description, wizard.threatModel, wizard.notes],
  );

  const configYAML = useMemo(() => {
    try {
      return buildConfigYAML(wizard);
    } catch {
      return "# Error generating YAML";
    }
  }, [wizard]);

  const scopeWarnings = useMemo(() => {
    const warnings: string[] = [];
    const focusKeys = wizard.focusRules.map((r) => `${r.type}:${r.url_path}`);
    const avoidKeys = wizard.avoidRules.map((r) => `${r.type}:${r.url_path}`);
    if (new Set(focusKeys).size !== focusKeys.length)
      warnings.push("Duplicate focus rules detected");
    if (new Set(avoidKeys).size !== avoidKeys.length)
      warnings.push("Duplicate avoid rules detected");
    if (focusKeys.some((k) => avoidKeys.includes(k)))
      warnings.push(
        "Conflicting rules: same rule appears in both focus and avoid",
      );
    return warnings;
  }, [wizard.focusRules, wizard.avoidRules]);

  function updateWizard(partial: Partial<ConfigWizardState>) {
    setWizard((prev) => ({ ...prev, ...partial }));
  }

  function updateAuth(partial: Partial<AuthConfig>) {
    setWizard((prev) => ({
      ...prev,
      auth: prev.auth ? { ...prev.auth, ...partial } : undefined,
    }));
  }

  function addRule(type: "focusRules" | "avoidRules") {
    updateWizard({
      [type]: [
        ...wizard[type],
        { type: "path", description: "", url_path: "" } satisfies ScopeRule,
      ],
    });
  }

  function removeRule(type: "focusRules" | "avoidRules", index: number) {
    updateWizard({
      [type]: wizard[type].filter((_, i) => i !== index),
    });
  }

  function updateRule(
    type: "focusRules" | "avoidRules",
    index: number,
    partial: Partial<ScopeRule>,
  ) {
    updateWizard({
      [type]: wizard[type].map((r, i) =>
        i === index ? { ...r, ...partial } : r,
      ),
    });
  }

  function addLoginStep() {
    if (!wizard.auth) return;
    updateAuth({ login_flow: [...wizard.auth.login_flow, ""] });
  }
  function removeLoginStep(index: number) {
    if (!wizard.auth) return;
    updateAuth({
      login_flow: wizard.auth.login_flow.filter((_, i) => i !== index),
    });
  }
  function updateLoginStep(index: number, value: string) {
    if (!wizard.auth) return;
    updateAuth({
      login_flow: wizard.auth.login_flow.map((s, i) =>
        i === index ? value : s,
      ),
    });
  }
  function moveLoginStep(index: number, direction: -1 | 1) {
    if (!wizard.auth) return;
    const flow = [...wizard.auth.login_flow];
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= flow.length) return;
    [flow[index], flow[newIndex]] = [flow[newIndex], flow[index]];
    updateAuth({ login_flow: flow });
  }

  async function handleLaunch() {
    const errors = validateForLaunch(wizard);
    if (errors.length > 0) {
      setStepErrors(errors);
      return;
    }
    setStepErrors([]);
    setLaunching(true);
    try {
      const res = await fetch("/api/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          engagementId: id,
          configYAML,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          (body as { error?: string }).error ?? "Failed to launch run",
        );
      }
      const run = (await res.json()) as { id: string };
      toast.success("Run launched");
      router.push(`/engagements/${id}/runs/${run.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Launch failed");
      setLaunching(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col min-h-full bg-slate-950">
        <div className="border-b border-slate-800 px-8 py-5 flex items-center gap-4 shrink-0">
          <Skeleton className="size-5 bg-slate-800 rounded" />
          <Skeleton className="h-6 w-48 bg-slate-800 rounded" />
        </div>
        <div className="px-8 py-6 space-y-4">
          <Skeleton className="h-12 w-full bg-slate-900 rounded-lg" />
          <Skeleton className="h-64 w-full bg-slate-900 rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full bg-slate-950">
      {/* Header */}
      <div className="border-b border-slate-800 px-8 py-5 flex items-center gap-4 shrink-0">
        <button
          onClick={() => router.push(`/engagements/${id}`)}
          className="text-slate-500 hover:text-slate-300 transition-colors"
        >
          <ArrowLeft className="size-4" />
        </button>
        <div>
          <h1 className="text-lg font-semibold text-slate-100">
            Configure Run
          </h1>
          {engagement && (
            <p className="text-sm text-slate-500">{engagement.name}</p>
          )}
        </div>
      </div>

      {/* Step indicator bar */}
      <div className="border-b border-slate-800 px-8 py-3">
        <div className="flex items-center gap-1">
          {STEPS.map((s, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setStep(i)}
              className="flex items-center gap-2"
            >
              <div
                className={`flex items-center justify-center size-6 rounded-full text-xs font-medium transition-colors ${
                  i === step
                    ? "bg-violet-600 text-white"
                    : i < step
                      ? "bg-violet-600/20 text-violet-400"
                      : "bg-slate-800 text-slate-500"
                }`}
              >
                {i < step ? <Check className="size-3" /> : i + 1}
              </div>
              <span
                className={`text-xs font-medium transition-colors ${
                  i === step ? "text-slate-200" : "text-slate-500"
                }`}
              >
                {s.label}
              </span>
              {i < STEPS.length - 1 && (
                <div className="w-8 h-px bg-slate-800 mx-1" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Step content */}
      <div className="flex-1 px-8 py-6 max-w-3xl overflow-y-auto">
        {step === 0 && (
          <StepContext wizard={wizard} condensed={condensed} />
        )}
        {step === 1 && wizard.auth && (
          <StepAuth
            auth={wizard.auth}
            updateAuth={updateAuth}
            loginFlow={wizard.auth.login_flow}
            addLoginStep={addLoginStep}
            removeLoginStep={removeLoginStep}
            updateLoginStep={updateLoginStep}
            moveLoginStep={moveLoginStep}
          />
        )}
        {step === 2 && (
          <StepScope
            wizard={wizard}
            addRule={addRule}
            removeRule={removeRule}
            updateRule={updateRule}
            warnings={scopeWarnings}
          />
        )}
        {step === 3 && (
          <StepPipeline wizard={wizard} updateWizard={updateWizard} />
        )}
        {step === 4 && <StepLaunch configYAML={configYAML} />}

        {/* Validation errors */}
        {stepErrors.length > 0 && (
          <div className="mt-4 bg-red-500/10 border border-red-500/30 rounded-lg p-3 space-y-1">
            {stepErrors.map((e, i) => (
              <div
                key={i}
                className="flex items-center gap-2 text-xs text-red-400"
              >
                <TriangleAlert className="size-3 shrink-0" />
                {e}
              </div>
            ))}
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-800">
          <Button
            variant="ghost"
            onClick={() => {
              setStepErrors([]);
              setStep((s) => s - 1);
            }}
            disabled={step === 0}
            className="h-9 px-4 text-sm text-slate-400 hover:text-slate-100 hover:bg-slate-800 gap-1.5 disabled:opacity-30"
          >
            <ArrowLeft className="size-3.5" />
            Back
          </Button>
          {step < STEPS.length - 1 ? (
            <Button
              onClick={() => {
                const errors = validateStep(step, wizard);
                if (errors.length > 0) {
                  setStepErrors(errors);
                  return;
                }
                setStepErrors([]);
                setStep((s) => s + 1);
              }}
              className="bg-violet-600 hover:bg-violet-500 text-white border-0 h-9 px-4 text-sm gap-1.5"
            >
              Next
              <ArrowRight className="size-3.5" />
            </Button>
          ) : (
            <Button
              onClick={handleLaunch}
              disabled={launching}
              className="bg-violet-600 hover:bg-violet-500 text-white border-0 h-9 px-4 text-sm gap-1.5 disabled:opacity-50"
            >
              {launching ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Launching...
                </>
              ) : (
                <>
                  <Rocket className="size-3.5" />
                  Launch Run
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
