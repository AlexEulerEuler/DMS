import { NextRequest, NextResponse } from "next/server";

import { errorResponse, loadIssues, paginate } from "@/lib/server/routes";
import type { Priority } from "@/lib/types";

export async function GET(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams;
    const state = params.get("state") ?? "open";
    const priority = params.get("priority") as Priority | null;
    const q = params.get("q")?.toLowerCase() ?? "";
    const page = Number(params.get("page") ?? 1);
    const size = Number(params.get("size") ?? 25);

    const { issues } = await loadIssues();
    const filtered = issues
      .filter((i) => (state === "all" ? true : i.state === state))
      .filter((i) => (priority ? i.priority === priority : true))
      .filter((i) => (q ? i.title.toLowerCase().includes(q) : true))
      .sort((a, b) => {
        const rank: Record<Priority, number> = { urgent: 0, high: 1, normal: 2, low: 3 };
        return rank[a.priority] - rank[b.priority] || b.createdAt.localeCompare(a.createdAt);
      });
    return NextResponse.json(paginate(filtered, page, size));
  } catch (error) {
    return errorResponse(error);
  }
}
