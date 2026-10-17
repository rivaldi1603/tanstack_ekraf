import {
	Link,
	Outlet,
	createFileRoute,
	redirect,
	useNavigate,
	useRouterState,
} from "@tanstack/react-router";
import { cn } from "cn";
import {
	HomeIcon,
	LayoutDashboardIcon,
	LogOutIcon,
	MenuIcon,
	PackageIcon,
	PanelLeftCloseIcon,
	PanelLeftOpenIcon,
	SparklesIcon,
	UsersIcon,
	XIcon,
} from "lucide-react";
import { useEffect, useState } from "react";

import ThemeToggle from "@/components/ThemeToggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { getViewer } from "@/lib/server/auth";
import { getUserInitials } from "@/lib/types";

export const Route = createFileRoute("/_admin")({
	beforeLoad: async () => {
		const viewer = await getViewer();
		if (!viewer.user) {
			throw redirect({ to: "/login" });
		}
		return { viewer };
	},
	component: DashboardShell,
});

const NAV_ITEMS = [
	{ to: "/dashboard", label: "Dashboard", icon: LayoutDashboardIcon },
	{ to: "/products", label: "Products", icon: PackageIcon },
	{ to: "/users", label: "Users", icon: UsersIcon },
	{ to: "/setup", label: "Setup", icon: SparklesIcon },
	{ to: "/", label: "Home", icon: HomeIcon },
] as const;

const SIDEBAR_STORAGE_KEY = "ekraf:sidebar";

function DashboardShell() {
	const { viewer } = Route.useRouteContext();
	const navigate = useNavigate();
	const pathname = useRouterState({ select: (state) => state.location.pathname });

	const [collapsed, setCollapsed] = useState(false);
	const [mobileOpen, setMobileOpen] = useState(false);
	const [signingOut, setSigningOut] = useState(false);

	useEffect(() => {
		setCollapsed(window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === "collapsed");
	}, []);

	useEffect(() => {
		if (!mobileOpen) return;
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") setMobileOpen(false);
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [mobileOpen]);

	const closeMobileDrawer = () => setMobileOpen(false);

	const toggleCollapsed = () => {
		const next = !collapsed;
		setCollapsed(next);
		window.localStorage.setItem(SIDEBAR_STORAGE_KEY, next ? "collapsed" : "expanded");
	};

	const handleSignOut = async () => {
		setSigningOut(true);
		try {
			await authClient.signOut();
			await navigate({ to: "/login", replace: true });
		} finally {
			setSigningOut(false);
		}
	};

	const user = viewer.user;
	const activeItem = NAV_ITEMS.find(
		(item) => pathname === item.to || pathname.startsWith(`${item.to}/`),
	);
	const initials = user ? getUserInitials({ name: user.name, email: user.email }) : "U";
	const roleLabel = viewer.role === "admin" ? "Admin" : "User";

	return (
		<div className="min-h-screen bg-background">
			{mobileOpen && (
				<button
					type="button"
					aria-label="Close navigation"
					onClick={closeMobileDrawer}
					className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
				/>
			)}

			<aside
				className={cn(
					// `invisible` (not just an off-screen transform) keeps the closed mobile
					// drawer out of the accessibility tree and the tab order. `lg:visible`
					// restores it as the permanent desktop sidebar. Visibility is part of the
					// transition so the drawer still slides in and out.
					"fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-border bg-card transition-[transform,visibility] duration-200 lg:visible lg:translate-x-0",
					collapsed ? "lg:w-20" : "lg:w-64",
					mobileOpen ? "visible translate-x-0" : "invisible -translate-x-full",
				)}
			>
				<div className="flex h-16 shrink-0 items-center gap-2 border-b border-border px-4">
					<div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[color:var(--lagoon)]/20 text-[color:var(--lagoon-deep)]">
						<SparklesIcon className="size-5" />
					</div>
					<div className={cn("min-w-0", collapsed && "lg:hidden")}>
						<p className="truncate text-sm font-bold tracking-tight text-foreground">Ekraf Admin</p>
						<p className="truncate text-[11px] text-muted-foreground">Dashboard</p>
					</div>
					<Button
						type="button"
						variant="ghost"
						size="icon-sm"
						aria-label="Close navigation"
						className="ml-auto lg:hidden"
						onClick={closeMobileDrawer}
					>
						<XIcon />
					</Button>
				</div>

				<nav className="flex-1 space-y-1 overflow-y-auto p-3">
					{NAV_ITEMS.map((item) => {
						const isActive = activeItem?.to === item.to;
						const Icon = item.icon;
						return (
							<Link
								key={item.to}
								to={item.to}
								title={collapsed ? item.label : undefined}
								onClick={closeMobileDrawer}
								className={cn(
									"flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium no-underline transition",
									isActive
										? "bg-[color:var(--lagoon)]/15 text-[color:var(--sea-ink)]"
										: "text-muted-foreground hover:bg-accent hover:text-foreground",
									collapsed && "lg:justify-center lg:px-0",
								)}
							>
								<Icon className="size-5 shrink-0" />
								<span className={cn("truncate", collapsed && "lg:hidden")}>{item.label}</span>
							</Link>
						);
					})}
				</nav>

				<div className="shrink-0 space-y-3 border-t border-border p-3">
					<div
						className={cn(
							"flex items-center gap-2 rounded-xl bg-muted/60 p-2",
							collapsed && "lg:justify-center",
						)}
					>
						<div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[color:var(--palm)]/20 text-xs font-bold text-[color:var(--palm)]">
							{initials}
						</div>
						<div className={cn("min-w-0 flex-1", collapsed && "lg:hidden")}>
							<p className="truncate text-xs font-semibold text-foreground">
								{user?.name ?? user?.email ?? "Signed in"}
							</p>
							<p className="truncate text-[11px] text-muted-foreground">{user?.email}</p>
						</div>
						<Badge
							variant={viewer.role === "admin" ? "default" : "muted"}
							className={cn(collapsed && "lg:hidden")}
						>
							{roleLabel}
						</Badge>
					</div>

					<div className={cn("flex items-center gap-2", collapsed && "lg:flex-col")}>
						<ThemeToggle />
						<Button
							type="button"
							variant="outline"
							size="sm"
							className="flex-1"
							disabled={signingOut}
							onClick={() => void handleSignOut()}
						>
							<LogOutIcon />
							<span className={cn(collapsed && "lg:hidden")}>
								{signingOut ? "Signing out…" : "Sign out"}
							</span>
						</Button>
					</div>
				</div>
			</aside>

			<div
				className={cn(
					"flex min-h-screen flex-col transition-[padding] duration-200",
					collapsed ? "lg:pl-20" : "lg:pl-64",
				)}
			>
				<header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur-lg sm:px-6">
					<Button
						type="button"
						variant="ghost"
						size="icon"
						aria-label="Open navigation"
						className="lg:hidden"
						onClick={() => setMobileOpen(true)}
					>
						<MenuIcon />
					</Button>
					<Button
						type="button"
						variant="ghost"
						size="icon"
						aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
						className="hidden lg:inline-flex"
						onClick={toggleCollapsed}
					>
						{collapsed ? <PanelLeftOpenIcon /> : <PanelLeftCloseIcon />}
					</Button>

					<div className="min-w-0">
						<p className="truncate text-sm font-semibold text-foreground">
							{activeItem?.label ?? "Dashboard"}
						</p>
						<p className="truncate text-xs text-muted-foreground">Ekraf Admin workspace</p>
					</div>

					<div className="ml-auto flex items-center gap-2">
						<Badge variant={viewer.role === "admin" ? "default" : "muted"}>{roleLabel}</Badge>
						<ThemeToggle className="hidden sm:inline-flex" />
					</div>
				</header>

				<main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
					<Outlet />
				</main>
			</div>
		</div>
	);
}
