import { readFile, access } from "fs/promises";
import { join } from "path";
import { db } from "./db";

const CATEGORIES = ["injection", "xss", "auth", "ssrf", "authz"] as const;

interface QueueFinding {
  ID: string;
  vulnerability_type: string;
  externally_exploitable: boolean;
  source?: string;
  source_endpoint?: string;
  vulnerable_code_location?: string;
  sink_call?: string;
  verdict?: string;
  confidence?: string;
  notes?: string;
  missing_defense?: string;
  exploitation_hypothesis?: string;
  suggested_exploit_technique?: string;
  witness_payload?: string;
}

interface EvidenceFinding {
  shannonId: string;
  title: string;
  severity: string;
  description: string;
  poc: string;
  codeLocation: string;
  remediation: string;
  isDisabled: boolean;
}

export async function ingestFindings(params: {
  engagementId: string;
  runId: string;
  repoPath: string;
  deliverablesSubdir?: string;
}): Promise<number> {
  const { engagementId, runId, repoPath, deliverablesSubdir = "deliverables" } = params;
  const delivDir = join(repoPath, deliverablesSubdir);
  let totalIngested = 0;

  for (const category of CATEGORIES) {
    const queuePath = join(delivDir, `${category}_exploitation_queue.json`);
    const evidencePath = join(delivDir, `${category}_exploitation_evidence.md`);

    // Parse queue JSON for structured metadata
    const queueFindings = await parseQueueJSON(queuePath);
    if (queueFindings.length === 0) continue;

    // Parse evidence markdown for PoC content
    const evidenceMap = await parseEvidenceMarkdown(evidencePath);

    for (const qf of queueFindings) {
      // Skip if already ingested
      const existing = await db.finding.findFirst({
        where: { runId, shannonId: qf.ID },
      });
      if (existing) continue;

      const evidence = evidenceMap.get(qf.ID);
      const severity = evidence?.severity ?? inferSeverity(qf);
      const isDisabled = evidence?.isDisabled ?? false;

      await db.finding.create({
        data: {
          engagementId,
          runId,
          shannonId: qf.ID,
          source: "shannon",
          category: mapCategory(category),
          title: evidence?.title ?? formatTitle(qf),
          severity,
          description: buildDescription(qf),
          poc: evidence?.poc ?? "",
          codeLocation: qf.vulnerable_code_location ?? qf.sink_call ?? "",
          remediation: evidence?.remediation ?? "",
          testerNotes: "",
          status: isDisabled ? "needs-more-testing" : "needs-review",
        },
      });
      totalIngested++;
    }
  }

  return totalIngested;
}

async function parseQueueJSON(path: string): Promise<QueueFinding[]> {
  try {
    await access(path);
    const content = await readFile(path, "utf8");
    const parsed = JSON.parse(content);
    return parsed.vulnerabilities ?? [];
  } catch {
    return [];
  }
}

async function parseEvidenceMarkdown(path: string): Promise<Map<string, EvidenceFinding>> {
  const map = new Map<string, EvidenceFinding>();
  try {
    await access(path);
    const content = await readFile(path, "utf8");
    const sections = content.split(/^### /m).slice(1);

    // Check if we're in the "disabled" section
    let inDisabledSection = false;
    const disabledHeader = /Docker-Disabled|Blocked by Docker|Environment Controls/i;

    for (const section of content.split(/^## /m)) {
      if (disabledHeader.test(section)) {
        inDisabledSection = true;
      }
    }

    for (const section of sections) {
      const headerMatch = section.match(/^([\w-]+(?:-VULN-\d+)[^:]*?)(?:\s*[:—]\s*(.+?))?$/m);
      if (!headerMatch) continue;

      const shannonId = extractId(headerMatch[1]);
      if (!shannonId) continue;

      const titleRaw = headerMatch[2]?.trim() ?? headerMatch[1].trim();
      const title = titleRaw.replace(/\*\*/g, "").trim();

      // Severity
      const severityMatch = section.match(/\*\*Severity:\*\*\s*(\w+)/i);
      const severity = normalizeSeverity(severityMatch?.[1] ?? "medium");

      // Description from Summary block
      const summaryMatch = section.match(/\*\*Overview:\*\*\s*([^*\n][^\n]*(?:\n(?!\*\*)[^\n]*)*)/);
      const description = summaryMatch?.[1]?.trim() ?? "";

      // PoC — capture all code blocks
      const codeBlocks = [...section.matchAll(/```[\w]*\n([\s\S]*?)```/g)];
      const poc = codeBlocks.map((m) => "```\n" + m[1].trim() + "\n```").join("\n\n");

      // Code location from Root Cause section
      const rootCauseMatch = section.match(/\*\*Root Cause[^*]*\*\*[\s\S]*?`([^`]+\.(?:ts|js|py|go|rb|php)[^`]*)`/);
      const codeLocation = rootCauseMatch?.[1] ?? "";

      // Remediation from Fix section
      const fixMatch = section.match(/\*\*Fix:\*\*\s*([^\n]+(?:\n(?![\n#])[^\n]*)*)/);
      const remediation = fixMatch?.[1]?.trim() ?? "";

      // Determine if this finding is in the disabled section
      const isDisabled = inDisabledSection && content.indexOf(`### ${section.slice(0, 30)}`) >
        content.indexOf("Docker-Disabled");

      map.set(shannonId, { shannonId, title, severity, description, poc, codeLocation, remediation, isDisabled });
    }
  } catch {
    // Evidence file doesn't exist yet — run still in progress
  }
  return map;
}

function extractId(str: string): string | null {
  const match = str.match(/([A-Z]+-VULN-\d+)/);
  return match?.[1] ?? null;
}

function normalizeSeverity(raw: string): string {
  const s = raw.toLowerCase();
  if (s === "critical") return "critical";
  if (s === "high") return "high";
  if (s === "medium" || s === "moderate") return "medium";
  if (s === "low") return "low";
  return "info";
}

function inferSeverity(qf: QueueFinding): string {
  const confidence = qf.confidence?.toLowerCase() ?? "";
  if (confidence === "high") return "high";
  if (confidence === "med" || confidence === "medium") return "medium";
  return "low";
}

function formatTitle(qf: QueueFinding): string {
  const type = qf.vulnerability_type.replace(/_/g, " ");
  const endpoint = qf.source_endpoint ?? qf.source ?? "";
  return endpoint ? `${type} — ${endpoint}` : type;
}

function buildDescription(qf: QueueFinding): string {
  const parts: string[] = [];
  if (qf.exploitation_hypothesis ?? qf.missing_defense) {
    parts.push(qf.exploitation_hypothesis ?? qf.missing_defense ?? "");
  }
  if (qf.notes) parts.push(qf.notes);
  return parts.join("\n\n");
}

function mapCategory(c: string): string {
  if (c === "injection") return "injection";
  if (c === "xss") return "xss";
  if (c === "auth") return "auth";
  if (c === "ssrf") return "ssrf";
  if (c === "authz") return "authz";
  return "other";
}
