import { redirect } from "next/navigation";

// Task module root → IA default screen (screens.md A-2, README §7).
export default function Page() {
  redirect("/task/ia");
}
