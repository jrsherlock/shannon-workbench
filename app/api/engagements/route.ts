import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const engagements = await db.engagement.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        _count: {
          select: { runs: true, findings: true },
        },
      },
    });
    return NextResponse.json(engagements);
  } catch (error) {
    console.error("GET /api/engagements error:", error);
    return NextResponse.json({ error: "Failed to fetch engagements" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, clientName, targetUrl, repoPath, description, threatModel, notes } = body;

    const engagement = await db.engagement.create({
      data: {
        name,
        clientName,
        targetUrl,
        repoPath,
        description: description ?? "",
        threatModel: threatModel ?? "",
        notes: notes ?? "",
      },
    });

    return NextResponse.json(engagement, { status: 201 });
  } catch (error) {
    console.error("POST /api/engagements error:", error);
    return NextResponse.json({ error: "Failed to create engagement" }, { status: 500 });
  }
}
