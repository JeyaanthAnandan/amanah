import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50 min-h-11 px-4 py-2 text-center",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-teal-800",
        secondary: "bg-primary-soft text-primary hover:bg-teal-100",
        outline: "border border-border bg-card hover:bg-muted",
        ghost: "hover:bg-muted",
        sand: "bg-sand text-foreground hover:bg-amber-100",
      },
      size: { default: "", sm: "min-h-9 px-3 text-xs", lg: "min-h-12 px-6 text-base" },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";
export { buttonVariants };
