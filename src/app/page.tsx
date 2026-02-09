import { redirect } from "next/navigation";
import Link from "next/link";
import { ActionsTable } from "@/features/actions/ui/ActionsTable";
import { getActionsTableData } from "@/features/actions/queries";
import { getCurrentUser } from "@/features/auth/service";

export default async function Home() {
  const user = await getCurrentUser();
  
  if (!user) {
    redirect("/login");
  }

  const data = await getActionsTableData();
  const isAdmin = user.user_role === "Admin" || user.user_role === "Legal";

  return (
    <main className="flex-1 bg-background px-4 py-4 sm:px-6 sm:py-4">
      <div className="mx-auto max-w-7xl space-y-4">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span className="text-gray-700 font-medium">Actions</span>
          <span>/</span>
          <Link href="/milestones" className="hover:text-un-blue hover:underline">
            Milestones
          </Link>
        </div>
        <ActionsTable data={data} isAdmin={isAdmin} />
      </div>
    </main>
  );
}
