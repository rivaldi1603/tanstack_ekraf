import { Link } from "@tanstack/react-router";
import { SparklesIcon } from "lucide-react";

import BetterAuthHeader from "../integrations/better-auth/header-user.tsx";
import ThemeToggle from "./ThemeToggle";

const NAV_LINKS = [
	{ to: "/", label: "Beranda" },
	{ to: "/dashboard", label: "Dashboard" },
	{ to: "/products", label: "Produk" },
	{ to: "/users", label: "Pengguna" },
	{ to: "/setup", label: "Setup" },
] as const;

export default function Header() {
	return (
		<header className="sticky top-0 z-30 border-b border-border/60 bg-background/60 px-4 backdrop-blur-xl">
			<nav className="page-wrap flex items-center gap-3 py-3">
				<Link
					to="/"
					className="inline-flex shrink-0 items-center gap-2 rounded-full border border-border/70 bg-card/80 px-3 py-1.5 text-sm font-semibold text-foreground no-underline shadow-sm transition hover:border-teal-500/40"
				>
					<span className="flex size-6 items-center justify-center rounded-full bg-gradient-to-tr from-teal-500 via-cyan-500 to-indigo-600 text-white shadow-[0_0_12px_rgba(20,184,166,0.45)]">
						<SparklesIcon className="size-3.5" />
					</span>
					Ekraf <span className="aurora-gradient-text">Admin</span>
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
