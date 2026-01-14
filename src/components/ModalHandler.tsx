"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import ActionModal from "./ActionModal";
import { getActionByNumber } from "@/lib/actions";
import type { Action } from "@/types";

export default function ModalHandler() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const actionParam = searchParams.get("action");
  const [action, setAction] = useState<Action | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // If there's no action param, clear state
    if (!actionParam) {
      // Use setTimeout to avoid synchronous setState in effect
      setTimeout(() => {
        setAction(null);
        setError(null);
        setLoading(false);
      }, 0);
      return;
    }

    // Parse action number
    const actionNumber = parseInt(actionParam, 10);
    if (isNaN(actionNumber)) {
      console.warn(`Invalid action number: "${actionParam}"`);
      setTimeout(() => {
        setError("Invalid action number");
        setLoading(false);
      }, 0);
      return;
    }

    // Get firstMilestone from URL if present (for subactions)
    const milestoneParam = searchParams.get("milestone");
    const firstMilestone = milestoneParam
      ? decodeURIComponent(milestoneParam)
      : null;

    setTimeout(() => {
      setLoading(true);
      setError(null);
    }, 0);

    // Load action data
    getActionByNumber(actionNumber, firstMilestone)
      .then((foundAction) => {
        if (!foundAction) {
          console.warn(`Action ${actionNumber} not found`);
          setError("Action not found");
        } else {
          setAction(foundAction);
        }
      })
      .catch((err) => {
        console.error("Error loading action:", err);
        setError("Failed to load action");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [actionParam, searchParams]);

  const handleClose = () => {
    // Restore previous URL from sessionStorage
    const previousUrl = sessionStorage.getItem("previousUrl");
    sessionStorage.removeItem("previousUrl");

    const newUrl = previousUrl ? `?${previousUrl}` : "/";
    router.replace(newUrl, { scroll: false });
  };

  // Don't render anything if no action param
  if (!actionParam) return null;

  return (
    <ActionModal
      action={error ? null : action}
      onClose={handleClose}
      loading={loading}
    />
  );
}
