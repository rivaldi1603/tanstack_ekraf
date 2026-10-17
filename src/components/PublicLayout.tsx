import type * as React from "react";

import Footer from "./Footer";
import Header from "./Header";

/** Shared chrome for the public marketing/onboarding pages. */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
	return (
		<div className="flex min-h-screen flex-col">
			<Header />
			<div className="flex-1">{children}</div>
			<Footer />
		</div>
	);
}
