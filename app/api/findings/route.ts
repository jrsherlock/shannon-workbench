import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

const SEVERITY_ORDER: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  info: 4,
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const engagementId = searchParams.get("engagementId");
    const runId = searchParams.get("runId");
    const status = searchParams.get("status");
    const severity = searchParams.get("severity");
    const category = searchParams.get("category");
    const source = searchParams.get("source");

    if (!engagementId) {
      return NextResponse.json({ error: "engagementId is required" }, { status: 400 });
    }

    const where: Prisma.FindingWhereInput = { engagementId };
    if (runId) where.runId = runId;
    if (status) where.status = status;
    if (severity) where.severity = severity;
    if (category) where.category = category;
    if (source) where.source = source;

    const findings = await db.finding.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    // Sort by severity (critical first), then by createdAt desc (already sorted above)
    findings.sort((a, b) => {
      const aSev = SEVERITY_ORDER[a.severity] ?? 99;
      const bSev = SEVERITY_ORDER[b.severity] ?? 99;
      if (aSev !== bSev) return aSev - bSev;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return NextResponse.json(findings);
  } catch (error) {
    console.error("GET /api/findings error:", error);
    return NextResponse.json({ error: "Failed to fetch findings" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      engagementId,
      runId,
      category,
      title,
      severity,
      description,
      poc,
      codeLocation,
      remediation,
      testerNotes,
    } = body;

    const finding = await db.finding.create({
      data: {
        engagementId,
        runId: runId ?? null,
        category: category ?? "other",
        title,
        severity: severity ?? "medium",
        description: description ?? "",
        poc: poc ?? "",
        codeLocation: codeLocation ?? "",
        remediation: remediation ?? "",
        testerNotes: testerNotes ?? "",
        source: "manual",
        status: "needs-review",
      },
    });

    return NextResponse.json(finding, { status: 201 });
  } catch (error) {
    console.error("POST /api/findings error:", error);
    return NextResponse.json({ error: "Failed to create finding" }, { status: 500 });
  }
}
