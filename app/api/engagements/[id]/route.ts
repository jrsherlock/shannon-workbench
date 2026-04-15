import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const engagement = await db.engagement.findUnique({
      where: { id },
      include: {
        runs: {
          orderBy: { startedAt: "desc" },
          include: {
            _count: { select: { findings: true } },
          },
        },
        _count: { select: { findings: true } },
      },
    });

    if (!engagement) {
      return NextResponse.json({ error: "Engagement not found" }, { status: 404 });
    }

    return NextResponse.json(engagement);
  } catch (error) {
    console.error("GET /api/engagements/[id] error:", error);
    return NextResponse.json({ error: "Failed to fetch engagement" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, clientName, targetUrl, repoPath, description, threatModel, notes, status } = body;

    const engagement = await db.engagement.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(clientName !== undefined && { clientName }),
        ...(targetUrl !== undefined && { targetUrl }),
        ...(repoPath !== undefined && { repoPath }),
        ...(description !== undefined && { description }),
        ...(threatModel !== undefined && { threatModel }),
        ...(notes !== undefined && { notes }),
        ...(status !== undefined && { status }),
      },
    });

    return NextResponse.json(engagement);
  } catch (error) {
    console.error("PATCH /api/engagements/[id] error:", error);
    return NextResponse.json({ error: "Failed to update engagement" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await db.engagement.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/engagements/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete engagement" }, { status: 500 });
  }
}
