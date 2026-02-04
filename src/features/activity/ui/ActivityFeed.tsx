"use client";

import { useState, useEffect } from "react";
import { Bell, X, MessageSquare, HelpCircle, Flag, Tag, FileText, CheckSquare, Square } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { getRecentActivity, type ActivityItem } from "../queries";
import { markActivityRead, markActivityUnread } from "../commands";
import { formatUNDateTime } from "@/lib/format-date";
import { useRouter } from "next/navigation";

const getActivityIcon = (type: ActivityItem["type"]) => {
  switch (type) {
    case "note":
      return <MessageSquare className="h-4 w-4" />;
    case "question":
      return <HelpCircle className="h-4 w-4" />;
    case "milestone":
    case "milestone_status":
      return <Flag className="h-4 w-4" />;
    case "milestone_update":
      return <FileText className="h-4 w-4" />;
    case "tag":
      return <Tag className="h-4 w-4" />;
    default:
      return <Bell className="h-4 w-4" />;
  }
};

const getActivityColor = (type: ActivityItem["type"]) => {
  switch (type) {
    case "note":
      return "text-amber-500";
    case "question":
      return "text-un-blue";
    case "milestone":
    case "milestone_status":
      return "text-green-600";
    case "milestone_update":
      return "text-blue-600";
    case "tag":
      return "text-purple-500";
    default:
      return "text-gray-500";
  }
};

export function ActivityFeed() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const loadActivities = async () => {
    setLoading(true);
    try {
      const data = await getRecentActivity(30);
      setActivities(data);
    } catch (error) {
      console.error("Failed to load activities:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActivities();
    // Refresh every 30 seconds
    const interval = setInterval(loadActivities, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleActivityClick = (activity: ActivityItem) => {
    if (activity.action_id > 0) {
      const params = new URLSearchParams({
        action: activity.action_id.toString(),
      });
      if (activity.action_sub_id) {
        params.set("subaction", activity.action_sub_id);
      }
      router.push(`/?${params.toString()}`);
      setOpen(false);
    }
  };

  const handleReadToggle = async (e: React.MouseEvent, activity: ActivityItem) => {
    e.stopPropagation();
    const isRead = !!activity.read_at;
    // Optimistic update: toggle read state immediately so the UI feels instant
    setActivities((prev) =>
      prev.map((a) =>
        a.id === activity.id
          ? { ...a, read_at: isRead ? undefined : new Date() }
          : a,
      ),
    );
    const res = isRead
      ? await markActivityUnread(activity.id)
      : await markActivityRead(activity.id);
    // Only refetch on failure to restore correct state
    if (!res.success) loadActivities();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="relative h-9 w-9 border-gray-200 bg-white hover:bg-gray-50"
          aria-label="Recent activity"
        >
          <Bell className="h-4 w-4 text-gray-600" />
          {activities.length > 0 && (
            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-un-blue text-[10px] font-medium text-white flex items-center justify-center">
              {activities.length > 9 ? "9+" : activities.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[32rem] max-w-[95vw] p-0" align="end">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="text-base font-semibold text-gray-900">Recent Activity</h3>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="max-h-[70vh] min-h-[320px] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-un-blue" />
            </div>
          ) : activities.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-500">
              No recent activity
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {activities.map((activity) => (
                <div
                  key={activity.id}
                  className={`flex items-start gap-3 px-4 py-4 hover:bg-gray-50 transition-colors ${
                    activity.read_at ? "opacity-75" : ""
                  }`}
                >
                  <button
                    type="button"
                    onClick={(e) => handleReadToggle(e, activity)}
                    className="mt-1 shrink-0 rounded p-0.5 text-gray-400 hover:bg-gray-200 hover:text-un-blue"
                    title={activity.read_at ? "Mark as unread" : "Mark as read/processed"}
                    aria-label={activity.read_at ? "Mark as unread" : "Mark as read"}
                  >
                    {activity.read_at ? (
                      <CheckSquare className="h-4 w-4 text-un-blue" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleActivityClick(activity)}
                    className={`min-w-0 flex-1 text-left ${
                      activity.action_id > 0 ? "cursor-pointer" : "cursor-default"
                    }`}
                    disabled={activity.action_id === 0}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 shrink-0 ${getActivityColor(activity.type)}`}>
                        {getActivityIcon(activity.type)}
                      </div>
                      <div className={`min-w-0 flex-1 ${activity.read_at ? "line-through decoration-gray-400" : ""}`}>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                          {activity.change_type && (
                            <span className="text-xs text-gray-500 capitalize">
                              {activity.change_type}
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-gray-600">{activity.description}</p>
                        <div className="mt-1.5 flex items-center gap-2 text-xs text-gray-400">
                          {activity.user_email && (
                            <span>{activity.user_email}</span>
                          )}
                          <span>•</span>
                          <span>{formatUNDateTime(activity.timestamp)}</span>
                          {activity.action_id > 0 && (
                            <>
                              <span>•</span>
                              <span>Action {activity.action_id}</span>
                              {activity.action_sub_id && (
                                <span> ({activity.action_sub_id})</span>
                              )}
                            </>
                          )}
                          {activity.read_at && (
                            <>
                              <span>•</span>
                              <span className="text-green-600">Read</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        {!loading && activities.length > 0 && (
          <div className="border-t px-4 py-2 text-center">
            <button
              type="button"
              onClick={loadActivities}
              className="text-xs text-un-blue hover:underline"
            >
              Refresh
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
