export function formatDateRange(start?: string | null, end?: string | null): string {
  if (!start && !end) return "미지정";
  if (start && end) return `${start} ~ ${end}`;
  return `${start ?? "?"} ~ ${end ?? "?"}`;
}

export function formatDate(value?: string | null): string {
  if (!value) return "-";
  return value.slice(0, 10);
}

export function formatDateTime(value?: string | null): string {
  if (!value) return "-";
  return value.slice(0, 16).replace("T", " ");
}

export function progressFromStatus(status: string | undefined, progress?: number | null): number {
  if (progress !== undefined && progress !== null) return progress;
  if (status === "done") return 100;
  if (status === "in_progress" || status === "review") return 50;
  return 0;
}
