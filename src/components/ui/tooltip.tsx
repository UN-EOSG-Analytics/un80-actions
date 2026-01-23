"use client";

import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";

import { cn } from "@/lib/utils";

function useIsTouchDevice() {
  const [isTouch, setIsTouch] = React.useState(false);
  React.useEffect(() => {
    const m = window.matchMedia("(hover: none)");
    const update = () => setIsTouch(m.matches);
    update();
    m.addEventListener("change", update);
    return () => m.removeEventListener("change", update);
  }, []);
  return isTouch;
}

const TooltipContext = React.createContext<{
  isTouch: boolean;
  open: boolean;
  setOpen: (v: boolean | ((prev: boolean) => boolean)) => void;
} | null>(null);

function TooltipProvider({
  delayDuration = 0,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
  return (
    <TooltipPrimitive.Provider
      data-slot="tooltip-provider"
      delayDuration={delayDuration}
      {...props}
    />
  );
}

function Tooltip(props: React.ComponentProps<typeof TooltipPrimitive.Root>) {
  const [open, setOpen] = React.useState(false);
  const isTouch = useIsTouchDevice();
  const controlledProps = isTouch ? { open, onOpenChange: setOpen } : {};
  return (
    <TooltipContext.Provider value={{ isTouch, open, setOpen }}>
      <TooltipProvider>
        <TooltipPrimitive.Root
          data-slot="tooltip"
          {...controlledProps}
          {...props}
        />
      </TooltipProvider>
    </TooltipContext.Provider>
  );
}

function TooltipTrigger({
  onClick,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Trigger>) {
  const ctx = React.useContext(TooltipContext);
  const isTouch = ctx?.isTouch ?? false;
  const setOpen = ctx?.setOpen;
  return (
    <TooltipPrimitive.Trigger
      data-slot="tooltip-trigger"
      onClick={(e) => {
        if (isTouch && setOpen) setOpen((o) => !o);
        onClick?.(e);
      }}
      {...props}
    />
  );
}

function TooltipContent({
  className,
  sideOffset = 8,
  onPointerDownOutside,
  children,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Content>) {
  const ctx = React.useContext(TooltipContext);
  const isTouch = ctx?.isTouch ?? false;
  const setOpen = ctx?.setOpen;
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        data-slot="tooltip-content"
        sideOffset={sideOffset}
        onPointerDownOutside={(e) => {
          if (isTouch && setOpen) setOpen(false);
          onPointerDownOutside?.(e);
        }}
        className={cn(
          "z-50 max-w-xs origin-(--radix-tooltip-content-transform-origin) animate-in rounded-lg border border-un-blue/20 bg-white px-4 py-1.5 text-sm text-balance text-gray-900 shadow-lg shadow-un-blue/10 backdrop-blur-sm fade-in-0 zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
          className,
        )}
        {...props}
      >
        <div className="relative">
          {/* Subtle gradient overlay */}
          <div className="pointer-events-none absolute inset-0 rounded-lg bg-gradient-to-br from-un-blue/5 to-transparent" />
          <div className="relative">{children}</div>
        </div>
        <TooltipPrimitive.Arrow className="z-50 size-2.5 fill-white drop-shadow-sm" />
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  );
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
