import { redirect } from "next/navigation";

// Work module root → Backlog default view (screens.md A-5 · foundation §7).
export default function WorkIndexPage() {
  redirect("/work/backlog");
}
