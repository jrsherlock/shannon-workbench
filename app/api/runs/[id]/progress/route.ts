import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getRunProgress } from "@/lib/temporal-client";

const POLL_INTERVAL_MS = 10_000;
const TERMINAL_STATUSES = new Set(["completed", "failed", "cancelled"]);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const runRecord = await db.run.findUnique({ where: { id } });
  if (!runRecord) {
    return new Response(JSON.stringify({ error: "Run not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Capture as a non-null const so TypeScript narrows correctly inside async closures
  const run = runRecord;
  const { workflowId } = run;

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      function send(data: unknown) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      }

      async function poll() {
        if (request.signal.aborted) {
          controller.close();
          return;
        }

        try {
          const progress = await getRunProgress(workflowId);

          if (!progress) {
            send({ error: "Could not fetch progress", workflowId });
          } else {
            send(progress);

            // Update DB if status has changed
            if (progress.status !== run.status) {
              const updateData: Record<string, unknown> = {
                status: progress.status,
                currentPhase: progress.currentPhase,
                currentAgent: progress.currentAgent,
                completedAgents: JSON.stringify(progress.completedAgents),
              };

              if (progress.summary) {
                updateData.totalCostUsd = progress.summary.totalCostUsd;
                updateData.totalDurationMs = progress.summary.totalDurationMs;
              }

              if (progress.agentMetrics) {
                updateData.agentMetrics = JSON.stringify(progress.agentMetrics);
              }

              if (progress.error) {
                updateData.errorMessage = progress.error;
              }

              if (TERMINAL_STATUSES.has(progress.status)) {
                updateData.completedAt = new Date();
              }

              await db.run.update({ where: { id }, data: updateData });
            }

            // Close stream when terminal status reached
            if (TERMINAL_STATUSES.has(progress.status)) {
              controller.close();
              return;
            }
          }
        } catch (error) {
          console.error("SSE poll error:", error);
          send({ error: "Poll error", message: String(error) });
        }

        // Schedule next poll if client still connected
        if (!request.signal.aborted) {
          setTimeout(poll, POLL_INTERVAL_MS);
        } else {
          controller.close();
        }
      }

      request.signal.addEventListener("abort", () => {
        controller.close();
      });

      // Start polling immediately
      await poll();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
