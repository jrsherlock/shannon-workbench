import yaml from "js-yaml";

export interface AuthConfig {
  login_type: "form" | "sso" | "api" | "basic";
  login_url: string;
  username: string;
  password: string;
  totp_secret?: string;
  login_flow: string[];
  success_type: "url_contains" | "element_present" | "url_equals_exactly" | "text_contains";
  success_value: string;
}

export interface ScopeRule {
  description: string;
  type: "path" | "subdomain" | "domain" | "method" | "header" | "parameter";
  url_path: string;
}

export interface ConfigWizardState {
  description: string;
  threatModel: string;
  notes: string;
  auth?: AuthConfig;
  focusRules: ScopeRule[];
  avoidRules: ScopeRule[];
  maxConcurrentPipelines: number;
  retryPreset: "default" | "subscription";
}

export function buildConfigYAML(state: ConfigWizardState): string {
  const shannonDescription = condenseDescription(state);

  const config: Record<string, unknown> = {};

  if (shannonDescription) {
    config.description = shannonDescription;
  }

  if (state.auth && state.auth.login_url && state.auth.username) {
    const authBlock: Record<string, unknown> = {
      login_type: state.auth.login_type,
      login_url: state.auth.login_url,
      credentials: {
        username: state.auth.username,
        password: state.auth.password,
        ...(state.auth.totp_secret && { totp_secret: state.auth.totp_secret }),
      },
      login_flow: state.auth.login_flow.filter((s) => s.trim()),
      success_condition: {
        type: state.auth.success_type,
        value: state.auth.success_value,
      },
    };
    config.authentication = authBlock;
  }

  if (state.focusRules.length > 0 || state.avoidRules.length > 0) {
    config.rules = {
      ...(state.focusRules.length > 0 && { focus: state.focusRules }),
      ...(state.avoidRules.length > 0 && { avoid: state.avoidRules }),
    };
  }

  config.pipeline = {
    retry_preset: state.retryPreset,
    max_concurrent_pipelines: String(state.maxConcurrentPipelines),
  };

  return yaml.dump(config, { lineWidth: 120, quotingType: '"' });
}

export function condenseDescription(state: Pick<ConfigWizardState, "description" | "threatModel" | "notes">): string {
  const parts: string[] = [];

  if (state.description.trim()) parts.push(state.description.trim());
  if (state.threatModel.trim()) parts.push(`Threat model: ${state.threatModel.trim()}`);
  if (state.notes.trim()) parts.push(`Notes: ${state.notes.trim()}`);

  const combined = parts.join(". ");
  if (combined.length <= 500) return combined;

  // Truncate to 500 chars at a word boundary
  const truncated = combined.slice(0, 497);
  const lastSpace = truncated.lastIndexOf(" ");
  return truncated.slice(0, lastSpace) + "...";
}

export function getDefaultWizardState(engagement?: {
  description: string;
  threatModel: string;
  notes: string;
  targetUrl: string;
}): ConfigWizardState {
  return {
    description: engagement?.description ?? "",
    threatModel: engagement?.threatModel ?? "",
    notes: engagement?.notes ?? "",
    auth: {
      login_type: "form",
      login_url: engagement ? new URL(engagement.targetUrl).origin + "/login" : "",
      username: "",
      password: "",
      login_flow: [
        "Fill the email field with the username",
        "Fill the password field",
        'Click the "Log in" button',
      ],
      success_type: "url_contains",
      success_value: "/dashboard",
    },
    focusRules: [],
    avoidRules: [],
    maxConcurrentPipelines: 2,
    retryPreset: "subscription",
  };
}
