import type { ReactElement } from "react";
import type { TextareaHTMLAttributes } from "react";

import { cn } from "../../lib/utils.ts";

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>): ReactElement {
  return (
    <textarea
      className={cn(
        "min-h-44 w-full rounded-md border border-border bg-white px-3 py-2 text-sm leading-6 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
