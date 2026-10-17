import { Link, createFileRoute } from "@tanstack/react-router";
import {
	ArrowRightIcon,
	DatabaseIcon,
	LayoutDashboardIcon,
	PackageIcon,
	ShieldCheckIcon,
	SparklesIcon,
	UsersIcon,
	ZapIcon,
} from "lucide-react";

import PublicLayout from "@/components/PublicLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/")({
	component: HomePage,
});

const FEATURES = [
	{
		title: "Server-verified sessions",
		description: "Every write re-checks your session and role on the server.",
		icon: ShieldCheckIcon,
	},
	{
		title: "Product catalogue",
		description: "Create, edit and delete products with image uploads.",
		icon: PackageIcon,
	},
	{
		title: "Role management",
		description: "Promote admins and keep at least one account in control.",
		icon: UsersIcon,
	},
	{
		title: "Fast data tables",
		description: "Sortable TanStack Table views that work on mobile too.",
		icon: ZapIcon,
	},
];

const QUICK_ACTIONS = [
	{
		to: "/dashboard",
		label: "Dashboard",
		description: "KPI overview and recent activity",
		icon: LayoutDashboardIcon,
	},
	{
		to: "/products",
		label: "Products",
		description: "Manage your catalogue",
		icon: PackageIcon,
	},
	{
		to: "/users",
		label: "Users",
		description: "Roles and accounts (admin)",
		icon: UsersIcon,
	},
	{
		to: "/setup",
		label: "Setup",
		description: "Seed the demo admin account",
		icon: DatabaseIcon,
	},
] as const;

const STEPS = [
	"Open the Setup page and seed the administrator account.",
	"Sign in with the demo credentials (admin@example.com / admin12345).",
	"Add products with images, then invite and promote your team.",
] as const;

function HomePage() {
	const { data: session, isPending } = authClient.useSession();

	return (
		<PublicLayout>
			<section className="border-b border-border">
				<div className="page-wrap grid gap-10 px-4 py-14 lg:grid-cols-[1.15fr_1fr] lg:items-center lg:py-20">
					<div className="rise-in">
						<Badge variant="lagoon" className="mb-4">
							<SparklesIcon />
							Ekraf creative economy admin
						</Badge>
						<h1 className="display-title text-4xl leading-[1.1] font-bold text-foreground sm:text-5xl lg:text-6xl">
							Run your catalogue and your team from one clean dashboard.
						</h1>
						<p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground">
							A secure admin workspace for creative economy products and people — built on TanStack
							Start and Better Auth, with server-side validation on every action.
						</p>

						<div className="mt-8 flex flex-wrap gap-3">
							{session?.user ? (
								<Button asChild size="lg">
									<Link to="/dashboard" className="no-underline">
										Open dashboard
										<ArrowRightIcon />
									</Link>
								</Button>
							) : (
								<Button asChild size="lg">
									<Link to="/login" className="no-underline">
										Sign in
										<ArrowRightIcon />
									</Link>
								</Button>
							)}
							<Button asChild size="lg" variant="outline">
								<Link to="/setup" className="no-underline">
									<DatabaseIcon />
									Seed demo data
								</Link>
							</Button>
						</div>

						<div className="mt-10 grid gap-4 sm:grid-cols-2">
							{FEATURES.map((feature) => (
								<div key={feature.title} className="flex gap-3">
									<span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[color:var(--lagoon)]/15 text-[color:var(--lagoon-deep)]">
										<feature.icon className="size-4" />
									</span>
									<div>
										<p className="text-sm font-semibold text-foreground">{feature.title}</p>
										<p className="text-xs text-muted-foreground">{feature.description}</p>
									</div>
								</div>
							))}
						</div>
					</div>

					<Card className="island-shell rise-in border-border/60">
						<CardHeader>
							<div className="flex items-center justify-between gap-3">
								<CardTitle className="flex items-center gap-2">
									<SparklesIcon className="size-4 text-[color:var(--lagoon-deep)]" />
									Session status
								</CardTitle>
								<Badge variant={session?.user ? "success" : "muted"}>
									{session?.user ? "Signed in" : "Guest"}
								</Badge>
							</div>
							<CardDescription>
								{session?.user
									? "You have an active session on this device."
									: "Sign in to unlock the dashboard, products and users."}
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							{isPending ? (
								<div className="space-y-2">
									<div className="h-4 w-40 animate-pulse rounded bg-muted" />
									<div className="h-4 w-56 animate-pulse rounded bg-muted" />
								</div>
							) : session?.user ? (
								<div className="rounded-xl border border-border bg-muted/40 p-4">
									<p className="text-sm font-semibold text-foreground">
										{session.user.name ?? session.user.email}
									</p>
									<p className="truncate text-xs text-muted-foreground">{session.user.email}</p>
								</div>
							) : (
								<div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
									No active session. Use the setup page to create the demo administrator, then sign
									in.
								</div>
							)}

							<div className="space-y-2">
								<p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
									Getting started
								</p>
								<ol className="space-y-2">
									{STEPS.map((step, index) => (
										<li key={step} className="flex gap-3 text-sm text-muted-foreground">
											<span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[color:var(--palm)]/15 text-[11px] font-bold text-[color:var(--palm)]">
												{index + 1}
											</span>
											<span>{step}</span>
										</li>
									))}
								</ol>
							</div>
						</CardContent>
					</Card>
				</div>
			</section>

			<section className="page-wrap px-4 py-14">
				<div className="mb-6">
					<h2 className="display-title text-2xl font-bold text-foreground sm:text-3xl">
						Quick actions
					</h2>
					<p className="mt-1 text-sm text-muted-foreground">
						Everything you need to manage the creative economy programme.
					</p>
				</div>

				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
					{QUICK_ACTIONS.map((action) => (
						<Link key={action.to} to={action.to} className="no-underline">
							<Card className="feature-card h-full border-border/60 transition hover:-translate-y-0.5">
								<CardContent className="space-y-3">
									<span className="flex size-10 items-center justify-center rounded-xl bg-[color:var(--lagoon)]/15 text-[color:var(--lagoon-deep)]">
										<action.icon className="size-5" />
									</span>
									<div>
										<p className="text-sm font-semibold text-foreground">{action.label}</p>
										<p className="text-xs text-muted-foreground">{action.description}</p>
									</div>
								</CardContent>
							</Card>
						</Link>
					))}
				</div>
			</section>
		</PublicLayout>
	);
}
