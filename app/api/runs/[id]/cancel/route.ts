import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cancelWorkflow } from "@/lib/temporal-client";

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

    await cancelWorkflow(run.workflowId);

    const updated = await db.run.update({
      where: { id },
      data: {
        status: "cancelled",
        completedAt: new Date(),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("POST /api/runs/[id]/cancel error:", error);
    return NextResponse.json({ error: "Failed to cancel run" }, { status: 500 });
  }
}
