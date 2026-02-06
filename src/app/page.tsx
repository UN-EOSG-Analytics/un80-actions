import { redirect } from "next/navigation";
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
    <main className="flex-1 bg-background px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-7xl">
        <ActionsTable data={data} isAdmin={isAdmin} />
      </div>
    </main>
  );
}
