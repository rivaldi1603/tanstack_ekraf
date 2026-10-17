/**
 * Applies the stored theme before first paint so there is no flash of the
 * wrong colour scheme. Loaded synchronously from <head>; the logic mirrors
 * src/components/ThemeToggle.tsx.
 */
(() => {
	const readStoredMode = () => {
		try {
			return window.localStorage.getItem("theme");
		} catch {
			return null;
		}
	};

	const stored = readStoredMode();
	const mode = stored === "light" || stored === "dark" || stored === "auto" ? stored : "auto";
	const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
	const resolved = mode === "auto" ? (prefersDark ? "dark" : "light") : mode;
	const root = document.documentElement;

	root.classList.remove("light", "dark");
	root.classList.add(resolved);

	if (mode === "auto") {
		root.removeAttribute("data-theme");
	} else {
		root.setAttribute("data-theme", mode);
	}

	root.style.colorScheme = resolved;
})();
