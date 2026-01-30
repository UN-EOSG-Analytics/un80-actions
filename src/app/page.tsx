import { ActionsTable } from "@/features/actions/ui/ActionsTable";
import { getActionsTableData } from "@/features/actions/queries";

export default async function Home() {
  const data = await getActionsTableData();
  return (
    <main className="flex-1 bg-background px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-7xl">
        <ActionsTable data={data} />
      </div>
    </main>
  );
}
