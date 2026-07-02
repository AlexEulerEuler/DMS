import { NextRequest, NextResponse } from "next/server";

import { errorResponse, loadIssues, paginate } from "@/lib/server/routes";
import type { WorkStage } from "@/lib/types";

/** Work = type:* 라벨을 가진 이슈의 실행 관점 (스테이지는 GitHub 사실에서 유도). */
export async function GET(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams;
    const stage = params.get("stage") as WorkStage | null;
    const q = params.get("q")?.toLowerCase() ?? "";
    const page = Number(params.get("page") ?? 1);
    const size = Number(params.get("size") ?? 25);
    const all = params.get("all") === "1"; // 칸반은 페이지네이션 없이 전량

    const { issues, syncNote } = await loadIssues();
    const work = issues
      .filter((i) => i.labels.some((l) => l.startsWith("type:")))
      .filter((i) => (stage ? i.stage === stage : true))
      .filter((i) => (q ? i.title.toLowerCase().includes(q) : true))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    if (all) return NextResponse.json({ items: work, total: work.length, syncNote });
    return NextResponse.json({ ...paginate(work, page, size), syncNote });
  } catch (error) {
    return errorResponse(error);
  }
}
