import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
	createColumnHelper,
	flexRender,
	rowSortingFeature,
	tableFeatures,
	useTable,
} from "@tanstack/react-table";
import {
	ArrowDownIcon,
	ArrowUpDownIcon,
	ArrowUpIcon,
	InboxIcon,
	LockIcon,
	RefreshCwIcon,
	SearchIcon,
	Settings2Icon,
	ShieldCheckIcon,
	UserIcon,
} from "lucide-react";
import { useMemo, useState } from "react";

import UserProfileModal from "@/components/UserProfileModal";
import UserRoleModal from "@/components/UserRoleModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getUsers } from "@/lib/server/users";
import { type UserRow, formatJoinedDate, getUserDisplayName, getUserInitials } from "@/lib/types";

export const Route = createFileRoute("/_admin/users")({
	component: UsersPage,
});

const SKELETON_ROWS = ["one", "two", "three", "four"] as const;

function UsersPage() {
	const { viewer } = Route.useRouteContext();
	const isAdmin = viewer.role === "admin";
	const currentUserId = viewer.user?.id ?? null;

	const usersQuery = useQuery({
		queryKey: ["users"],
		queryFn: async () => getUsers(),
		enabled: isAdmin,
	});

	const [search, setSearch] = useState("");
	const [selected, setSelected] = useState<UserRow | null>(null);
	const [profileOpen, setProfileOpen] = useState(false);

	const users = usersQuery.data ?? [];
	const adminCount = users.filter((user) => user.role === "admin").length;
	const filtered = useMemo(() => {
		const query = search.trim().toLowerCase();
		if (!query) return users;
		return users.filter(
			(user) =>
				user.email.toLowerCase().includes(query) || (user.name ?? "").toLowerCase().includes(query),
		);
	}, [users, search]);

	const features = tableFeatures({ rowSortingFeature });
	const columnHelper = createColumnHelper<typeof features, UserRow>();

	const columns = columnHelper.columns([
		columnHelper.accessor("email", {
			header: "Member",
			cell: (info) => {
				const user = info.row.original;
				return (
					<div className="flex items-center gap-3">
						<div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[color:var(--lagoon)]/20 text-xs font-bold text-[color:var(--lagoon-deep)]">
							{getUserInitials(user)}
						</div>
						<div className="min-w-0">
							<p className="flex items-center gap-2 truncate text-sm font-medium text-foreground">
								{getUserDisplayName(user)}
								{user.id === currentUserId && <Badge variant="lagoon">You</Badge>}
							</p>
							<p className="truncate text-xs text-muted-foreground">{user.email}</p>
						</div>
					</div>
				);
			},
		}),
		columnHelper.accessor("role", {
			header: "Role",
			cell: (info) => {
				const user = info.row.original;
				const isLastAdmin = user.role === "admin" && adminCount <= 1;
				return (
					<div className="flex flex-wrap items-center gap-1.5">
						<Badge variant={user.role === "admin" ? "default" : "muted"}>
							{user.role === "admin" ? <ShieldCheckIcon /> : <UserIcon />}
							{user.role === "admin" ? "Admin" : "User"}
						</Badge>
						{isLastAdmin && <Badge variant="warning">Last admin</Badge>}
					</div>
				);
			},
		}),
		columnHelper.accessor("emailVerified", {
			header: "Status",
			cell: (info) =>
				info.getValue() ? (
					<Badge variant="success">Verified</Badge>
				) : (
					<Badge variant="muted">Unverified</Badge>
				),
		}),
		columnHelper.accessor("createdAt", {
			header: "Joined",
			cell: (info) => (
				<span className="whitespace-nowrap text-muted-foreground">
					{formatJoinedDate(info.getValue())}
				</span>
			),
		}),
		columnHelper.display({
			id: "actions",
			header: "Actions",
			cell: (info) => (
				<div className="flex justify-end">
					<Button
						type="button"
						variant="ghost"
						size="sm"
						onClick={() => setSelected(info.row.original)}
					>
						<Settings2Icon />
						Manage
					</Button>
				</div>
			),
		}),
	]);

	const table = useTable({ features, columns, data: filtered });

	const showSkeleton = isAdmin && usersQuery.isPending;
	const showError = isAdmin && usersQuery.isError;
	const showEmpty = isAdmin && !showSkeleton && !showError && filtered.length === 0;

	return (
		<div className="mx-auto w-full max-w-6xl space-y-6">
			<div>
				<p className="island-kicker mb-1">Access control</p>
				<h1 className="display-title text-3xl font-bold text-foreground sm:text-4xl">Users</h1>
				<p className="mt-1 text-sm text-muted-foreground">
					Promote or demote members and remove accounts. Administrators only.
				</p>
			</div>

			{!isAdmin ? (
				<div className="grid gap-6 md:grid-cols-2">
					<Card>
						<CardContent className="flex flex-col items-center gap-3 py-10 text-center">
							<div className="flex size-12 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
								<LockIcon className="size-6" />
							</div>
							<div>
								<p className="text-base font-semibold text-foreground">Administrators Only</p>
								<p className="mt-1 text-xs text-muted-foreground max-w-sm">
									Member management, role assignments, and account deletions are restricted to
									workspace administrators.
								</p>
							</div>
						</CardContent>
					</Card>

					<Card>
						<CardContent className="space-y-4 py-6">
							<div className="flex items-center justify-between border-b border-border pb-3">
								<h3 className="text-sm font-semibold text-foreground">Your Account Profile</h3>
								<Badge variant="muted">
									<UserIcon className="size-3" /> Standard Member
								</Badge>
							</div>
							<div className="flex items-center gap-3">
								<div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[color:var(--lagoon)]/20 text-sm font-bold text-[color:var(--lagoon-deep)]">
									{viewer.user
										? getUserInitials({ name: viewer.user.name, email: viewer.user.email })
										: "U"}
								</div>
								<div className="min-w-0 flex-1">
									<p className="truncate text-sm font-semibold text-foreground">
										{viewer.user?.name || viewer.user?.email}
									</p>
									<p className="truncate text-xs text-muted-foreground">{viewer.user?.email}</p>
								</div>
							</div>
							<div className="rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
								<p className="font-medium text-foreground">Workspace Permissions:</p>
								<p>• Catalogue access: Read-only (Browse products & stock)</p>
								<p>• Dashboard: Overview KPIs and product catalogue metrics</p>
							</div>
							<Button
								type="button"
								variant="outline"
								size="sm"
								className="w-full"
								onClick={() => setProfileOpen(true)}
							>
								<Settings2Icon /> Edit Profile Display Name
							</Button>
						</CardContent>
					</Card>
				</div>
			) : (
				<>
					<div className="relative max-w-sm">
						<SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
						<Input
							type="search"
							value={search}
							onChange={(event) => setSearch(event.target.value)}
							placeholder="Search users…"
							aria-label="Search users"
							className="pl-9"
						/>
					</div>

					{showError && (
						<Card>
							<CardContent className="flex flex-col items-center gap-3 py-10 text-center">
								<p className="text-sm font-medium text-destructive">
									Could not load users:{" "}
									{(usersQuery.error as Error | null)?.message ?? "unknown error"}
								</p>
								<Button type="button" variant="outline" onClick={() => void usersQuery.refetch()}>
									<RefreshCwIcon />
									Retry
								</Button>
							</CardContent>
						</Card>
					)}

					{!showError && showSkeleton && (
						<Card>
							<CardContent className="space-y-3">
								{SKELETON_ROWS.map((key) => (
									<div key={key} className="flex items-center gap-3">
										<div className="size-9 shrink-0 animate-pulse rounded-full bg-muted" />
										<div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
										<div className="ml-auto h-3 w-20 animate-pulse rounded bg-muted" />
									</div>
								))}
							</CardContent>
						</Card>
					)}

					{!showError && showEmpty && (
						<Card>
							<CardContent className="flex flex-col items-center gap-3 py-12 text-center">
								<InboxIcon className="size-10 text-muted-foreground" />
								<div>
									<p className="text-sm font-semibold text-foreground">
										{search ? "No matching users" : "No users yet"}
									</p>
									<p className="mt-1 text-xs text-muted-foreground">
										{search
											? "Try a different search term."
											: "Accounts will appear here once people sign up."}
									</p>
								</div>
							</CardContent>
						</Card>
					)}

					{!showError && !showSkeleton && !showEmpty && (
						<>
							{/* Desktop table */}
							<Card className="hidden overflow-hidden md:block">
								<div className="overflow-x-auto">
									<table className="w-full border-collapse text-sm">
										<thead>
											{table.getHeaderGroups().map((headerGroup) => (
												<tr key={headerGroup.id} className="border-b border-border">
													{headerGroup.headers.map((header) => (
														<th
															key={header.id}
															colSpan={header.colSpan}
															className="bg-muted/50 px-4 py-3 text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase"
														>
															{header.isPlaceholder ? null : header.column.getCanSort() ? (
																<button
																	type="button"
																	onClick={header.column.getToggleSortingHandler()}
																	className="inline-flex items-center gap-1 transition hover:text-foreground"
																>
																	{flexRender(header.column.columnDef.header, header.getContext())}
																	{header.column.getIsSorted() === "asc" ? (
																		<ArrowUpIcon className="size-3.5" />
																	) : header.column.getIsSorted() === "desc" ? (
																		<ArrowDownIcon className="size-3.5" />
																	) : (
																		<ArrowUpDownIcon className="size-3.5 opacity-40" />
																	)}
																</button>
															) : (
																flexRender(header.column.columnDef.header, header.getContext())
															)}
														</th>
													))}
												</tr>
											))}
										</thead>
										<tbody>
											{table.getRowModel().rows.map((row) => (
												<tr
													key={row.id}
													className="border-b border-border last:border-0 hover:bg-accent/30"
												>
													{row.getAllCells().map((cell) => (
														<td key={cell.id} className="px-4 py-3 align-middle">
															{flexRender(cell.column.columnDef.cell, cell.getContext())}
														</td>
													))}
												</tr>
											))}
										</tbody>
									</table>
								</div>
							</Card>

							{/* Mobile / tablet cards */}
							<div className="grid gap-4 md:hidden">
								{filtered.map((user) => {
									const isLastAdmin = user.role === "admin" && adminCount <= 1;
									return (
										<Card key={user.id}>
											<CardContent className="space-y-3">
												<div className="flex items-center gap-3">
													<div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[color:var(--lagoon)]/20 text-sm font-bold text-[color:var(--lagoon-deep)]">
														{getUserInitials(user)}
													</div>
													<div className="min-w-0 flex-1">
														<p className="truncate text-sm font-semibold text-foreground">
															{getUserDisplayName(user)}
														</p>
														<p className="truncate text-xs text-muted-foreground">{user.email}</p>
													</div>
													{user.id === currentUserId && <Badge variant="lagoon">You</Badge>}
												</div>

												<div className="flex flex-wrap items-center gap-1.5">
													<Badge variant={user.role === "admin" ? "default" : "muted"}>
														{user.role === "admin" ? <ShieldCheckIcon /> : <UserIcon />}
														{user.role === "admin" ? "Admin" : "User"}
													</Badge>
													{isLastAdmin && <Badge variant="warning">Last admin</Badge>}
													<Badge variant={user.emailVerified ? "success" : "muted"}>
														{user.emailVerified ? "Verified" : "Unverified"}
													</Badge>
													<span className="text-xs text-muted-foreground">
														Joined {formatJoinedDate(user.createdAt)}
													</span>
												</div>

												<Button
													type="button"
													variant="outline"
													size="sm"
													className="w-full"
													onClick={() => setSelected(user)}
												>
													<Settings2Icon />
													Manage user
												</Button>
											</CardContent>
										</Card>
									);
								})}
							</div>
						</>
					)}

					<UserRoleModal
						open={Boolean(selected)}
						user={selected}
						currentUserId={currentUserId}
						adminCount={adminCount}
						onOpenChange={(open) => {
							if (!open) setSelected(null);
						}}
					/>
				</>
			)}

			<UserProfileModal
				open={profileOpen}
				user={viewer.user}
				role={viewer.role}
				onOpenChange={setProfileOpen}
			/>
		</div>
	);
}
