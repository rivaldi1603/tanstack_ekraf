import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
	Loader2Icon,
	ShieldCheckIcon,
	Trash2Icon,
	TriangleAlertIcon,
	UserIcon,
} from "lucide-react";
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
import type { Role } from "@/lib/db";
import { deleteUser, updateUserRole } from "@/lib/server/users";
import { type UserRow, formatJoinedDate, getUserDisplayName, getUserInitials } from "@/lib/types";

interface UserRoleModalProps {
	open: boolean;
	user: UserRow | null;
	currentUserId: string | null;
	adminCount: number;
	onOpenChange: (open: boolean) => void;
}

export default function UserRoleModal({
	open,
	user,
	currentUserId,
	adminCount,
	onOpenChange,
}: UserRoleModalProps) {
	const queryClient = useQueryClient();
	const updateRoleFn = useServerFn(updateUserRole);
	const deleteFn = useServerFn(deleteUser);

	const [role, setRole] = useState<Role>("user");
	const [error, setError] = useState("");
	const [isSaving, setIsSaving] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);
	const [confirmingDelete, setConfirmingDelete] = useState(false);

	useEffect(() => {
		if (!open || !user) return;
		setRole(user.role);
		setError("");
		setConfirmingDelete(false);
	}, [open, user]);

	const isSelf = Boolean(user && currentUserId && user.id === currentUserId);
	const isLastAdmin = Boolean(user && user.role === "admin" && adminCount <= 1);
	const canChangeRole = Boolean(user) && !isSelf && !isLastAdmin;
	const canDelete = Boolean(user) && !isSelf && !isLastAdmin;
	const roleChanged = Boolean(user) && role !== user?.role;

	const refresh = async () => {
		await Promise.all([
			queryClient.invalidateQueries({ queryKey: ["users"] }),
			queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
		]);
	};

	const handleSaveRole = async () => {
		if (!user || !roleChanged) return;
		setError("");
		setIsSaving(true);
		try {
			await updateRoleFn({ data: { userId: user.id, role } });
			await refresh();
			onOpenChange(false);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Could not update the role");
		} finally {
			setIsSaving(false);
		}
	};

	const handleDelete = async () => {
		if (!user) return;
		setError("");
		setIsDeleting(true);
		try {
			await deleteFn({ data: { userId: user.id } });
			await refresh();
			onOpenChange(false);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Could not delete the user");
		} finally {
			setIsDeleting(false);
		}
	};

	if (!user) {
		return <Dialog open={open} onOpenChange={onOpenChange} />;
	}

	const displayName = getUserDisplayName(user);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>{confirmingDelete ? "Delete user" : "Manage user"}</DialogTitle>
					<DialogDescription>
						{confirmingDelete
							? "This action cannot be undone."
							: "Update this member's role or remove their account."}
					</DialogDescription>
				</DialogHeader>

				<div className="flex items-center gap-3 rounded-xl border border-border bg-muted/40 p-4">
					<div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[color:var(--lagoon)]/20 text-sm font-bold text-[color:var(--lagoon-deep)]">
						{getUserInitials(user)}
					</div>
					<div className="min-w-0 flex-1">
						<p className="truncate text-sm font-semibold text-foreground">{displayName}</p>
						<p className="truncate text-xs text-muted-foreground">{user.email}</p>
					</div>
					<div className="flex flex-col items-end gap-1">
						<Badge variant={user.role === "admin" ? "default" : "muted"}>
							{user.role === "admin" ? <ShieldCheckIcon /> : <UserIcon />}
							{user.role === "admin" ? "Admin" : "User"}
						</Badge>
						<span className="text-[11px] text-muted-foreground">
							Joined {formatJoinedDate(user.createdAt)}
						</span>
					</div>
				</div>

				{isSelf && (
					<div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
						<TriangleAlertIcon className="mt-0.5 size-4 shrink-0" />
						<span>
							This is your own account. You cannot change your own role or delete yourself — ask
							another administrator.
						</span>
					</div>
				)}

				{isLastAdmin && (
					<div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
						<TriangleAlertIcon className="mt-0.5 size-4 shrink-0" />
						<span>
							{displayName} is the last administrator. Demoting or deleting them would lock everyone
							out, so both actions are blocked.
						</span>
					</div>
				)}

				{confirmingDelete ? (
					<div className="space-y-3">
						<div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
							Permanently delete <span className="font-semibold">{displayName}</span> ({user.email}
							)? Their sessions and role assignment will be removed.
						</div>
						{error && <p className="text-xs font-medium text-destructive">{error}</p>}
					</div>
				) : (
					<div className="space-y-4">
						<div className="space-y-2">
							<p className="text-sm font-medium text-foreground">Role</p>
							<div className="grid grid-cols-2 gap-2">
								<button
									type="button"
									disabled={!canChangeRole}
									onClick={() => setRole("user")}
									className={`flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${
										role === "user"
											? "border-[color:var(--lagoon)] bg-[color:var(--lagoon)]/10"
											: "border-border hover:bg-accent"
									}`}
								>
									<span className="flex items-center gap-1.5 text-sm font-semibold">
										<UserIcon className="size-4" />
										User
									</span>
									<span className="text-xs text-muted-foreground">
										Can browse the dashboard read-only areas.
									</span>
								</button>
								<button
									type="button"
									disabled={!canChangeRole}
									onClick={() => setRole("admin")}
									className={`flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${
										role === "admin"
											? "border-[color:var(--lagoon)] bg-[color:var(--lagoon)]/10"
											: "border-border hover:bg-accent"
									}`}
								>
									<span className="flex items-center gap-1.5 text-sm font-semibold">
										<ShieldCheckIcon className="size-4" />
										Administrator
									</span>
									<span className="text-xs text-muted-foreground">
										Full access to products and user management.
									</span>
								</button>
							</div>
						</div>

						<div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
							<p className="text-sm font-semibold text-destructive">Danger zone</p>
							<p className="mt-1 text-xs text-muted-foreground">
								Deleting a user removes their account and role permanently.
							</p>
							<Button
								type="button"
								variant="destructive"
								size="sm"
								className="mt-3"
								disabled={!canDelete}
								onClick={() => {
									setError("");
									setConfirmingDelete(true);
								}}
							>
								<Trash2Icon />
								Delete user
							</Button>
						</div>

						{error && <p className="text-xs font-medium text-destructive">{error}</p>}
					</div>
				)}

				<DialogFooter>
					{confirmingDelete ? (
						<>
							<Button
								type="button"
								variant="outline"
								disabled={isDeleting}
								onClick={() => {
									setError("");
									setConfirmingDelete(false);
								}}
							>
								Back
							</Button>
							<Button
								type="button"
								variant="destructive"
								disabled={isDeleting}
								onClick={() => void handleDelete()}
							>
								{isDeleting ? (
									<>
										<Loader2Icon className="animate-spin" />
										Deleting…
									</>
								) : (
									<>
										<Trash2Icon />
										Yes, delete user
									</>
								)}
							</Button>
						</>
					) : (
						<>
							<Button
								type="button"
								variant="outline"
								onClick={() => onOpenChange(false)}
								disabled={isSaving}
							>
								Cancel
							</Button>
							<Button
								type="button"
								disabled={!canChangeRole || !roleChanged || isSaving}
								onClick={() => void handleSaveRole()}
							>
								{isSaving ? (
									<>
										<Loader2Icon className="animate-spin" />
										Saving…
									</>
								) : (
									"Save role"
								)}
							</Button>
						</>
					)}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
