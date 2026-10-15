import { aiInfo } from "../ai/llm";
import { estimateCostUsd } from "../ai/pricing";
import type { TicketStatus } from "../generated/prisma/client";
import { prisma } from "../lib/prisma";

const UNRESOLVED: TicketStatus[] = ["OPEN", "IN_PROGRESS"];
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export async function getAdminStats(adminId: string) {
  const since = new Date(Date.now() - THIRTY_DAYS_MS);

  const [byStatus, byPriority, unassigned, mine, oldest, aiCalls, accuracy, responseTime] = await Promise.all([
    prisma.ticket.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.ticket.groupBy({
      by: ["priority"],
      where: { status: { in: UNRESOLVED } },
      _count: { _all: true },
    }),
    prisma.ticket.count({ where: { status: { in: UNRESOLVED }, assigneeId: null } }),
    prisma.ticket.count({ where: { status: { in: UNRESOLVED }, assigneeId: adminId } }),
    prisma.ticket.findFirst({
      where: { status: { in: UNRESOLVED } },
      orderBy: { createdAt: "asc" },
      select: { id: true, number: true, subject: true, createdAt: true },
    }),
    prisma.aiCall.groupBy({
      by: ["task", "model", "success"],
      where: { createdAt: { gte: since } },
      _count: { _all: true },
      _sum: { inputTokens: true, outputTokens: true, cachedTokens: true },
      _avg: { latencyMs: true },
    }),
    // How often admins kept the AI's suggestion. Compares two columns, so raw SQL.
    prisma.$queryRaw<{ total: bigint; category_kept: bigint; priority_kept: bigint }[]>`
      SELECT count(*) AS total,
             count(*) FILTER (WHERE "category" = "aiCategory") AS category_kept,
             count(*) FILTER (WHERE "priority" = "aiPriority") AS priority_kept
      FROM "Ticket"
      WHERE "aiStatus" = 'COMPLETED'`,
    prisma.$queryRaw<{ avg_hours: number | null }[]>`
      SELECT avg(extract(epoch FROM ("firstResponseAt" - "createdAt")) / 3600)::float AS avg_hours
      FROM "Ticket"
      WHERE "firstResponseAt" IS NOT NULL AND "createdAt" >= ${since}`,
  ]);

  const statusCounts = Object.fromEntries(byStatus.map((row) => [row.status, row._count._all]));
  const priorityCounts = Object.fromEntries(
    byPriority.map((row) => [row.priority ?? "UNCLASSIFIED", row._count._all]),
  );

  const usage = aiCalls.map((row) => {
    const input = row._sum.inputTokens ?? 0;
    const output = row._sum.outputTokens ?? 0;
    const cached = row._sum.cachedTokens ?? 0;
    return {
      task: row.task,
      model: row.model,
      success: row.success,
      calls: row._count._all,
      inputTokens: input,
      outputTokens: output,
      cachedTokens: cached,
      avgLatencyMs: Math.round(row._avg.latencyMs ?? 0),
      estimatedCostUsd: estimateCostUsd(row.model, input, output, cached),
    };
  });

  const totalCalls = usage.reduce((sum, row) => sum + row.calls, 0);
  const failedCalls = usage.filter((row) => !row.success).reduce((sum, row) => sum + row.calls, 0);
  const acc = accuracy[0];
  const classified = Number(acc?.total ?? 0);

  return {
    tickets: {
      byStatus: statusCounts,
      unresolvedByPriority: priorityCounts,
      unresolved: (statusCounts.OPEN ?? 0) + (statusCounts.IN_PROGRESS ?? 0),
      unassigned,
      assignedToMe: mine,
      oldestUnresolved: oldest,
      avgFirstResponseHours: responseTime[0]?.avg_hours ?? null,
    },
    ai: {
      ...aiInfo(),
      last30Days: {
        calls: totalCalls,
        failedCalls,
        failureRate: totalCalls ? failedCalls / totalCalls : 0,
        estimatedCostUsd: usage.reduce((sum, row) => sum + (row.estimatedCostUsd ?? 0), 0),
        byTaskAndModel: usage,
      },
      accuracy: {
        classified,
        categoryKeptRate: classified ? Number(acc!.category_kept) / classified : null,
        priorityKeptRate: classified ? Number(acc!.priority_kept) / classified : null,
      },
    },
  };
}
