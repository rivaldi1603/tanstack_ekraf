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
		title: "Validasi Sesi Tingkat Server",
		description: "Setiap penulisan dan perubahan data diverifikasi langsung pada server.",
		icon: ShieldCheckIcon,
	},
	{
		title: "Katalog Produk Ekonomi Kreatif",
		description: "Kurasi karya, visual resolusi tinggi, inventaris stok, dan varian harga.",
		icon: PackageIcon,
	},
	{
		title: "Manajemen Peran & Kolaborator",
		description: "Pengaturan terpadu untuk Administrator dan Anggota tim kreatif.",
		icon: UsersIcon,
	},
	{
		title: "Tabel Data Berkecepatan Tinggi",
		description: "Penyortiran cepat & responsif di layar ponsel maupun komputer.",
		icon: ZapIcon,
	},
];

const QUICK_ACTIONS = [
	{
		to: "/dashboard",
		label: "Dashboard Ekraf",
		description: "Ringkasan KPI, nilai inventaris, dan audit sistem",
		icon: LayoutDashboardIcon,
	},
	{
		to: "/products",
		label: "Katalog Produk",
		description: "Kelola kurasi karya dan inventaris produk kreatif",
		icon: PackageIcon,
	},
	{
		to: "/users",
		label: "Kelola Pengguna",
		description: "Hak akses, kolaborator, dan peran administrator",
		icon: UsersIcon,
	},
	{
		to: "/setup",
		label: "Inisialisasi Demo",
		description: "Seed akun Administrator dan Anggota demo",
		icon: DatabaseIcon,
	},
] as const;

const STEPS = [
	"Kunjungi halaman Setup lalu klik Seed Akun Demo untuk menyiapkan data awal.",
	"Masuk dengan akun demo: Administrator (admin@example.com) atau Anggota (user@example.com).",
	"Kelola katalog karya ekonomi kreatif, perbarui profil, atau atur peran tim kolaborator.",
] as const;

function HomePage() {
	const { data: session, isPending } = authClient.useSession();

	return (
		<PublicLayout>
			<section className="border-b border-border">
				<div className="page-wrap grid gap-10 px-4 py-14 lg:grid-cols-[1.15fr_1fr] lg:items-center lg:py-20">
					<div className="rise-in">
						<Badge variant="aurora" className="mb-4">
							<SparklesIcon />
							Platform Digital Ekonomi Kreatif (EKRAF)
						</Badge>
						<h1 className="display-title text-4xl leading-[1.1] font-bold text-foreground sm:text-5xl lg:text-6xl">
							Kelola katalog karya & talenta kreatif dalam{" "}
							<span className="aurora-gradient-text">satu dashboard terpadu</span>.
						</h1>
						<p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground">
							Pusat kendali dan administrasi digital bagi pelaku industri ekonomi kreatif Indonesia
							— kurasi katalog produk kriya, fesyen, kuliner, desain, hingga manajemen peran tim
							kolaborator dengan keamanan terproteksi di setiap tindakan.
						</p>

						<div className="mt-8 flex flex-wrap gap-3">
							{session?.user ? (
								<Button
									asChild
									size="lg"
									className="bg-gradient-to-r from-teal-500 via-cyan-600 to-indigo-600 !text-white font-semibold shadow-[0_0_24px_rgba(20,184,166,0.4)] hover:opacity-95 transition-all"
								>
									<Link
										to="/dashboard"
										className="inline-flex items-center gap-2 !text-white no-underline"
									>
										<span className="!text-white font-semibold">Buka Dashboard</span>
										<ArrowRightIcon className="size-4 !text-white" />
									</Link>
								</Button>
							) : (
								<Button
									asChild
									size="lg"
									className="bg-gradient-to-r from-teal-500 via-cyan-600 to-indigo-600 !text-white font-semibold shadow-[0_0_24px_rgba(20,184,166,0.4)] hover:opacity-95 transition-all"
								>
									<Link
										to="/login"
										className="inline-flex items-center gap-2 !text-white no-underline"
									>
										<span className="!text-white font-semibold">Masuk ke Akun</span>
										<ArrowRightIcon className="size-4 !text-white" />
									</Link>
								</Button>
							)}
							<Button
								asChild
								size="lg"
								variant="outline"
								className="backdrop-blur-md bg-card/70 border-border/80 hover:bg-card/90"
							>
								<Link
									to="/setup"
									className="inline-flex items-center gap-2 no-underline text-foreground"
								>
									<DatabaseIcon className="size-4 text-teal-600 dark:text-teal-400" />
									<span>Inisialisasi Data Demo</span>
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
									Status Akses
								</CardTitle>
								<Badge variant={session?.user ? "success" : "muted"}>
									{session?.user ? "Terautentikasi" : "Tamu (Guest)"}
								</Badge>
							</div>
							<CardDescription>
								{session?.user
									? "Anda memiliki sesi aktif pada perangkat ini."
									: "Masuk untuk mengakses penuh dashboard ekraf, katalog karya, dan manajemen tim."}
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
									Belum ada sesi aktif. Gunakan halaman Setup untuk membuat akun demo, lalu masuk ke
									sistem.
								</div>
							)}

							<div className="space-y-2">
								<p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
									Panduan Singkat
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
						Aksi Cepat
					</h2>
					<p className="mt-1 text-sm text-muted-foreground">
						Akses instan ke seluruh modul operasional dan administrasi ekonomi kreatif.
					</p>
				</div>

				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
					{QUICK_ACTIONS.map((action) => (
						<Link key={action.to} to={action.to} className="no-underline">
							<Card className="feature-card aurora-card-glow h-full border-border/60">
								<CardContent className="space-y-3">
									<span className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-tr from-teal-500/20 via-cyan-500/15 to-indigo-500/20 text-teal-600 dark:text-teal-300 shadow-sm">
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
