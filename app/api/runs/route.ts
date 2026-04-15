import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { launchShannonRun } from "@/lib/shannon-launcher";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { engagementId, configYAML } = body;

    // 1. Fetch engagement from DB
    const engagement = await db.engagement.findUnique({ where: { id: engagementId } });
    if (!engagement) {
      return NextResponse.json({ error: "Engagement not found" }, { status: 404 });
    }

    // 2. Generate sessionId
    const sessionId = `${engagementId.slice(0, 8)}-${Date.now()}`;

    // 3. Launch Shannon run
    const { workflowId } = await launchShannonRun({
      webUrl: engagement.targetUrl,
      repoPath: engagement.repoPath,
      configYAML,
      sessionId,
    });

    // 4. Create Run record in DB
    const run = await db.run.create({
      data: {
        engagementId,
        workflowId,
        sessionId,
        configYAML,
        status: "running",
      },
    });

    // 5. Return the created Run
    return NextResponse.json(run, { status: 201 });
  } catch (error) {
    console.error("POST /api/runs error:", error);
    return NextResponse.json({ error: "Failed to launch run" }, { status: 500 });
  }
}
