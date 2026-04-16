import { execFile } from "child_process";
import { writeFile, unlink } from "fs/promises";
import { join } from "path";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export interface LaunchResult {
  workflowId: string;
  sessionId: string;
}

/**
 * Resolves the Shannon CLI command + arg prefix.
 *
 * Default: `npx @keygraph/shannon ...`
 * Override: set SHANNON_CLI_PATH to a binary path (e.g. "shannon" if globally installed).
 */
function shannonCmd(): { bin: string; prefix: string[] } {
  const override = process.env.SHANNON_CLI_PATH;
  if (override) return { bin: override, prefix: [] };
  return { bin: "npx", prefix: ["@keygraph/shannon"] };
}

export async function launchShannonRun(params: {
  webUrl: string;
  repoPath: string;
  configYAML: string;
  sessionId: string;
}): Promise<LaunchResult> {
  const { webUrl, repoPath, configYAML, sessionId } = params;

  // Write config to a stable path keyed by sessionId. The file must persist
  // because Shannon's Docker worker reads it asynchronously after the CLI
  // returns, and resume needs the same config available again.
  const configPath = join("/tmp", `shannon-config-${sessionId}.yaml`);
  await writeFile(configPath, configYAML, "utf8");

  const { bin, prefix } = shannonCmd();

  const { stdout, stderr } = await execFileAsync(
    bin,
    [...prefix, "start", "-u", webUrl, "-r", repoPath, "-c", configPath, "-w", sessionId],
    { timeout: 60_000 },
  );

  const output = stdout + stderr;
  const workflowId = parseWorkflowId(output, sessionId);

  return { workflowId, sessionId };
}

/** Clean up the config file after a run reaches a terminal status. */
export async function cleanupRunConfig(sessionId: string): Promise<void> {
  const configPath = join("/tmp", `shannon-config-${sessionId}.yaml`);
  await unlink(configPath).catch(() => null);
}

function parseWorkflowId(output: string, sessionId: string): string {
  // Shannon outputs lines like: "Workflow ID: juice-shop-pentest_shannon-1776275402052"
  const match = output.match(/Workflow ID:\s*(\S+)/i);
  if (match) return match[1];

  // Fallback: look for the session-prefixed workflow pattern
  const patternMatch = output.match(new RegExp(`(${sessionId}[_-]\\S+)`));
  if (patternMatch) return patternMatch[1];

  throw new Error(
    `Could not parse workflow ID from Shannon output:\n${output.slice(0, 500)}`
  );
}

export async function cancelShannonRun(workflowId: string): Promise<void> {
  const { bin, prefix } = shannonCmd();
  await execFileAsync(bin, [...prefix, "stop", workflowId], { timeout: 10_000 });
}
