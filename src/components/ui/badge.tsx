import { type VariantProps, cva } from "class-variance-authority";
import { cn } from "cn";
import type * as React from "react";

const badgeVariants = cva(
	"inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap [&>svg]:pointer-events-none [&>svg]:size-3",
	{
		variants: {
			variant: {
				default: "border-transparent bg-primary text-primary-foreground",
				secondary: "border-transparent bg-secondary text-secondary-foreground",
				destructive: "border-transparent bg-destructive text-white",
				outline: "border-border text-foreground",
				success:
					"border-[color:var(--palm)]/30 bg-[color:var(--palm)]/12 text-[color:var(--palm)] dark:bg-[color:var(--palm)]/20",
				warning: "border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-300",
				muted: "border-border bg-muted text-muted-foreground",
				lagoon:
					"border-[color:var(--lagoon)]/35 bg-[color:var(--lagoon)]/15 text-[color:var(--lagoon-deep)]",
				aurora:
					"border-teal-500/30 bg-gradient-to-r from-teal-500/15 via-cyan-500/15 to-indigo-500/15 text-teal-700 dark:text-teal-300 shadow-[0_0_12px_rgba(20,184,166,0.15)]",
			},
		},

		defaultVariants: {
			variant: "default",
		},
	},
);

function Badge({
	className,
	variant,
	...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
	return (
		<span data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />
	);
}

export { Badge, badgeVariants };
