"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import ActionModal from "./ActionModal";
import { getActionByNumber } from "@/lib/actions";
import type { Action } from "@/types";

export default function ModalHandler() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const actionParam = searchParams.get("action");
  const [action, setAction] = useState<Action | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check for action in query params (backward compatibility) or pathname (new format)
    let actionNumber: number | null = null;
    let firstMilestone: string | null = null;
    
    if (actionParam) {
      // Old format: ?action=14
      actionNumber = parseInt(actionParam, 10);
      const milestoneParam = searchParams.get("milestone");
      firstMilestone = milestoneParam ? decodeURIComponent(milestoneParam) : null;
    } else {
      // Check pathname for /action-14 format
      const pathMatch = typeof window !== "undefined" ? window.location.pathname.match(/^\/action-(\d+)/) : null;
      if (pathMatch) {
        actionNumber = parseInt(pathMatch[1], 10);
        // Check for milestone in query params
        const urlParams = new URLSearchParams(window.location.search);
        const milestoneParam = urlParams.get("milestone");
        firstMilestone = milestoneParam ? decodeURIComponent(milestoneParam) : null;
      }
    }

    // If there's no action, clear state
    if (!actionNumber || isNaN(actionNumber)) {
      setAction(null);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

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
  }, [actionParam, pathname, searchParams]);

  // Listen for popstate events (when URL changes via pushState)
  useEffect(() => {
    const handlePopState = () => {
      // Force re-evaluation by checking window.location
      const pathMatch = window.location.pathname.match(/^\/action-(\d+)/);
      if (pathMatch) {
        const actionNumber = parseInt(pathMatch[1], 10);
        const urlParams = new URLSearchParams(window.location.search);
        const milestoneParam = urlParams.get("milestone");
        const firstMilestone = milestoneParam ? decodeURIComponent(milestoneParam) : null;
        
        setLoading(true);
        setError(null);
        
        getActionByNumber(actionNumber, firstMilestone)
          .then((foundAction) => {
            if (!foundAction) {
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
      } else {
        setAction(null);
        setError(null);
        setLoading(false);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const handleClose = () => {
    // Restore previous URL from sessionStorage
    const previousUrl = sessionStorage.getItem("previousUrl");
    sessionStorage.removeItem("previousUrl");

    if (previousUrl) {
      window.history.pushState({}, "", `?${previousUrl}`);
    } else {
      window.history.pushState({}, "", "/");
    }
    window.dispatchEvent(new PopStateEvent("popstate"));
  };

  // Check if we should show the modal
  const shouldShow = actionParam || (typeof window !== "undefined" && window.location.pathname.startsWith("/action-"));
  if (!shouldShow) return null;

  return (
    <ActionModal
      action={error ? null : action}
      onClose={handleClose}
      loading={loading}
    />
  );
}
