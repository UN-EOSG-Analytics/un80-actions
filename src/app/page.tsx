import { ReportsTableShell } from "@/components/ReportsTableShell";

export default function Home() {
  return (
    <main className="flex-1 bg-background px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-7xl">
        <ReportsTableShell />
      </div>
    </main>
  );
}
