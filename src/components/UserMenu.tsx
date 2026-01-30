"use client";

import { logoutAction } from "@/lib/auth_actions";
import { Badge } from "./ui/badge";
import { LogOut } from "lucide-react";

interface Props {
  email: string;
  entity?: string | null;
}

export function UserMenu({ email, entity }: Props) {
  async function handleLogout() {
    await logoutAction();
  }

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">{email}</span>
        {entity && <Badge className="bg-un-blue/10 text-un-blue">{entity}</Badge>}
      </div>
      <div className="h-4 w-px bg-gray-200" />
      <button onClick={handleLogout} className="flex items-center gap-1 text-sm text-gray-500 transition-colors hover:text-gray-900">
        Logout
        <LogOut className="h-4 w-4" />
      </button>
    </div>
  );
}
