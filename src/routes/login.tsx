import { Link, createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import {
	ArrowLeftIcon,
	EyeIcon,
	EyeOffIcon,
	Loader2Icon,
	LockIcon,
	MailIcon,
	ShieldAlertIcon,
	SparklesIcon,
	UserIcon,
} from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD } from "@/lib/demo-credentials";
import { getServerSession } from "@/lib/server/auth";

export const Route = createFileRoute("/login")({
	beforeLoad: async () => {
		const { session } = await getServerSession();
		if (session) {
			throw redirect({ to: "/dashboard" });
		}
	},
	component: LoginPage,
});

function getErrorMessage(error: { status?: number; message?: string } | null): string {
	if (!error) return "Authentication failed. Please try again.";
	const message = error.message ?? "";
	if (error.status === 429 || /too many/i.test(message)) {
		return message || "Too many attempts. Please wait a minute and try again.";
	}
	if (/invalid email or password/i.test(message)) {
		return "Incorrect email or password. Please try again.";
	}
	if (error.status === 401 || error.status === 403) {
		return "Incorrect email or password. Please try again.";
	}
	return message || "Authentication failed. Please try again.";
}

function LoginPage() {
	const navigate = useNavigate();
	const [mode, setMode] = useState<"signin" | "signup">("signin");
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [error, setError] = useState("");
	const [isLoading, setIsLoading] = useState(false);

	const switchMode = (next: "signin" | "signup") => {
		setMode(next);
		setError("");
	};

	const quickFillAdmin = () => {
		setMode("signin");
		setEmail(SEED_ADMIN_EMAIL);
		setPassword(SEED_ADMIN_PASSWORD);
		setError("");
	};

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setError("");
		setIsLoading(true);
		try {
			if (mode === "signup") {
				const result = await authClient.signUp.email({ email, password, name });
				if (result.error) {
					setError(getErrorMessage(result.error));
					return;
				}
			} else {
				const result = await authClient.signIn.email({ email, password });
				if (result.error) {
					setError(getErrorMessage(result.error));
					return;
				}
			}
			await navigate({ to: "/dashboard" });
		} catch {
			setError("Something went wrong. Please check your connection and try again.");
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<main className="relative flex min-h-screen items-center justify-center px-4 py-12">
			<Link
				to="/"
				className="absolute top-5 left-5 inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground no-underline transition hover:bg-accent hover:text-foreground"
			>
				<ArrowLeftIcon className="size-4" />
				Back to home
			</Link>

			<div className="w-full max-w-md">
				<div className="mb-6 flex flex-col items-center text-center">
					<span className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-[color:var(--lagoon)]/20 text-[color:var(--lagoon-deep)]">
						<SparklesIcon className="size-6" />
					</span>
					<h1 className="display-title text-3xl font-bold text-foreground">Ekraf Admin</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						Sign in to manage products and your team.
					</p>
				</div>

				<div className="island-shell rounded-2xl p-6 sm:p-7">
					<div
						className="mb-6 grid grid-cols-2 gap-1 rounded-xl border border-border bg-muted/50 p-1"
						role="tablist"
						aria-label="Authentication mode"
					>
						<button
							type="button"
							role="tab"
							aria-selected={mode === "signin"}
							onClick={() => switchMode("signin")}
							className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
								mode === "signin"
									? "bg-background text-foreground shadow-sm"
									: "text-muted-foreground hover:text-foreground"
							}`}
						>
							Sign in
						</button>
						<button
							type="button"
							role="tab"
							aria-selected={mode === "signup"}
							onClick={() => switchMode("signup")}
							className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
								mode === "signup"
									? "bg-background text-foreground shadow-sm"
									: "text-muted-foreground hover:text-foreground"
							}`}
						>
							Create account
						</button>
					</div>

					<form onSubmit={(event) => void handleSubmit(event)} className="space-y-4" noValidate>
						{mode === "signup" && (
							<div className="space-y-1.5">
								<Label htmlFor="login-name">Name</Label>
								<div className="relative">
									<UserIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
									<Input
										id="login-name"
										type="text"
										value={name}
										onChange={(event) => setName(event.target.value)}
										placeholder="Your name"
										autoComplete="name"
										required
										className="pl-9"
									/>
								</div>
							</div>
						)}

						<div className="space-y-1.5">
							<Label htmlFor="login-email">Email</Label>
							<div className="relative">
								<MailIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
								<Input
									id="login-email"
									type="email"
									value={email}
									onChange={(event) => setEmail(event.target.value)}
									placeholder="you@example.com"
									autoComplete="email"
									required
									className="pl-9"
								/>
							</div>
						</div>

						<div className="space-y-1.5">
							<div className="flex items-center justify-between">
								<Label htmlFor="login-password">Password</Label>
								{mode === "signin" && (
									<button
										type="button"
										onClick={quickFillAdmin}
										className="text-xs font-semibold text-[color:var(--lagoon-deep)] hover:underline"
									>
										Quick fill admin demo
									</button>
								)}
							</div>
							<div className="relative">
								<LockIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
								<Input
									id="login-password"
									type={showPassword ? "text" : "password"}
									value={password}
									onChange={(event) => setPassword(event.target.value)}
									placeholder="••••••••"
									autoComplete={mode === "signup" ? "new-password" : "current-password"}
									required
									minLength={8}
									className="px-9"
								/>
								<button
									type="button"
									onClick={() => setShowPassword((previous) => !previous)}
									aria-label={showPassword ? "Hide password" : "Show password"}
									className="absolute top-1/2 right-2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground transition hover:bg-accent hover:text-foreground"
								>
									{showPassword ? (
										<EyeOffIcon className="size-4" />
									) : (
										<EyeIcon className="size-4" />
									)}
								</button>
							</div>
							<p className="text-xs text-muted-foreground">
								Password must be at least 8 characters.
							</p>
						</div>

						{error && (
							<div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs font-medium text-destructive">
								<ShieldAlertIcon className="mt-0.5 size-4 shrink-0" />
								<span>{error}</span>
							</div>
						)}

						<Button type="submit" className="w-full" disabled={isLoading}>
							{isLoading ? (
								<>
									<Loader2Icon className="animate-spin" />
									{mode === "signup" ? "Creating account…" : "Signing in…"}
								</>
							) : mode === "signup" ? (
								"Create account"
							) : (
								"Sign in"
							)}
						</Button>
					</form>

					<div className="mt-5 flex flex-col items-center gap-2 text-center text-xs text-muted-foreground">
						<Badge variant="muted">Demo: admin@example.com / admin12345</Badge>
						<p>
							Need the admin account?{" "}
							<Link
								to="/setup"
								className="font-semibold text-[color:var(--lagoon-deep)] no-underline hover:underline"
							>
								Run the setup
							</Link>
							.
						</p>
					</div>
				</div>
			</div>
		</main>
	);
}
