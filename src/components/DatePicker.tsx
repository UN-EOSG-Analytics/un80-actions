"use client";

import * as React from "react";
import { CalendarIcon, X } from "lucide-react";
import { format, parseISO, isValid, parse } from "date-fns";

import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DatePickerProps {
  value: string; // YYYY-MM-DD string
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

function toYMD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseTypedMonth(text: string): Date | null {
  const t = text.trim();
  if (!t) return null;
  for (const fmt of [
    "MMM yyyy",
    "MMMM yyyy",
    "M/yyyy",
    "yyyy-MM",
    "MMM",
    "MMMM",
  ]) {
    const d = parse(t, fmt, new Date());
    if (isValid(d)) return d;
  }
  return null;
}

function parseTypedDate(text: string): Date | null {
  const t = text.trim();
  for (const fmt of [
    "d MMM yyyy",
    "d MMMM yyyy",
    "dd/MM/yyyy",
    "d/M/yyyy",
    "yyyy-MM-dd",
  ]) {
    const d = parse(t, fmt, new Date());
    if (isValid(d) && d.getFullYear() > 1900) return d;
  }
  return null;
}

export function DatePicker({
  value,
  onChange,
  disabled,
  placeholder = "Pick a date",
  className,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [typedMonth, setTypedMonth] = React.useState<Date | undefined>();
  const inputRef = React.useRef<HTMLInputElement>(null);

  const selected = value ? parseISO(value) : undefined;
  const displayValue = selected ? format(selected, "d MMM yyyy") : "";

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const text = e.target.value;
    const fullDate = parseTypedDate(text);
    if (fullDate) {
      onChange(toYMD(fullDate));
      setTypedMonth(undefined);
      setOpen(false);
      return;
    }
    const month = parseTypedMonth(text);
    setTypedMonth(month ?? undefined);
    if (!open) setOpen(true);
  }

  function handleCalendarSelect(date: Date | undefined) {
    onChange(date ? toYMD(date) : "");
    setTypedMonth(undefined);
    setOpen(false);
    inputRef.current?.blur();
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange("");
    setTypedMonth(undefined);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      {/* PopoverTrigger sets the anchor point for positioning; we prevent its
          toggle-on-click and drive open state ourselves via the input's onFocus */}
      <PopoverTrigger asChild>
        <div
          className={cn(
            "flex h-9 w-full cursor-text items-center gap-2 rounded-md border border-slate-300 px-3 text-sm transition-colors focus-within:border-un-blue",
            disabled && "pointer-events-none opacity-50",
            className,
          )}
          onClick={(e) => {
            // Don't let the trigger toggle the popover on click — only open via focus
            e.preventDefault();
            inputRef.current?.focus();
          }}
        >
          <CalendarIcon className="size-4 shrink-0 text-slate-400" />
          <input
            ref={inputRef}
            type="text"
            disabled={disabled}
            placeholder={placeholder}
            defaultValue={displayValue}
            key={displayValue}
            onChange={handleInputChange}
            onFocus={() => setOpen(true)}
            className="min-w-0 flex-1 bg-transparent placeholder:text-slate-400"
          />
          {selected && (
            <button
              type="button"
              onClick={handleClear}
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0"
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <Calendar
          mode="single"
          selected={selected}
          onSelect={handleCalendarSelect}
          captionLayout="dropdown"
          month={typedMonth}
          onMonthChange={setTypedMonth}
          defaultMonth={selected ?? typedMonth}
          startMonth={new Date(2020, 0)}
          endMonth={new Date(2030, 11)}
        />
      </PopoverContent>
    </Popover>
  );
}
