"use client";

import { cn } from "cn";
import { ImageOffIcon } from "lucide-react";
import { useState } from "react";

interface ProductThumbnailProps {
	src?: string | null;
	alt: string;
	className?: string;
}

/** Product image with a graceful placeholder for missing or broken URLs. */
export default function ProductThumbnail({ src, alt, className }: ProductThumbnailProps) {
	const [failed, setFailed] = useState(false);

	if (src && !failed) {
		return (
			<img
				src={src}
				alt={alt}
				loading="lazy"
				onError={() => setFailed(true)}
				className={cn("shrink-0 border border-border bg-muted object-cover", className)}
			/>
		);
	}

	return (
		<div
			role="img"
			aria-label={alt}
			className={cn(
				"flex shrink-0 items-center justify-center border border-border bg-muted text-muted-foreground",
				className,
			)}
		>
			<ImageOffIcon className="size-5" />
		</div>
	);
}
