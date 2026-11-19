import * as React from "react";
import { cn } from "@/lib/utils";

export function Label({ className, ...p }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("block text-sm font-semibold", className)} {...p} />;
}
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...p }, ref) => (
    <input ref={ref} className={cn("mt-1 block w-full rounded-xl border border-border bg-card px-3 py-2.5 text-base", className)} {...p} />
  ),
);
Input.displayName = "Input";
export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...p }, ref) => (
    <select ref={ref} className={cn("mt-1 block w-full rounded-xl border border-border bg-card px-3 py-2.5 text-base", className)} {...p} />
  ),
);
Select.displayName = "Select";
