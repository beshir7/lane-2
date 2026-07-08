import { redirect } from "next/navigation";

// The workspace root lands on the dashboard.
export default function Home() {
  redirect("/dashboard");
}
