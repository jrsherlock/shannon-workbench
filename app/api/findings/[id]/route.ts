import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const finding = await db.finding.findUnique({ where: { id } });

    if (!finding) {
      return NextResponse.json({ error: "Finding not found" }, { status: 404 });
    }

    return NextResponse.json(finding);
  } catch (error) {
    console.error("GET /api/findings/[id] error:", error);
    return NextResponse.json({ error: "Failed to fetch finding" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, severity, testerNotes, title, description, poc, codeLocation, remediation, cvss } = body;

    const finding = await db.finding.update({
      where: { id },
      data: {
        ...(status !== undefined && { status }),
        ...(severity !== undefined && { severity }),
        ...(testerNotes !== undefined && { testerNotes }),
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(poc !== undefined && { poc }),
        ...(codeLocation !== undefined && { codeLocation }),
        ...(remediation !== undefined && { remediation }),
        ...(cvss !== undefined && { cvss }),
      },
    });

    return NextResponse.json(finding);
  } catch (error) {
    console.error("PATCH /api/findings/[id] error:", error);
    return NextResponse.json({ error: "Failed to update finding" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await db.finding.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/findings/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete finding" }, { status: 500 });
  }
}
