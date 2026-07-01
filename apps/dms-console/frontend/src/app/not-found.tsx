import Link from "next/link";

import { NotFound } from "@/components/StateViews";

// Undefined routes render the "없음" screen with no auto-redirect
// (foundation.md §7-8). Rendered inside AppShell via the root layout.
export default function NotFoundPage() {
  return (
    <NotFound
      title="없음"
      description="정의되지 않은 경로입니다."
      action={
        <Link href="/overview" style={{ color: "var(--color-primary)", textDecoration: "underline" }}>
          개요로 이동
        </Link>
      }
    />
  );
}
