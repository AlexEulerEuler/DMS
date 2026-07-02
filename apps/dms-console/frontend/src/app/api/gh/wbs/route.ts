import { NextResponse } from "next/server";

import { loadPlan, toWbsRows } from "@/lib/server/plan";
import { errorResponse, loadIssues } from "@/lib/server/routes";

export async function GET() {
  try {
    const [nodes, { issues }] = await Promise.all([loadPlan(), loadIssues()]);
    const rows = toWbsRows(nodes, issues);
    const tasks = rows.filter((r) => r.type === "task");
    const overallProgress =
      tasks.length > 0 ? Math.round(tasks.reduce((sum, r) => sum + r.progress, 0) / tasks.length) : 0;
    const dates = tasks.flatMap((r) => [r.start, r.end]).filter((d): d is string => Boolean(d)).sort();
    return NextResponse.json({
      rows,
      overallProgress,
      timeAxis: { startDate: dates[0] ?? null, endDate: dates[dates.length - 1] ?? null },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
