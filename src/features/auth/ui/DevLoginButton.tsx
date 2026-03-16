"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { devLogin } from "@/features/auth/commands";

export function DevLoginButton({ email }: { email: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleClick() {
    setStatus("loading");
    setErrorMsg("");
    const result = await devLogin();
    if (result.success) {
      router.push("/");
      router.refresh();
    } else {
      setErrorMsg(result.error);
      setStatus("error");
    }
  }

  return (
    <div className="mt-6 border-t border-dashed border-amber-300 pt-6">
      <p className="mb-3 text-center text-xs font-medium tracking-wide text-amber-600 uppercase">
        Development only
      </p>
      <button
        onClick={handleClick}
        disabled={status === "loading"}
        className="w-full rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-800 transition-all hover:bg-amber-100 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status === "loading" ? "Signing in..." : `Sign in as ${email}`}
      </button>
      {status === "error" && (
        <p className="mt-2 text-center text-xs text-red-600">{errorMsg}</p>
      )}
    </div>
  );
}
