import { AppShell } from "@/components/app-shell";

// Every authenticated page renders inside the sidebar/topbar shell.
export default function PagesLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
