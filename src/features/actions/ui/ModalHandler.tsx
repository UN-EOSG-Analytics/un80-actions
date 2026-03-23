"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import ActionModal from "@/features/actions/ui/ActionModal";
import { getActionByNumber } from "@/features/actions/queries";
import { checkCanEditAction } from "@/features/auth/lib/permissions";
import { decodeUrlParam } from "@/lib/utils";
import type { Action } from "@/types";

// Session storage key for return URL (set by ActionCard before opening modal)
const RETURN_URL_KEY = "actionModalReturnUrl";
const FILTERED_ACTION_IDS_KEY = "filteredActionIds";

export default function ModalHandler({
  isAdmin = false,
  userEntity = null,
}: {
  isAdmin?: boolean;
  userEntity?: string | null;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const actionParam = searchParams.get("action");
  const milestoneParam = searchParams.get("milestone");
  const [action, setAction] = useState<Action | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // If there's no action param, clear state
    if (!actionParam) {
      setAction(null);
      setCanEdit(false);
      setError(null);
      setLoading(false);
      return;
    }

    // Parse action number from query param (e.g., "94" or "94(a)")
    // Extract id and optional sub_id using regex
    const actionMatch = actionParam.match(/^(\d+)(\([a-z]\))?$/i);

    if (!actionMatch) {
      setError("Invalid action format");
      setLoading(false);
      return;
    }

    const actionId = parseInt(actionMatch[1], 10);
    // Keep parentheses in sub_id as they're stored in the database (e.g., "(a)")
    const actionSubId = actionMatch[2] || "";
    const firstMilestone = milestoneParam
      ? decodeUrlParam(milestoneParam)
      : null;

    // Load action data
    const loadAction = async () => {
      setLoading(true);
      setError(null);

      try {
        const foundAction = await getActionByNumber(
          actionId,
          actionSubId,
          firstMilestone,
        );
        if (!foundAction) {
          setError("Action not found");
          setAction(null);
        } else {
          setAction(foundAction);
          const editAccess = await checkCanEditAction(actionId, actionSubId);
          setCanEdit(editAccess);
        }
      } catch {
        setError("Failed to load action");
        setAction(null);
      } finally {
        setLoading(false);
      }
    };

    loadAction();
  }, [actionParam, milestoneParam]);

  // Read filtered action IDs from sessionStorage for prev/next navigation
  const { prevAction, nextAction } = useMemo(() => {
    if (!actionParam) return { prevAction: null, nextAction: null };
    try {
      const stored = sessionStorage.getItem(FILTERED_ACTION_IDS_KEY);
      if (!stored) return { prevAction: null, nextAction: null };
      const ids: string[] = JSON.parse(stored);
      const currentIndex = ids.indexOf(actionParam);
      if (currentIndex === -1) return { prevAction: null, nextAction: null };
      return {
        prevAction: currentIndex > 0 ? ids[currentIndex - 1] : null,
        nextAction:
          currentIndex < ids.length - 1 ? ids[currentIndex + 1] : null,
      };
    } catch {
      return { prevAction: null, nextAction: null };
    }
  }, [actionParam]);

  const navigateToAction = (actionId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("action", actionId);
    params.delete("tab");
    params.delete("milestone");
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  const handleClose = () => {
    // Get stored return URL and clear it
    const returnUrl = sessionStorage.getItem(RETURN_URL_KEY) || "/actions";
    sessionStorage.removeItem(RETURN_URL_KEY);
    sessionStorage.removeItem("actionModalOpen");
    router.replace(returnUrl, { scroll: false });
  };

  // Only show modal if there's an action param
  if (!actionParam) return null;

  return (
    <ActionModal
      action={action}
      onClose={handleClose}
      loading={loading}
      error={error}
      isAdmin={isAdmin}
      userEntity={userEntity}
      canEdit={canEdit}
      onPrev={prevAction ? () => navigateToAction(prevAction) : undefined}
      onNext={nextAction ? () => navigateToAction(nextAction) : undefined}
    />
  );
}
