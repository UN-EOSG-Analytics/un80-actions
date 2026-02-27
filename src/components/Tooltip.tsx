"use client";

/**
 * Project-level Tooltip wrapper.
 * Re-exports Tooltip/TooltipProvider/TooltipTrigger from the UI primitive, but
 * provides a custom TooltipContent built directly from @radix-ui/react-tooltip
 * to avoid the blue border, shadow and gradient baked into the shadcn primitive.
 * Never edit src/components/ui/tooltip.tsx directly.
 */

import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger as TooltipTriggerPrimitive,
  TooltipCollisionBoundaryProvider,
} from "@/components/ui/tooltip";

function TooltipTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TooltipTriggerPrimitive>) {
  return (
    <TooltipTriggerPrimitive
      className={cn("outline-none", className)}
      {...props}
    />
  );
}

function TooltipContent({
  className,
  sideOffset = 4,
  children,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        sideOffset={sideOffset}
        className={cn(
          "z-50 max-w-xs rounded-lg border border-gray-200 bg-white px-4 py-1.5 text-sm text-gray-900 shadow-sm animate-in fade-in-0 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
          className,
        )}
        {...props}
      >
        {children}
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  );
}

export {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
  TooltipCollisionBoundaryProvider,
};
