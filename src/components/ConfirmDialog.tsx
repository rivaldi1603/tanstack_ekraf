import { Loader2Icon, TriangleAlertIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";

interface ConfirmDialogProps {
	open: boolean;
	title: string;
	description: string;
	confirmLabel?: string;
	cancelLabel?: string;
	warning?: string;
	isPending?: boolean;
	error?: string;
	onConfirm: () => void;
	onOpenChange: (open: boolean) => void;
}

export default function ConfirmDialog({
	open,
	title,
	description,
	confirmLabel = "Confirm",
	cancelLabel = "Cancel",
	warning,
	isPending = false,
	error,
	onConfirm,
	onOpenChange,
}: ConfirmDialogProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
					<DialogDescription>{description}</DialogDescription>
				</DialogHeader>

				{warning && (
					<div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs font-medium text-destructive">
						<TriangleAlertIcon className="mt-0.5 size-4 shrink-0" />
						<span>{warning}</span>
					</div>
				)}

				{error && <p className="text-xs font-medium text-destructive">{error}</p>}

				<DialogFooter>
					<Button
						type="button"
						variant="outline"
						disabled={isPending}
						onClick={() => onOpenChange(false)}
					>
						{cancelLabel}
					</Button>
					<Button type="button" variant="destructive" disabled={isPending} onClick={onConfirm}>
						{isPending ? (
							<>
								<Loader2Icon className="animate-spin" />
								Working…
							</>
						) : (
							confirmLabel
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
