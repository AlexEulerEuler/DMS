import { NextRequest, NextResponse } from "next/server";

import { listDocs, parseFrontMatter, readDoc } from "@/lib/server/docs";
import { errorResponse } from "@/lib/server/routes";
import type { DocContent } from "@/lib/types";

/** ?path=<dir> → 목록, ?path=<file>&content=1 → 본문(+frontmatter). 화이트리스트는 docs.ts가 강제. */
export async function GET(req: NextRequest) {
  try {
    const path = req.nextUrl.searchParams.get("path") ?? "docs";
    if (req.nextUrl.searchParams.get("content") === "1") {
      const text = await readDoc(path);
      const { frontMatter, body } = parseFrontMatter(text);
      const content: DocContent = { path, frontMatter, body };
      return NextResponse.json(content);
    }
    return NextResponse.json({ entries: await listDocs(path) });
  } catch (error) {
    return errorResponse(error);
  }
}
