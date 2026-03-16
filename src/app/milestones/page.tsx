import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getCurrentUser } from "@/features/auth/service";
import { getAllMilestonesTableData } from "@/features/milestones/queries";
import { MilestonesTable } from "@/features/milestones/ui/MilestonesTable";

export default async function MilestonesPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const isAdmin = user.user_role === "Admin" || user.user_role === "Legal";
  if (!isAdmin) {
    redirect("/actions");
  }

  const rows = await getAllMilestonesTableData();

  return (
    <main className="flex-1 bg-background px-4 py-4 sm:px-6 sm:py-4">
      <div className="mx-auto max-w-7xl">
        <Suspense>
          <MilestonesTable rows={rows} />
        </Suspense>
      </div>
    </main>
  );
}
