"use client";

import { logoutAction } from "@/lib/actions";

interface Props {
  email: string;
}

export function UserMenu({ email }: Props) {
  async function handleLogout() {
    await logoutAction();
  }

  return (
    <div className="flex items-center gap-4">
      <span className="text-sm text-gray-600">{email}</span>
      <div className="h-4 w-px bg-gray-200" />
      <button onClick={handleLogout} className="text-sm text-gray-500 transition-colors hover:text-gray-900">
        Logout
      </button>
    </div>
  );
}
