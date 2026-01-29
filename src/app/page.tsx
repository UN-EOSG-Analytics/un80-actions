import { ReportsTableShell } from "@/components/ReportsTableShell";
import { getActionsTableData } from "@/lib/actions-table-data";

export default async function Home() {
  const data = await getActionsTableData();
  return (
    <main className="flex-1 bg-background px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-7xl">
        <ReportsTableShell data={data} />
      </div>
    </main>
  );
}
