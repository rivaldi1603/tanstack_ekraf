import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2Icon, Loader2Icon, ShieldCheckIcon, UserIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Role } from "@/lib/db";
import { updateCurrentUserProfile } from "@/lib/server/users";
import { getUserInitials } from "@/lib/types";

interface UserProfileModalProps {
	open: boolean;
	user: { id: string; email: string; name: string | null } | null;
	role: Role | null;
	onOpenChange: (open: boolean) => void;
}

export default function UserProfileModal({
	open,
	user,
	role,
	onOpenChange,
}: UserProfileModalProps) {
	const router = useRouter();
	const updateProfileFn = useServerFn(updateCurrentUserProfile);

	const [name, setName] = useState("");
	const [error, setError] = useState("");
	const [success, setSuccess] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);

	useEffect(() => {
		if (!open || !user) return;
		setName(user.name ?? "");
		setError("");
		setSuccess(false);
	}, [open, user]);

	if (!user) {
		return <Dialog open={open} onOpenChange={onOpenChange} />;
	}

	const initials = getUserInitials({ name: user.name, email: user.email });
	const isAdmin = role === "admin";

	const handleSave = async (event: React.FormEvent) => {
		event.preventDefault();
		const trimmed = name.trim();
		if (!trimmed) {
			setError("Display name cannot be empty.");
			return;
		}

		setError("");
		setSuccess(false);
		setIsSubmitting(true);
		try {
			await updateProfileFn({ data: { name: trimmed } });
			setSuccess(true);
			await router.invalidate();
			setTimeout(() => {
				if (open) onOpenChange(false);
			}, 900);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to update profile.");
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Account Profile</DialogTitle>
					<DialogDescription>
						View your account credentials, role permissions, and update your display name.
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSave} className="space-y-4">
					{/* User identity card */}
					<div className="flex items-center gap-3 rounded-xl border border-border bg-muted/40 p-3.5">
						<div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[color:var(--lagoon)]/20 text-sm font-bold text-[color:var(--lagoon-deep)]">
							{initials}
						</div>
						<div className="min-w-0 flex-1">
							<p className="truncate text-sm font-semibold text-foreground">
								{user.name || user.email}
							</p>
							<p className="truncate text-xs text-muted-foreground">{user.email}</p>
						</div>
						<Badge variant={isAdmin ? "default" : "muted"}>
							{isAdmin ? (
								<ShieldCheckIcon className="size-3.5" />
							) : (
								<UserIcon className="size-3.5" />
							)}
							{isAdmin ? "Admin" : "Standard User"}
						</Badge>
					</div>

					{/* Role permissions card */}
					<div className="rounded-xl border border-border bg-card p-3.5 text-xs text-muted-foreground space-y-2">
						<div className="flex items-center justify-between font-semibold text-foreground">
							<span>Your Workspace Permissions</span>
							<Badge variant={isAdmin ? "default" : "lagoon"}>
								{isAdmin ? "Full Access" : "Read-Only"}
							</Badge>
						</div>
						<ul className="space-y-1 list-disc pl-4">
							<li>Browse product catalogue and check live inventory</li>
							<li>View product specifications, pricing, and high-resolution images</li>
							<li>Access dashboard overview metrics</li>
							{isAdmin ? (
								<>
									<li className="text-foreground font-medium">
										Create, edit, and delete catalogue products
									</li>
									<li className="text-foreground font-medium">
										Manage user accounts and role assignments
									</li>
									<li className="text-foreground font-medium">
										Inspect administrative security audit trail
									</li>
								</>
							) : (
								<li className="text-amber-600 dark:text-amber-400">
									Catalogue modifications and user role management require an Administrator account.
								</li>
							)}
						</ul>
					</div>

					{/* Edit Name Input */}
					<div className="space-y-1.5">
						<Label htmlFor="profile-name">Display Name</Label>
						<Input
							id="profile-name"
							value={name}
							onChange={(e) => {
								setName(e.target.value);
								setError("");
								setSuccess(false);
							}}
							placeholder="Your display name"
							maxLength={100}
							required
						/>
					</div>

					{/* Read-only email */}
					<div className="space-y-1.5">
						<Label htmlFor="profile-email">Email Address</Label>
						<Input
							id="profile-email"
							value={user.email}
							disabled
							readOnly
							className="opacity-70 cursor-not-allowed bg-muted/40"
						/>
						<p className="text-[11px] text-muted-foreground">
							Email is tied to your login identity and cannot be changed here.
						</p>
					</div>

					{error && <p className="text-xs font-medium text-destructive">{error}</p>}

					{success && (
						<div className="flex items-center gap-1.5 text-xs font-medium text-[color:var(--palm)]">
							<CheckCircle2Icon className="size-3.5" />
							Profile display name updated successfully!
						</div>
					)}

					<DialogFooter className="pt-2">
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
							disabled={isSubmitting}
						>
							Cancel
						</Button>
						<Button type="submit" disabled={isSubmitting || !name.trim()}>
							{isSubmitting ? (
								<>
									<Loader2Icon className="animate-spin size-4" />
									Saving…
								</>
							) : (
								"Save Changes"
							)}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
