import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ingestFindings } from "@/lib/finding-ingester";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const run = await db.run.findUnique({
      where: { id },
      include: { engagement: true } as never,
    });

    if (!run) {
      return NextResponse.json({ error: "Run not found" }, { status: 404 });
    }

    const engagement = await db.engagement.findUnique({
      where: { id: run.engagementId },
    });

    if (!engagement) {
      return NextResponse.json({ error: "Engagement not found" }, { status: 404 });
    }

    const count = await ingestFindings({
      engagementId: engagement.id,
      runId: id,
      repoPath: engagement.repoPath,
    });

    return NextResponse.json({ count });
  } catch (error) {
    console.error("POST /api/runs/[id]/ingest error:", error);
    return NextResponse.json({ error: "Failed to ingest findings" }, { status: 500 });
  }
}
