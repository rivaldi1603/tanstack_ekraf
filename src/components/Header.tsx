import { Link } from "@tanstack/react-router";
import { SparklesIcon } from "lucide-react";

import BetterAuthHeader from "../integrations/better-auth/header-user.tsx";
import ThemeToggle from "./ThemeToggle";

const NAV_LINKS = [
	{ to: "/", label: "Home" },
	{ to: "/dashboard", label: "Dashboard" },
	{ to: "/products", label: "Products" },
	{ to: "/users", label: "Users" },
	{ to: "/setup", label: "Setup" },
] as const;

export default function Header() {
	return (
		<header className="sticky top-0 z-30 border-b border-border bg-background/80 px-4 backdrop-blur-lg">
			<nav className="page-wrap flex items-center gap-3 py-3">
				<Link
					to="/"
					className="inline-flex shrink-0 items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-sm font-semibold text-foreground no-underline shadow-sm"
				>
					<span className="flex size-6 items-center justify-center rounded-full bg-[color:var(--lagoon)]/20 text-[color:var(--lagoon-deep)]">
						<SparklesIcon className="size-3.5" />
					</span>
					Ekraf Admin
				</Link>

				<div className="hidden items-center gap-1 md:flex">
					{NAV_LINKS.map((link) => (
						<Link
							key={link.to}
							to={link.to}
							className="rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground no-underline transition hover:bg-accent hover:text-foreground"
							activeProps={{ className: "text-foreground bg-accent" }}
						>
							{link.label}
						</Link>
					))}
				</div>

				<div className="ml-auto flex items-center gap-2">
					<BetterAuthHeader />
					<ThemeToggle />
				</div>
			</nav>
		</header>
	);
}
