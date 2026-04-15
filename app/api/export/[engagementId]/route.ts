import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ engagementId: string }> }
) {
  try {
    const { engagementId } = await params;
    const { searchParams } = new URL(request.url);
    const statusesParam = searchParams.get("statuses") ?? "confirmed";
    const statusFilter = statusesParam.split(",").map((s) => s.trim()).filter(Boolean);

    // Fetch engagement
    const engagement = await db.engagement.findUnique({ where: { id: engagementId } });
    if (!engagement) {
      return NextResponse.json({ error: "Engagement not found" }, { status: 404 });
    }

    // Fetch latest completed run
    const latestRun = await db.run.findFirst({
      where: { engagementId, status: "completed" },
      orderBy: { startedAt: "desc" },
    });

    // Fetch findings filtered by status
    const findings = await db.finding.findMany({
      where: {
        engagementId,
        status: { in: statusFilter },
      },
      orderBy: { createdAt: "desc" },
    });

    // Build summary
    const summary = {
      total_findings: findings.length,
      confirmed: findings.filter((f) => f.status === "confirmed").length,
      dismissed: findings.filter((f) => f.status === "dismissed").length,
      needs_review: findings.filter((f) => f.status === "needs-review").length,
      needs_more_testing: findings.filter((f) => f.status === "needs-more-testing").length,
      by_severity: findings.reduce<Record<string, number>>((acc, f) => {
        acc[f.severity] = (acc[f.severity] ?? 0) + 1;
        return acc;
      }, {}),
      by_category: findings.reduce<Record<string, number>>((acc, f) => {
        acc[f.category] = (acc[f.category] ?? 0) + 1;
        return acc;
      }, {}),
    };

    const exportPayload = {
      export_version: "1.0",
      generated_at: new Date().toISOString(),
      engagement: {
        id: engagement.id,
        name: engagement.name,
        client_name: engagement.clientName,
        target_url: engagement.targetUrl,
      },
      run: latestRun
        ? {
            workflow_id: latestRun.workflowId,
            started_at: latestRun.startedAt.toISOString(),
            completed_at: latestRun.completedAt?.toISOString() ?? null,
            total_cost_usd: latestRun.totalCostUsd,
            total_duration_ms: latestRun.totalDurationMs,
          }
        : null,
      findings: findings.map((f) => ({
        id: f.id,
        shannon_id: f.shannonId,
        source: f.source,
        category: f.category,
        title: f.title,
        severity: f.severity,
        status: f.status,
        description: f.description,
        poc: f.poc,
        code_location: f.codeLocation,
        remediation: f.remediation,
        tester_notes: f.testerNotes,
        cvss: f.cvss,
      })),
      summary,
    };

    return NextResponse.json(exportPayload);
  } catch (error) {
    console.error("GET /api/export/[engagementId] error:", error);
    return NextResponse.json({ error: "Failed to generate export" }, { status: 500 });
  }
}
