import { redirect } from "next/navigation";

// App root → Overview (foundation.md §7 default-route redirect).
export default function Home() {
  redirect("/overview");
}
