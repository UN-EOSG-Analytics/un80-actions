"use client";

import { Button } from "@/components/ui/button";
import type { Notification, NotificationType } from "@/types";
import { CheckCheck, X } from "lucide-react";
import { NotificationItem, getTabForType } from "./NotificationItem";
import { useRouter } from "next/navigation";
import {
  markAllNotificationsRead,
  markNotificationRead,
  markNotificationUnread,
} from "../commands";

const TYPE_FILTERS: { label: string; value: NotificationType | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Milestones", value: "milestone_status_changed" },
  { label: "Notes", value: "note_added" },
  { label: "Questions", value: "question_added" },
  { label: "Updates", value: "update_added" },
];

function groupByTime(
  notifications: Notification[],
): { label: string; items: Notification[] }[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const weekAgo = new Date(today.getTime() - 7 * 86400000);

  const groups: Record<string, Notification[]> = {
    Today: [],
    Yesterday: [],
    "This week": [],
    Earlier: [],
  };

  for (const n of notifications) {
    const d = new Date(n.created_at);
    if (d >= today) groups["Today"].push(n);
    else if (d >= yesterday) groups["Yesterday"].push(n);
    else if (d >= weekAgo) groups["This week"].push(n);
    else groups["Earlier"].push(n);
  }

  return Object.entries(groups)
    .filter(([, items]) => items.length > 0)
    .map(([label, items]) => ({ label, items }));
}

interface Props {
  notifications: Notification[];
  loading: boolean;
  typeFilter: NotificationType | "all";
  onTypeFilterChange: (filter: NotificationType | "all") => void;
  onClose: () => void;
  onRefresh: () => void;
  setNotifications: React.Dispatch<React.SetStateAction<Notification[]>>;
}

export function NotificationPanel({
  notifications,
  loading,
  typeFilter,
  onTypeFilterChange,
  onClose,
  onRefresh,
  setNotifications,
}: Props) {
  const router = useRouter();

  const filteredNotifications =
    typeFilter === "all"
      ? notifications
      : notifications.filter((n) => {
          if (typeFilter === "milestone_status_changed") {
            return n.type.startsWith("milestone_");
          }
          if (typeFilter === "question_added") {
            return n.type.startsWith("question_");
          }
          return n.type === typeFilter;
        });

  const groups = groupByTime(filteredNotifications);
  const hasUnread = notifications.some((n) => !n.read_at);

  const handleClick = async (notification: Notification) => {
    // Mark as read on click
    if (!notification.read_at) {
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notification.id ? { ...n, read_at: new Date() } : n,
        ),
      );
      await markNotificationRead(notification.id);
    }

    // Navigate to the action with deep link to specific item
    const actionLabel = notification.action_sub_id && notification.action_sub_id !== ""
      ? `${notification.action_id}${notification.action_sub_id}`
      : notification.action_id.toString();
    const params = new URLSearchParams({ action: actionLabel });
    const tab = getTabForType(notification.type);
    if (tab) params.set("tab", tab);
    if (notification.reference_id && notification.reference_type) {
      params.set(notification.reference_type, notification.reference_id);
    }
    router.push(`/?${params.toString()}`);
    onClose();
  };

  const handleReadToggle = async (
    e: React.MouseEvent,
    notification: Notification,
  ) => {
    e.stopPropagation();
    const isRead = !!notification.read_at;

    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === notification.id
          ? { ...n, read_at: isRead ? null : new Date() }
          : n,
      ),
    );

    const res = isRead
      ? await markNotificationUnread(notification.id)
      : await markNotificationRead(notification.id);

    if (!res.success) onRefresh();
  };

  const handleMarkAllRead = async () => {
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.read_at ? n : { ...n, read_at: new Date() })),
    );
    const res = await markAllNotificationsRead();
    if (!res.success) onRefresh();
  };

  return (
    <>
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
        <div className="flex items-center gap-1.5">
          {hasUnread && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="flex items-center gap-1 rounded px-2 py-1 text-xs text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
              title="Mark all as read"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              <span>Read all</span>
            </button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Type filter chips */}
      <div className="flex gap-1 overflow-x-auto border-b px-4 py-2">
        {TYPE_FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => onTypeFilterChange(f.value)}
            className={`shrink-0 rounded-full px-2.5 py-1 text-xs transition-colors ${
              typeFilter === f.value
                ? "bg-un-blue text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Notification list */}
      <div className="max-h-[70vh] min-h-64 overflow-y-auto overscroll-contain">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-un-blue" />
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-gray-400">
            No notifications
          </div>
        ) : (
          groups.map((group) => (
            <div key={group.label}>
              <div className="sticky top-0 bg-gray-50 px-4 py-1.5 text-[11px] font-medium tracking-wide text-gray-400 uppercase">
                {group.label}
              </div>
              <div className="divide-y divide-gray-100">
                {group.items.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onClick={handleClick}
                    onReadToggle={handleReadToggle}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {!loading && notifications.length > 0 && (
        <div className="border-t px-4 py-2 text-center">
          <button
            type="button"
            onClick={onRefresh}
            className="text-xs text-un-blue hover:underline"
          >
            Refresh
          </button>
        </div>
      )}
    </>
  );
}
