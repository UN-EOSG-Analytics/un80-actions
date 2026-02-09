import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/features/auth/service";
import { getMilestoneViewTableData } from "@/features/milestones/queries";
import { MilestonesTable } from "@/features/milestones/ui/MilestonesTable";

export default async function MilestonesPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const rows = await getMilestoneViewTableData();

  return (
    <main className="flex-1 bg-background px-4 py-4 sm:px-6 sm:py-4">
      <div className="mx-auto max-w-7xl space-y-4">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Link href="/" className="hover:text-un-blue hover:underline">
            Actions
          </Link>
          <span>/</span>
          <span className="text-gray-700 font-medium">Milestones</span>
        </div>
        <MilestonesTable rows={rows} />
      </div>
    </main>
  );
}
