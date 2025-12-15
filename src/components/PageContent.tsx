"use client";

import { Suspense } from "react";

interface PageContentProps {
  children: React.ReactNode;
}

/**
 * Wrapper component that provides Suspense boundary for pages using useSearchParams
 */
export function PageContent({ children }: PageContentProps) {
  return <Suspense fallback={<div>Loading...</div>}>{children}</Suspense>;
}
