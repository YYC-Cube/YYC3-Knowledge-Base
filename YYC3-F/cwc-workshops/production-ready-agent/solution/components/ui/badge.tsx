import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider",
  {
    variants: {
      variant: {
        default: "bg-secondary text-foreground/70",
        running: "bg-accent text-accent-foreground",
        idle: "bg-teal/15 text-teal",
        pending: "bg-secondary text-muted-foreground",
        satisfied: "bg-accent text-accent-foreground",
        failed: "bg-primary text-primary-foreground",
        pursue: "bg-accent text-accent-foreground",
        hold: "bg-lavender text-foreground",
        pass: "bg-primary/15 text-primary",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  pulse?: boolean;
}

export function Badge({ className, variant, pulse, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props}>
      {pulse && <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse-ring" />}
      {children}
    </span>
  );
}
