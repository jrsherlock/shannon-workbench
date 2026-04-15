import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const run = await db.run.findUnique({
      where: { id },
      include: {
        _count: { select: { findings: true } },
      },
    });

    if (!run) {
      return NextResponse.json({ error: "Run not found" }, { status: 404 });
    }

    return NextResponse.json(run);
  } catch (error) {
    console.error("GET /api/runs/[id] error:", error);
    return NextResponse.json({ error: "Failed to fetch run" }, { status: 500 });
  }
}
