"use client";

import { logout, toggleAdminRole } from "@/features/auth/commands";
import { Badge } from "../../../components/ui/badge";
import { LogOut, ShieldCheck, ShieldOff } from "lucide-react";
import { useTransition } from "react";
import { useRouter } from "next/navigation";

interface Props {
  email: string;
  entity?: string | null;
  isAdmin?: boolean;
}

export function UserMenu({ email, entity, isAdmin }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  async function handleLogout() {
    await logout();
  }

  async function handleToggleAdmin() {
    startTransition(async () => {
      await toggleAdminRole();
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">{email}</span>
        {entity && (
          <Badge className="bg-un-blue/10 text-un-blue">{entity}</Badge>
        )}
        <button
          onClick={handleToggleAdmin}
          disabled={isPending}
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium transition-colors ${
            isAdmin
              ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
              : "bg-gray-100 text-gray-500 hover:bg-gray-200"
          } ${isPending ? "opacity-50 cursor-wait" : "cursor-pointer"}`}
          title={isAdmin ? "Click to remove Admin" : "Click to become Admin"}
        >
          {isAdmin ? (
            <><ShieldCheck className="h-3 w-3" /> Admin</>
          ) : (
            <><ShieldOff className="h-3 w-3" /> User</>
          )}
        </button>
      </div>
      <div className="h-4 w-px bg-gray-200" />
      <button
        onClick={handleLogout}
        className="flex items-center gap-1 text-sm text-gray-500 transition-colors hover:text-gray-900"
      >
        Logout
        <LogOut className="h-4 w-4" />
      </button>
    </div>
  );
}
