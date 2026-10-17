import { Link, useRouter } from "@tanstack/react-router";
import { LogOutIcon } from "lucide-react";
import { authClient } from "#/lib/auth-client";
import { getUserInitials } from "#/lib/types";

export default function BetterAuthHeader() {
	const router = useRouter();
	const { data: session, isPending } = authClient.useSession();

	if (isPending) {
		return <div className="h-9 w-28 animate-pulse rounded-xl bg-muted" />;
	}

	if (session?.user) {
		const initials = getUserInitials({
			name: session.user.name ?? null,
			email: session.user.email,
		});

		return (
			<div className="flex items-center gap-2">
				<div className="hidden items-center gap-2 rounded-xl border border-border bg-card px-2.5 py-1.5 sm:flex">
					<span className="flex size-6 items-center justify-center rounded-full bg-[color:var(--lagoon)]/20 text-[10px] font-bold text-[color:var(--lagoon-deep)]">
						{initials}
					</span>
					<span className="max-w-40 truncate text-xs font-medium text-foreground">
						{session.user.email}
					</span>
				</div>
				<button
					type="button"
					onClick={async () => {
						await authClient.signOut();
						await router.invalidate();
					}}
					className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border bg-background px-3 text-sm font-medium text-foreground transition hover:bg-accent"
				>
					<LogOutIcon className="size-4" />
					<span className="hidden sm:inline">Sign out</span>
				</button>
			</div>
		);
	}

	return (
		<Link
			to="/login"
			className="inline-flex h-9 items-center rounded-xl bg-[color:var(--sea-ink)] px-4 text-sm font-semibold text-[color:var(--foam)] no-underline transition hover:opacity-90"
		>
			Sign in
		</Link>
	);
}
