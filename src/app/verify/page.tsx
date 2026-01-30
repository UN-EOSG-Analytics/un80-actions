import { Suspense } from "react";
import { VerifyForm } from "@/components/VerifyForm";

export const dynamic = "force-dynamic";

export default function VerifyPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h2 className="mb-2 text-xl font-semibold text-foreground">
          Signing you in...
        </h2>
        <p className="mb-6 text-sm text-gray-500">
          Please wait while we complete your authentication
        </p>
        <Suspense fallback={<p className="text-gray-500">Loading...</p>}>
          <VerifyForm />
        </Suspense>
      </div>
    </main>
  );
}
