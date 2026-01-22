"use client";

import { useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import ActionModal from "./ActionModal";
import { getActionByNumber } from "@/lib/actions";
import { buildCleanQueryString, decodeUrlParam } from "@/lib/utils";
import type { Action } from "@/types";

export default function ModalHandler() {
  const searchParams = useSearchParams();
  const actionParam = searchParams.get("action");
  const milestoneParam = searchParams.get("milestone");
  const [action, setAction] = useState<Action | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Parse action number from query param
    const actionNumber = actionParam ? parseInt(actionParam, 10) : null;
    const firstMilestone = milestoneParam
      ? decodeUrlParam(milestoneParam)
      : null;

    // If there's no action, skip loading
    if (!actionNumber || isNaN(actionNumber)) {
      return;
    }

    // Load action data in async function
    const loadAction = async () => {
      setLoading(true);
      setError(null);

      try {
        const foundAction = await getActionByNumber(
          actionNumber,
          firstMilestone,
        );
        if (!foundAction) {
          console.warn(`Action ${actionNumber} not found`);
          setError("Action not found");
          setAction(null);
        } else {
          setAction(foundAction);
        }
      } catch (err) {
        console.error("Error loading action:", err);
        setError("Failed to load action");
        setAction(null);
      } finally {
        setLoading(false);
      }
    };

    loadAction();
  }, [actionParam, milestoneParam]);

  const handleClose = () => {
    // Preserve other query params when closing the modal (with clean encoding)
    const params: Record<string, string> = {};
    new URLSearchParams(window.location.search).forEach((value, key) => {
      if (key !== "action" && key !== "milestone") {
        params[key] = value;
      }
    });

    const queryString = buildCleanQueryString(params);
    const newUrl = queryString ? `?${queryString}` : "/";
    window.history.pushState({}, "", newUrl);
    // Trigger a re-render by dispatching popstate
    window.dispatchEvent(new PopStateEvent("popstate"));
  };

  // Only show modal if there's an action param
  if (!actionParam) return null;

  return (
    <ActionModal
      action={error ? null : action}
      onClose={handleClose}
      loading={loading}
    />
  );
}
