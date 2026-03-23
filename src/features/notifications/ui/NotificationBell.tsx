"use client";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { Notification, NotificationType } from "@/types";
import { Bell } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { getNotifications } from "../queries";
import { getUnreadNotificationCount } from "../queries";
import { NotificationPanel } from "./NotificationPanel";

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState<NotificationType | "all">("all");

  // Poll unread count every 60s
  useEffect(() => {
    const fetchCount = async () => {
      try {
        const count = await getUnreadNotificationCount();
        setUnreadCount(count);
      } catch {
        // silently ignore
      }
    };
    fetchCount();
    const interval = setInterval(fetchCount, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getNotifications(50);
      setNotifications(data);
      setUnreadCount(data.filter((n) => !n.read_at).length);
    } catch {
      // silently ignore
    } finally {
      setLoading(false);
    }
  }, []);

  // Load full list when popover opens
  useEffect(() => {
    if (open) loadNotifications();
  }, [open, loadNotifications]);

  // Sync unread count when notifications change
  useEffect(() => {
    setUnreadCount(notifications.filter((n) => !n.read_at).length);
  }, [notifications]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="relative h-9 w-9 border-gray-200 bg-white hover:bg-gray-50"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4 text-gray-600" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-un-blue text-[10px] font-medium text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-lg max-w-[95vw] p-0" align="end">
        <NotificationPanel
          notifications={notifications}
          loading={loading}
          typeFilter={typeFilter}
          onTypeFilterChange={setTypeFilter}
          onClose={() => setOpen(false)}
          onRefresh={loadNotifications}
          setNotifications={setNotifications}
        />
      </PopoverContent>
    </Popover>
  );
}
