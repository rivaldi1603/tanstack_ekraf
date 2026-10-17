import { Link, createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
	ArrowRightIcon,
	CheckCircle2Icon,
	DatabaseIcon,
	KeyRoundIcon,
	Loader2Icon,
	MailIcon,
	RefreshCwIcon,
	ShieldCheckIcon,
	TriangleAlertIcon,
	UserIcon,
} from "lucide-react";
import { useState } from "react";

import PublicLayout from "@/components/PublicLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
	SEED_ADMIN_EMAIL,
	SEED_ADMIN_PASSWORD,
	SEED_USER_EMAIL,
	SEED_USER_PASSWORD,
} from "@/lib/demo-credentials";
import { seedAdmin } from "@/lib/server/auth";
import type { SeedResult } from "@/lib/server/auth";

export const Route = createFileRoute("/setup")({
	component: SetupPage,
});

const STEPS = [
	"Run the seed — it creates the administrator and three sample products.",
	"Sign in with the demo credentials below.",
	"Add, edit and delete products, or promote teammates to administrators.",
] as const;

function SetupPage() {
	const seedAdminFn = useServerFn(seedAdmin);
	const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
	const [message, setMessage] = useState("");
	const [result, setResult] = useState<SeedResult | null>(null);

	const handleSeed = async () => {
		setStatus("loading");
		setMessage("");
		try {
			const seedResult = await seedAdminFn();
			setResult(seedResult);
			setStatus("success");
			setMessage(seedResult.message);
		} catch (error) {
			setResult(null);
			setStatus("error");
			setMessage(error instanceof Error ? error.message : "Seeding failed. Please try again.");
		}
	};

	return (
		<PublicLayout>
			<main className="page-wrap px-4 py-12">
				<div className="mx-auto max-w-4xl space-y-6">
					<div>
						<p className="island-kicker mb-1">Setup</p>
						<h1 className="display-title text-3xl font-bold text-foreground sm:text-4xl">
							Seed the admin account
						</h1>
						<p className="mt-2 max-w-2xl text-sm text-muted-foreground">
							This project has no database by design — data lives in memory for the life of the
							server process. Run the seed once after every deploy or restart. It is safe to click
							repeatedly: it never creates a second administrator or duplicate products.
						</p>
					</div>

					<div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<DatabaseIcon className="size-4 text-[color:var(--lagoon-deep)]" />
									One-time seed
								</CardTitle>
								<CardDescription>
									Creates <strong>admin@example.com</strong> with a hashed password and three sample
									products.
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-4">
								<Button
									type="button"
									size="lg"
									className="w-full"
									disabled={status === "loading"}
									onClick={() => void handleSeed()}
								>
									{status === "loading" ? (
										<>
											<Loader2Icon className="animate-spin" />
											Seeding…
										</>
									) : (
										<>
											<DatabaseIcon />
											{result ? "Run seed again" : "Seed admin account"}
										</>
									)}
								</Button>

								{status !== "idle" && message && (
									<div
										className={`flex items-start gap-2 rounded-xl border p-3 text-sm ${
											status === "success"
												? "border-[color:var(--palm)]/30 bg-[color:var(--palm)]/10 text-[color:var(--palm)]"
												: status === "error"
													? "border-destructive/30 bg-destructive/10 text-destructive"
													: "border-border bg-muted/40 text-muted-foreground"
										}`}
									>
										{status === "success" ? (
											<CheckCircle2Icon className="mt-0.5 size-4 shrink-0" />
										) : (
											<TriangleAlertIcon className="mt-0.5 size-4 shrink-0" />
										)}
										<div>
											<p className="font-medium">{message}</p>
											{result && (
												<p className="mt-1 text-xs opacity-90">
													{result.alreadySeeded
														? `${result.productCount} product(s) already in the catalogue.`
														: `Catalogue now contains ${result.productCount} product(s).`}
												</p>
											)}
										</div>
									</div>
								)}

								<ol className="space-y-3">
									{STEPS.map((step, index) => (
										<li key={step} className="flex gap-3 text-sm text-muted-foreground">
											<span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[color:var(--lagoon)]/15 text-xs font-bold text-[color:var(--lagoon-deep)]">
												{index + 1}
											</span>
											<span>{step}</span>
										</li>
									))}
								</ol>

								<div className="flex flex-wrap gap-2">
									<Button asChild>
										<Link to="/login" className="no-underline">
											Go to sign in
											<ArrowRightIcon />
										</Link>
									</Button>
									<Button asChild variant="outline">
										<Link to="/dashboard" className="no-underline">
											Open dashboard
										</Link>
									</Button>
								</div>
							</CardContent>
						</Card>

						<div className="space-y-4">
							<Card>
								<CardHeader>
									<CardTitle className="flex items-center justify-between gap-2">
										<span className="flex items-center gap-2">
											<ShieldCheckIcon className="size-4 text-[color:var(--palm)]" />
											Demo accounts
										</span>
										<Badge variant="muted">Development only</Badge>
									</CardTitle>
									<CardDescription>
										Use these seeded accounts to test both administrator and regular user roles.
									</CardDescription>
								</CardHeader>
								<CardContent className="space-y-4">
									<div className="space-y-2 rounded-xl border border-border bg-muted/40 p-3">
										<div className="flex items-center justify-between">
											<span className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
												<ShieldCheckIcon className="size-3.5 text-[color:var(--palm)]" />
												Administrator (Full Access)
											</span>
											<Badge variant="default">Admin</Badge>
										</div>
										<div className="flex items-center gap-2 text-xs text-muted-foreground">
											<MailIcon className="size-3.5 shrink-0" />
											<span className="font-mono text-foreground">{SEED_ADMIN_EMAIL}</span>
										</div>
										<div className="flex items-center gap-2 text-xs text-muted-foreground">
											<KeyRoundIcon className="size-3.5 shrink-0" />
											<span className="font-mono text-foreground">{SEED_ADMIN_PASSWORD}</span>
										</div>
									</div>

									<div className="space-y-2 rounded-xl border border-border bg-muted/40 p-3">
										<div className="flex items-center justify-between">
											<span className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
												<UserIcon className="size-3.5 text-[color:var(--lagoon-deep)]" />
												Standard Member (Read-only)
											</span>
											<Badge variant="muted">User</Badge>
										</div>
										<div className="flex items-center gap-2 text-xs text-muted-foreground">
											<MailIcon className="size-3.5 shrink-0" />
											<span className="font-mono text-foreground">{SEED_USER_EMAIL}</span>
										</div>
										<div className="flex items-center gap-2 text-xs text-muted-foreground">
											<KeyRoundIcon className="size-3.5 shrink-0" />
											<span className="font-mono text-foreground">{SEED_USER_PASSWORD}</span>
										</div>
									</div>
								</CardContent>
							</Card>

							<Card>
								<CardHeader>
									<CardTitle className="flex items-center gap-2">
										<RefreshCwIcon className="size-4 text-muted-foreground" />
										Reminder
									</CardTitle>
									<CardDescription>
										In-memory data resets on redeploy or a cold start, so re-run this seed whenever
										the catalogue looks empty.
									</CardDescription>
								</CardHeader>
							</Card>
						</div>
					</div>
				</div>
			</main>
		</PublicLayout>
	);
}
