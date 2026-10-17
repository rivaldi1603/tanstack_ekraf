import { Link } from "@tanstack/react-router";
import { SparklesIcon } from "lucide-react";

const FOOTER_LINKS = [
	{ to: "/", label: "Home" },
	{ to: "/dashboard", label: "Dashboard" },
	{ to: "/products", label: "Products" },
	{ to: "/setup", label: "Setup" },
	{ to: "/login", label: "Sign in" },
] as const;

export default function Footer() {
	const year = new Date().getFullYear();

	return (
		<footer className="mt-16 border-t border-border bg-background/60 px-4 py-10 text-muted-foreground">
			<div className="page-wrap flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
				<div className="max-w-sm">
					<div className="flex items-center gap-2 text-sm font-semibold text-foreground">
						<SparklesIcon className="size-4 text-[color:var(--lagoon-deep)]" />
						Ekraf Admin Dashboard
					</div>
					<p className="mt-2 text-sm leading-6">
						Secure product and user administration for creative economy teams, built with TanStack
						Start and Better Auth.
					</p>
				</div>

				<nav className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
					{FOOTER_LINKS.map((link) => (
						<Link
							key={link.to}
							to={link.to}
							className="font-medium text-muted-foreground no-underline transition hover:text-foreground"
						>
							{link.label}
						</Link>
					))}
				</nav>
			</div>

			<div className="page-wrap mt-8 border-t border-border pt-6">
				<p className="m-0 text-xs">&copy; {year} Ekraf Admin. All rights reserved.</p>
			</div>
		</footer>
	);
}
