"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import ActionModal from "@/features/actions/ui/ActionModal";
import { getActionByNumber } from "@/features/actions/queries";
import { decodeUrlParam } from "@/lib/utils";
import type { Action } from "@/types";

// Session storage key for return URL (set by ActionCard before opening modal)
const RETURN_URL_KEY = "actionModalReturnUrl";

export default function ModalHandler({
  isAdmin = false,
}: {
  isAdmin?: boolean;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const actionParam = searchParams.get("action");
  const milestoneParam = searchParams.get("milestone");
  const [action, setAction] = useState<Action | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // If there's no action param, clear state
    if (!actionParam) {
      setAction(null);
      setError(null);
      setLoading(false);
      return;
    }

    // Parse action number from query param
    const actionNumber = parseInt(actionParam, 10);
    const firstMilestone = milestoneParam
      ? decodeUrlParam(milestoneParam)
      : null;

    // If invalid action number, show error
    if (isNaN(actionNumber)) {
      setError("Invalid action number");
      setLoading(false);
      return;
    }

    // Load action data
    const loadAction = async () => {
      setLoading(true);
      setError(null);

      try {
        const foundAction = await getActionByNumber(
          actionNumber,
          firstMilestone,
        );
        if (!foundAction) {
          setError("Action not found");
          setAction(null);
        } else {
          setAction(foundAction);
        }
      } catch (err) {
        console.error("Failed to load action:", err);
        setError("Failed to load action");
        setAction(null);
      } finally {
        setLoading(false);
      }
    };

    loadAction();
  }, [actionParam, milestoneParam]);

  const handleClose = () => {
    // Get stored return URL and clear it
    const returnUrl = sessionStorage.getItem(RETURN_URL_KEY) || "/";
    sessionStorage.removeItem(RETURN_URL_KEY);
    sessionStorage.removeItem("actionModalOpen");
    router.replace(returnUrl, { scroll: false });
  };

  // Only show modal if there's an action param
  if (!actionParam) return null;

  return (
    <ActionModal
      action={error ? null : action}
      onClose={handleClose}
      loading={loading}
      isAdmin={isAdmin}
    />
  );
}
