import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { launchShannonRun } from "@/lib/shannon-launcher";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const run = await db.run.findUnique({ where: { id } });

    if (!run) {
      return NextResponse.json({ error: "Run not found" }, { status: 404 });
    }

    if (run.status === "running") {
      return NextResponse.json(
        { error: "Run is already running" },
        { status: 409 },
      );
    }

    const engagement = await db.engagement.findUnique({
      where: { id: run.engagementId },
    });
    if (!engagement) {
      return NextResponse.json(
        { error: "Engagement not found" },
        { status: 404 },
      );
    }

    // Relaunch with the same sessionId (workspace name) — Shannon detects
    // which agents already completed via workspace checkpoints and resumes
    // from where it left off.
    const { workflowId } = await launchShannonRun({
      webUrl: engagement.targetUrl,
      repoPath: engagement.repoPath,
      configYAML: run.configYAML,
      sessionId: run.sessionId,
    });

    const updated = await db.run.update({
      where: { id },
      data: {
        workflowId,
        status: "running",
        errorMessage: null,
        completedAt: null,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("POST /api/runs/[id]/resume error:", error);
    return NextResponse.json(
      { error: "Failed to resume run" },
      { status: 500 },
    );
  }
}
