"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { verifyMagicTokenAction } from "@/lib/auth_actions";

export function VerifyForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError("Missing verification token");
      return;
    }

    // Auto-verify the token and sign in
    verifyMagicTokenAction(token)
      .then((result) => {
        if (!result.success) {
          setError(result.error || "Failed to verify token");
        } else {
          router.push("/");
        }
      })
      .catch(() => {
        setError("An unexpected error occurred");
      });
  }, [token, router]);

  if (!token)
    return <p className="text-red-600">Missing verification token.</p>;
  if (error) return <p className="text-red-600">{error}</p>;

  return (
    <div className="flex items-center justify-center space-x-2">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-un-blue" />
      <p className="text-gray-500">Verifying your authentication...</p>
    </div>
  );
}
