"use client";

import { logout, toggleAdminRole } from "@/features/auth/commands";
import { Badge } from "../../../components/ui/badge";
import { LogOut, ShieldCheck, ShieldOff } from "lucide-react";
import { useTransition } from "react";
import { useRouter } from "next/navigation";

const ROLE_STYLES: Record<string, string> = {
  Admin: "bg-amber-100 text-amber-700",
  Legal: "bg-purple-100 text-purple-700",
  Principal: "bg-blue-100 text-blue-700",
  "Focal Point": "bg-emerald-100 text-emerald-700",
  Support: "bg-slate-100 text-slate-600",
  Assistant: "bg-slate-100 text-slate-600",
};

function getRoleStyle(role: string | null | undefined): string {
  if (!role) return "bg-gray-100 text-gray-400";
  return ROLE_STYLES[role] ?? "bg-gray-100 text-gray-500";
}

function getRoleLabel(role: string | null | undefined): string {
  if (!role) return "No role";
  return role;
}

interface Props {
  email: string;
  entity?: string | null;
  isAdmin?: boolean;
  userRole?: string | null;
}

export function UserMenu({ email, entity, isAdmin, userRole }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isDev = process.env.NODE_ENV === "development";

  async function handleLogout() {
    await logout();
  }

  async function handleToggleAdmin() {
    startTransition(async () => {
      await toggleAdminRole();
      router.refresh();
    });
  }

  const roleLabel = getRoleLabel(userRole);
  const roleStyle = getRoleStyle(userRole);

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">{email}</span>
        {entity && (
          <Badge className="bg-un-blue/10 text-un-blue">{entity}</Badge>
        )}
        {isDev ? (
          <button
            onClick={handleToggleAdmin}
            disabled={isPending}
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium transition-colors ${roleStyle} ${
              isPending ? "cursor-wait opacity-50" : "cursor-pointer hover:opacity-80"
            }`}
            title={isAdmin ? "Click to switch to User view" : "Click to switch to Admin view"}
          >
            {isAdmin ? <ShieldCheck className="h-3 w-3" /> : <ShieldOff className="h-3 w-3" />}
            {roleLabel}
          </button>
        ) : (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${roleStyle}`}
          >
            {isAdmin ? <ShieldCheck className="h-3 w-3" /> : null}
            {roleLabel}
          </span>
        )}
      </div>
      <div className="h-4 w-px bg-gray-200" />
      <button
        onClick={handleLogout}
        className="flex items-center gap-1 text-sm text-gray-500 transition-colors hover:text-gray-900"
      >
        <LogOut className="h-4 w-4" />
      </button>
    </div>
  );
}
