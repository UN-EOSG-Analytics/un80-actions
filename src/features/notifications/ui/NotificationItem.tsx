"use client";

import type { Notification } from "@/types";
import { formatUNDateTime } from "@/lib/format-date";
import {
  CheckSquare,
  FileText,
  Flag,
  HelpCircle,
  MessageSquare,
  Square,
} from "lucide-react";

function getIcon(type: Notification["type"]) {
  switch (type) {
    case "note_added":
      return <MessageSquare className="h-4 w-4" />;
    case "question_added":
    case "question_answered":
      return <HelpCircle className="h-4 w-4" />;
    case "update_added":
      return <FileText className="h-4 w-4" />;
    default:
      return <Flag className="h-4 w-4" />;
  }
}

function getIconColor(type: Notification["type"]) {
  switch (type) {
    case "note_added":
      return "text-amber-500";
    case "question_added":
    case "question_answered":
      return "text-un-blue";
    case "update_added":
      return "text-blue-600";
    default:
      return "text-green-600";
  }
}

function getTabForType(type: Notification["type"]): string | undefined {
  switch (type) {
    case "note_added":
      return "notes";
    case "question_added":
    case "question_answered":
      return "questions";
    case "milestone_submitted":
    case "milestone_status_changed":
    case "milestone_approved":
    case "milestone_rejected":
      return "milestones";
    case "update_added":
      return "updates";
    default:
      return undefined;
  }
}

interface Props {
  notification: Notification;
  onClick: (notification: Notification) => void;
  onReadToggle: (e: React.MouseEvent, notification: Notification) => void;
}

export function NotificationItem({ notification, onClick, onReadToggle }: Props) {
  const isRead = !!notification.read_at;
  const tab = getTabForType(notification.type);

  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 transition-colors hover:bg-gray-50 ${
        isRead ? "opacity-60" : ""
      }`}
    >
      <button
        type="button"
        onClick={(e) => onReadToggle(e, notification)}
        className="mt-0.5 shrink-0 rounded p-0.5 text-gray-400 hover:bg-gray-200 hover:text-un-blue"
        title={isRead ? "Mark as unread" : "Mark as read"}
        aria-label={isRead ? "Mark as unread" : "Mark as read"}
      >
        {isRead ? (
          <CheckSquare className="h-3.5 w-3.5 text-un-blue" />
        ) : (
          <Square className="h-3.5 w-3.5" />
        )}
      </button>
      <button
        type="button"
        onClick={() => onClick(notification)}
        className="min-w-0 flex-1 cursor-pointer text-left"
      >
        <div className="flex items-start gap-2.5">
          <div className={`mt-0.5 shrink-0 ${getIconColor(notification.type)}`}>
            {getIcon(notification.type)}
          </div>
          <div className="min-w-0 flex-1">
            <p
              className={`text-sm text-gray-900 ${isRead ? "font-normal" : "font-medium"}`}
            >
              {notification.title}
            </p>
            <p className="mt-0.5 text-xs text-gray-500">
              {notification.body}
            </p>
            <div className="mt-1 flex items-center gap-1.5 text-[11px] text-gray-400">
              {notification.actor_email && (
                <span>{notification.actor_email}</span>
              )}
              {notification.actor_email && <span>&middot;</span>}
              <span>{formatUNDateTime(notification.created_at)}</span>
              <span>&middot;</span>
              <span>
                Action {notification.action_id}
                {notification.action_sub_id && notification.action_sub_id !== ""
                  ? ` ${notification.action_sub_id}`
                  : ""}
              </span>
              {tab && (
                <>
                  <span>&middot;</span>
                  <span className="capitalize">{tab}</span>
                </>
              )}
            </div>
          </div>
          {!isRead && (
            <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-un-blue" />
          )}
        </div>
      </button>
    </div>
  );
}

export { getTabForType };
